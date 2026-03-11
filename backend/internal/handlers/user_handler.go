package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
)

// Legacy User Management (Previously Admin Accounts)
// Redirected to use User table or made redundant by UserDataHandler

func (server *Server) ListSettingUser(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Where("role != ''").Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "setting/user", map[string]interface{}{
		"title": "User Management",
		"users": users,
		"error": r.URL.Query().Get("error"),
		"msg":   r.URL.Query().Get("msg"),
	})
}

func (server *Server) ApiListSettingUser(w http.ResponseWriter, r *http.Request) {
	// Redundant, React uses ApiListUsers
	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"admins": []string{},
	})
}

func (server *Server) ApiDeleteSettingUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	// In the unified system, we don't delete from a separate admin table
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Feature deprecated, use unified User deletion", "id": id})
}

func (server *Server) ApiStoreSettingUser(w http.ResponseWriter, r *http.Request) {
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Feature deprecated"})
}

func (server *Server) ApiUpdateSettingUser(w http.ResponseWriter, r *http.Request) {
	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Feature deprecated"})
}

func (server *Server) CreateSettingUserForm(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/administration/user/create", http.StatusSeeOther)
}

func (server *Server) StoreSettingUser(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
}

func (server *Server) EditSettingUserForm(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
}

func (server *Server) UpdateSettingUser(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
}

func (server *Server) DeleteSettingUser(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/administration/user", http.StatusSeeOther)
}
