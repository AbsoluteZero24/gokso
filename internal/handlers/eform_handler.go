package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ListEForm menampilkan katalog formulir digital
func (server *Server) ListEForm(w http.ResponseWriter, r *http.Request) {
	// Dummy data untuk katalog form
	forms := []map[string]interface{}{
		{
			"id":          "form-maintenance",
			"name":        "Laporan Pemeliharaan Bulanan",
			"description": "Formulir standar untuk pencatatan rutin kondisi aset laptop & komputer.",
			"icon":        "bi-tools",
			"color":       "#3b82f6",
			"category":    "IT Support",
		},
		{
			"id":          "form-peminjaman",
			"name":        "Permohonan Pinjam Aset",
			"description": "Digunakan untuk mengajukan peminjaman aset kantor bagi karyawan.",
			"icon":        "bi-person-badge",
			"color":       "#10b981",
			"category":    "Logistik",
		},
		{
			"id":          "form-surat-jalan",
			"name":        "Surat Jalan Barang",
			"description": "Dokumen resmi pengiriman atau perpindahan aset antar cabang.",
			"icon":        "bi-truck",
			"color":       "#f59e0b",
			"category":    "Logistik",
		},
		{
			"id":          "form-bast",
			"name":        "BA Serah Terima Aset",
			"description": "Berita acara bukti penyerahan aset kepada pengguna/karyawan.",
			"icon":        "bi-file-earmark-check",
			"color":       "#8b5cf6",
			"category":    "Asset Control",
		},
		{
			"id":          "form-bast-laptop",
			"name":        "BA Serah Terima Laptop/Komputer",
			"description": "Berita acara bukti penyerahan khusus aset IT (Laptop/Komputer).",
			"icon":        "bi-laptop",
			"color":       "#ec4899",
			"category":    "Asset Control",
		},
	}

	server.RenderHTML(w, r, http.StatusOK, "eform/index", map[string]interface{}{
		"title": "eForm Catalog",
		"forms": forms,
		"msg":   r.URL.Query().Get("msg"),
	})
}

// FillEForm menampilkan formulir untuk diisi
func (server *Server) FillEForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Tentukan template berdasarkan ID form
	templateName := "eform/fill"
	formName := ""

	var employees []models.User
	server.DB.Order("name asc").Find(&employees)

	var assets []models.AssetKSO
	query := server.DB.Order("inventory_number asc")
	if id == "form-bast-laptop" {
		query = query.Where("LOWER(category) = ? OR LOWER(category) = ?", "laptop", "komputer")
	}
	query.Find(&assets)

	switch id {
	case "form-maintenance":
		formName = "Laporan Pemeliharaan Bulanan"
	case "form-peminjaman":
		formName = "Permohonan Pinjam Aset"
	case "form-surat-jalan":
		formName = "Surat Jalan Barang"
	case "form-bast":
		formName = "BA Serah Terima Aset"
		templateName = "eform/form_bast"
	case "form-bast-laptop":
		formName = "BA Serah Terima Laptop/Komputer"
		templateName = "eform/form_bast_laptop"
	default:
		http.Redirect(w, r, "/godms/dms", http.StatusSeeOther)
		return
	}

	server.RenderHTML(w, r, http.StatusOK, templateName, map[string]interface{}{
		"title":     "Isi " + formName,
		"formID":    id,
		"formName":  formName,
		"employees": employees,
		"assets":    assets,
	})
}

