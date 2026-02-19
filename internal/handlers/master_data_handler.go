package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// Master Branch
// ListMasterBranch menampilkan daftar semua cabang perusahaan
func (server *Server) ListMasterBranch(w http.ResponseWriter, r *http.Request) {
	var branches []models.MasterBranch
	server.DB.Find(&branches)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/branch", map[string]interface{}{
		"title":    "Master Cabang",
		"branches": branches,
	})
}

// StoreMasterBranch menyimpan data cabang baru ke database
func (server *Server) StoreMasterBranch(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	branch := models.MasterBranch{
		Name: r.FormValue("name"),
	}
	server.DB.Create(&branch)
	http.Redirect(w, r, "/administration/master-data/branch", http.StatusSeeOther)
}

// DeleteMasterBranch menghapus data cabang dari database
func (server *Server) DeleteMasterBranch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Unscoped().Delete(&models.MasterBranch{}, id)
	http.Redirect(w, r, "/administration/master-data/branch", http.StatusSeeOther)
}

// EditMasterBranch menampilkan form edit untuk data cabang tertentu
func (server *Server) EditMasterBranch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var branch models.MasterBranch
	if err := server.DB.First(&branch, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/branch", http.StatusSeeOther)
		return
	}

	var branches []models.MasterBranch
	server.DB.Find(&branches)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/branch", map[string]interface{}{
		"title":    "Edit Cabang",
		"branch":   branch,
		"branches": branches,
	})
}

// UpdateMasterBranch memperbarui data nama cabang dan melakukan update cascading pada data karyawan
func (server *Server) UpdateMasterBranch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var branch models.MasterBranch
	if err := server.DB.First(&branch, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/branch", http.StatusSeeOther)
		return
	}

	oldName := branch.Name
	newName := r.FormValue("name")

	server.DB.Transaction(func(tx *gorm.DB) error {
		branch.Name = newName
		if err := tx.Save(&branch).Error; err != nil {
			return err
		}

		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("branch = ?", oldName).Update("branch", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	http.Redirect(w, r, "/administration/master-data/branch", http.StatusSeeOther)
}

// Master Department
// ListMasterDepartment menampilkan daftar semua bagian (departemen) perusahaan
func (server *Server) ListMasterDepartment(w http.ResponseWriter, r *http.Request) {
	var departments []models.MasterDepartment
	server.DB.Preload("MasterBranch").Find(&departments)

	var branches []models.MasterBranch
	server.DB.Find(&branches)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/department", map[string]interface{}{
		"title":       "Master Bagian",
		"departments": departments,
		"branches":    branches,
	})
}

// StoreMasterDepartment menyimpan data bagian (departemen) baru ke database
func (server *Server) StoreMasterDepartment(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	branchID := r.FormValue("master_branch_id")
	dept := models.MasterDepartment{
		Name:           r.FormValue("name"),
		MasterBranchID: server.parseUint(branchID),
	}
	server.DB.Create(&dept)
	http.Redirect(w, r, "/administration/master-data/department", http.StatusSeeOther)
}

// DeleteMasterDepartment menghapus data bagian (departemen) dari database
func (server *Server) DeleteMasterDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Unscoped().Delete(&models.MasterDepartment{}, id)
	http.Redirect(w, r, "/administration/master-data/department", http.StatusSeeOther)
}

func (server *Server) EditMasterDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var department models.MasterDepartment
	if err := server.DB.First(&department, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/department", http.StatusSeeOther)
		return
	}

	var departments []models.MasterDepartment
	server.DB.Preload("MasterBranch").Find(&departments)

	var branches []models.MasterBranch
	server.DB.Find(&branches)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/department", map[string]interface{}{
		"title":       "Edit Bagian",
		"department":  department,
		"departments": departments,
		"branches":    branches,
	})
}

func (server *Server) UpdateMasterDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var department models.MasterDepartment
	if err := server.DB.First(&department, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/department", http.StatusSeeOther)
		return
	}

	oldName := department.Name
	newName := r.FormValue("name")
	branchID := r.FormValue("master_branch_id")

	server.DB.Transaction(func(tx *gorm.DB) error {
		department.Name = newName
		department.MasterBranchID = server.parseUint(branchID)
		if err := tx.Save(&department).Error; err != nil {
			return err
		}

		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("department = ?", oldName).Update("department", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	http.Redirect(w, r, "/administration/master-data/department", http.StatusSeeOther)
}

// Master Sub-Department
// ListMasterSubDepartment menampilkan daftar semua sub-bagian perusahaan
func (server *Server) ListMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	var subDepts []models.MasterSubDepartment
	server.DB.Preload("MasterDepartment").Find(&subDepts)

	var departments []models.MasterDepartment
	server.DB.Find(&departments)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/sub_department", map[string]interface{}{
		"title":       "Master Sub Bagian",
		"subDepts":    subDepts,
		"departments": departments,
	})
}

func (server *Server) StoreMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	deptID := r.FormValue("master_department_id")
	subDept := models.MasterSubDepartment{
		Name:               r.FormValue("name"),
		MasterDepartmentID: server.parseUint(deptID),
	}
	server.DB.Create(&subDept)
	http.Redirect(w, r, "/administration/master-data/sub-department", http.StatusSeeOther)
}

