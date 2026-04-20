package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// ApiListGoSignTasks returns tasks for current user
func (server *Server) ApiListGoSignTasks(w http.ResponseWriter, r *http.Request) {
	adminID, _, role, _ := GetCurrentAdmin(r)

	var tasks []models.GoSignTask
	query := server.DB.Preload("Signers").Order("created_at desc")

	// Super Admin sees everything
	if strings.ToLower(strings.TrimSpace(role)) == "super admin" {
		query.Find(&tasks)
	} else {
		// Normal user sees tasks they created OR tasks where they are a signer
		var signers []models.GoSignSigner
		server.DB.Where("user_id = ?", adminID).Find(&signers)

		taskIDs := make([]string, 0)
		for _, s := range signers {
			taskIDs = append(taskIDs, s.TaskID)
		}

		if len(taskIDs) > 0 {
			query.Where("id IN ? OR creator_id = ?", taskIDs, adminID).Find(&tasks)
		} else {
			query.Where("creator_id = ?", adminID).Find(&tasks)
		}
	}

	if tasks == nil {
		tasks = []models.GoSignTask{}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"tasks":           tasks,
		"current_user_id": adminID,
	})
}

// ApiSignTask handles signing a document
func (server *Server) ApiSignTask(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)
	taskID := r.FormValue("task_id")

	// Use a transaction for the entire signing process
	err := server.DB.Transaction(func(tx *gorm.DB) error {
		var task models.GoSignTask
		if err := tx.Preload("Signers").Set("gorm:query_option", "FOR UPDATE").First(&task, "id = ?", taskID).Error; err != nil {
			return fmt.Errorf("Permohonan tidak ditemukan")
		}

		if task.Status != "Pending" {
			return fmt.Errorf("Permohonan sudah selesai diproses")
		}

		var signer *models.GoSignSigner
		for i := range task.Signers {
			if task.Signers[i].UserID == adminID {
				signer = &task.Signers[i]
				break
			}
		}

		if signer == nil {
			return fmt.Errorf("Anda bukan penanda tangan untuk dokumen ini")
		}

		// Count signed signers
		signedCount := 0
		for _, s := range task.Signers {
			if s.Signed {
				signedCount++
			}
		}

		// If user already signed, check if we need to retry finalization
		if signer.Signed {
			if signedCount == len(task.Signers) && task.Status == "Pending" {
				fmt.Printf("[GoSign] Retrying finalization for task %s\n", taskID)
				return server.FinalizeGoSignTask(tx, taskID)
			}
			return fmt.Errorf("Anda sudah menandatangani dokumen ini")
		}

		// Mark as signed
		now := time.Now()
		signer.Signed = true
		signer.SignedAt = &now
		if err := tx.Save(signer).Error; err != nil {
			return err
		}
		
		// Update count for completion check
		signedCount++

		if len(task.Signers) == signedCount {
			// FINALIZATION (dalam transaksi tetap panggil server.FinalizeGoSignTask)
			// Namun agar transaksional, sebaiknya logika pindah kesini atau pastikan FinalizeGoSignTask bisa pakai tx
			// Untuk sekarang kita set Status dulu agar yang lain tidak masuk
			task.Status = "Completed"
			if err := tx.Save(&task).Error; err != nil {
				return err
			}
			
			// Logika finalisasi (bisa di luar tx jika berat, tapi disini aman karena file ops)
			// Kita panggil saja fungsinya (ia akan load ulang task tsb namun status sdh Completed)
			// Update: Pass the current transaction to FinalizeGoSignTask
			err := server.FinalizeGoSignTask(tx, taskID)
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Tanda tangan berhasil.",
		"completed": true,
	})
}

// FinalizeGoSignTask generates the final PDF and moves it to DMS
func (server *Server) FinalizeGoSignTask(tx *gorm.DB, taskID string) error {
	db := tx
	if db == nil {
		db = server.DB
	}

	var task models.GoSignTask
	if err := db.Preload("Signers").First(&task, "id = ?", taskID).Error; err != nil {
		return err
	}

	// Tipe Upload diolah berbeda (Overlay signature ke PDF yg ada)
	if task.TaskType == "Upload" {
		return server.FinalizeUploadGoSignTask(db, task)
	}

	if task.FormID == "FM.SI.0101" {
		return server.FinalizeFMSI0101Task(db, task)
	}

	// Default BAST Logic
	return server.FinalizeBASTTask(db, task)
}