// SubmitEForm menangani pengiriman data formulir
func (server *Server) SubmitEForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 1. Dapatkan atau Buat Folder "Digital Reports" di eDoc
	var folder models.DMSFolder
	folderName := "Laporan Digital"
	if err := server.DB.Where("name = ? AND parent_id IS NULL", folderName).First(&folder).Error; err != nil {
		folder = models.DMSFolder{
			ID:    uuid.New().String(),
			Name:  folderName,
			Color: "#3b82f6", // Blue
		}
		server.DB.Create(&folder)
	}

	// 2. Siapkan data file
	fileID := uuid.New().String()
	fileName := ""
	msg := "Formulir berhasil dikirim."
	uploadDir := filepath.Join("public", "uploads", "edoc")
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	physicalPath := filepath.Join(uploadDir, fileID+".pdf")

	if id == "form-bast" || id == "form-bast-laptop" {
		// Collect BAST Data
		var data BASTData

		p1ID := r.FormValue("p1_employee_id")
		p2ID := r.FormValue("p2_employee_id")
		dateStr := r.FormValue("handover_date")
		data.Notes = r.FormValue("notes")

		if dateStr != "" {
			data.HandoverDate, _ = time.Parse("2006-01-02", dateStr)
		} else {
			data.HandoverDate = time.Now()
		}

		// Fetch P1 and P2
		server.DB.Where("id = ?", p1ID).First(&data.P1)
		server.DB.Where("id = ?", p2ID).First(&data.P2)

		// Fetch Selected Assets
		assetIDs := r.Form["selected_asset_ids[]"]
		if len(assetIDs) > 0 {
			server.DB.Where("id IN ?", assetIDs).Find(&data.Items)
		}

		// Signature Data
		data.SigP1Data = r.FormValue("sig_p1_data")
		data.SigP2Data = r.FormValue("sig_p2_data")

		pdfTitle := "BERITA ACARA SERAH TERIMA"
		if id == "form-bast-laptop" {
			pdfTitle = "BERITA ACARA SERAH TERIMA\nLAPTOP/KOMPUTER"

			// Create/Find Subfolder "BAST Laptop/Komputer"
			var subFolder models.DMSFolder
			subFolderName := "BAST Laptop/Komputer"
			if err := server.DB.Where("name = ? AND parent_id = ?", subFolderName, folder.ID).First(&subFolder).Error; err != nil {
				subFolder = models.DMSFolder{
					ID:       uuid.New().String(),
					Name:     subFolderName,
					ParentID: &folder.ID,
					Color:    "#ec4899", // Pink matching the icon
				}
				server.DB.Create(&subFolder)
			}
			folder = subFolder // Re-assign folder so the file is saved here
		}

		// Generate PDF
		err := server.GenerateBASTPDF(data, pdfTitle, physicalPath)
		if err != nil {
			http.Error(w, "Failed to generate PDF: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Auto-assign assets to recipient (Requirement: Update asset holder on BAST submit)
		if len(assetIDs) > 0 && p2ID != "" {
			if err := server.DB.Model(&models.AssetKSO{}).Where("id IN ?", assetIDs).Update("user_id", p2ID).Error; err != nil {
				fmt.Printf("[EForm Handler] Warning: Failed to auto-assign assets to recipient: %v\n", err)
			}
		}

		prefix := "BAST"
		if id == "form-bast-laptop" {
			prefix = "BAST_IT"
		}
		fileName = fmt.Sprintf("%s_%s_%s.pdf", prefix, data.P2.Name, time.Now().Format("20060102_150405"))
		msg = "Berita Acara Serah Terima (BAST) berhasil dibuat dan disimpan ke eDoc."
	} else {
		fileName = fmt.Sprintf("Form_%s_%s.pdf", id, time.Now().Format("20060102_150405"))
		// 3. Simulasikan pembuatan file fisik (.pdf dummy) untuk form lain
		dummyContent := []byte("%PDF-1.4\n% Dummy generated file for " + fileName)
		os.WriteFile(physicalPath, dummyContent, 0644)
	}

	// 4. Simpan metadata ke DMSFile
	newFile := models.DMSFile{
		ID:         fileID,
		FolderID:   &folder.ID,
		Name:       fileName,
		Size:       0, // Will be updated below
		Extension:  "pdf",
		FilePath:   "/public/uploads/edoc/" + fileID + ".pdf",
		UploadedBy: "System",
		Category:   "Digital Form",
	}

	// Get actual file size
	if info, err := os.Stat(physicalPath); err == nil {
		newFile.Size = info.Size()
	}

	server.DB.Create(&newFile)

	http.Redirect(w, r, "/godms/dms?msg="+msg, http.StatusSeeOther)
}
