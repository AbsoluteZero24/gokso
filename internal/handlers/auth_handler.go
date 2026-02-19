package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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

// Login menangani proses verifikasi kredensial admin dan pembuatan session
func (server *Server) Login(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	password := r.FormValue("password")

	fmt.Printf("Login attempt: username=%s\n", username)

	var admin models.Admin
	if err := server.DB.Where("username = ?", username).First(&admin).Error; err != nil {
		fmt.Printf("Login failed: username %s not found in admins table\n", username)
		http.Redirect(w, r, "/login?error=Username atau password salah", http.StatusSeeOther)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password)); err != nil {
		http.Redirect(w, r, "/login?error=Username atau password salah", http.StatusSeeOther)
		return
	}

	// Create session
	session, _ := store.Get(r, "gokso-session")
	session.Values["admin_id"] = admin.ID
	session.Values["admin_username"] = admin.Username
	session.Values["admin_role"] = admin.Role
	session.Save(r, w)

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// Logout menghapus data session admin dan mengarahkan ke halaman login
func (server *Server) Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	session.Values["admin_id"] = nil
	session.Values["admin_username"] = nil
	session.Values["admin_role"] = nil
	session.Options.MaxAge = -1
	session.Save(r, w)

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// GetCurrentAdmin returns the current logged in admin info from session
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

	return adminIDVal.(string), usernameVal.(string), roleVal.(string), true
}

// GetAdminData returns a map with current admin info to be used in templates
// GetAdminData menyediakan data admin dan notifikasi untuk dikirim ke template/UI
func (server *Server) GetAdminData(r *http.Request) map[string]interface{} {
	adminID, username, role, isLoggedIn := GetCurrentAdmin(r)
	perms := server.GetPermissions(role)

	var avatar string
	var signature string
	var adminName string = username // Fallback to username
	if isLoggedIn {
		var admin models.Admin
		if err := server.DB.First(&admin, "id = ?", adminID).Error; err == nil {
			avatar = admin.Avatar
			signature = admin.Signature
			if admin.UserID != "" {
				var user models.User
				if err := server.DB.Select("name").Where("id = ?", admin.UserID).First(&user).Error; err == nil {
					adminName = user.Name
				}
			}
		}
	}

	var pendingCount int64
	var pendingReports []map[string]interface{}
	var approvalLink string = "/maintenance/laptop"
	if isLoggedIn && role == "super_admin" {
		// Group by location and period to avoid duplicate notifications for the same section
		server.DB.Table("(?) as grouped",
			server.DB.Model(&models.MaintenanceReport{}).
				Select("user_branch, user_department, user_sub_department, period").
				Where("is_submitted = ? AND is_approved = ?", true, false).
				Group("user_branch, user_department, user_sub_department, period"),
		).Count(&pendingCount)

		if pendingCount > 0 {
			type GroupedReport struct {
				UserBranch        string
				UserDepartment    string
				UserSubDepartment string
				Period            string
				MaxUpdate         time.Time
			}
			var groups []GroupedReport
			server.DB.Model(&models.MaintenanceReport{}).
				Select("user_branch, user_department, user_sub_department, period, MAX(updated_at) as max_update").
				Where("is_submitted = ? AND is_approved = ?", true, false).
				Group("user_branch, user_department, user_sub_department, period").
				Order("max_update desc").
				Limit(5).
				Scan(&groups)

			for _, g := range groups {
				var semester, year string
				parts := strings.Split(g.Period, "-")
				if len(parts) == 2 {
					semester = parts[0]
					year = parts[1]
				}

				link := fmt.Sprintf("/maintenance/laptop?branch=%s&department=%s&sub_department=%s&year=%s&semester=%s",
					g.UserBranch, g.UserDepartment, g.UserSubDepartment, year, semester)

				pendingReports = append(pendingReports, map[string]interface{}{
					"Branch":     g.UserBranch,
					"Department": g.UserDepartment,
					"Period":     g.Period,
					"Link":       link,
					"Time":       g.MaxUpdate.Format("02 Jan 15:04"),
				})
			}
			if len(pendingReports) > 0 {
				approvalLink = pendingReports[0]["Link"].(string)
			}
		}
	}

	return map[string]interface{}{
		"IsLoggedIn":            isLoggedIn,
		"AdminUsername":         username,
		"AdminName":             adminName,
		"AdminRole":             role,
		"AdminAvatar":           avatar,
		"AdminSignature":        signature,
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

	var admin models.Admin
	server.DB.First(&admin, "id = ?", adminID)

	server.RenderHTML(w, r, http.StatusOK, "auth/profile", map[string]interface{}{
		"title": "My Profile",
		"admin": admin,
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

	var admin models.Admin
	server.DB.First(&admin, "id = ?", adminID)

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(oldPassword)); err != nil {
		http.Redirect(w, r, "/profile?error=Password lama salah", http.StatusSeeOther)
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	admin.Password = string(hashedPassword)
	server.DB.Save(&admin)

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
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyimpan gambar", http.StatusSeeOther)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Redirect(w, r, "/profile?error=Gagal menyalin gambar", http.StatusSeeOther)
		return
	}

	// Update record
	var admin models.Admin
	server.DB.First(&admin, "id = ?", adminID)

	// Delete old avatar if exists
	if admin.Avatar != "" {
		oldPath := filepath.Join(uploadDir, admin.Avatar)
		os.Remove(oldPath)
	}

	admin.Avatar = filename
	server.DB.Save(&admin)

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
	var admin models.Admin
	server.DB.First(&admin, "id = ?", adminID)

	// Delete old signature if exists
	if admin.Signature != "" {
		oldPath := filepath.Join(uploadDir, admin.Signature)
		os.Remove(oldPath)
	}

	admin.Signature = filename
	server.DB.Save(&admin)

	http.Redirect(w, r, "/profile?msg=Tanda tangan berhasil diperbarui", http.StatusSeeOther)
}