// FinalizeUploadGoSignTask handles signature placement on uploaded PDF
func (server *Server) FinalizeUploadGoSignTask(db *gorm.DB, task models.GoSignTask) error {
	// 1. Get Physical Path of uploaded document (Draft)
	relPath := task.FilePath
	if len(relPath) > 0 && relPath[0] == '/' {
		relPath = relPath[1:]
	}

	// 2. Determine target path in DMS with Smart Filenaming (append timestamp)
	uploadDir := server.getPhysicalFolderPath(&task.TargetFolderID, task.Section, false)
	os.MkdirAll(uploadDir, 0755)

	origExt := filepath.Ext(task.FileName)
	baseName := strings.TrimSuffix(task.FileName, origExt)
	// Add current time for uniqueness and "fresh" feel
	timestamp := time.Now().Format("20060102_150405")
	smartFileName := fmt.Sprintf("%s_%s%s", baseName, timestamp, origExt)
	finalPhysicalPath := filepath.Join(uploadDir, server.sanitizeFileName(smartFileName))

	// 2.5 Resumability check (now unlikely to trigger due to unique timestamp, which is good for being "fresh")
	alreadyFinished := false
	if _, err := os.Stat(finalPhysicalPath); err == nil {
		if _, err := os.Stat(relPath); os.IsNotExist(err) {
			alreadyFinished = true
		}
	}

	if !alreadyFinished {
		// 3. Perform Overlay (Only for PDF)
		ext := filepath.Ext(finalPhysicalPath)
		if strings.ToLower(ext) == ".pdf" {
			// Temporary short path to avoid library length/naming limitations on Windows, 100% Unique
			uniqueSuffix := fmt.Sprintf("%s_%d", task.ID[:8], time.Now().UnixNano())
			tmpInput := filepath.Join("public/uploads/drafts", fmt.Sprintf("in_%s.pdf", uniqueSuffix))
			tmpOutput := filepath.Join("public/uploads/drafts", fmt.Sprintf("out_%s.pdf", uniqueSuffix))
			
			// Prep the files
			os.Remove(tmpInput)
			os.Remove(tmpOutput)
			
			// Copy input to temporary short path
			if errCopy := server.copyFile(relPath, tmpInput); errCopy != nil {
				fmt.Printf("[GoSign] Failed to prep tmp input: %v\n", errCopy)
				// Fallback to relative path without Abs/ToSlash
				tmpInput = relPath
				tmpOutput = finalPhysicalPath
			} else {
				// Use relative paths with forward slashes - often the most compatible for libraries
				tmpInput = filepath.ToSlash(tmpInput)
				tmpOutput = filepath.ToSlash(tmpOutput)
			}

			// Perform overlay on the temporary file
			err := server.OverlaySignaturesOnPDF(tmpInput, tmpOutput, task.Signers)
			
			// If success, move tmpOutput to finalPhysicalPath
			if err == nil {
				os.Rename(tmpOutput, finalPhysicalPath)
				os.Remove(tmpInput)
			}

			// Validate output
			inInfo, _ := os.Stat(relPath)
			outInfo, _ := os.Stat(finalPhysicalPath)
			
			// If overlay failed or produced a suspiciously small file (likely blank due to gofpdi limitations)
			if err != nil || (outInfo != nil && inInfo != nil && outInfo.Size() < 5000 && inInfo.Size() > 10000) {
				if err != nil {
					fmt.Printf("[GoSign] Overlay Error: %v\n", err)
				} else {
					fmt.Printf("[GoSign] Overlay produced blank/small file (%d vs %d), falling back\n", outInfo.Size(), inInfo.Size())
				}
				// Fallback: cleanup corrupted output and restore original draft using Copy (safer on Windows)
				os.Remove(finalPhysicalPath)
				
				// Manual copy because Rename often fails on Windows if source is still being "read" by gofpdi
				srcFile, errSrc := os.Open(relPath)
				if errSrc == nil {
					dstFile, errDst := os.Create(finalPhysicalPath)
					if errDst == nil {
						_, errCopy := io.Copy(dstFile, srcFile)
						dstFile.Close()
						srcFile.Close()
						if errCopy != nil {
							fmt.Printf("[GoSign] Fallback Copy Error: %v\n", errCopy)
							return fmt.Errorf("gagal menyalin file cadangan: %v", errCopy)
						}
						// Successfully copied original - now try to remove the draft (optional, might still be locked)
						os.Remove(relPath)
					} else {
						srcFile.Close()
						return fmt.Errorf("gagal membuat file tujuan: %v", errDst)
					}
				} else {
					return fmt.Errorf("gagal membuka file sumber: %v", errSrc)
				}
			} else {
				// Success
				os.Remove(relPath)
			}
		} else {
			// Non-PDF: just move the file as is
			os.Rename(relPath, finalPhysicalPath)
		}
	}

	// 4. Register to DMS
	var folderID *string
	if task.TargetFolderID != "" && task.TargetFolderID != "root" {
		folderID = &task.TargetFolderID
	}

	newFile := models.DMSFile{
		ID:         server.generateUUID(), // Use a fresh UUID to stay within 36 character limit
		FolderID:   folderID,
		Section:    task.Section,
		Name:       smartFileName,
		Extension:  strings.TrimPrefix(origExt, "."),
		FilePath:   "/" + filepath.ToSlash(finalPhysicalPath),
		UploadedBy: task.CreatorName,
		Category:   "Digital Sign",
	}

	if info, err := os.Stat(finalPhysicalPath); err == nil {
		newFile.Size = info.Size()
	}

	var existing models.DMSFile
	if err := db.Where("id = ?", task.ID).First(&existing).Error; err != nil {
		if err := db.Create(&newFile).Error; err != nil {
			return err
		}
	}

	// 5. Cleanup Task
	task.Status = "Completed"
	db.Save(&task)

	server.AddNotification(task.CreatorID, "Dokumen Selesai", fmt.Sprintf("Dokumen %s telah ditandatangani oleh semua pihak dan disimpan di eDoc.", task.FormName), "success", "/godms/edoc")
	return nil
}

