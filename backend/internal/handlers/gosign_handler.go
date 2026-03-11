package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
)

// ApiListGoSignTasks returns tasks for current user
func (server *Server) ApiListGoSignTasks(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)

	var signers []models.GoSignSigner
	server.DB.Where("user_id = ?", adminID).Find(&signers)

	taskIDs := make([]string, 0)
	for _, s := range signers {
		taskIDs = append(taskIDs, s.TaskID)
	}

	var tasks []models.GoSignTask
	if len(taskIDs) > 0 {
		server.DB.Preload("Signers").Where("id IN ?", taskIDs).Order("created_at desc").Find(&tasks)
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
			// Status would need to be passed in DataJSON if we want to update it to "Rusak"/"Hilang"
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
