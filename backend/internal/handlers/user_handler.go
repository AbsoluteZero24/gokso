package handlers

import (
	"fmt"
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// User Management (Admin Accounts)

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

// ApiListSettingUser returns JSON list of admin users
func (server *Server) ApiListSettingUser(w http.ResponseWriter, r *http.Request) {
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

	if data == nil {
		data = []AdminWithUser{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"admins": data,
	})
}

// ApiDeleteSettingUser handles JSON delete request for admin
func (server *Server) ApiDeleteSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := server.DB.Delete(&models.Admin{}, "id = ?", id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Admin user deleted successfully"})
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
