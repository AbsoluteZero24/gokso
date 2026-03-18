package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// Master Branch

// ListMasterBranch displays all branches (HTML)
func (server *Server) ListMasterBranch(w http.ResponseWriter, r *http.Request) {
	var branches []models.MasterBranch
	server.DB.Find(&branches)

	server.RenderHTML(w, r, http.StatusOK, "administration/master_data/branch", map[string]interface{}{
		"title":    "Master Cabang",
		"branches": branches,
	})
}

// ApiListMasterBranch returns JSON list of branches
func (server *Server) ApiListMasterBranch(w http.ResponseWriter, r *http.Request) {
	var branches []models.MasterBranch
	server.DB.Select("id, name").Find(&branches)
	if branches == nil {
		branches = []models.MasterBranch{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"branches": branches,
	})
}

// ApiStoreMasterBranch saves new branch via JSON API
func (server *Server) ApiStoreMasterBranch(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	branch := models.MasterBranch{
		Name: r.FormValue("name"),
	}
	if err := server.DB.Create(&branch).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Branch created", "branch": branch})
}

// ApiUpdateMasterBranch updates branch via JSON API
func (server *Server) ApiUpdateMasterBranch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var branch models.MasterBranch
	if err := server.DB.First(&branch, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Branch not found"})
		return
	}

	oldName := branch.Name
	newName := r.FormValue("name")

	err := server.DB.Transaction(func(tx *gorm.DB) error {
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

	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Branch updated", "branch": branch})
}

// ApiDeleteMasterBranch deletes branch via JSON API
func (server *Server) ApiDeleteMasterBranch(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := server.DB.Unscoped().Delete(&models.MasterBranch{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Branch deleted"})
}

// Master Department

// ApiListMasterDepartment returns JSON list of departments
func (server *Server) ApiListMasterDepartment(w http.ResponseWriter, r *http.Request) {
	var departments []models.MasterDepartment
	// Menampilkan hanya kolom yg dibutuhkan untuk performa lebih cepat (id, name, master_branch_id)
	server.DB.Select("id", "name", "master_branch_id").
		Preload("MasterBranch", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name")
		}).
		Find(&departments)

	if departments == nil {
		departments = []models.MasterDepartment{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"departments": departments,
	})
}

// ApiStoreMasterDepartment saves new department via JSON API
func (server *Server) ApiStoreMasterDepartment(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	branchID := r.FormValue("master_branch_id")
	dept := models.MasterDepartment{
		Name:           r.FormValue("name"),
		MasterBranchID: server.parseUint(branchID),
	}
	if err := server.DB.Create(&dept).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Department created", "department": dept})
}

// ApiUpdateMasterDepartment updates department via JSON API
func (server *Server) ApiUpdateMasterDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var dept models.MasterDepartment
	if err := server.DB.First(&dept, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Department not found"})
		return
	}

	oldName := dept.Name
	newName := r.FormValue("name")
	branchID := r.FormValue("master_branch_id")

	err := server.DB.Transaction(func(tx *gorm.DB) error {
		dept.Name = newName
		dept.MasterBranchID = server.parseUint(branchID)
		if err := tx.Save(&dept).Error; err != nil {
			return err
		}
		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("department = ?", oldName).Update("department", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Department updated", "department": dept})
}

// ApiDeleteMasterDepartment deletes department via JSON API
func (server *Server) ApiDeleteMasterDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := server.DB.Unscoped().Delete(&models.MasterDepartment{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Department deleted"})
}

// Master Sub-Department

// ApiListMasterSubDepartment returns JSON list of sub-departments
func (server *Server) ApiListMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	var subDepts []models.MasterSubDepartment
	server.DB.Preload("MasterDepartment").Preload("MasterDepartment.MasterBranch").Find(&subDepts)
	if subDepts == nil {
		subDepts = []models.MasterSubDepartment{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"sub_departments": subDepts,
	})
}

// ApiStoreMasterSubDepartment saves new sub-department via JSON API
func (server *Server) ApiStoreMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	deptID := r.FormValue("master_department_id")
	subDept := models.MasterSubDepartment{
		Name:               r.FormValue("name"),
		MasterDepartmentID: server.parseUint(deptID),
	}
	if err := server.DB.Create(&subDept).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Sub-Department created", "sub_department": subDept})
}

// ApiUpdateMasterSubDepartment updates sub-department via JSON API
func (server *Server) ApiUpdateMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var subDept models.MasterSubDepartment
	if err := server.DB.First(&subDept, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Sub-Department not found"})
		return
	}

	oldName := subDept.Name
	newName := r.FormValue("name")
	deptID := r.FormValue("master_department_id")

	err := server.DB.Transaction(func(tx *gorm.DB) error {
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

	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Sub-Department updated", "sub_department": subDept})
}

// ApiDeleteMasterSubDepartment deletes sub-department via JSON API
func (server *Server) ApiDeleteMasterSubDepartment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := server.DB.Unscoped().Delete(&models.MasterSubDepartment{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Sub-Department deleted"})
}

// Master Position

// ApiListMasterPosition returns JSON list of positions
func (server *Server) ApiListMasterPosition(w http.ResponseWriter, r *http.Request) {
	var positions []models.MasterPosition
	// Hanya mengambil kolom id dan name untuk performa listing yang cepat
	server.DB.Select("id", "name").Find(&positions)
	if positions == nil {
		positions = []models.MasterPosition{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"positions": positions,
	})
}

// ApiStoreMasterPosition saves new position via JSON API
func (server *Server) ApiStoreMasterPosition(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	pos := models.MasterPosition{
		Name: r.FormValue("name"),
	}
	if err := server.DB.Create(&pos).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Position created", "position": pos})
}

// ApiUpdateMasterPosition updates position via JSON API
func (server *Server) ApiUpdateMasterPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var pos models.MasterPosition
	if err := server.DB.First(&pos, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Position not found"})
		return
	}

	oldName := pos.Name
	newName := r.FormValue("name")

	err := server.DB.Transaction(func(tx *gorm.DB) error {
		pos.Name = newName
		if err := tx.Save(&pos).Error; err != nil {
			return err
		}
		if oldName != newName {
			if err := tx.Model(&models.User{}).Where("position = ?", oldName).Update("position", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Position updated", "position": pos})
}

// ApiDeleteMasterPosition deletes position via JSON API
func (server *Server) ApiDeleteMasterPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := server.DB.Unscoped().Delete(&models.MasterPosition{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Position deleted"})
}

// Master Asset Category

// ApiListMasterAssetCategory returns JSON list of asset categories
func (server *Server) ApiListMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	var categories []models.MasterAssetCategory
	server.DB.Find(&categories)
	if categories == nil {
		categories = []models.MasterAssetCategory{}
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"categories": categories,
	})
}

// ApiStoreMasterAssetCategory saves new asset category via JSON API
func (server *Server) ApiStoreMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	cat := models.MasterAssetCategory{
		Name: r.FormValue("name"),
	}
	if err := server.DB.Create(&cat).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Asset category created", "category": cat})
}

// ApiUpdateMasterAssetCategory updates asset category via JSON API
func (server *Server) ApiUpdateMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var cat models.MasterAssetCategory
	if err := server.DB.First(&cat, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Category not found"})
		return
	}

	oldName := cat.Name
	newName := r.FormValue("name")

	err := server.DB.Transaction(func(tx *gorm.DB) error {
		cat.Name = newName
		if err := tx.Save(&cat).Error; err != nil {
			return err
		}
		if oldName != newName {
			if err := tx.Model(&models.AssetKSO{}).Where("category = ?", oldName).Update("category", newName).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Category updated", "category": cat})
}

// ApiDeleteMasterAssetCategory deletes asset category via JSON API
func (server *Server) ApiDeleteMasterAssetCategory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	if err := server.DB.Unscoped().Delete(&models.MasterAssetCategory{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Category deleted"})
}

// ApiGetAssetSpecs returns RAM and Storage types
func (server *Server) ApiGetAssetSpecs(w http.ResponseWriter, r *http.Request) {
	var ramTypes []models.MasterRamType
	var storageTypes []models.MasterStorageType
	server.DB.Order("name asc").Find(&ramTypes)
	server.DB.Order("name asc").Find(&storageTypes)
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"ramTypes":     ramTypes,
		"storageTypes": storageTypes,
	})
}
