package handlers

import (
	"fmt"
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// ListUsers menampilkan daftar semua user
func (server *Server) ListUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "administration/user", map[string]interface{}{
		"title": "Daftar User",
		"users": users,
		"msg":   r.URL.Query().Get("msg"),
		"error": r.URL.Query().Get("error"),
	})
}

// ApiListUsers returns JSON list of users
func (server *Server) ApiListUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	if err := server.DB.Find(&users).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if users == nil {
		users = []models.User{}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}

// ApiDeleteUser handles JSON delete request
func (server *Server) ApiDeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := server.DB.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// CreateUserForm menampilkan form untuk menambah user baru
func (server *Server) CreateUserForm(w http.ResponseWriter, r *http.Request) {
	var branches []models.MasterBranch
	var positions []models.MasterPosition

	server.DB.Preload("Departments.SubDepartments").Find(&branches)
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/user_form", map[string]interface{}{
		"title":     "Tambah User",
		"branches":  branches,
		"positions": positions,
	})
}

// StoreUser menyimpan data user baru ke database
func (server *Server) StoreUser(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	user := models.User{
		ID:             uuid.New().String(),
		NIK:            r.FormValue("nik"),
		Name:           r.FormValue("name"),
		Email:          r.FormValue("email"),
		Branch:         r.FormValue("branch"),
		Department:     r.FormValue("department"),
		SubDepartment:  r.FormValue("sub_department"),
		Position:       r.FormValue("position"),
		StatusKaryawan: r.FormValue("status_karyawan"),
		PhoneNumber:    r.FormValue("phone_number"),
		Password:       "password123", // Default password
	}

	if err := server.DB.Create(&user).Error; err != nil {
		http.Redirect(w, r, "/administration/user?error=Gagal menambah user: "+err.Error(), http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, "/administration/user?msg=User berhasil ditambahkan", http.StatusSeeOther)
}

// ApiStoreUser handles JSON request to add new user
func (server *Server) ApiStoreUser(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()

	password := r.FormValue("password")
	if password == "" {
		password = "password123" // Default password
	}
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	user := models.User{
		ID:             uuid.New().String(),
		NIK:            r.FormValue("nik"),
		Name:           r.FormValue("name"),
		Email:          r.FormValue("email"),
		Branch:         r.FormValue("branch"),
		Department:     r.FormValue("department"),
		SubDepartment:  r.FormValue("sub_department"),
		Position:       r.FormValue("position"),
		StatusKaryawan: r.FormValue("status_karyawan"),
		PhoneNumber:    r.FormValue("phone_number"),
		Password:       string(hashedPassword),
		Role:           r.FormValue("role"),
	}

	if err := server.DB.Create(&user).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "User berhasil ditambahkan", "user": user})
}

// EditUserForm menampilkan form untuk mengubah data user yang sudah ada
func (server *Server) EditUserForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var user models.User
	if err := server.DB.Where("id = ?", id).First(&user).Error; err != nil {
		http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
		return
	}

	var branches []models.MasterBranch
	var positions []models.MasterPosition

	server.DB.Preload("Departments.SubDepartments").Find(&branches)
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/user_form", map[string]interface{}{
		"title":     "Edit User",
		"user":      user,
		"branches":  branches,
		"positions": positions,
	})
}

// UpdateUser menangani proses pembaruan data user di database
func (server *Server) UpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	fmt.Printf("[UpdateUser] START - ID: %s\n", id)

	err := r.ParseForm()
	if err != nil {
		fmt.Printf("[UpdateUser] ParseForm Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Build update map
	newData := map[string]interface{}{
		"nik":             r.FormValue("nik"),
		"name":            r.FormValue("name"),
		"email":           r.FormValue("email"),
		"branch":          r.FormValue("branch"),
		"department":      r.FormValue("department"),
		"sub_department":  r.FormValue("sub_department"),
		"position":        r.FormValue("position"),
		"status_karyawan": r.FormValue("status_karyawan"),
		"phone_number":    r.FormValue("phone_number"),
	}

	fmt.Printf("[UpdateUser] New Data: %+v\n", newData)

	// Perform update
	result := server.DB.Model(&models.User{}).Where("id = ?", id).Updates(newData)
	if result.Error != nil {
		fmt.Printf("[UpdateUser] DB ERROR: %v\n", result.Error)
		http.Redirect(w, r, "/administration/user?error=Gagal simpan: "+result.Error.Error(), http.StatusSeeOther)
		return
	}

	fmt.Printf("[UpdateUser] SUCCESS - Rows affected: %d\n", result.RowsAffected)

	if result.RowsAffected == 0 {
		fmt.Printf("[UpdateUser] WARNING - No rows affected. Check if ID %s exists.\n", id)
	}

	http.Redirect(w, r, "/administration/user?msg=Data user berhasil diperbarui", http.StatusSeeOther)
}

// ApiUpdateUser handles JSON update request for a user
func (server *Server) ApiUpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()

	newData := map[string]interface{}{
		"nik":             r.FormValue("nik"),
		"name":            r.FormValue("name"),
		"email":           r.FormValue("email"),
		"branch":          r.FormValue("branch"),
		"department":      r.FormValue("department"),
		"sub_department":  r.FormValue("sub_department"),
		"position":        r.FormValue("position"),
		"status_karyawan": r.FormValue("status_karyawan"),
		"phone_number":    r.FormValue("phone_number"),
		"role":            r.FormValue("role"),
	}

	password := r.FormValue("password")
	if password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		newData["password"] = string(hashedPassword)
	}

	result := server.DB.Model(&models.User{}).Where("id = ?", id).Updates(newData)
	if result.Error != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "User tidak ditemukan"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Data user berhasil diperbarui"})
}

// DeleteUser menghapus data user dari database
func (server *Server) DeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Where("id = ?", id).Delete(&models.User{})
	http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
}