func (server *Server) FinalizeFMSI0101Task(db *gorm.DB, task models.GoSignTask) error {
	var data struct {
		Period   string            `json:"period"`
		Servers  []models.FMSI0101 `json:"servers"`
		Preparer models.User       `json:"preparer"`
		Approver models.User       `json:"approver"`
		Date     string            `json:"date"`
	}
	if err := json.Unmarshal([]byte(task.DataJSON), &data); err != nil {
		return err
	}

	// 1. Prepare Signatures
	sigPreparer := ""
	sigApprover := ""
	for _, s := range task.Signers {
		var u models.User
		db.Where("id = ?", s.UserID).First(&u)
		
		sigData := ""
		if u.Signature != "" {
			if strings.HasPrefix(u.Signature, "data:image") {
				sigData = u.Signature
			} else {
				sigPath := filepath.Join("./public/uploads/signatures", u.Signature)
				sigBytes, err := os.ReadFile(sigPath)
				if err == nil {
					sigData = "data:image/png;base64," + base64.StdEncoding.EncodeToString(sigBytes)
				}
			}
		}

		if s.Role == "Penyusun" {
			sigPreparer = sigData
		} else if s.Role == "Penyetuju" {
			sigApprover = sigData
		}
	}

	// 2. Generate Final PDF
	uploadDir := server.getPhysicalFolderPath(&task.TargetFolderID, task.Section, false)
	os.MkdirAll(uploadDir, 0755)
	physicalPath := filepath.Join(uploadDir, server.sanitizeFileName(task.FileName))

	pdf := server.GenerateFMSI0101PDF(data.Servers, data.Period, &data.Preparer, &data.Approver, sigPreparer, sigApprover, data.Date)
	err := pdf.OutputFileAndClose(physicalPath)
	if err != nil {
		return err
	}

	// 3. Register to DMS
	var folderID *string
	if task.TargetFolderID != "" && task.TargetFolderID != "root" {
		folderID = &task.TargetFolderID
	}

	newFile := models.DMSFile{
		ID:         task.ID,
		FolderID:   folderID,
		Section:    task.Section,
		Name:       task.FileName,
		Extension:  "pdf",
		FilePath:   "/" + filepath.ToSlash(physicalPath),
		UploadedBy: task.CreatorName,
		Category:   "Digital Form",
	}

	if info, err := os.Stat(physicalPath); err == nil {
		newFile.Size = info.Size()
	}

	var existing models.DMSFile
	if err := db.Where("id = ?", task.ID).First(&existing).Error; err != nil {
		if err := db.Create(&newFile).Error; err != nil {
			return err
		}
	}

	// 4. Cleanup Task
	task.Status = "Completed"
	db.Save(&task)

	if task.FilePath != "" {
		relPath := task.FilePath
		if len(relPath) > 0 && relPath[0] == '/' {
			relPath = relPath[1:]
		}
		os.Remove(relPath)
	}

	server.AddNotification(task.CreatorID, "Dokumen Selesai", fmt.Sprintf("Dokumen %s telah ditandatangani oleh semua pihak dan disimpan di eDoc.", task.FormName), "success", "/godms/edoc")
	return nil
}

