package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ListEDoc menampilkan halaman utama Digital Management System (DMS)
func (server *Server) ListEDoc(w http.ResponseWriter, r *http.Request) {
	var folders []models.DMSFolder
	server.DB.Where("parent_id IS NULL AND trashed_at IS NULL").Find(&folders)

	var files []models.DMSFile
	server.DB.Where("folder_id IS NULL AND trashed_at IS NULL").Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	server.RenderHTML(w, r, http.StatusOK, "edoc/index", map[string]interface{}{
		"title":        "Digital Management System (DMS)",
		"folders":      folders,
		"files":        files,
		"totalStorage": server.formatSize(totalSize),
		"isTrash":      false,
	})
}

// StoreFolder menyimpan folder baru ke database
func (server *Server) StoreFolder(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")
	if name == "" {
		http.Redirect(w, r, "/godms/doc", http.StatusSeeOther)
		return
	}

	folder := models.DMSFolder{
		ID:    uuid.New().String(),
		Name:  name,
		Color: "#fbbf24", // Default yellow
	}

	if parentID := r.FormValue("parent_id"); parentID != "" {
		folder.ParentID = &parentID
	}

	if err := server.DB.Create(&folder).Error; err != nil {
		fmt.Printf("Error creating folder: %v\n", err)
	}

	redirect := "/godms/doc"
	if folder.ParentID != nil {
		redirect = "/godms/doc/" + *folder.ParentID
	}
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// ListFolderContent menampilkan isi dari sebuah folder (subfolder dan file)
func (server *Server) ListFolderContent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	folderID := vars["id"]

	var currentFolder models.DMSFolder
	if err := server.DB.Where("id = ?", folderID).First(&currentFolder).Error; err != nil {
		http.Redirect(w, r, "/godms/doc", http.StatusSeeOther)
		return
	}

	var subfolders []models.DMSFolder
	server.DB.Where("parent_id = ? AND trashed_at IS NULL", folderID).Find(&subfolders)

	var files []models.DMSFile
	server.DB.Where("folder_id = ? AND trashed_at IS NULL", folderID).Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	server.RenderHTML(w, r, http.StatusOK, "edoc/index", map[string]interface{}{
		"title":         currentFolder.Name,
		"currentFolder": currentFolder,
		"folders":       subfolders,
		"files":         files,
		"breadcrumbs":   server.getEDocBreadcrumb(folderID),
		"totalStorage":  server.formatSize(totalSize),
		"isTrash":       false,
	})
}