func (server *Server) DeleteMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Unscoped().Delete(&models.MasterSubDepartment{}, id)
	http.Redirect(w, r, "/administration/master-data/sub-department", http.StatusSeeOther)
}

func (server *Server) EditMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var subDept models.MasterSubDepartment
	if err := server.DB.First(&subDept, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/sub-department", http.StatusSeeOther)
		return
	}

	var subDepts []models.MasterSubDepartment
	server.DB.Preload("MasterDepartment").Find(&subDepts)

	var departments []models.MasterDepartment
	server.DB.Find(&departments)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/sub_department", map[string]interface{}{
		"title":       "Edit Sub Bagian",
		"subDept":     subDept,
		"subDepts":    subDepts,
		"departments": departments,
	})
}

func (server *Server) UpdateMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var subDept models.MasterSubDepartment
	if err := server.DB.First(&subDept, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/sub-department", http.StatusSeeOther)
		return
	}

	oldName := subDept.Name
	newName := r.FormValue("name")
	deptID := r.FormValue("master_department_id")

	server.DB.Transaction(func(tx *gorm.DB) error {
		subDept.Name = newName
		subDept.MasterDepartmentID = server.parseUint(deptID)
		if err := tx.Save(&subDept).Error; err != nil {
			return err
		}

		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("sub_department = ?", oldName).Update("sub_department", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	http.Redirect(w, r, "/administration/master-data/sub-department", http.StatusSeeOther)
}

// Master Position
// ListMasterPosition menampilkan daftar semua jabatan perusahaan
func (server *Server) ListMasterPosition(w http.ResponseWriter, r *http.Request) {
	var positions []models.MasterPosition
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/position", map[string]interface{}{
		"title":     "Master Jabatan",
		"positions": positions,
	})
}

func (server *Server) StoreMasterPosition(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	pos := models.MasterPosition{
		Name: r.FormValue("name"),
	}
	server.DB.Create(&pos)
	http.Redirect(w, r, "/administration/master-data/position", http.StatusSeeOther)
}

func (server *Server) DeleteMasterPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Unscoped().Delete(&models.MasterPosition{}, id)
	http.Redirect(w, r, "/administration/master-data/position", http.StatusSeeOther)
}

func (server *Server) EditMasterPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var position models.MasterPosition
	if err := server.DB.First(&position, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/position", http.StatusSeeOther)
		return
	}

	var positions []models.MasterPosition
	server.DB.Find(&positions)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/position", map[string]interface{}{
		"title":     "Edit Jabatan",
		"position":  position,
		"positions": positions,
	})
}

func (server *Server) UpdateMasterPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var position models.MasterPosition
	if err := server.DB.First(&position, id).Error; err != nil {
		http.Redirect(w, r, "/administration/master-data/position", http.StatusSeeOther)
		return
	}

	oldName := position.Name
	newName := r.FormValue("name")

	server.DB.Transaction(func(tx *gorm.DB) error {
		position.Name = newName
		if err := tx.Save(&position).Error; err != nil {
			return err
		}

		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("position = ?", oldName).Update("position", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	http.Redirect(w, r, "/administration/master-data/position", http.StatusSeeOther)
}

// Master Asset Category
// ListMasterAssetCategory menampilkan daftar semua kategori aset
func (server *Server) ListMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	var categories []models.MasterAssetCategory
	server.DB.Find(&categories)

	server.RenderHTML(w, r, http.StatusOK, "inventori/master_data/asset_category", map[string]interface{}{
		"title":      "Master Kategori Aset",
		"categories": categories,
	})
}

func (server *Server) StoreMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	cat := models.MasterAssetCategory{
		Name: r.FormValue("name"),
	}
	server.DB.Create(&cat)
	http.Redirect(w, r, "/inventori/master-data/asset-category", http.StatusSeeOther)
}

func (server *Server) DeleteMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Unscoped().Delete(&models.MasterAssetCategory{}, id)
	http.Redirect(w, r, "/inventori/master-data/asset-category", http.StatusSeeOther)
}

func (server *Server) EditMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var category models.MasterAssetCategory
	if err := server.DB.First(&category, id).Error; err != nil {
		http.Redirect(w, r, "/inventori/master-data/asset-category", http.StatusSeeOther)
		return
	}

	var categories []models.MasterAssetCategory
	server.DB.Find(&categories)

	server.RenderHTML(w, r, http.StatusOK, "inventori/master_data/asset_category", map[string]interface{}{
		"title":      "Edit Kategori Aset",
		"category":   category,
		"categories": categories,
	})
}

func (server *Server) UpdateMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var category models.MasterAssetCategory
	if err := server.DB.First(&category, id).Error; err != nil {
		http.Redirect(w, r, "/inventori/master-data/asset-category", http.StatusSeeOther)
		return
	}

	oldName := category.Name
	newName := r.FormValue("name")

	if oldName != newName {
		server.DB.Transaction(func(tx *gorm.DB) error {
			category.Name = newName
			if err := tx.Save(&category).Error; err != nil {
				return err
			}

			if err := tx.Model(&models.AssetKSO{}).Where("category = ?", oldName).Update("category", newName).Error; err != nil {
				return err
			}
			return nil
		})
	}

	http.Redirect(w, r, "/inventori/master-data/asset-category", http.StatusSeeOther)
}
