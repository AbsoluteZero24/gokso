package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
)

// ApiListEDID returns all EDID documents
func (server *Server) ApiListEDID(w http.ResponseWriter, r *http.Request) {
	var documents []models.EDIDDocument
	query := server.DB.Order("category ASC, doc_no ASC")

	category := r.URL.Query().Get("category")
	if category != "" && category != "Semua" {
		query = query.Where("category = ?", category)
	}

	search := r.URL.Query().Get("search")
	if search != "" {
		query = query.Where("name ILIKE ? OR doc_no ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&documents).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch documents"})
		return
	}

	if documents == nil {
		documents = []models.EDIDDocument{}
	}

	server.Renderer.JSON(w, http.StatusOK, documents)
}

// ApiStoreEDIDDocument creates a new EDID document
func (server *Server) ApiStoreEDIDDocument(w http.ResponseWriter, r *http.Request) {
	adminID, _, _, isLoggedIn := GetCurrentAdmin(r)
	if !isLoggedIn {
		server.Renderer.JSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	var input models.EDIDDocument
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	input.CreatedBy = adminID

	if err := server.DB.Create(&input).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create document: " + err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, input)
}

// ApiUpdateEDIDDocument updates an existing EDID document
func (server *Server) ApiUpdateEDIDDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var doc models.EDIDDocument
	if err := server.DB.First(&doc, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Document not found"})
		return
	}

	var input models.EDIDDocument
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	// Update fields
	doc.DocNo = input.DocNo
	doc.Name = input.Name
	doc.Revision = input.Revision
	doc.Date = input.Date
	doc.Category = input.Category

	if err := server.DB.Save(&doc).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update document: " + err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, doc)
}

// ApiDeleteEDIDDocument deletes an EDID document
func (server *Server) ApiDeleteEDIDDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, _ := strconv.ParseUint(idStr, 10, 32)

	if err := server.DB.Delete(&models.EDIDDocument{}, id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete document"})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Document deleted successfully"})
}
