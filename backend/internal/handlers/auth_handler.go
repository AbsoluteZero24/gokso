package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
	"github.com/unrolled/render"
	"golang.org/x/crypto/bcrypt"
)

var store = sessions.NewCookieStore([]byte("gokso-secret-key-change-in-production"))

func init() {
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 days
		HttpOnly: true,
	}
}

// LoginForm menampilkan halaman login admin
func (server *Server) LoginForm(w http.ResponseWriter, r *http.Request) {
	// Check if already logged in
	session, _ := store.Get(r, "gokso-session")
	if session.Values["admin_id"] != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	_ = server.Renderer.HTML(w, http.StatusOK, "auth/login", map[string]interface{}{
		"Error": r.URL.Query().Get("error"),
	}, render.HTMLOptions{Layout: ""})
}

// Login menangani proses verifikasi kredensial karyawan/karyawan dan pembuatan session
func (server *Server) Login(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	password := r.FormValue("password")

	fmt.Printf("Login attempt: identity=%s\n", username)

	var user models.User
	query := "email = ? OR nik = ?"
	args := []interface{}{username, username}
	if !strings.Contains(username, "@") {
		query = "email ILIKE ? OR email ILIKE ? OR nik = ?"
		args = []interface{}{username, username + "@%", username}
	}

	if err := server.DB.Where(query, args...).Limit(1).Find(&user).Error; err != nil || user.ID == "" {
		fmt.Printf("Login failed: %s not found in User table\n", username)
		http.Redirect(w, r, "/login?error=Username atau password salah", http.StatusSeeOther)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		http.Redirect(w, r, "/login?error=Username atau password salah", http.StatusSeeOther)
		return
	}

	// Create session
	session, _ := store.Get(r, "gokso-session")
	session.Values["admin_id"] = user.ID
	session.Values["admin_username"] = user.Name
	session.Values["admin_role"] = user.Role
	session.Values["admin_department"] = user.Department
	session.Save(r, w)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// ApiLogin handles JSON login request
func (server *Server) ApiLogin(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	password := r.FormValue("password")

	var user models.User
	query := "email = ? OR nik = ?"
	args := []interface{}{username, username}
	if !strings.Contains(username, "@") {
		query = "email ILIKE ? OR email ILIKE ? OR nik = ?"
		args = []interface{}{username, username + "@%", username}
	}

	if err := server.DB.Where(query, args...).Limit(1).Find(&user).Error; err != nil || user.ID == "" {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Username atau password salah"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Username atau password salah"})
		return
	}

	session, _ := store.Get(r, "gokso-session")
	session.Values["admin_id"] = user.ID
	session.Values["admin_username"] = user.Name
	session.Values["admin_role"] = user.Role
	session.Values["admin_department"] = user.Department
	session.Save(r, w)

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Login successful",
		"username": user.Name,
		"role":     user.Role,
	})
}

// Logout menghapus data session admin dan mengarahkan ke halaman login
func (server *Server) Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	session.Values["admin_id"] = nil
	session.Values["admin_username"] = nil
	session.Values["admin_role"] = nil
	session.Options.MaxAge = -1
	session.Save(r, w)

	if r.Header.Get("Accept") == "application/json" {
		server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Logged out"})
		return
	}

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// ApiCheckAuth returns current session status
func (server *Server) ApiCheckAuth(w http.ResponseWriter, r *http.Request) {
	adminID, username, role, isLoggedIn := GetCurrentAdmin(r)
	if !isLoggedIn {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]interface{}{"isLoggedIn": false})
		return
	}

	// Get full admin details including avatar and name
	adminData := server.GetAdminData(r)
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"isLoggedIn": true,
		"admin_id":   adminID,
		"username":   username,
		"name":       adminData["AdminName"],
		"role":             role,
		"avatar":           adminData["AdminAvatar"],
		"signature":        adminData["AdminSignature"],
		"paraf":            adminData["AdminParaf"],
		"department":       adminData["AdminDepartment"],
		"dms_filter_scope": adminData["DMSFilterScope"],
		"allowed_sections": adminData["AllowedSections"],
		"permissions":      adminData["RolePermissions"],
	})
}

// GetCurrentAdmin mengambil informasi admin yang sedang login dari session
func GetCurrentAdmin(r *http.Request) (adminID string, username string, role string, isLoggedIn bool) {
	session, err := store.Get(r, "gokso-session")
	if err != nil {
		return "", "", "", false
	}

	adminIDVal := session.Values["admin_id"]
	usernameVal := session.Values["admin_username"]
	roleVal := session.Values["admin_role"]

	if adminIDVal == nil {
		return "", "", "", false
	}

	// Safe type assertions to avoid panics
	id, _ := adminIDVal.(string)
	uname, _ := usernameVal.(string)
	urol, _ := roleVal.(string)

	if id == "" {
		return "", "", "", false
	}

	return id, uname, urol, true
}

