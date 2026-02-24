package handlers

import (
	"archive/zip"
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

// Helper untuk mendapatkan path fisik folder berdasarkan struktur di DB
func (server *Server) getPhysicalFolderPath(folderID *string) string {
	baseDir := filepath.Join("public", "nas", "eDoc")
	if folderID == nil || *folderID == "" {
		return baseDir
	}

	var pathParts []string
	currentID := *folderID

	// Gunakan map untuk menghindari infinite loop jika ada circular reference (meskipun tidak mungkin di UI)
	visited := make(map[string]bool)

	for currentID != "" && !visited[currentID] {
		visited[currentID] = true
		var folder models.DMSFolder
		if err := server.DB.Unscoped().Where("id = ?", currentID).First(&folder).Error; err != nil {
			break
		}
		// Bersihkan nama folder dari karakter terlarang
		folderName := server.sanitizeFileName(folder.Name)
		pathParts = append([]string{folderName}, pathParts...)
		if folder.ParentID != nil {
			currentID = *folder.ParentID
		} else {
			currentID = ""
		}
	}
	return filepath.Join(baseDir, filepath.Join(pathParts...))
}

// Helper untuk membersihkan nama file dari karakter terlarang
func (server *Server) sanitizeFileName(name string) string {
	badChars := []string{"<", ">", ":", "\"", "/", "\\", "|", "?", "*"}
	sanitized := name
	for _, char := range badChars {
		sanitized = strings.ReplaceAll(sanitized, char, "_")
	}
	return strings.TrimSpace(sanitized)
}

// Helper untuk memindahkan file secara fisik dan update DB
func (server *Server) moveFilePhysically(file *models.DMSFile, newFolderID *string, newName string) error {
	oldPath := strings.TrimPrefix(file.FilePath, "/")
	newDir := server.getPhysicalFolderPath(newFolderID)
	os.MkdirAll(newDir, 0755)

	if newName == "" {
		newName = file.Name
	}
	sanitizedName := server.sanitizeFileName(newName)
	newPath := filepath.Join(newDir, sanitizedName)

	// Handle duplicate names (jika path berubah)
	if _, err := os.Stat(newPath); err == nil && oldPath != newPath {
		ext := filepath.Ext(sanitizedName)
		nameOnly := strings.TrimSuffix(sanitizedName, ext)
		newPath = filepath.Join(newDir, fmt.Sprintf("%s_%d%s", nameOnly, time.Now().Unix(), ext))
	}

	if oldPath != "" && oldPath != newPath {
		if _, err := os.Stat(oldPath); err == nil {
			os.Rename(oldPath, newPath)
		}
	}

	file.Name = newName
	file.FolderID = newFolderID
	file.FilePath = "/" + filepath.ToSlash(newPath)
	return server.DB.Save(file).Error
}

// Helper untuk sinkronisasi struktur folder secara fisik (rekursif)
func (server *Server) syncFolderPhysically(folderID string) {
	// 1. Update semua file di folder ini
	var files []models.DMSFile
	server.DB.Where("folder_id = ?", folderID).Find(&files)
	for i := range files {
		server.moveFilePhysically(&files[i], files[i].FolderID, files[i].Name)
	}

	// 2. Rekursif untuk subfolder
	var subfolders []models.DMSFolder
	server.DB.Where("parent_id = ?", folderID).Find(&subfolders)
	for _, sub := range subfolders {
		server.syncFolderPhysically(sub.ID)
	}
}

// MigrateDMS memindahkan semua file lama ke struktur folder yang baru
func (server *Server) MigrateDMS(w http.ResponseWriter, r *http.Request) {
	// 1. Proses semua file yang ada di root (folder_id IS NULL)
	var rootFiles []models.DMSFile
	server.DB.Where("folder_id IS NULL").Find(&rootFiles)
	for i := range rootFiles {
		server.moveFilePhysically(&rootFiles[i], nil, rootFiles[i].Name)
	}

	// 2. Proses semua folder root (parent_id IS NULL)
	var rootFolders []models.DMSFolder
	server.DB.Where("parent_id IS NULL").Find(&rootFolders)
	for _, folder := range rootFolders {
		server.syncFolderPhysically(folder.ID)
	}

	w.Write([]byte("Migrasi selesai. Semua file telah dipindahkan ke folder public/nas/ sesuai struktur."))
	w.WriteHeader(http.StatusOK)
}

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
		// Sinkronisasi fisik semua isi folder (karena path berubah)
		server.syncFolderPhysically(id)
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// RenameFile mengubah nama file
func (server *Server) RenameFile(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	newName := r.FormValue("name")

	if id != "" && newName != "" {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", id).First(&file).Error; err == nil {
			server.moveFilePhysically(&file, file.FolderID, newName)
		}
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
			// Path di model adalah format URL: /public/nas/xxx.ext atau /public/uploads/edoc/xxx.ext
			physicalPath := strings.TrimPrefix(file.FilePath, "/")
			if _, err := os.Stat(physicalPath); err == nil {
				os.Remove(physicalPath)
			}
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

	// 3. Akhirnya hapus folder itu sendiri (dan direktorinya jika kosong)
	var folder models.DMSFolder
	if err := server.DB.Unscoped().Where("id = ?", folderID).First(&folder).Error; err == nil {
		dirPath := server.getPhysicalFolderPath(&folderID)
		if _, err := os.Stat(dirPath); err == nil {
			os.Remove(dirPath) // Hanya akan terhapus jika kosong
		}
		server.DB.Unscoped().Delete(&folder)
	}
}

// DeleteFilePermanently menghapus file secara permanen dari database dan penyimpanan fisik
func (server *Server) DeleteFilePermanently(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		var file models.DMSFile
		if err := server.DB.Unscoped().Where("id = ?", id).First(&file).Error; err == nil {
			// Hapus file fisik jika ada
			if file.FilePath != "" {
				physicalPath := strings.TrimPrefix(file.FilePath, "/")
				if _, err := os.Stat(physicalPath); err == nil {
					os.Remove(physicalPath)
				}
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

	var folderID *string
	if parentID != "" {
		folderID = &parentID
	}

	uploadDir := server.getPhysicalFolderPath(folderID)

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

		// Gunakan nama file asli (sanitized)
		sanitizedName := server.sanitizeFileName(fileHeader.Filename)
		dstPath := filepath.Join(uploadDir, sanitizedName)

		// Cek jika file sudah ada, jika ya tambahkan suffix agar tidak tertimpa
		if _, err := os.Stat(dstPath); err == nil {
			ext := filepath.Ext(sanitizedName)
			nameOnly := strings.TrimSuffix(sanitizedName, ext)
			dstPath = filepath.Join(uploadDir, fmt.Sprintf("%s_%d%s", nameOnly, time.Now().Unix(), ext))
		}

		dst, err := os.Create(dstPath)
		if err != nil {
			continue
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			continue
		}

		// Hitung path relatif untuk disimpan di DB agar bisa diakses via /public/nas/...
		dbPath := "/" + filepath.ToSlash(dstPath)

		// Simpan metadata ke DB
		newFile := models.DMSFile{
			ID:         uuid.New().String(),
			FolderID:   folderID,
			Name:       fileHeader.Filename,
			Size:       fileHeader.Size,
			Extension:  strings.TrimPrefix(filepath.Ext(fileHeader.Filename), "."),
			FilePath:   dbPath,
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

		var folderID *string
		if currentParentID != "" {
			folderID = &currentParentID
		}

		uploadDir := server.getPhysicalFolderPath(folderID)
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, 0755)
		}

		fileName := pathParts[len(pathParts)-1]
		sanitizedName := server.sanitizeFileName(fileName)
		dstPath := filepath.Join(uploadDir, sanitizedName)

		// Cek jika file sudah ada
		if _, err := os.Stat(dstPath); err == nil {
			ext := filepath.Ext(sanitizedName)
			nameOnly := strings.TrimSuffix(sanitizedName, ext)
			dstPath = filepath.Join(uploadDir, fmt.Sprintf("%s_%d%s", nameOnly, time.Now().Unix(), ext))
		}

		dst, err := os.Create(dstPath)
		if err != nil {
			continue
		}
		defer dst.Close()
		io.Copy(dst, file)

		dbPath := "/" + filepath.ToSlash(dstPath)

		// Simpan DB
		dbFile := models.DMSFile{
			ID:         uuid.New().String(),
			FolderID:   folderID,
			Name:       fileName,
			Size:       fileHeader.Size,
			Extension:  strings.TrimPrefix(filepath.Ext(fileName), "."),
			FilePath:   dbPath,
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

// Helper untuk format ukuran file ke KB, MB, GB atau TB
func (server *Server) formatSize(size int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)
	s := float64(size)
	if size >= TB {
		return fmt.Sprintf("%.2f TB", s/TB)
	}
	if size >= GB {
		return fmt.Sprintf("%.2f GB", s/GB)
	}
	if size >= MB {
		return fmt.Sprintf("%.2f MB", s/MB)
	}
	if size >= KB {
		return fmt.Sprintf("%.2f KB", s/KB)
	}
	return fmt.Sprintf("%.2f KB", s/KB)
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

	var targetID *string
	if targetFolderID != "" {
		targetID = &targetFolderID
	}

	// Pindahkan folder
	for _, id := range folderIDs {
		if id == targetFolderID {
			continue
		}
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Update("parent_id", targetID)
		// Sinkronisasi fisik isi folder
		server.syncFolderPhysically(id)
	}

	// Pindahkan file
	for _, id := range fileIDs {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", id).First(&file).Error; err == nil {
			server.moveFilePhysically(&file, targetID, file.Name)
		}
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
				physicalPath := strings.TrimPrefix(file.FilePath, "/")
				if _, err := os.Stat(physicalPath); err == nil {
					os.Remove(physicalPath)
				}
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

// BulkDownload mendownload banyak file/folder sekaligus sebagai satu file ZIP
func (server *Server) BulkDownload(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	folderIDs := r.Form["folder_ids[]"]
	fileIDs := r.Form["file_ids[]"]

	if len(folderIDs) == 0 && len(fileIDs) == 0 {
		http.Error(w, "No items selected", http.StatusBadRequest)
		return
	}

	// NEW: If ONLY one file is selected (no folders), download it directly
	if len(folderIDs) == 0 && len(fileIDs) == 1 {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", fileIDs[0]).First(&file).Error; err == nil {
			physicalPath := strings.TrimPrefix(file.FilePath, "/")

			// Set headers for direct download
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Name))
			w.Header().Set("Content-Type", "application/octet-stream") // Or detect from extension

			http.ServeFile(w, r, physicalPath)
			return
		}
	}

	// Buat ZIP di memory atau temp file
	// Untuk demo, kita gunakan buffer memory. Jika file sangat besar, gunakan temp file.
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=gokso_download_%s.zip", time.Now().Format("20060102_150405")))

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	// Fungsi helper untuk menambah file ke zip
	addFileToZip := func(file models.DMSFile, prefix string) error {
		physicalPath := strings.TrimPrefix(file.FilePath, "/")
		f, err := os.Open(physicalPath)
		if err != nil {
			return err
		}
		defer f.Close()

		// Gunakan forward slash untuk ZIP entry names (standard zip behavior)
		zipPath := file.Name
		if prefix != "" {
			zipPath = strings.ReplaceAll(filepath.Join(prefix, file.Name), "\\", "/")
		}

		zipFile, err := zipWriter.Create(zipPath)
		if err != nil {
			return err
		}

		_, err = io.Copy(zipFile, f)
		return err
	}

	// Fungsi rekursif untuk menambah folder ke zip
	var addFolderToZip func(folderID string, prefix string) error
	addFolderToZip = func(folderID string, prefix string) error {
		var folder models.DMSFolder
		if err := server.DB.Where("id = ?", folderID).First(&folder).Error; err != nil {
			return err
		}

		newPrefix := strings.ReplaceAll(filepath.Join(prefix, folder.Name), "\\", "/")

		// 1. Tambah semua file di folder ini
		var files []models.DMSFile
		server.DB.Where("folder_id = ? AND trashed_at IS NULL", folderID).Find(&files)
		for _, file := range files {
			if err := addFileToZip(file, newPrefix); err != nil {
				fmt.Printf("Error adding file %s to zip: %v\n", file.Name, err)
			}
		}

		// 2. Tambah subfolder
		var subfolders []models.DMSFolder
		server.DB.Where("parent_id = ? AND trashed_at IS NULL", folderID).Find(&subfolders)
		for _, sub := range subfolders {
			if err := addFolderToZip(sub.ID, newPrefix); err != nil {
				fmt.Printf("Error adding subfolder %s to zip: %v\n", sub.Name, err)
			}
		}

		return nil
	}

	// Proses Item yang dipilih
	for _, id := range fileIDs {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", id).First(&file).Error; err == nil {
			addFileToZip(file, "")
		}
	}

	for _, id := range folderIDs {
		addFolderToZip(id, "")
	}
}