func (server *Server) FinalizeBASTTask(db *gorm.DB, task models.GoSignTask) error {
	var data BASTData
	if err := json.Unmarshal([]byte(task.DataJSON), &data); err != nil {
		return err
	}

	// 1. Prepare Signatures from User Profiles
	for _, s := range task.Signers {
		var u models.User
		db.Where("id = ?", s.UserID).First(&u)
		
		if u.Signature != "" {
			sigPath := filepath.Join("./public/uploads/signatures", u.Signature)
			sigBytes, err := os.ReadFile(sigPath)
			if err == nil {
				// Detect if p1 or p2 in BASTData
				if u.ID == data.P1.ID {
					data.SigP1Data = "data:image/png;base64," + base64.StdEncoding.EncodeToString(sigBytes)
				} else if u.ID == data.P2.ID {
					data.SigP2Data = "data:image/png;base64," + base64.StdEncoding.EncodeToString(sigBytes)
				}
			}
		}
	}

	// 2. Generate Final PDF
	uploadDir := server.getPhysicalFolderPath(&task.TargetFolderID, task.Section, false)
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	physicalPath := filepath.Join(uploadDir, server.sanitizeFileName(task.FileName))

	err := server.GenerateBASTPDF(data, task.FormName, physicalPath)
	if err != nil {
		return err
	}

	// 3. Register to DMS
	var folderID *string
	if task.TargetFolderID != "" && task.TargetFolderID != "root" {
		folderID = &task.TargetFolderID
	}

	newFile := models.DMSFile{
		ID:         task.ID, // Keep same ID as task for reference
		FolderID:   folderID,
		Section:    task.Section,
		Name:       task.FileName,
		Extension:  "pdf",
		FilePath:   "/" + filepath.ToSlash(physicalPath),
		UploadedBy: task.CreatorName,
		Category:   "Digital Form",
	}

	if info, err := os.Stat(physicalPath); err == nil {
		newFile.Size = info.Size()
	}

	var existing models.DMSFile
	if err := db.Where("id = ?", task.ID).First(&existing).Error; err != nil {
		if err := db.Create(&newFile).Error; err != nil {
			return err
		}
	}

	// 4. Asset Management Logic (Same as SubmitGoForm)
	assetIDs := make([]string, 0)
	for _, item := range data.Items {
		assetIDs = append(assetIDs, item.ID)
	}

	if len(assetIDs) > 0 {
		if data.Category == "Pengembalian" {
			db.Model(&models.AssetKSO{}).Where("id IN ?", assetIDs).Update("user_id", nil)
		} else if data.P2.ID != "" && data.Category != "Tukar" {
			db.Model(&models.AssetKSO{}).Where("id IN ?", assetIDs).Update("user_id", data.P2.ID)
		}
	}

	if data.Category == "Tukar" && data.P2.ID != "" {
		if data.NewAsset != nil {
			db.Model(&models.AssetKSO{}).Where("id = ?", data.NewAsset.ID).Update("user_id", data.P2.ID)
		}
		if data.OldAsset != nil {
			db.Model(&models.AssetKSO{}).Where("id = ?", data.OldAsset.ID).Update("user_id", nil)
		}
	}

	// 5. Cleanup Task & Draft
	task.Status = "Completed"
	db.Save(&task)

	if task.FilePath != "" {
		// Remove leading slash if any
		relPath := task.FilePath
		if len(relPath) > 0 && relPath[0] == '/' {
			relPath = relPath[1:]
		}
		os.Remove(relPath)
	}

	// Notify Creator
	server.AddNotification(task.CreatorID, "Dokumen Selesai", fmt.Sprintf("Dokumen %s telah ditandatangani oleh semua pihak dan disimpan di eDoc.", task.FormName), "success", "/godms/edoc")

	return nil
}
// ApiPreviewGoSignTask serves the pre-generated draft PDF
func (server *Server) ApiPreviewGoSignTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var task models.GoSignTask
	if err := server.DB.First(&task, "id = ?", id).Error; err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	if task.FilePath == "" {
		// FALLBACK: For old tasks, generate on the fly
		tempDir := "./public/temp/previews"
		if _, err := os.Stat(tempDir); os.IsNotExist(err) {
			os.MkdirAll(tempDir, 0755)
		}
		tempPath := filepath.Join(tempDir, "temp_preview_"+id+".pdf")

		var data BASTData
		if err := json.Unmarshal([]byte(task.DataJSON), &data); err != nil {
			http.Error(w, "Data dokumen tidak valid", http.StatusInternalServerError)
			return
		}

		if err := server.GenerateBASTPDF(data, task.FormName, tempPath); err != nil {
			http.Error(w, "Gagal generate preview: "+err.Error(), http.StatusInternalServerError)
			return
		}
		http.ServeFile(w, r, tempPath)
		return
	}

	// Remove leading slash for local file serving
	localPath := task.FilePath
	if len(localPath) > 0 && localPath[0] == '/' {
		localPath = localPath[1:]
	}

	if _, err := os.Stat(localPath); os.IsNotExist(err) {
		http.Error(w, "File draft fisik tidak ditemukan", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, localPath)
}
// ApiRejectTask handles rejecting a signature request
func (server *Server) ApiRejectTask(w http.ResponseWriter, r *http.Request) {
	adminID, adminName, _, _ := GetCurrentAdmin(r)
	taskID := r.FormValue("task_id")
	reason := r.FormValue("reason") // Optional reason

	var task models.GoSignTask
	if err := server.DB.Preload("Signers").First(&task, "id = ?", taskID).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Permohonan tidak ditemukan"})
		return
	}

	// Verify if current user is one of the signers
	isSigner := false
	for _, s := range task.Signers {
		if s.UserID == adminID {
			isSigner = true
			break
		}
	}

	if !isSigner {
		server.Renderer.JSON(w, http.StatusForbidden, map[string]string{"error": "Anda tidak memiliki akses untuk menolak permohonan ini"})
		return
	}

	if task.Status != "Pending" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Hanya permohonan dengan status Pending yang dapat ditolak"})
		return
	}

	// Update Task Status
	task.Status = "Rejected"
	task.RejectionReason = reason
	task.RejectorID = adminID
	task.RejectorName = adminName
	server.DB.Save(&task)

	// Update specific signer to "Rejected"
	now := time.Now()
	server.DB.Model(&models.GoSignSigner{}).Where("task_id = ? AND user_id = ?", taskID, adminID).Updates(map[string]interface{}{
		"rejected":    true,
		"rejected_at": &now,
	})

	// Cleanup Draft if exists
	if task.FilePath != "" {
		relPath := task.FilePath
		if len(relPath) > 0 && relPath[0] == '/' {
			relPath = relPath[1:]
		}
		os.Remove(relPath)
	}

	// Notify Creator
	rejectMsg := fmt.Sprintf("Dokumen %s ditolak oleh %s.", task.FormName, adminName)
	if reason != "" {
		rejectMsg += " Alasan: " + reason
	}
	server.AddNotification(task.CreatorID, "Permohonan Ditolak", rejectMsg, "danger", "/gosign")

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Permohonan tanda tangan telah ditolak"})
}