func GetCurrentAdminDept(r *http.Request) string {
	session, _ := store.Get(r, "gokso-session")
	deptVal := session.Values["admin_department"]
	if deptVal == nil {
		return ""
	}
	return deptVal.(string)
}

// GetAdminData returns a map with current admin info to be used in templates
// GetAdminData menyediakan data admin dan notifikasi untuk dikirim ke template/UI// GetAdminData retrieves comprehensive admin data for the navbar/sidebar
func (server *Server) GetAdminData(r *http.Request) map[string]interface{} {
	adminID, username, role, isLoggedIn := GetCurrentAdmin(r)

	var avatar, signature, paraf string
	var adminDepartment string
	var dmsFilterScope string = "All"
	var allowedSections string
	var rolePermissions string
	var adminName string = username // Fallback to username
	if isLoggedIn {
		var user models.User
		if err := server.DB.Where("id = ?", adminID).Limit(1).Find(&user).Error; err == nil && user.ID != "" {
			adminName = user.Name
			avatar = user.Avatar
			signature = user.Signature
			paraf = user.Paraf
			adminDepartment = user.Department
		}

		// Fetch Advanced Role Settings
		var roleObj models.Role
		if err := server.DB.Where("name = ?", role).Limit(1).Find(&roleObj).Error; err == nil && roleObj.ID != 0 {
			dmsFilterScope = roleObj.DMSFilterScope
			allowedSections = roleObj.AllowedSections
			rolePermissions = roleObj.Permissions
		}
	}

	var perms map[string]bool
	if isLoggedIn {
		perms = server.GetPermissions(role)
	}

	var pendingCount int64 = 0
	var pendingReports []map[string]interface{}
	var approvalLink string = ""

	return map[string]interface{}{
		"IsLoggedIn":            isLoggedIn,
		"AdminUsername":         username,
		"AdminName":             adminName,
		"AdminRole":             role,
		"AdminAvatar":           avatar,
		"AdminSignature":        signature,
		"AdminParaf":            paraf,
		"AdminDepartment":       adminDepartment,
		"DMSFilterScope":        dmsFilterScope,
		"AllowedSections":       allowedSections,
		"RolePermissions":       rolePermissions,
		"Permissions":           perms,
		"PendingApprovalsCount": pendingCount,
		"PendingReports":        pendingReports,
		"ApprovalLink":          approvalLink,
	}
}

// GetPermissions returns a map of resources allowed for the role
func (server *Server) GetPermissions(role string) map[string]bool {
	res := make(map[string]bool)
	if role == "" {
		return res
	}

	var perms []models.RolePermission
	server.DB.Where("role = ?", role).Find(&perms)

	for _, p := range perms {
		res[p.Resource] = p.CanAccess
	}
	return res
}

// Profile menampilkan halaman profil admin yang sedang login
func (server *Server) Profile(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)

	var user models.User
	server.DB.Where("id = ?", adminID).Limit(1).Find(&user)

	server.RenderHTML(w, r, http.StatusOK, "auth/profile", map[string]interface{}{
		"title": "My Profile",
		"admin": user,
		"error": r.URL.Query().Get("error"),
		"msg":   r.URL.Query().Get("msg"),
	})
}

// UpdatePassword menangani proses perubahan password admin
func (server *Server) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)

	oldPassword := r.FormValue("old_password")
	newPassword := r.FormValue("new_password")
	confirmPassword := r.FormValue("confirm_password")

	if newPassword != confirmPassword {
		http.Redirect(w, r, "/profile?error=Konfirmasi password baru tidak cocok", http.StatusSeeOther)
		return
	}

	var user models.User
	if err := server.DB.Where("id = ?", adminID).Limit(1).Find(&user).Error; err != nil || user.ID == "" {
		http.Redirect(w, r, "/profile?error=Akun tidak ditemukan", http.StatusSeeOther)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword)); err != nil {
		http.Redirect(w, r, "/profile?error=Password lama salah", http.StatusSeeOther)
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	server.DB.Model(&models.User{}).Where("id = ?", adminID).Update("password", string(hashedPassword))

	http.Redirect(w, r, "/profile?msg=Password berhasil diperbarui", http.StatusSeeOther)
}

