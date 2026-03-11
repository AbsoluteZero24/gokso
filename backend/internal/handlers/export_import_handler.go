package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ApiExportUsers exports user data to Excel
func (server *Server) ApiExportUsers(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	if err := server.DB.Order("name asc").Find(&users).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Users"
	f.SetSheetName("Sheet1", sheetName)

	// Headers
	headers := []string{"NIK", "Nama", "Email", "No. Telepon", "Cabang", "Bagian", "Sub Bagian", "Jabatan", "Status"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Data
	for i, user := range users {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), user.NIK)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), user.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), user.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), user.PhoneNumber)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), user.Branch)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), user.Department)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), user.SubDepartment)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), user.Position)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), user.StatusKaryawan)
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=users_"+time.Now().Format("20060102")+".xlsx")

	if err := f.Write(w); err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
}

// ApiImportUsers handles user import from CSV/Excel
func (server *Server) ApiImportUsers(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10MB limit
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "File too large"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "File is required"})
		return
	}
	defer file.Close()

	var users []models.User
	ext := header.Filename[len(header.Filename)-4:]

	if ext == ".csv" {
		reader := csv.NewReader(file)
		records, err := reader.ReadAll()
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read CSV"})
			return
		}

		// Skipping header
		for i, record := range records {
			if i == 0 || len(record) < 4 {
				continue
			}
			userObj := models.User{
				ID:             uuid.New().String(),
				NIK:            record[0],
				Name:           record[1],
				Email:          record[2],
				PhoneNumber:    getSafe(record, 3),
				Branch:         getSafe(record, 4),
				Department:     getSafe(record, 5),
				SubDepartment:  getSafe(record, 6),
				Position:       getSafe(record, 7),
				StatusKaryawan: getSafe(record, 8),
				Password:       "password123",
			}
			users = append(users, userObj)
		}
	} else {
		f, err := excelize.OpenReader(file)
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read Excel"})
			return
		}
		defer f.Close()

		rows, err := f.GetRows(f.GetSheetList()[0])
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get rows"})
			return
		}

		for i, row := range rows {
			if i == 0 || len(row) < 4 {
				continue
			}
			userObj := models.User{
				ID:             uuid.New().String(),
				NIK:            row[0],
				Name:           row[1],
				Email:          row[2],
				PhoneNumber:    getSafe(row, 3),
				Branch:         getSafe(row, 4),
				Department:     getSafe(row, 5),
				SubDepartment:  getSafe(row, 6),
				Position:       getSafe(row, 7),
				StatusKaryawan: getSafe(row, 8),
				Password:       "password123",
			}
			users = append(users, userObj)
		}
	}

	if len(users) > 0 {
		if err := server.DB.Create(&users).Error; err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save data: " + err.Error()})
			return
		}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("Successfully imported %d users", len(users)),
	})
}

// ApiExportAssets exports asset data to Excel
func (server *Server) ApiExportAssets(w http.ResponseWriter, r *http.Request) {
	var assets []models.AssetKSO
	if err := server.DB.Preload("User").Order("inventory_number asc").Find(&assets).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Assets"
	f.SetSheetName("Sheet1", sheetName)

	headers := []string{"No Inventaris", "Nama Aset", "Kategori", "Merk", "Tipe", "SN", "Warna", "Lokasi", "Status", "Pengguna"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	for i, asset := range assets {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), asset.InventoryNumber)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), asset.AssetName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), asset.Category)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), asset.Brand)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), asset.TypeModel)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), asset.SerialNumber)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), asset.Color)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), asset.Location)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), asset.Status)
		userName := ""
		if asset.User.Name != "" {
			userName = asset.User.Name
		}
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), userName)
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=assets_"+time.Now().Format("20060102")+".xlsx")

	if err := f.Write(w); err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
}

// ApiImportAssets handles asset import from CSV/Excel
func (server *Server) ApiImportAssets(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "File too large"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": "File is required"})
		return
	}
	defer file.Close()

	var assets []models.AssetKSO
	ext := header.Filename[len(header.Filename)-4:]

	if ext == ".csv" {
		reader := csv.NewReader(file)
		records, err := reader.ReadAll()
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read CSV"})
			return
		}

		for i, record := range records {
			if i == 0 || len(record) < 3 {
				continue
			}
			asset := models.AssetKSO{
				ID:              uuid.New().String(),
				InventoryNumber: record[0],
				AssetName:       record[1],
				Category:        record[2],
				Brand:           getSafe(record, 3),
				TypeModel:       getSafe(record, 4),
				SerialNumber:    getSafe(record, 5),
				Color:           getSafe(record, 6),
				Location:        getSafe(record, 7),
				Status:          getSafe(record, 8),
				PurchaseDate:    time.Now(),
			}
			if asset.Status == "" {
				asset.Status = "Ready"
			}
			assets = append(assets, asset)
		}
	} else {
		f, err := excelize.OpenReader(file)
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to read Excel"})
			return
		}
		defer f.Close()

		rows, err := f.GetRows(f.GetSheetList()[0])
		if err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get rows"})
			return
		}

		for i, row := range rows {
			if i == 0 || len(row) < 3 {
				continue
			}
			asset := models.AssetKSO{
				ID:              uuid.New().String(),
				InventoryNumber: row[0],
				AssetName:       row[1],
				Category:        row[2],
				Brand:           getSafe(row, 3),
				TypeModel:       getSafe(row, 4),
				SerialNumber:    getSafe(row, 5),
				Color:           getSafe(row, 6),
				Location:        getSafe(row, 7),
				Status:          getSafe(row, 8),
				PurchaseDate:    time.Now(),
			}
			if asset.Status == "" {
				asset.Status = "Ready"
			}
			assets = append(assets, asset)
		}
	}

	if len(assets) > 0 {
		if err := server.DB.Create(&assets).Error; err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save data: " + err.Error()})
			return
		}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("Successfully imported %d assets", len(assets)),
	})
}

func getSafe(slice []string, index int) string {
	if index < len(slice) {
		return slice[index]
	}
	return ""
}
