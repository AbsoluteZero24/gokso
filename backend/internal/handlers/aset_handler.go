package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ApiListAssetKSO returns JSON list of assets KSO
func (server *Server) ApiListAssetKSO(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	category := r.URL.Query().Get("category")
	status := r.URL.Query().Get("status")

	var assets []models.AssetKSO
	db := server.DB.Model(&models.AssetKSO{}).Preload("User")

	if year != "" && year != "Semua Tahun" && year != "All" {
		startOfYear := fmt.Sprintf("%s-01-01 00:00:00", year)
		endOfYear := fmt.Sprintf("%s-12-31 23:59:59", year)
		db = db.Where("purchase_date BETWEEN ? AND ?", startOfYear, endOfYear)
	}

	if category != "" {
		db = db.Where("category = ?", category)
	}

	if status != "" {
		db = db.Where("status = ?", status)
	}

	if err := db.Order("inventory_number asc").Find(&assets).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if assets == nil {
		assets = []models.AssetKSO{}
	}

	// Provide a list of years for filter
	currentYear := time.Now().Year()
	var years []int
	for y := 2024; y <= currentYear+1; y++ {
		years = append(years, y)
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"assets":       assets,
		"selectedYear": year,
		"years":        years,
	})
}

// ApiDeleteAssetKSO handles JSON delete request
func (server *Server) ApiDeleteAssetKSO(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if err := server.DB.Where("id = ?", id).Delete(&models.AssetKSO{}).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Asset deleted successfully"})
}

// ApiBulkDeleteAssetKSO handles JSON bulk delete request
func (server *Server) ApiBulkDeleteAssetKSO(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		server.Renderer.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	ids := r.Form["ids"]
	if len(ids) > 0 {
		if err := server.DB.Where("id IN ?", ids).Delete(&models.AssetKSO{}).Error; err != nil {
			server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Assets deleted successfully"})
}

// fetchAssetMasterData mengambil data master (kategori, RAM, penyimpanan) untuk form aset
func (server *Server) fetchAssetMasterData() (map[string]interface{}, error) {
	var categories []models.MasterAssetCategory
	var ramTypes []models.MasterRamType
	var storageTypes []models.MasterStorageType

	if err := server.DB.Order("name asc").Find(&categories).Error; err != nil {
		return nil, err
	}
	if err := server.DB.Order("name asc").Find(&ramTypes).Error; err != nil {
		return nil, err
	}
	if err := server.DB.Order("name asc").Find(&storageTypes).Error; err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"categories":   categories,
		"ramTypes":     ramTypes,
		"storageTypes": storageTypes,
	}, nil
}

// getAssetSpecFromForm mengekstrak dan memformat spesifikasi aset dari form request
func (server *Server) getAssetSpecFromForm(r *http.Request, category string) string {
	spec := r.FormValue("specification")
	if category == "Laptop" || category == "Komputer" {
		os := r.FormValue("spec_os")
		proc := r.FormValue("spec_processor")
		ramSize := r.FormValue("spec_ram_size")
		ramUnit := r.FormValue("spec_ram_unit")
		ramType := r.FormValue("spec_ram_type")
		storageSize := r.FormValue("spec_storage_size")
		storageUnit := r.FormValue("spec_storage_unit")
		storageType := r.FormValue("spec_storage_type")

		if os != "" || proc != "" || ramSize != "" || storageSize != "" {
			ramInfo := fmt.Sprintf("%s %s %s", ramSize, ramUnit, ramType)
			storageInfo := fmt.Sprintf("%s %s %s", storageSize, storageUnit, storageType)
			return fmt.Sprintf("%s, RAM %s, %s, %s", proc, ramInfo, storageInfo, os)
		}
	}
	return spec
}

// ListAssetKSO menampilkan halaman daftar aset KSO dengan dukungan filter tahun
func (server *Server) ListAssetKSO(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	if _, ok := r.URL.Query()["year"]; !ok {
		year = fmt.Sprintf("%d", time.Now().Year())
	}
	var assets []models.AssetKSO
	db := server.DB.Model(&models.AssetKSO{}).Preload("User")

	if year != "" {
		startOfYear := fmt.Sprintf("%s-01-01 00:00:00", year)
		endOfYear := fmt.Sprintf("%s-12-31 23:59:59", year)
		db = db.Where("purchase_date BETWEEN ? AND ?", startOfYear, endOfYear)
	}

	err := db.Order("inventory_number asc").Find(&assets).Error
	if err != nil {
		fmt.Printf("[ListAssetKSO] Query Error: %v\n", err)
	}

	currentYear := time.Now().Year()
	var years []int
	for y := 2024; y <= currentYear+1; y++ {
		years = append(years, y)
	}

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/asetkso", map[string]interface{}{
		"title":        "Daftar Aset KSO",
		"assets":       assets,
		"selectedYear": year,
		"years":        years,
	})
}

