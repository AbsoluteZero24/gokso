package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

// ApiListFMSI0101 returns JSON for server inventory
func (server *Server) ApiListFMSI0101(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "2026"
	}

	var servers []models.FMSI0101
	if err := server.DB.Where("period = ?", period).Order("id ASC").Find(&servers).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"servers": servers,
	})
}

// ApiStoreFMSI0101 handles creation of new server inventory record
func (server *Server) ApiStoreFMSI0101(w http.ResponseWriter, r *http.Request) {
	var input models.FMSI0101
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if input.Name == "" || input.Period == "" {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Name and Period are required"})
		return
	}

	if err := server.DB.Create(&input).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusCreated, input)
}

// ApiImportFMSI0101 handles excel import for FMSI0101
func (server *Server) ApiImportFMSI0101(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "2026"
	}

	err := r.ParseMultipartForm(10 << 20) // 10MB limit
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to parse form"})
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "File is required"})
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to open excel file"})
		return
	}
	defer f.Close()

	// Assume data is in the first sheet
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read rows"})
		return
	}

	var importedServers []models.FMSI0101
	// Start from second row (skip header)
	for i, row := range rows {
		if i == 0 || len(row) < 3 {
			continue
		}

		// Adjust mapping based on column order
		// Assuming: 0: No, 1: Nama, 2: IP, 3: OS, 4: CPU, 5: RAM, 6: Storage, 7: Fungsi
		s := models.FMSI0101{
			Period:    period,
			Name:      getRowValue(row, 1),
			IPAddress: getRowValue(row, 2),
			OS:        getRowValue(row, 3),
			CPU:       getRowValue(row, 4),
			RAM:       getRowValue(row, 5),
			Storage:   getRowValue(row, 6),
			Function:  getRowValue(row, 7),
		}
		
		if s.Name != "" {
			importedServers = append(importedServers, s)
		}
	}

	if len(importedServers) == 0 {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "No valid data found in excel"})
		return
	}

	if err := server.DB.Create(&importedServers).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("Successfully imported %d servers", len(importedServers)),
		"count":   len(importedServers),
	})
}

