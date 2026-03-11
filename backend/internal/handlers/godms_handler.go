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

func (server *Server) getPhysicalFolderPath(folderID *string, section string, isTrash bool) string {
	nasFolder := section
	if nasFolder == "" {
		nasFolder = "General"
	}

	typeDir := "edoc"
	if isTrash {
		typeDir = "trash"
	}

	baseDir := filepath.Join("public", "godms", typeDir, nasFolder)

	if folderID == nil || *folderID == "" {
		return baseDir
	}

	var pathParts []string
	currentID := *folderID
	visited := make(map[string]bool)

	for currentID != "" && !visited[currentID] {
		visited[currentID] = true
		var folder models.DMSFolder
		// Use Unscoped to find trashed folders too
		if err := server.DB.Unscoped().Where("id = ?", currentID).First(&folder).Error; err != nil {
			break
		}
		pathParts = append([]string{server.sanitizeFileName(folder.Name)}, pathParts...)

		if folder.Section != "" {
			nasFolder = folder.Section
			baseDir = filepath.Join("public", "godms", typeDir, nasFolder)
		}

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
// Helper untuk memindahkan file secara fisik dan update DB
func (server *Server) moveFilePhysically(file *models.DMSFile, newFolderID *string, newName string) error {
	oldPath := strings.TrimPrefix(file.FilePath, "/")
	isTrash := file.TrashedAt != nil
	newDir := server.getPhysicalFolderPath(newFolderID, file.Section, isTrash)
	os.MkdirAll(newDir, 0755)

	if newName == "" {
		newName = file.Name
	}
	sanitizedName := server.sanitizeFileName(newName)
	newPath := filepath.Join(newDir, sanitizedName)

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
	// 1. Update semua file di folder ini (termasuk yang di tempat sampah)
	var files []models.DMSFile
	server.DB.Unscoped().Where("folder_id = ?", folderID).Find(&files)
	for i := range files {
		server.moveFilePhysically(&files[i], files[i].FolderID, files[i].Name)
	}

	// 2. Rekursif untuk subfolder (termasuk yang di tempat sampah)
	var subfolders []models.DMSFolder
	server.DB.Unscoped().Where("parent_id = ?", folderID).Find(&subfolders)
	for _, sub := range subfolders {
		server.syncFolderPhysically(sub.ID)
	}
}

func (server *Server) MigrateDMS(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Migrasi selesai. Semua file telah dipindahkan ke folder public/godms/edoc/ atau public/godms/trash/ sesuai statusnya."))
	w.WriteHeader(http.StatusOK)
}

func (server *Server) getDMSAccessSettings(r *http.Request) (bool, map[string]bool) {
	_, _, roleName, _ := GetCurrentAdmin(r)
	allowedSet := make(map[string]bool)

	if roleName == "Super Admin" {
		return true, allowedSet
	}

	var role models.Role
	if err := server.DB.Where("name = ?", roleName).First(&role).Error; err != nil {
		return false, allowedSet
	}

	if role.DMSFilterScope == "All" {
		return true, allowedSet
	}

	allowed := strings.Split(role.AllowedSections, ",")
	for _, a := range allowed {
		a = strings.TrimSpace(a)
		if a != "" {
			allowedSet[a] = true
		}
	}

	return false, allowedSet
}

func (server *Server) isSectionAllowed(r *http.Request, section string) bool {
	isFull, allowedSet := server.getDMSAccessSettings(r)
	if isFull {
		return true
	}
	userDept := GetCurrentAdminDept(r)
	if section == userDept {
		return true
	}
	return allowedSet[section]
}

// ListEDoc displays the main DMS page (HTML)
func (server *Server) ListEDoc(w http.ResponseWriter, r *http.Request) {
	section := r.URL.Query().Get("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	var folders []models.DMSFolder
	server.DB.Where("section = ? AND parent_id IS NULL AND trashed_at IS NULL", section).Find(&folders)

	var files []models.DMSFile
	server.DB.Where("section = ? AND folder_id IS NULL AND trashed_at IS NULL", section).Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Where("section = ?", section).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	server.RenderHTML(w, r, http.StatusOK, "edoc/index", map[string]interface{}{
		"title":        "Digital Management System (DMS) - " + section,
		"section":      section,
		"folders":      folders,
		"files":        files,
		"totalStorage": server.formatSize(totalSize),
		"isTrash":      false,
	})
}

// ApiListEDoc returns JSON for DMS main page
func (server *Server) ApiListEDoc(w http.ResponseWriter, r *http.Request) {
	section := r.URL.Query().Get("section")
	isFull, allowedSet := server.getDMSAccessSettings(r)
	userDept := GetCurrentAdminDept(r)

	if section == "" {
		if isFull {
			section = "Sistem Informasi"
		} else {
			section = userDept
		}
	}

	// Security Check: If not full access, validate section
	if !isFull && section != userDept && !allowedSet[section] {
		section = userDept // Force to own department
	}

	var folders []models.DMSFolder
	server.DB.Where("section = ? AND parent_id IS NULL AND trashed_at IS NULL", section).Find(&folders)

	var files []models.DMSFile
	server.DB.Where("section = ? AND folder_id IS NULL AND trashed_at IS NULL", section).Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Where("section = ?", section).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	if folders == nil {
		folders = []models.DMSFolder{}
	}
	if files == nil {
		files = []models.DMSFile{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"section":      section,
		"folders":      folders,
		"files":        files,
		"totalStorage": server.formatSize(totalSize),
		"isTrash":      false,
	})
}

// ApiListFolderContent returns JSON for folder content
func (server *Server) ApiListFolderContent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	folderID := vars["id"]

	var currentFolder models.DMSFolder
	if err := server.DB.Where("id = ?", folderID).First(&currentFolder).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Folder not found"})
		return
	}

	var subfolders []models.DMSFolder
	server.DB.Where("parent_id = ? AND trashed_at IS NULL", folderID).Find(&subfolders)

	var files []models.DMSFile
	server.DB.Where("folder_id = ? AND trashed_at IS NULL", folderID).Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Where("section = ?", currentFolder.Section).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	if subfolders == nil {
		subfolders = []models.DMSFolder{}
	}
	if files == nil {
		files = []models.DMSFile{}
	}
	breadcrumbs := server.getEDocBreadcrumb(folderID)
	if breadcrumbs == nil {
		breadcrumbs = []models.DMSFolder{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"section":       currentFolder.Section,
		"currentFolder": currentFolder,
		"folders":       subfolders,
		"files":         files,
		"breadcrumbs":   breadcrumbs,
		"totalStorage":  server.formatSize(totalSize),
		"isTrash":       false,
	})
}

// ApiListAllFolders returns a simple list of all folders for movement UI
func (server *Server) ApiListAllFolders(w http.ResponseWriter, r *http.Request) {
	section := r.URL.Query().Get("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	var folders []models.DMSFolder
	server.DB.Where("section = ? AND trashed_at IS NULL", section).Order("name asc").Find(&folders)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
}

// StoreFolder menyimpan folder baru ke database (Legacy HTML Support)
func (server *Server) StoreFolder(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")
	section := r.FormValue("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	if name == "" {
		http.Redirect(w, r, "/godms/edoc?section="+section, http.StatusSeeOther)
		return
	}

	folder := models.DMSFolder{
		ID:      uuid.New().String(),
		Name:    name,
		Section: section,
		Color:   "#fbbf24", // Default yellow
	}

	if parentID := r.FormValue("parent_id"); parentID != "" {
		folder.ParentID = &parentID
	}

	if err := server.DB.Create(&folder).Error; err != nil {
		fmt.Printf("Error creating folder: %v\n", err)
	}

	redirect := "/godms/edoc?section=" + section
	if folder.ParentID != nil {
		redirect = "/godms/edoc/" + *folder.ParentID
	}
	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// ApiStoreFolder menyimpan folder baru ke database via API (JSON)
func (server *Server) ApiStoreFolder(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request"})
		return
	}

	name := r.FormValue("name")
	section := r.FormValue("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	if name == "" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Nama folder tidak boleh kosong"})
		return
	}

	folder := models.DMSFolder{
		ID:      uuid.New().String(),
		Name:    name,
		Section: section,
		Color:   "#fbbf24", // Default yellow
	}

	if parentID := r.FormValue("parent_id"); parentID != "" {
		folder.ParentID = &parentID
	}

	if err := server.DB.Create(&folder).Error; err != nil {
		fmt.Printf("Error creating folder: %v\n", err)
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan folder: " + err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"folder": folder,
	})
}

