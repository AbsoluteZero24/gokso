package handlers

import (
	"net/http"
)

// AuthRequired middleware checks if user is logged in
// AuthRequired adalah middleware untuk memastikan pengguna sudah login sebelum mengakses rute
func (server *Server) AuthRequired(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, _, _, isLoggedIn := GetCurrentAdmin(r)
		if !isLoggedIn {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next(w, r)
	}
}

// RoleRequired middleware checks if user has one of the required roles
// RoleRequired adalah middleware untuk membatasi akses berdasarkan peran (role) tertentu
func (server *Server) RoleRequired(roles []string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, _, userRole, isLoggedIn := GetCurrentAdmin(r)
		if !isLoggedIn {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		allowed := false
		for _, role := range roles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			http.Error(w, "Access Denied: You don't have permission to access this resource", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// PermissionRequired middleware checks if user's role has access to a specific resource
// PermissionRequired adalah middleware untuk memeriksa izin akses terhadap sumber daya (resource) tertentu
func (server *Server) PermissionRequired(resource string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, _, userRole, isLoggedIn := GetCurrentAdmin(r)
		if !isLoggedIn {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		// Super Admin always has access to everything
		if userRole == "super_admin" {
			next(w, r)
			return
		}

		perms := server.GetPermissions(userRole)
		if allowed, ok := perms[resource]; ok && allowed {
			next(w, r)
			return
		}

		http.Error(w, "Access Denied: You don't have permission to access this resource", http.StatusForbidden)
	}
}