// RenameFolder mengubah nama folder
func (server *Server) RenameFolder(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	newName := r.FormValue("name")

	if id != "" && newName != "" {
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Update("name", newName)
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// RenameFile mengubah nama file
func (server *Server) RenameFile(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	newName := r.FormValue("name")

	if id != "" && newName != "" {
		server.DB.Model(&models.DMSFile{}).Where("id = ?", id).Update("name", newName)
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// MoveFolderToTrash memindahkan folder ke tempat sampah
func (server *Server) MoveFolderToTrash(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		now := time.Now()
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Updates(map[string]interface{}{
			"trashed_at": &now,
		})
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// MoveFileToTrash memindahkan file ke tempat sampah
func (server *Server) MoveFileToTrash(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		now := time.Now()
		server.DB.Model(&models.DMSFile{}).Where("id = ?", id).Updates(map[string]interface{}{
			"trashed_at": &now,
		})
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// ViewTrash menampilkan semua item yang ada di tempat sampah
func (server *Server) ViewTrash(w http.ResponseWriter, r *http.Request) {
	var folders []models.DMSFolder
	server.DB.Where("trashed_at IS NOT NULL").Find(&folders)

	var files []models.DMSFile
	server.DB.Where("trashed_at IS NOT NULL").Find(&files)

	server.RenderHTML(w, r, http.StatusOK, "edoc/trashbin", map[string]interface{}{
		"title":   "Tempat Sampah",
		"folders": folders,
		"files":   files,
		"isTrash": true,
	})
}

// RestoreFolder mengembalikan folder dari tempat sampah
func (server *Server) RestoreFolder(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Update("trashed_at", nil)
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// RestoreFile mengembalikan file dari tempat sampah
func (server *Server) RestoreFile(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		server.DB.Model(&models.DMSFile{}).Where("id = ?", id).Update("trashed_at", nil)
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// DeleteFolderPermanently menghapus folder secara permanen dari database
func (server *Server) DeleteFolderPermanently(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		server.deleteFolderRecursive(id)
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// deleteFolderRecursive adalah helper untuk menghapus folder, subfolder, dan file secara rekursif
func (server *Server) deleteFolderRecursive(folderID string) {
	// 1. Hapus semua file di dalam folder ini
	var files []models.DMSFile
	server.DB.Unscoped().Where("folder_id = ?", folderID).Find(&files)
	for _, file := range files {
		// Hapus fisik
		if file.FilePath != "" {
			physicalPath := filepath.Join("public", "uploads", "edoc", filepath.Base(file.FilePath))
			os.Remove(physicalPath)
		}
		// Hapus DB
		server.DB.Unscoped().Delete(&file)
	}

	// 2. Cari semua subfolder
	var subfolders []models.DMSFolder
	server.DB.Unscoped().Where("parent_id = ?", folderID).Find(&subfolders)
	for _, sub := range subfolders {
		// Rekursif ke subfolder
		server.deleteFolderRecursive(sub.ID)
	}

	// 3. Akhirnya hapus folder itu sendiri
	server.DB.Unscoped().Where("id = ?", folderID).Delete(&models.DMSFolder{})
}

// DeleteFilePermanently menghapus file secara permanen dari database dan penyimpanan fisik
func (server *Server) DeleteFilePermanently(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		var file models.DMSFile
		if err := server.DB.Unscoped().Where("id = ?", id).First(&file).Error; err == nil {
			// Hapus file fisik jika ada
			if file.FilePath != "" {
				// Path di model adalah format URL: /public/uploads/edoc/xxx.ext
				// Kita perlu ubah ke system path: public\uploads\edoc\xxx.ext
				physicalPath := filepath.Join("public", "uploads", "edoc", filepath.Base(file.FilePath))
				os.Remove(physicalPath)
			}
			// Hapus dari DB
			server.DB.Unscoped().Delete(&file)
		}
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// UploadFile menangani unggahan satu atau beberapa file ke DMS
func (server *Server) UploadFile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(100 << 20) // 100MB limit
	if err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["file"]
	parentID := r.FormValue("folder_id")
	uploadDir := filepath.Join("public", "uploads", "edoc")

	// Pastikan direktori upload ada
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		// Buat nama file unik untuk penyimpanan fisik
		fileID := uuid.New().String()
		ext := filepath.Ext(fileHeader.Filename)
		physicalName := fileID + ext
		dstPath := filepath.Join(uploadDir, physicalName)

		dst, err := os.Create(dstPath)
		if err != nil {
			continue
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			continue
		}

		var folderID *string
		if parentID != "" {
			folderID = &parentID
		}

		// Simpan metadata ke DB
		newFile := models.DMSFile{
			ID:         fileID,
			FolderID:   folderID,
			Name:       fileHeader.Filename,
			Size:       fileHeader.Size,
			Extension:  strings.TrimPrefix(ext, "."),
			FilePath:   "/public/uploads/edoc/" + physicalName,
			UploadedBy: "System", // TODO: Get from session
			Category:   "General",
		}
		if err := server.DB.Create(&newFile).Error; err != nil {
			fmt.Printf("Error creating file in DB: %v\n", err)
		}
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// UploadFolder menangani unggahan folder (recursive)
func (server *Server) UploadFolder(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(500 << 20) // 500MB limit for folders
	if err != nil {
		http.Error(w, "Upload too large", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["files"]
	rootParentID := r.FormValue("folder_id")
	uploadDir := filepath.Join("public", "uploads", "edoc")

	// Map untuk melacak folder yang sudah dibuat/ditemukan dalam sesi upload ini
	// Key: path/to/folder, Value: ID Folder di DB
	folderPathCache := make(map[string]string)

	for _, fileHeader := range files {
		// relativePath biasanya dikirim oleh browser dalam fileHeader.Filename jika menggunakan webkitdirectory
		// Contoh: "MyFolder/SubFolder/file.txt"
		fullPath := fileHeader.Filename
		pathParts := strings.Split(filepath.ToSlash(fullPath), "/")

		currentParentID := rootParentID
		if len(pathParts) > 1 {
			// Proses pembuatan struktur folder
			var currentPathBuilder []string
			for i := 0; i < len(pathParts)-1; i++ {
				folderName := pathParts[i]
				currentPathBuilder = append(currentPathBuilder, folderName)
				compositePath := strings.Join(currentPathBuilder, "/")

				if id, exists := folderPathCache[compositePath]; exists {
					currentParentID = id
				} else {
					// Cari folder di DB atau buat baru
					var existingFolder models.DMSFolder
					query := server.DB.Where("name = ?", folderName)
					if currentParentID == "" {
						query = query.Where("parent_id IS NULL")
					} else {
						query = query.Where("parent_id = ?", currentParentID)
					}

					if err := query.First(&existingFolder).Error; err == nil {
						folderPathCache[compositePath] = existingFolder.ID
						currentParentID = existingFolder.ID
					} else {
						// Buat folder baru
						newFolderID := uuid.New().String()
						newFolder := models.DMSFolder{
							ID:    newFolderID,
							Name:  folderName,
							Color: "#fbbf24",
						}
						if currentParentID != "" {
							newFolder.ParentID = &currentParentID
						}
						server.DB.Create(&newFolder)
						folderPathCache[compositePath] = newFolderID
						currentParentID = newFolderID
					}
				}
			}
		}

		// Upload filenya ke folder terakhir (currentParentID)
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		fileID := uuid.New().String()
		fileName := pathParts[len(pathParts)-1]
		ext := filepath.Ext(fileName)
		physicalName := fileID + ext
		dstPath := filepath.Join(uploadDir, physicalName)

		// Simpan fisik
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, 0755)
		}

		dst, err := os.Create(dstPath)
		if err != nil {
			continue
		}
		defer dst.Close()
		io.Copy(dst, file)

		var folderID *string
		if currentParentID != "" {
			folderID = &currentParentID
		}

		// Simpan DB
		dbFile := models.DMSFile{
			ID:         fileID,
			FolderID:   folderID,
			Name:       fileName,
			Size:       fileHeader.Size,
			Extension:  strings.TrimPrefix(ext, "."),
			FilePath:   "/public/uploads/edoc/" + physicalName,
			UploadedBy: "System",
			Category:   "Uploaded",
		}
		if err := server.DB.Create(&dbFile).Error; err != nil {
			fmt.Printf("Error creating folder file in DB: %v\n", err)
		}
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// Helper untuk membangun navigasi breadcrumb
func (server *Server) getEDocBreadcrumb(folderID string) []models.DMSFolder {
	var breadcrumbs []models.DMSFolder
	currentID := folderID

	for currentID != "" {
		var folder models.DMSFolder
		if err := server.DB.Where("id = ?", currentID).First(&folder).Error; err != nil {
			break
		}
		breadcrumbs = append([]models.DMSFolder{folder}, breadcrumbs...)
		if folder.ParentID != nil {
			currentID = *folder.ParentID
		} else {
			currentID = ""
		}
	}
	return breadcrumbs
}

// Helper untuk format ukuran file
func (server *Server) formatSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(size)/float64(div), "KMGTPE"[exp])
}

// BulkMove memindahkan beberapa item sekaligus ke folder baru
func (server *Server) BulkMove(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	targetFolderID := r.FormValue("target_id")
	folderIDs := r.Form["folder_ids[]"]
	fileIDs := r.Form["file_ids[]"]

	// Pindahkan folder
	for _, id := range folderIDs {
		// Pastikan tidak memindahkan folder ke dirinya sendiri atau subfoldernya
		if id == targetFolderID {
			continue
		}

		var parentID *string
		if targetFolderID != "" {
			parentID = &targetFolderID
		}
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Update("parent_id", parentID)
	}

	// Pindahkan file
	for _, id := range fileIDs {
		var fID *string
		if targetFolderID != "" {
			fID = &targetFolderID
		}
		server.DB.Model(&models.DMSFile{}).Where("id = ?", id).Update("folder_id", fID)
	}

	w.WriteHeader(http.StatusOK)
}

// BulkTrash memindahkan beberapa item ke tempat sampah sekaligus
func (server *Server) BulkTrash(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	folderIDs := r.Form["folder_ids[]"]
	fileIDs := r.Form["file_ids[]"]
	now := time.Now()

	if len(folderIDs) > 0 {
		server.DB.Model(&models.DMSFolder{}).Where("id IN ?", folderIDs).Update("trashed_at", &now)
	}

	if len(fileIDs) > 0 {
		server.DB.Model(&models.DMSFile{}).Where("id IN ?", fileIDs).Update("trashed_at", &now)
	}

	w.WriteHeader(http.StatusOK)
}

// BulkRestore mengembalikan banyak item dari tempat sampah sekaligus
func (server *Server) BulkRestore(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	folderIDs := r.Form["folder_ids[]"]
	fileIDs := r.Form["file_ids[]"]

	if len(folderIDs) > 0 {
		server.DB.Model(&models.DMSFolder{}).Where("id IN ?", folderIDs).Update("trashed_at", nil)
	}

	if len(fileIDs) > 0 {
		server.DB.Model(&models.DMSFile{}).Where("id IN ?", fileIDs).Update("trashed_at", nil)
	}

	w.WriteHeader(http.StatusOK)
}

// BulkDeletePermanent menghapus banyak item secara permanen sekaligus
func (server *Server) BulkDeletePermanent(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	folderIDs := r.Form["folder_ids[]"]
	fileIDs := r.Form["file_ids[]"]

	// Hapus folder (rekursif)
	for _, id := range folderIDs {
		server.deleteFolderRecursive(id)
	}

	// Hapus file
	for _, id := range fileIDs {
		var file models.DMSFile
		if err := server.DB.Unscoped().Where("id = ?", id).First(&file).Error; err == nil {
			if file.FilePath != "" {
				physicalPath := filepath.Join("public", "uploads", "edoc", filepath.Base(file.FilePath))
				os.Remove(physicalPath)
			}
			server.DB.Unscoped().Delete(&file)
		}
	}

	w.WriteHeader(http.StatusOK)
}

// GetFolderList mengembalikan semua folder aktif dalam format JSON (untuk modal pindahkan)
func (server *Server) GetFolderList(w http.ResponseWriter, r *http.Request) {
	var folders []models.DMSFolder
	server.DB.Where("trashed_at IS NULL").Order("name ASC").Find(&folders)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
}