// UpdateAvatar menangani proses unggah dan pembaruan foto profil admin
func (server *Server) UpdateAvatar(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)

	// Parse multipart form
	err := r.ParseMultipartForm(5 << 20) // 5MB max
	if err != nil {
		http.Redirect(w, r, "/profile?error=Gagal memproses gambar", http.StatusSeeOther)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Redirect(w, r, "/profile?error=Pilih file gambar terlebih dahulu", http.StatusSeeOther)
		return
	}
	defer file.Close()

	// Validate extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true}
	if !allowedExts[ext] {
		http.Redirect(w, r, "/profile?error=Format file tidak diizinkan (gunakan jpg/png/gif)", http.StatusSeeOther)
		return
	}

	// Create directory if not exists
	uploadDir := "./public/uploads/avatars"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// Generate filename
	ext = strings.ToLower(filepath.Ext(header.Filename))
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(uploadDir, fileName)

	// Save file to server
	dst, err := os.Create(filePath)
	if err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyimpan file di server", http.StatusSeeOther)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyalin file", http.StatusSeeOther)
		return
	}

	// Update record
	var user models.User
	if err := server.DB.Where("id = ?", adminID).Limit(1).Find(&user).Error; err == nil && user.ID != "" {
		// Delete old avatar if exists
		if user.Avatar != "" {
			oldPath := filepath.Join(uploadDir, user.Avatar)
			os.Remove(oldPath)
		}
		user.Avatar = fileName
		server.DB.Save(&user)
	}

	http.Redirect(w, r, "/profile?msg=Foto profil berhasil diperbarui", http.StatusSeeOther)
}

func (server *Server) UpdateSignature(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, _ := GetCurrentAdmin(r)

	// Parse multipart form
	err := r.ParseMultipartForm(5 << 20) // 5MB max
	if err != nil {
		http.Redirect(w, r, "/profile?error=Gagal memproses tanda tangan", http.StatusSeeOther)
		return
	}

	file, header, err := r.FormFile("signature")
	if err != nil {
		http.Redirect(w, r, "/profile?error=Pilih file gambar tanda tangan terlebih dahulu", http.StatusSeeOther)
		return
	}
	defer file.Close()

	// Validate extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{".png": true} // Only PNG allowed for signature as per request
	if !allowedExts[ext] {
		http.Redirect(w, r, "/profile?error=Format file tidak diizinkan (gunakan png)", http.StatusSeeOther)
		return
	}

	// Create directory if not exists
	uploadDir := "./public/uploads/signatures"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// Generate filename
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyimpan tanda tangan", http.StatusSeeOther)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyalin tanda tangan", http.StatusSeeOther)
		return
	}

	// Update record
	var user models.User
	if err := server.DB.Where("id = ?", adminID).Limit(1).Find(&user).Error; err == nil && user.ID != "" {
		// Delete old signature if exists
		if user.Signature != "" {
			oldPath := filepath.Join(uploadDir, user.Signature)
			os.Remove(oldPath)
		}
		user.Signature = filename
		server.DB.Save(&user)
	}

	http.Redirect(w, r, "/profile?msg=Tanda tangan berhasil diperbarui", http.StatusSeeOther)
}

// ApiUpdateSignatureParaf handles signature and initials (paraf) updates from React frontend
func (server *Server) ApiUpdateSignatureParaf(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, isLoggedIn := GetCurrentAdmin(r)
	if !isLoggedIn {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(5 << 20) // 5MB max
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to process request"})
		return
	}

	// Mode: signature or paraf
	mode := r.FormValue("mode") // "signature" or "paraf"
	if mode != "signature" && mode != "paraf" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid mode"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".png" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Only PNG files allowed"})
		return
	}

	// Create directory
	uploadDir := "./public/uploads/signatures"
	if mode == "paraf" {
		uploadDir = "./public/uploads/parafs"
	}
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		err = os.MkdirAll(uploadDir, 0755)
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create directory"})
			return
		}
	}

	// Generate filename
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save file on server"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to copy file content"})
		return
	}

	// Update DB
	var user models.User
	if err := server.DB.Where("id = ?", adminID).Limit(1).Find(&user).Error; err == nil && user.ID != "" {
		if mode == "signature" {
			if user.Signature != "" {
				os.Remove(filepath.Join(uploadDir, user.Signature))
			}
			user.Signature = filename
		} else {
			if user.Paraf != "" {
				os.Remove(filepath.Join(uploadDir, user.Paraf))
			}
			user.Paraf = filename
		}
		if err := server.DB.Save(&user).Error; err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Gagal menyimpan perubahan ke database"})
			return
		}
	} else {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Akun tidak ditemukan di database"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Updated successfully",
		"filename": filename,
		"mode":     mode,
	})
}
