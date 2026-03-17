package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
)

// ApiListNotifications returns all notifications for the logged in user
func (server *Server) ApiListNotifications(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	adminID, ok := session.Values["admin_id"].(string)

	if !ok || adminID == "" {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	err := server.DB.Where("user_id = ?", adminID).Order("created_at desc").Find(&notifications).Error
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not fetch notifications"})
		return
	}

	if notifications == nil {
		notifications = []models.Notification{}
	}

	server.Renderer.JSON(w, http.StatusOK, notifications)
}

// ApiMarkNotificationsRead marks all notifications as read for the logged in user
func (server *Server) ApiMarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	adminID, ok := session.Values["admin_id"].(string)

	if !ok || adminID == "" {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	err := server.DB.Model(&models.Notification{}).Where("user_id = ?", adminID).Update("is_read", true).Error
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not update notifications"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "All notifications marked as read"})
}

// ApiMarkSingleNotificationRead marks one notification as read
func (server *Server) ApiMarkSingleNotificationRead(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	adminID, ok := session.Values["admin_id"].(string)

	if !ok || adminID == "" {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	err := server.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", id, adminID).Update("is_read", true).Error
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not update notification"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Notification marked as read"})
}

// ApiClearNotifications deletes all notifications for the logged in user
func (server *Server) ApiClearNotifications(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "gokso-session")
	adminID, ok := session.Values["admin_id"].(string)

	if !ok || adminID == "" {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	err := server.DB.Where("user_id = ?", adminID).Delete(&models.Notification{}).Error
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not clear notifications"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Notifications cleared"})
}

// AddNotification is a helper to create notifications from backend (not an API)
func (server *Server) AddNotification(userID string, title string, message string, notifType string, link string) error {
	notif := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		Link:    link,
		IsRead:  false,
	}
	return server.DB.Create(&notif).Error
}