// ListFolderContent displays content of a folder (HTML)
func (server *Server) ListFolderContent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	folderID := vars["id"]

	var currentFolder models.DMSFolder
	if err := server.DB.Where("id = ?", folderID).First(&currentFolder).Error; err != nil {
		http.Redirect(w, r, "/godms/edoc", http.StatusSeeOther)
		return
	}

	var subfolders []models.DMSFolder
	server.DB.Where("parent_id = ? AND trashed_at IS NULL", folderID).Find(&subfolders)

	var files []models.DMSFile
	server.DB.Where("folder_id = ? AND trashed_at IS NULL", folderID).Find(&files)

	var totalSize int64
	server.DB.Model(&models.DMSFile{}).Where("section = ?", currentFolder.Section).Select("COALESCE(sum(size), 0)").Scan(&totalSize)

	server.RenderHTML(w, r, http.StatusOK, "edoc/index", map[string]interface{}{
		"title":         currentFolder.Name,
		"section":       currentFolder.Section,
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
		server.DB.Model(&models.DMSFolder{}).Where("id = ?", id).Update("trashed_at", &now)
		// Sinkronisasi fisik semua isi folder ke path trash
		server.syncFolderPhysically(id)
	}
	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// MoveFileToTrash memindahkan file ke tempat sampah
func (server *Server) MoveFileToTrash(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", id).First(&file).Error; err == nil {
			now := time.Now()
			file.TrashedAt = &now
			server.DB.Save(&file)
			// Pindahkan fisik ke path trash
			server.moveFilePhysically(&file, file.FolderID, file.Name)
		}
	}
	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// ViewTrash menampilkan semua item yang ada di tempat sampah
