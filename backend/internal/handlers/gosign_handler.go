package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
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
		"tasks": tasks,
	})
}

// ApiSignTask handles signing a document
func (server *Server) ApiSignTask(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)
	taskID := r.FormValue("task_id")

	var signer models.GoSignSigner
	if err := server.DB.Where("task_id = ? AND user_id = ?", taskID, adminID).First(&signer).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Permohonan tidak ditemukan"})
		return
	}

	if signer.Signed {
		server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Anda sudah menandatangani dokumen ini"})
		return
	}

	now := time.Now()
	signer.Signed = true
	signer.SignedAt = &now
	server.DB.Save(&signer)

	// Check if ALL signed
	var totalSigners int64
	var signedCount int64
	server.DB.Model(&models.GoSignSigner{}).Where("task_id = ?", taskID).Count(&totalSigners)
	server.DB.Model(&models.GoSignSigner{}).Where("task_id = ? AND signed = ?", taskID, true).Count(&signedCount)

	if totalSigners == signedCount {
		// FINALIZATION
		err := server.FinalizeGoSignTask(taskID)
		if err != nil {
			fmt.Printf("[GoSign] Finalization error: %v\n", err)
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal finalisasi dokumen: " + err.Error()})
			return
		}
		
		server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
			"message":   "Tanda tangan berhasil. Dokumen telah difinalisasi dan dipindahkan ke eDoc.",
			"completed": true,
		})
	} else {
		server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
			"message":   "Tanda tangan berhasil. Menunggu pihak lain.",
			"completed": false,
		})
	}
}

// FinalizeGoSignTask generates the final PDF and moves it to DMS
func (server *Server) FinalizeGoSignTask(taskID string) error {
	var task models.GoSignTask
	if err := server.DB.Preload("Signers").First(&task, "id = ?", taskID).Error; err != nil {
		return err
	}

	if task.FormID == "FM.SI.0101" {
		return server.FinalizeFMSI0101Task(task)
	}

	// Default BAST Logic
	return server.FinalizeBASTTask(task)
}

func (server *Server) FinalizeFMSI0101Task(task models.GoSignTask) error {
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
		server.DB.Where("id = ?", s.UserID).First(&u)
		
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
	newFile := models.DMSFile{
		ID:         task.ID,
		FolderID:   &task.TargetFolderID,
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

	if err := server.DB.Create(&newFile).Error; err != nil {
		return err
	}

	// 4. Cleanup Task
	task.Status = "Completed"
	server.DB.Save(&task)

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

func (server *Server) FinalizeBASTTask(task models.GoSignTask) error {
	var data BASTData
	if err := json.Unmarshal([]byte(task.DataJSON), &data); err != nil {
		return err
	}

	// 1. Prepare Signatures from User Profiles
	for _, s := range task.Signers {
		var u models.User
		server.DB.Where("id = ?", s.UserID).First(&u)
		
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
	newFile := models.DMSFile{
		ID:         task.ID, // Keep same ID as task for reference
		FolderID:   &task.TargetFolderID,
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

	if err := server.DB.Create(&newFile).Error; err != nil {
		return err
	}

	// 4. Asset Management Logic (Same as SubmitGoForm)
	assetIDs := make([]string, 0)
	for _, item := range data.Items {
		assetIDs = append(assetIDs, item.ID)
	}

	if len(assetIDs) > 0 {
		if data.Category == "Pengembalian" {
			server.DB.Model(&models.AssetKSO{}).Where("id IN ?", assetIDs).Update("user_id", nil)
		} else if data.P2.ID != "" && data.Category != "Tukar" {
			server.DB.Model(&models.AssetKSO{}).Where("id IN ?", assetIDs).Update("user_id", data.P2.ID)
		}
	}

	if data.Category == "Tukar" && data.P2.ID != "" {
		if data.NewAsset != nil {
			server.DB.Model(&models.AssetKSO{}).Where("id = ?", data.NewAsset.ID).Update("user_id", data.P2.ID)
		}
		if data.OldAsset != nil {
			server.DB.Model(&models.AssetKSO{}).Where("id = ?", data.OldAsset.ID).Update("user_id", nil)
		}
	}

	// 5. Cleanup Task & Draft
	task.Status = "Completed"
	server.DB.Save(&task)

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