// ApiDeleteFMSI0101 handles deletion of server inventory record
func (server *Server) ApiDeleteFMSI0101(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := server.DB.Delete(&models.FMSI0101{}, "id = ?", id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Server deleted successfully"})
}

// ApiUpdateFMSI0101 handles updating a server inventory record
func (server *Server) ApiUpdateFMSI0101(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var updatedData models.FMSI0101
	if err := json.NewDecoder(r.Body).Decode(&updatedData); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if err := server.DB.Model(&models.FMSI0101{}).Where("id = ?", id).Updates(updatedData).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Server updated successfully"})
}

// ApiBulkDeleteFMSI0101 handles deletion of multiple server inventory records
func (server *Server) ApiBulkDeleteFMSI0101(w http.ResponseWriter, r *http.Request) {
	var input struct {
		IDs []uint `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if len(input.IDs) == 0 {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "No IDs provided"})
		return
	}

	if err := server.DB.Where("id IN ?", input.IDs).Delete(&models.FMSI0101{}).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": fmt.Sprintf("Successfully deleted %d servers", len(input.IDs))})
}

// ApiExportFMSI0101 generates a PDF and saves it to the DMS
func (server *Server) ApiExportFMSI0101(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Period       string `json:"period"`
		PreparedByID string `json:"prepared_by_id"`
		ApprovedByID string `json:"approved_by_id"`
		Date         string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		return
	}

	if input.Period == "" {
		input.Period = "2026"
	}

	var servers []models.FMSI0101
	if err := server.DB.Where("period = ?", input.Period).Order("id ASC").Find(&servers).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var preparer, approver models.User
	server.DB.First(&preparer, "id = ?", fmt.Sprintf("%v", input.PreparedByID))
	server.DB.First(&approver, "id = ?", fmt.Sprintf("%v", input.ApprovedByID))

	// Create GoSign Task
	taskID := uuid.New().String()
	
	// Data for task (frozen)
	taskData := map[string]interface{}{
		"Form":     "FMSI0101",
		"Period":   input.Period,
		"Servers":  servers,
		"preparer": preparer,
		"approver": approver,
		"date":     input.Date,
	}
	dataJSON, _ := json.Marshal(taskData)

	// Save draft PDF for preview in GoSign
	pdf := server.GenerateFMSI0101PDF(servers, input.Period, &preparer, &approver, "", "", input.Date)
	
	draftDir := "./public/temp/gosign/drafts"
	os.MkdirAll(draftDir, 0755)
	draftFilename := fmt.Sprintf("draft_fmsi0101_%s_%s.pdf", input.Period, taskID)
	draftPath := filepath.Join(draftDir, draftFilename)
	
	err := pdf.OutputFileAndClose(draftPath)
	if err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate draft: " + err.Error()})
		return
	}

	task := models.GoSignTask{
		ID:             taskID,
		FormID:         "FM.SI.0101",
		FormName:       "FM.SI.0101 Daftar Server KSO SCSI",
		FileName:       fmt.Sprintf("FM.SI.0101 Daftar Server KSO SCSI - %s.pdf", input.Period),
		FilePath:       "/" + filepath.ToSlash(draftPath),
		DataJSON:       string(dataJSON),
		CreatorID:      preparer.ID,
		CreatorName:    preparer.Name,
		Status:         "Pending",
		TargetFolderID: func() string {
			formID := server.getOrCreateDMSFolder("Sistem Informasi", "Formulir", nil)
			return server.getOrCreateDMSFolder("Sistem Informasi", input.Period, &formID)
		}(),
		Section:        "Sistem Informasi",
	}

	if err := server.DB.Create(&task).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create GoSign task: " + err.Error()})
		return
	}

	// Signers
	signers := []models.GoSignSigner{
		{
			ID:       uuid.New().String(),
			TaskID:   taskID,
			UserID:   preparer.ID,
			UserName: preparer.Name,
			Role:     "Penyusun",
			Signed:   false,
		},
		{
			ID:       uuid.New().String(),
			TaskID:   taskID,
			UserID:   approver.ID,
			UserName: approver.Name,
			Role:     "Penyetuju",
			Signed:   false,
		},
	}
	server.DB.Create(&signers)

	// Notifications
	server.AddNotification(preparer.ID, "Tanda Tangan Baru", "Anda perlu menyusun dokumen Daftar Server periode "+input.Period, "info", "/gosign")
	server.AddNotification(approver.ID, "Tanda Tangan Baru", "Permohonan tanda tangan baru untuk Daftar Server periode "+input.Period, "info", "/gosign")

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "Pengajuan tanda tangan berhasil dikirim ke GoSign",
		"task_id": taskID,
	})
}

// ApiGetFMSI0101Preview generates a preview PDF on the fly
func (server *Server) ApiGetFMSI0101Preview(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "2026"
	}

	var servers []models.FMSI0101
	if err := server.DB.Where("period = ?", period).Order("id ASC").Find(&servers).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Generate PDF without signatures for preview
	pdf := server.GenerateFMSI0101PDF(servers, period, nil, nil, "", "", "")

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "inline; filename=preview.pdf")
	pdf.Output(w)
}

// GenerateFMSI0101PDF encapsulates the logic for creating the FMSI0101 PDF
func (server *Server) GenerateFMSI0101PDF(servers []models.FMSI0101, period string, preparer *models.User, approver *models.User, sigPreparerData, sigApproverData, customDate string) *gofpdf.Fpdf {
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(15, 45, 15)
	pdf.AliasNbPages("{nb}")

	// Header Logic - Must be set BEFORE AddPage
	pdf.SetHeaderFunc(func() {
		logoDir := filepath.Join("public", "assets", "img")
		registerLogo(pdf, filepath.Join(logoDir, "logo-danantara.png"), "logo1")
		pdf.Image("logo1", 30, 10, 38, 0, false, "", 0, "")

		registerLogo(pdf, filepath.Join(logoDir, "logo-idsurvey.png"), "logo2")
		pdf.Image("logo2", 130, 10, 40, 0, false, "", 0, "")

		registerLogo(pdf, filepath.Join(logoDir, "logo-ksoscisi.png"), "logo3")
		pdf.Image("logo3", 230, 10, 45, 0, false, "", 0, "")

		pdf.SetY(30)
		pdf.SetFont("Arial", "B", 14)
		pdf.CellFormat(0, 7, "DAFTAR SERVER KSO SCSI", "", 1, "C", false, 0, "")
		
		pdf.SetFont("Arial", "", 10)
		pdf.Ln(2)
		pdf.CellFormat(0, 5, fmt.Sprintf("Periode : %s", period), "", 1, "L", false, 0, "")
		pdf.Ln(2)
	})

	// Footer Logic
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Arial", "", 9)
		
		// Left: Doc Number
		pdf.SetX(15)
		pdf.CellFormat(50, 10, "FM.SI.0101", "", 0, "L", false, 0, "")
		
		// Center: Revision
		pdf.SetX(130)
		pdf.CellFormat(40, 10, "Revisi : 05", "", 0, "C", false, 0, "")
		
		// Right: Page
		pdf.SetX(250)
		pdf.CellFormat(30, 10, fmt.Sprintf("Hal. %d dari {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	// Table Header
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(200, 220, 255)
	
	wNo := 10.0
	wName := 40.0
	wIP := 35.0
	wOS := 45.0
	wCPU := 20.0
	wRAM := 20.0
	wStorage := 30.0
	wFunc := 67.0

	// Header Row 1
	pdf.CellFormat(wNo, 12, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(wName, 12, "NAMA SERVER", "1", 0, "C", true, 0, "")
	pdf.CellFormat(wIP, 12, "IPADDRESS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(wOS, 12, "OPERATING SYSTEM", "1", 0, "C", true, 0, "")
	
	xBefore, yBefore := pdf.GetXY()
	pdf.CellFormat(wCPU+wRAM+wStorage, 6, "SISTEM", "1", 1, "C", true, 0, "")
	pdf.SetXY(xBefore, yBefore+6)
	pdf.CellFormat(wCPU, 6, "CPU", "1", 0, "C", true, 0, "")
	pdf.CellFormat(wRAM, 6, "RAM", "1", 0, "C", true, 0, "")
	pdf.CellFormat(wStorage, 6, "STORAGE", "1", 0, "C", true, 0, "")
	
	pdf.SetXY(xBefore+wCPU+wRAM+wStorage, yBefore)
	pdf.CellFormat(wFunc, 12, "FUNGSI", "1", 1, "C", true, 0, "")

	// Table Body
	pdf.SetFont("Arial", "", 9)
	for i, s := range servers {
		// Format values with units if missing
		cpu := s.CPU
		if cpu != "" && !containsLetter(cpu) {
			cpu = cpu + " Core"
		}
		ram := s.RAM
		if ram != "" && !containsLetter(ram) {
			ram = ram + " GB"
		}
		storage := s.Storage
		if storage != "" && !containsLetter(storage) {
			storage = storage + " TB"
		}

		funcLines := pdf.SplitText(s.Function, wFunc)
		h := 8.0
		lineHeight := 5.0
		estimatedHeight := float64(len(funcLines)) * lineHeight
		if estimatedHeight > h {
			h = estimatedHeight + 2 // Add small padding
		}

		// Auto paging
		if pdf.GetY()+h > 185 {
			pdf.AddPage()
		}

		xStart, yStart := pdf.GetXY()
		pdf.CellFormat(wNo, h, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(wName, h, s.Name, "1", 0, "L", false, 0, "")
		pdf.CellFormat(wIP, h, s.IPAddress, "1", 0, "L", false, 0, "")
		pdf.CellFormat(wOS, h, s.OS, "1", 0, "L", false, 0, "")
		pdf.CellFormat(wCPU, h, cpu, "1", 0, "C", false, 0, "")
		pdf.CellFormat(wRAM, h, ram, "1", 0, "C", false, 0, "")
		pdf.CellFormat(wStorage, h, storage, "1", 0, "C", false, 0, "")
		
		// Draw the last cell's border first to ensure unity
		pdf.CellFormat(wFunc, h, "", "1", 0, "L", false, 0, "")
		
		// Put the multi-line text inside without additional borders
		pdf.SetXY(xStart+wNo+wName+wIP+wOS+wCPU+wRAM+wStorage, yStart)
		pdf.MultiCell(wFunc, lineHeight, s.Function, "0", "L", false)
		
		pdf.SetXY(xStart, yStart+h)
	}

	// Signatures logic - Only if preparer/approver provided
	if preparer != nil && approver != nil && preparer.Name != "" {
		// If Y is too low, move entire signature block to next page
		// Threshold: Date(5) + Space(5) + Roles(5) + Sig(25) + Name(5) + Pos(5) = ~50mm
		// Page height: 210mm - Footer(15) = 195mm -> 195 - 55 = 140 max
		if pdf.GetY() > 135 {
			pdf.AddPage()
		}
		pdf.Ln(10)
		
		dateStr := customDate
		if dateStr == "" {
			dateStr = translateMonth(time.Now().Format("02 January 2006"))
		} else {
			// Convert to 02 January 2006 format if it's YYYY-MM-DD
			t, err := time.Parse("2006-01-02", dateStr)
			if err == nil {
				dateStr = translateMonth(t.Format("02 January 2006"))
			}
		}
		pdf.SetX(200)
		pdf.CellFormat(80, 5, fmt.Sprintf("Jakarta, %s", dateStr), "", 1, "C", false, 0, "")
		pdf.Ln(5)

		pdf.SetX(150)
		pdf.CellFormat(60, 5, "Disusun oleh,", "", 0, "C", false, 0, "")
		pdf.SetX(220)
		pdf.CellFormat(60, 5, "Disetujui oleh,", "", 1, "C", false, 0, "")

		// Signature images
		imgY := pdf.GetY() + 2
		
		// Only show signatures if explicitly provided (already signed)
		if sigPreparerData != "" {
			if err := registerBase64Image(pdf, sigPreparerData, "preparer_sig"); err == nil {
				pdf.Image("preparer_sig", 160, imgY, 40, 0, false, "", 0, "")
			}
		}

		if sigApproverData != "" {
			if err := registerBase64Image(pdf, sigApproverData, "approver_sig"); err == nil {
				pdf.Image("approver_sig", 230, imgY, 40, 0, false, "", 0, "")
			}
		}

		pdf.Ln(25)
		
		pdf.SetFont("Arial", "U", 9)
		pdf.SetX(150)
		pdf.CellFormat(60, 5, preparer.Name, "", 0, "C", false, 0, "")
		pdf.SetX(220)
		pdf.CellFormat(60, 5, approver.Name, "", 1, "C", false, 0, "")
		
		pdf.SetFont("Arial", "", 8)
		pdf.SetX(150)
		pdf.CellFormat(60, 5, preparer.Position, "", 0, "C", false, 0, "")
		pdf.SetX(220)
		pdf.CellFormat(60, 5, approver.Position, "", 1, "C", false, 0, "")
	}

	return pdf
}

func (server *Server) getOrCreateDMSFolder(section, name string, parentID *string) string {
	var folder models.DMSFolder
	query := server.DB.Where("section = ? AND name = ? AND trashed_at IS NULL", section, name)
	if parentID == nil {
		query = query.Where("parent_id IS NULL")
	} else {
		query = query.Where("parent_id = ?", *parentID)
	}

	if err := query.First(&folder).Error; err == nil {
		return folder.ID
	}

	folder = models.DMSFolder{
		ID:       uuid.New().String(),
		Name:     name,
		Section:  section,
		ParentID: parentID,
		Color:    "#6366f1",
	}
	server.DB.Create(&folder)
	return folder.ID
}

func getRowValue(row []string, index int) string {
	if index < len(row) {
		return row[index]
	}
	return ""
}

func containsLetter(s string) bool {
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			return true
		}
	}
	return false
}
