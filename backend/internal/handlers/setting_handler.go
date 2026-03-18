package handlers

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/AbsoluteZero24/gokso/internal/models"
)

// Role Permission Management

// ListSettingRole menampilkan halaman pengaturan izin akses (permission) untuk setiap peran
func (server *Server) ListSettingRole(w http.ResponseWriter, r *http.Request) {
	roles := []string{"Super Admin", "Koordinator", "Top Management"}

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

// ApiListRoles returns JSON list of roles
func (server *Server) ApiListRoles(w http.ResponseWriter, r *http.Request) {
	var roles []models.Role
	// Use a subquery to count users for each role efficiently
	server.DB.Select("roles.*, (SELECT COUNT(*) FROM users WHERE LOWER(users.role) = LOWER(roles.name) AND users.deleted_at IS NULL) as user_count").Find(&roles)

	if roles == nil {
		roles = []models.Role{}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"roles": roles,
	})
}

// ApiStoreRole handles JSON request to create a role
func (server *Server) ApiStoreRole(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	name := r.FormValue("name")
	description := r.FormValue("description")
	permissions := r.FormValue("permissions")
	dmsFilterScope := r.FormValue("dms_filter_scope")
	allowedSections := r.FormValue("allowed_sections")

	role := models.Role{
		Name:            name,
		Description:     description,
		Permissions:     permissions,
		DMSFilterScope:  dmsFilterScope,
		AllowedSections: allowedSections,
	}

	if err := server.DB.Create(&role).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, role)
}

// ApiUpdateRole handles JSON request to update a role
func (server *Server) ApiUpdateRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	name := r.FormValue("name")
	description := r.FormValue("description")
	permissions := r.FormValue("permissions")

	var role models.Role
	if err := server.DB.First(&role, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Role not found"})
		return
	}

	oldName := role.Name

	// Prevent renaming Super Admin
	if oldName == "Super Admin" && name != "Super Admin" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Role Super Admin tidak boleh diubah namanya"})
		return
	}

	role.Name = name
	role.Description = description
	role.Permissions = permissions
	role.DMSFilterScope = r.FormValue("dms_filter_scope")
	role.AllowedSections = r.FormValue("allowed_sections")

	if err := server.DB.Save(&role).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Sync to users if role name changed
	if oldName != name && oldName != "" {
		server.DB.Model(&models.User{}).Where("role = ?", oldName).Update("role", name)
	}

	server.Renderer.JSON(w, http.StatusOK, role)
}

// ApiDeleteRole handles JSON request to delete a role
func (server *Server) ApiDeleteRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var role models.Role
	if err := server.DB.First(&role, id).Error; err == nil {
		if role.Name == "Super Admin" {
			server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Role Super Admin tidak boleh dihapus"})
			return
		}
		roleName := role.Name
		server.DB.Delete(&role)
		// Clear from users
		server.DB.Model(&models.User{}).Where("role = ?", roleName).Update("role", "")
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Role deleted successfully"})
}