func (server *Server) ViewTrash(w http.ResponseWriter, r *http.Request) {
	section := r.URL.Query().Get("section")
	isFull, allowedSet := server.getDMSAccessSettings(r)
	userDept := GetCurrentAdminDept(r)

	if section == "" {
		if isFull {
			section = "Sistem Informasi"
		} else {
			section = userDept
		}
	}

	// Security Check
	if !isFull && section != userDept && !allowedSet[section] {
		section = userDept
	}

	var folders []models.DMSFolder
	// Hanya tampilkan yang dihapus (< 30 hari jika mau, tapi biarkan dulu)
	server.DB.Where("section = ? AND trashed_at IS NOT NULL", section).Find(&folders)

	var files []models.DMSFile
	server.DB.Where("section = ? AND trashed_at IS NOT NULL", section).Find(&files)

	// Check if API request
	if r.Header.Get("Accept") == "application/json" || strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"folders": folders,
			"files":   files,
			"section": section,
		})
		return
	}

	server.RenderHTML(w, r, http.StatusOK, "edoc/trashbin", map[string]interface{}{
		"title":   "Tempat Sampah - " + section,
		"section": section,
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
		// Kembalikan juga semua isi di dalamnya secara rekursif (soft)
		server.restoreFolderRecursive(id)
		// Sinkronisasi fisik semua isi folder ke path edoc
		server.syncFolderPhysically(id)
	}

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

func (server *Server) restoreFolderRecursive(folderID string) {
	server.DB.Model(&models.DMSFolder{}).Where("parent_id = ?", folderID).Update("trashed_at", nil)
	server.DB.Model(&models.DMSFile{}).Where("folder_id = ?", folderID).Update("trashed_at", nil)

	var subfolders []models.DMSFolder
	server.DB.Where("parent_id = ?", folderID).Find(&subfolders)
	for _, sub := range subfolders {
		server.restoreFolderRecursive(sub.ID)
	}
}

// RestoreFile mengembalikan file dari tempat sampah
func (server *Server) RestoreFile(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		var file models.DMSFile
		if err := server.DB.Where("id = ?", id).First(&file).Error; err == nil {
			file.TrashedAt = nil
			server.DB.Save(&file)
			// Pindahkan fisik ke path edoc
			server.moveFilePhysically(&file, file.FolderID, file.Name)
		}
	}

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// DeleteFolderPermanently menghapus folder secara permanen dari database
func (server *Server) DeleteFolderPermanently(w http.ResponseWriter, r *http.Request) {
	id := r.FormValue("id")
	if id != "" {
		server.deleteFolderRecursive(id)
	}

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
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
		dirPath := server.getPhysicalFolderPath(&folderID, folder.Section, folder.TrashedAt != nil)
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

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
	}
	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

// UploadFile menangani unggahan satu atau beberapa file ke DMS
// UploadFile menangani unggahan satu atau beberapa file ke DMS
func (server *Server) UploadFile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(100 << 20) // 100MB limit
	if err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["file"]
	parentID := r.FormValue("folder_id")
	section := r.FormValue("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	var folderID *string
	if parentID != "" {
		folderID = &parentID
		// Jika ada parent, gunakan section dari parent agar konsisten
		var parent models.DMSFolder
		if err := server.DB.Where("id = ?", parentID).First(&parent).Error; err == nil {
			section = parent.Section
		}
	}

	uploadDir := server.getPhysicalFolderPath(folderID, section, false)

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
			Section:    section,
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

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
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
	section := r.FormValue("section")
	if section == "" {
		section = "Sistem Informasi"
	}

	if rootParentID != "" {
		var parent models.DMSFolder
		if err := server.DB.Where("id = ?", rootParentID).First(&parent).Error; err == nil {
			section = parent.Section
		}
	}

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
							ID:      newFolderID,
							Name:    folderName,
							Section: section,
							Color:   "#fbbf24",
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

		// Ambil section dari folder parent atau tentukan default
		section := "Sistem Informasi"
		if folderID != nil {
			var f models.DMSFolder
			if err := server.DB.Where("id = ?", *folderID).First(&f).Error; err == nil {
				section = f.Section
			}
		}

		uploadDir := server.getPhysicalFolderPath(folderID, section, false)
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
			Section:    section,
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

	if strings.HasPrefix(r.URL.Path, "/api") {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		return
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
		server.DB.Model(&models.DMSFolder{}).Unscoped().Where("id = ?", id).Updates(map[string]interface{}{
			"parent_id":  targetID,
			"trashed_at": nil,
		})
		// Sinkronisasi fisik isi folder
		server.syncFolderPhysically(id)
	}

	// Pindahkan file
	for _, id := range fileIDs {
		var file models.DMSFile
		if err := server.DB.Unscoped().Where("id = ?", id).First(&file).Error; err == nil {
			file.FolderID = targetID
			file.TrashedAt = nil
			server.DB.Save(&file)
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
		for _, id := range folderIDs {
			server.syncFolderPhysically(id)
		}
	}

	if len(fileIDs) > 0 {
		var files []models.DMSFile
		server.DB.Where("id IN ?", fileIDs).Find(&files)
		for i := range files {
			files[i].TrashedAt = &now
			server.DB.Save(&files[i])
			server.moveFilePhysically(&files[i], files[i].FolderID, files[i].Name)
		}
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
		for _, id := range folderIDs {
			server.syncFolderPhysically(id)
		}
	}

	if len(fileIDs) > 0 {
		var files []models.DMSFile
		server.DB.Unscoped().Where("id IN ?", fileIDs).Find(&files)
		for i := range files {
			files[i].TrashedAt = nil
			server.DB.Save(&files[i])
			server.moveFilePhysically(&files[i], files[i].FolderID, files[i].Name)
		}
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
// GetFolderList mengembalikan semua folder aktif dalam format JSON (untuk modal pindahkan)
func (server *Server) GetFolderList(w http.ResponseWriter, r *http.Request) {
	section := r.URL.Query().Get("section")
	query := server.DB.Where("trashed_at IS NULL")
	if section != "" {
		query = query.Where("section = ?", section)
	}
	var folders []models.DMSFolder
	query.Order("name ASC").Find(&folders)

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

// DownloadFile handles single file download from GDMS
func (server *Server) DownloadFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	fileID := vars["id"]

	var file models.DMSFile
	if err := server.DB.Where("id = ?", fileID).First(&file).Error; err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Clean path and ensure it exists
	physicalPath := strings.TrimPrefix(file.FilePath, "/")
	if _, err := os.Stat(physicalPath); os.IsNotExist(err) {
		http.Error(w, "Physical file not found", http.StatusNotFound)
		return
	}

	// Set headers for download
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.Name))
	w.Header().Set("Content-Type", "application/octet-stream")

	http.ServeFile(w, r, physicalPath)
}