// CreateAssetKSOForm menampilkan halaman form untuk membuat aset KSO baru
func (server *Server) CreateAssetKSOForm(w http.ResponseWriter, r *http.Request) {
	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Aset KSO"

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/asetkso_form", masterData)
}

// StoreAssetKSO menangani proses penyimpanan data aset KSO baru ke database
func (server *Server) StoreAssetKSO(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	purchaseDate, _ := time.Parse("2006-01-02", r.FormValue("purchase_date"))
	userID := r.FormValue("user_id")
	var userIDPtr *string
	if userID != "" {
		userIDPtr = &userID
	}

	asset := models.AssetKSO{
		ID:              uuid.New().String(),
		InventoryNumber: r.FormValue("inventory_number"),
		SerialNumber:    r.FormValue("serial_number"),
		AssetName:       r.FormValue("asset_name"),
		DeviceName:      r.FormValue("device_name"),
		Category:        r.FormValue("category"),
		Brand:           r.FormValue("brand"),
		TypeModel:       r.FormValue("type_model"),
		Color:           r.FormValue("color"),
	}

	asset.Specification = server.getAssetSpecFromForm(r, asset.Category)
	asset.Location = r.FormValue("location")
	asset.UserID = userIDPtr
	asset.PurchaseDate = purchaseDate
	asset.Status = r.FormValue("status")

	if err := server.DB.Create(&asset).Error; err != nil {
		http.Error(w, "Gagal membuat aset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

func (server *Server) CreateAssetKSOBulkForm(w http.ResponseWriter, r *http.Request) {
	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Sisipan Masal Aset KSO"

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/asetkso_bulk_form", masterData)
}

func (server *Server) StoreAssetKSOBulk(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	qtyStr := r.FormValue("quantity")
	quantity, _ := strconv.Atoi(qtyStr)
	if quantity < 1 {
		quantity = 1
	}

	invStart := r.FormValue("inventory_number_start")
	purchaseDate, _ := time.Parse("2006-01-02", r.FormValue("purchase_date"))

	re := regexp.MustCompile(`(\d+)$`)
	matches := re.FindStringSubmatch(invStart)

	var prefix string
	var currentNum int
	var padding int

	if len(matches) > 0 {
		numStr := matches[1]
		padding = len(numStr)
		currentNum, _ = strconv.Atoi(numStr)
		prefix = invStart[:len(invStart)-padding]
	} else {
		prefix = invStart + "-"
		currentNum = 1
		padding = 1
	}

	for i := 0; i < quantity; i++ {
		newInvNum := ""
		if len(matches) > 0 {
			newInvNum = fmt.Sprintf("%s%0*d", prefix, padding, currentNum+i)
		} else {
			if i == 0 {
				newInvNum = invStart
			} else {
				newInvNum = fmt.Sprintf("%s%d", prefix, currentNum+i)
			}
		}

		asset := models.AssetKSO{
			ID:              uuid.New().String(),
			InventoryNumber: newInvNum,
			AssetName:       r.FormValue("asset_name"),
			Category:        r.FormValue("category"),
			Brand:           r.FormValue("brand"),
			TypeModel:       r.FormValue("type_model"),
			Color:           r.FormValue("color"),
		}

		asset.Specification = server.getAssetSpecFromForm(r, asset.Category)
		asset.Location = r.FormValue("location")
		asset.PurchaseDate = purchaseDate
		asset.Status = r.FormValue("status")
		server.DB.Create(&asset)
	}

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

// ApiStoreAssetKSOBulk handles JSON request to save multiple assets massal
func (server *Server) ApiStoreAssetKSOBulk(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()

	qtyStr := r.FormValue("quantity")
	quantity, _ := strconv.Atoi(qtyStr)
	if quantity < 1 {
		quantity = 1
	}

	invStart := r.FormValue("inventory_number_start")
	devNameStart := r.FormValue("device_name_start")
	purchaseDate, _ := time.Parse("2006-01-02", r.FormValue("purchase_date"))

	incrementor := func(base string, index int) string {
		if base == "" {
			return ""
		}

		// Support [NUM] placeholder
		if strings.Contains(base, "[NUM]") {
			numStr := fmt.Sprintf("%03d", index+1)
			return strings.ReplaceAll(base, "[NUM]", numStr)
		}

		re := regexp.MustCompile(`(\d+)$`)
		matches := re.FindStringSubmatch(base)

		if len(matches) > 0 {
			numStr := matches[1]
			padding := len(numStr)
			currentNum, _ := strconv.Atoi(numStr)
			prefix := base[:len(base)-padding]
			return fmt.Sprintf("%s%0*d", prefix, padding, currentNum+index)
		}

		if index == 0 {
			return base
		}
		return fmt.Sprintf("%s-%d", base, index+1)
	}

	for i := 0; i < quantity; i++ {
		newInvNum := incrementor(invStart, i)
		newDevName := incrementor(devNameStart, i)

		asset := models.AssetKSO{
			ID:              uuid.New().String(),
			InventoryNumber: newInvNum,
			DeviceName:      newDevName,
			AssetName:       r.FormValue("asset_name"),
			Category:        r.FormValue("category"),
			Brand:           r.FormValue("brand"),
			TypeModel:       r.FormValue("type_model"),
			Color:           r.FormValue("color"),
		}

		asset.Specification = server.getAssetSpecFromForm(r, asset.Category)
		asset.Location = r.FormValue("location")
		asset.PurchaseDate = purchaseDate
		asset.Status = r.FormValue("status")
		server.DB.Create(&asset)
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Bulk assets created successfully"})
}

func (server *Server) EditAssetKSOForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var asset models.AssetKSO
	if err := server.DB.Preload("User").Where("id = ?", id).First(&asset).Error; err != nil {
		http.Redirect(w, r, "/inventori/aset-laptop", http.StatusSeeOther)
		return
	}

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Edit Aset"
	masterData["asset"] = asset

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/asetkso_form", masterData)
}

// UpdateAssetKSO menangani proses pembaruan data aset KSO di database
func (server *Server) UpdateAssetKSO(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var asset models.AssetKSO
	if err := server.DB.Where("id = ?", id).First(&asset).Error; err != nil {
		http.Redirect(w, r, "/inventori/aset-laptop", http.StatusSeeOther)
		return
	}

	purchaseDate, _ := time.Parse("2006-01-02", r.FormValue("purchase_date"))

	asset.InventoryNumber = r.FormValue("inventory_number")
	asset.SerialNumber = r.FormValue("serial_number")
	asset.AssetName = r.FormValue("asset_name")
	if r.Form.Has("device_name") {
		asset.DeviceName = r.FormValue("device_name")
	}
	asset.Category = r.FormValue("category")
	asset.Brand = r.FormValue("brand")
	asset.TypeModel = r.FormValue("type_model")

	asset.Specification = server.getAssetSpecFromForm(r, asset.Category)

	asset.Color = r.FormValue("color")
	asset.Location = r.FormValue("location")
	if r.Form.Has("user_id") {
		userID := r.FormValue("user_id")
		var userIDPtr *string
		if userID != "" {
			userIDPtr = &userID
		}
		asset.UserID = userIDPtr
	}
	asset.PurchaseDate = purchaseDate
	asset.Status = r.FormValue("status")
	server.DB.Save(&asset)

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

// DeleteAssetKSO menangani proses penghapusan data aset KSO (soft delete)
func (server *Server) DeleteAssetKSO(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Where("id = ?", id).Delete(&models.AssetKSO{})
	http.Redirect(w, r, "/inventori/aset-laptop", http.StatusSeeOther)
}

// BulkDeleteAssetKSO menangani proses penghapusan banyak data aset KSO sekaligus
func (server *Server) BulkDeleteAssetKSO(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ids := r.Form["ids"]
	if len(ids) > 0 {
		server.DB.Where("id IN ?", ids).Delete(&models.AssetKSO{})
	}

	http.Redirect(w, r, "/inventori/aset-laptop", http.StatusSeeOther)
}

// ApiStoreAssetKSO handles JSON request to add new asset
func (server *Server) ApiStoreAssetKSO(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()

	asset := models.AssetKSO{
		ID:              uuid.New().String(),
		InventoryNumber: r.FormValue("inventory_number"),
		AssetName:       r.FormValue("asset_name"),
		Category:        r.FormValue("category"),
		Brand:           r.FormValue("brand"),
		TypeModel:       r.FormValue("type_model"),
		SerialNumber:    r.FormValue("serial_number"),
		DeviceName:      r.FormValue("device_name"),
		Specification:   r.FormValue("specification"),
		Color:           r.FormValue("color"),
		Location:        r.FormValue("location"),
		Status:          r.FormValue("status"),
	}

	if asset.Specification == "" && (asset.Category == "Laptop" || asset.Category == "Komputer") {
		asset.Specification = server.getAssetSpecFromForm(r, asset.Category)
	}

	if asset.Status == "" {
		asset.Status = "Ready"
	}

	if r.FormValue("purchase_date") != "" {
		t, err := time.Parse("2006-01-02", r.FormValue("purchase_date"))
		if err == nil {
			asset.PurchaseDate = t
		}
	}

	if err := server.DB.Create(&asset).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Aset berhasil ditambahkan", "asset": asset})
}

// ApiUpdateAssetKSO handles JSON request to update existing asset
func (server *Server) ApiUpdateAssetKSO(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var asset models.AssetKSO
	if err := server.DB.First(&asset, "id = ?", id).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Aset tidak ditemukan"})
		return
	}

	_ = r.ParseForm()
	asset.InventoryNumber = r.FormValue("inventory_number")
	asset.AssetName = r.FormValue("asset_name")
	asset.Category = r.FormValue("category")
	asset.Brand = r.FormValue("brand")
	asset.TypeModel = r.FormValue("type_model")
	asset.SerialNumber = r.FormValue("serial_number")
	asset.DeviceName = r.FormValue("device_name")
	asset.Specification = r.FormValue("specification")
	if asset.Specification == "" && (asset.Category == "Laptop" || asset.Category == "Komputer") {
		asset.Specification = server.getAssetSpecFromForm(r, asset.Category)
	}
	asset.Color = r.FormValue("color")
	asset.Location = r.FormValue("location")
	asset.Status = r.FormValue("status")

	if r.FormValue("purchase_date") != "" {
		t, err := time.Parse("2006-01-02", r.FormValue("purchase_date"))
		if err == nil {
			asset.PurchaseDate = t
		}
	}

	if err := server.DB.Save(&asset).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{"message": "Aset berhasil diperbarui", "asset": asset})
}