// ApiDeleteGoSignTask deletes a GoSign task and its associated data
func (server *Server) ApiDeleteGoSignTask(w http.ResponseWriter, r *http.Request) {
	_, _, role, _ := GetCurrentAdmin(r)
	vars := mux.Vars(r)
	id := vars["id"]

	var task models.GoSignTask
	if err := server.DB.First(&task, "id = ?", id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Permohonan tidak ditemukan"})
		return
	}

	// Permission Check: Only Super Admin can delete per User Request
	if strings.ToLower(strings.TrimSpace(role)) != "super admin" {
		server.Renderer.JSON(w, http.StatusForbidden, map[string]string{"error": "Hanya Super Admin yang dapat menghapus data permohonan"})
		return
	}

	// 1. Delete Signers
	if err := server.DB.Where("task_id = ?", id).Delete(&models.GoSignSigner{}).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menghapus data signer"})
		return
	}

	// 2. Remove Draft File if exists and task is not completed
	// Completed tasks have their file in eDoc (DMSFile), which we might want to keep unless specifically deleted from DMS
	if task.Status != "Completed" && task.FilePath != "" {
		relPath := task.FilePath
		if len(relPath) > 0 && relPath[0] == '/' {
			relPath = relPath[1:]
		}
		os.Remove(relPath)
	}

	// 3. Delete Task
	if err := server.DB.Delete(&task).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menghapus permohonan"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Permohonan telah berhasil dihapus"})
}

