package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
)

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
