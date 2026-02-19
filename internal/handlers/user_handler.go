package handlers

import (
	"fmt"
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ListEmployees menampilkan daftar semua karyawan
func (server *Server) ListEmployees(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "administration/employee", map[string]interface{}{
		"title": "Daftar Karyawan",
		"users": users,
		"msg":   r.URL.Query().Get("msg"),
		"error": r.URL.Query().Get("error"),
	})
}

// CreateEmployeeForm menampilkan form untuk menambah karyawan baru
func (server *Server) CreateEmployeeForm(w http.ResponseWriter, r *http.Request) {
	var branches []models.MasterBranch
	var positions []models.MasterPosition

	server.DB.Preload("Departments.SubDepartments").Find(&branches)
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/employee_form", map[string]interface{}{
		"title":     "Tambah Karyawan",
		"branches":  branches,
		"positions": positions,
	})
}

// StoreEmployee menyimpan data karyawan baru ke database
func (server *Server) StoreEmployee(w http.ResponseWriter, r *http.Request) {
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
		Password:       "password123", // Default password
	}

	if err := server.DB.Create(&user).Error; err != nil {
		http.Redirect(w, r, "/administration/employee?error=Gagal menambah karyawan: "+err.Error(), http.StatusSeeOther)
		return
	}
	http.Redirect(w, r, "/administration/employee?msg=Karyawan berhasil ditambahkan", http.StatusSeeOther)
}

// EditEmployeeForm menampilkan form untuk mengubah data karyawan yang sudah ada
func (server *Server) EditEmployeeForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var user models.User
	if err := server.DB.Where("id = ?", id).First(&user).Error; err != nil {
		http.Redirect(w, r, "/administration/employee", http.StatusSeeOther)
		return
	}

	var branches []models.MasterBranch
	var positions []models.MasterPosition

	server.DB.Preload("Departments.SubDepartments").Find(&branches)
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/employee_form", map[string]interface{}{
		"title":     "Edit Karyawan",
		"user":      user,
		"branches":  branches,
		"positions": positions,
	})
}

// UpdateEmployee menangani proses pembaruan data karyawan di database
func (server *Server) UpdateEmployee(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	fmt.Printf("[UpdateEmployee] START - ID: %s\n", id)

	err := r.ParseForm()
	if err != nil {
		fmt.Printf("[UpdateEmployee] ParseForm Error: %v\n", err)
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
	}

	fmt.Printf("[UpdateEmployee] New Data: %+v\n", newData)

	// Perform update
	result := server.DB.Model(&models.User{}).Where("id = ?", id).Updates(newData)
	if result.Error != nil {
		fmt.Printf("[UpdateEmployee] DB ERROR: %v\n", result.Error)
		http.Redirect(w, r, "/administration/employee?error=Gagal simpan: "+result.Error.Error(), http.StatusSeeOther)
		return
	}

	fmt.Printf("[UpdateEmployee] SUCCESS - Rows affected: %d\n", result.RowsAffected)

	if result.RowsAffected == 0 {
		fmt.Printf("[UpdateEmployee] WARNING - No rows affected. Check if ID %s exists.\n", id)
	}

	http.Redirect(w, r, "/administration/employee?msg=Data karyawan berhasil diperbarui", http.StatusSeeOther)
}

// DeleteEmployee menghapus data karyawan dari database
func (server *Server) DeleteEmployee(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Where("id = ?", id).Delete(&models.User{})
	http.Redirect(w, r, "/administration/employee", http.StatusSeeOther)
}