// ApiSubmitGoSignUpload handles manual file upload for GoSign
func (server *Server) ApiSubmitGoSignUpload(w http.ResponseWriter, r *http.Request) {
	adminID, adminName, _, _ := GetCurrentAdmin(r)

	// 1. Parse Multipart Form
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Gagal membaca form: " + err.Error()})
		return
	}

	formName := r.FormValue("form_name")
	section := r.FormValue("section")
	signersJSON := r.FormValue("signers")
	targetFolderID := r.FormValue("target_folder_id")

	// 2. Handle File Upload
	file, header, err := r.FormFile("file")
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Pilih file dokumen terlebih dahulu"})
		return
	}
	defer file.Close()

	// Ensure draft directory exists
	draftDir := "public/uploads/drafts"
	os.MkdirAll(draftDir, 0755)

	taskID := server.generateUUID()
	fileName := server.sanitizeFileName(header.Filename)
	filePath := filepath.Join(draftDir, fmt.Sprintf("%s_%s", taskID, fileName))

	out, err := os.Create(filePath)
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan file: " + err.Error()})
		return
	}
	defer out.Close()

	if _, err := out.ReadFrom(file); err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyalin file"})
		return
	}

	// 1.5 Handle Auto Folder
	if targetFolderID == "auto" && section != "" {
		var folder models.DMSFolder
		err := server.DB.Where("name = ? AND section = ? AND parent_id IS NULL", "GoSign", section).First(&folder).Error
		if err != nil {
			// Create it
			newFolderID := server.generateUUID()
			folder = models.DMSFolder{
				ID:      newFolderID,
				Name:    "GoSign",
				Section: section,
			}
			if err := server.DB.Create(&folder).Error; err != nil {
				server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membuat folder GoSign: " + err.Error()})
				return
			}
			targetFolderID = newFolderID
		} else {
			targetFolderID = folder.ID
		}
	}

	// 3. Create Task
	task := models.GoSignTask{
		ID:             taskID,
		FormName:       formName,
		FileName:       fileName,
		FilePath:       "/" + filepath.ToSlash(filePath),
		Status:         "Pending",
		CreatorID:      adminID,
		CreatorName:    adminName,
		Section:        section,
		TargetFolderID: targetFolderID,
		TaskType:       "Upload",
	}

	// 4. Handle Signers
	var inputSigners []struct {
		UserID   string  `json:"user_id"`
		UserName string  `json:"user_name"`
		Role     string  `json:"role"`
		X        float64 `json:"x"`
		Y        float64 `json:"y"`
		Page     int     `json:"page"`
		Width    float64 `json:"width"`
		HideRole bool    `json:"hide_role"`
		SignType string  `json:"sign_type"`
	}
	if err := json.Unmarshal([]byte(signersJSON), &inputSigners); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Format data signer tidak valid"})
		return
	}

	for _, s := range inputSigners {
		signer := models.GoSignSigner{
			ID:       server.generateUUID(),
			TaskID:   taskID,
			UserID:   s.UserID,
			UserName: s.UserName,
			Role:     s.Role,
			X:        s.X,
			Y:        s.Y,
			Page:     s.Page,
			Width:    s.Width,
			HideRole: s.HideRole,
			SignType: s.SignType,
		}
		task.Signers = append(task.Signers, signer)
	}

	if err := server.DB.Create(&task).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal membuat permohonan: " + err.Error()})
		return
	}

	// Notify all signers
	for _, s := range task.Signers {
		server.AddNotification(s.UserID, "Permohonan Tanda Tangan Baru", fmt.Sprintf("Anda diminta untuk menandatangani dokumen %s oleh %s.", formName, adminName), "primary", "/gosign")
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Permohonan GoSign telah diajukan",
		"task":    task,
	})
}

// copyFile is a helper to duplicate a file safely
func (server *Server) copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}
