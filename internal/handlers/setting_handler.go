package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/goaset/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// User Management
func (server *Server) ListSettingUser(w http.ResponseWriter, r *http.Request) {
	var admins []models.Admin
	server.DB.Find(&admins)

	server.RenderHTML(w, r, http.StatusOK, "setting/user", map[string]interface{}{
		"title":  "User Management",
		"admins": admins,
	})
}

func (server *Server) CreateSettingUserForm(w http.ResponseWriter, r *http.Request) {
	server.RenderHTML(w, r, http.StatusOK, "setting/user_form", map[string]interface{}{
		"title": "Tambah User Admin",
	})
}

func (server *Server) StoreSettingUser(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	password := r.FormValue("password")
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	admin := models.Admin{
		ID:       uuid.New().String(),
		Username: r.FormValue("username"),
		Password: string(hashedPassword),
		Role:     r.FormValue("role"),
	}

	server.DB.Create(&admin)
	http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
}

func (server *Server) EditSettingUserForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var admin models.Admin
	if err := server.DB.First(&admin, "id = ?", id).Error; err != nil {
		http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
		return
	}

	server.RenderHTML(w, r, http.StatusOK, "setting/user_form", map[string]interface{}{
		"title": "Edit User Admin",
		"admin": admin,
	})
}

func (server *Server) UpdateSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_ = r.ParseForm()
	var admin models.Admin
	if err := server.DB.First(&admin, "id = ?", id).Error; err != nil {
		http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
		return
	}

	admin.Username = r.FormValue("username")
	admin.Role = r.FormValue("role")

	password := r.FormValue("password")
	if password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		admin.Password = string(hashedPassword)
	}

	server.DB.Save(&admin)
	http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
}

func (server *Server) DeleteSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	server.DB.Delete(&models.Admin{}, "id = ?", id)
	http.Redirect(w, r, "/setting/user", http.StatusSeeOther)
}

// Role Permission Management
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
