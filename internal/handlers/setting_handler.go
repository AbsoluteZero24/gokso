package handlers

import (
	"fmt"
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// User Management
// ListSettingUser menampilkan halaman manajemen pengguna admin
func (server *Server) ListSettingUser(w http.ResponseWriter, r *http.Request) {
	type AdminWithUser struct {
		models.Admin
		EmployeeName string
		NIK          string
	}

	var admins []models.Admin
	server.DB.Find(&admins)

	var data []AdminWithUser
	for _, admin := range admins {
		var user models.User
		if admin.UserID != "" {
			server.DB.Select("name", "nik").Where("id = ?", admin.UserID).First(&user)
		}
		data = append(data, AdminWithUser{
			Admin:        admin,
			EmployeeName: user.Name,
			NIK:          user.NIK,
		})
	}

	server.RenderHTML(w, r, http.StatusOK, "setting/user", map[string]interface{}{
		"title":  "User Management",
		"admins": data,
		"error":  r.URL.Query().Get("error"),
		"msg":    r.URL.Query().Get("msg"),
	})
}

// CreateSettingUserForm menampilkan form untuk menambah user admin baru
func (server *Server) CreateSettingUserForm(w http.ResponseWriter, r *http.Request) {
	var employees []models.User
	server.DB.Select("id", "name", "nik").Find(&employees)

	server.RenderHTML(w, r, http.StatusOK, "setting/user_form", map[string]interface{}{
		"title":     "Tambah User Admin",
		"employees": employees,
	})
}

// StoreSettingUser menyimpan data user admin baru ke database
func (server *Server) StoreSettingUser(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	username := r.FormValue("username")
	password := r.FormValue("password")
	role := r.FormValue("role")
	userID := r.FormValue("user_id")

	// Check if username already exists
	var count int64
	server.DB.Model(&models.Admin{}).Where("username = ?", username).Count(&count)
	if count > 0 {
		http.Redirect(w, r, "/setting/user?error=Username sudah digunakan", http.StatusSeeOther)
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	admin := models.Admin{
		ID:       uuid.New().String(),
		UserID:   userID,
		Username: username,
		Password: string(hashedPassword),
		Role:     role,
	}

	fmt.Printf("Creating admin: %+v\n", admin)

	if err := server.DB.Create(&admin).Error; err != nil {
		http.Redirect(w, r, "/setting/user?error=Gagal menyimpan user: "+err.Error(), http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, "/setting/user?msg=User berhasil dibuat", http.StatusSeeOther)
}

// EditSettingUserForm menampilkan form untuk mengubah data user admin yang sudah ada
func (server *Server) EditSettingUserForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var admin models.Admin
	if err := server.DB.First(&admin, "id = ?", id).Error; err != nil {
		http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
		return
	}

	var employees []models.User
	server.DB.Select("id", "name", "nik").Find(&employees)

	server.RenderHTML(w, r, http.StatusOK, "setting/user_form", map[string]interface{}{
		"title":     "Edit User Admin",
		"admin":     admin,
		"employees": employees,
	})
}

// UpdateSettingUser menangani proses pembaruan data user admin di database
func (server *Server) UpdateSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var admin models.Admin
	if err := server.DB.First(&admin, "id = ?", id).Error; err != nil {
		http.Redirect(w, r, "/setting/user?error=User tidak ditemukan", http.StatusSeeOther)
		return
	}

	username := r.FormValue("username")
	role := r.FormValue("role")
	userID := r.FormValue("user_id")

	// Check if username already exists for OTHER users
	var count int64
	server.DB.Model(&models.Admin{}).Where("username = ? AND id != ?", username, id).Count(&count)
	if count > 0 {
		http.Redirect(w, r, "/setting/user?error=Username sudah digunakan oleh akun lain", http.StatusSeeOther)
		return
	}

	admin.UserID = userID
	admin.Username = username
	admin.Role = role

	password := r.FormValue("password")
	if password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		admin.Password = string(hashedPassword)
	}

	if err := server.DB.Save(&admin).Error; err != nil {
		http.Redirect(w, r, "/setting/user?error=Gagal memperbarui user: "+err.Error(), http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, "/setting/user?msg=User berhasil diperbarui", http.StatusSeeOther)
}

// DeleteSettingUser menghapus data user admin dari database
func (server *Server) DeleteSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Delete(&models.Admin{}, "id = ?", id)
	http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
}

// Role Permission Management
// ListSettingRole menampilkan halaman pengaturan izin akses (permission) untuk setiap peran
func (server *Server) ListSettingRole(w http.ResponseWriter, r *http.Request) {
	roles := []string{"super_admin", "asset_manager", "staf_it", "support"}

	type RoleWithPerms struct {
		Role        string
		Permissions map[string]bool
	}

	var data []RoleWithPerms
	for _, role := range roles {
		data = append(data, RoleWithPerms{
			Role:        role,
			Permissions: server.GetPermissions(role),
		})
	}

	server.RenderHTML(w, r, http.StatusOK, "setting/role", map[string]interface{}{
		"title": "Role Permission Setting",
		"roles": data,
		"resources": []string{
			"dashboard",
			"inventori",
			"asset_management",
			"maintenance",
			"administration",
			"setting",
		},
	})
}

func (server *Server) UpdateSettingRole(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	role := r.FormValue("role")
	resources := []string{
		"dashboard",
		"inventori",
		"asset_management",
		"maintenance",
		"administration",
		"setting",
	}

	for _, res := range resources {
		val := r.FormValue("perm_" + res)
		canAccess := val == "on"

		server.DB.Model(&models.RolePermission{}).
			Where("role = ? AND resource = ?", role, res).
			Update("can_access", canAccess)
	}

	http.Redirect(w, r, "/setting/role", http.StatusSeeOther)
}
