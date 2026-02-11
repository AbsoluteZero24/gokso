package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/AbsoluteZero24/goaset/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

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

// ListAssetKSO menampilkan halaman daftar aset KSO dengan dukungan filter tahun
func (server *Server) ListAssetKSO(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	if _, ok := r.URL.Query()["year"]; !ok {
		year = fmt.Sprintf("%d", time.Now().Year())
	}

	var assets []models.AssetKSO
	// Start a fresh query for AssetKSO
	db := server.DB.Model(&models.AssetKSO{}).Preload("User")

	if year != "" {
		fmt.Printf("[ListAssetKSO] Applied filter year: %s\n", year)
		// Range query is generally more efficient and reliable than extraction functions
		startOfYear := fmt.Sprintf("%s-01-01 00:00:00", year)
		endOfYear := fmt.Sprintf("%s-12-31 23:59:59", year)
		db = db.Where("purchase_date BETWEEN ? AND ?", startOfYear, endOfYear)
	}

	err := db.Order("inventory_number asc").Find(&assets).Error
	if err != nil {
		fmt.Printf("[ListAssetKSO] Query Error: %v\n", err)
	}
	fmt.Printf("[ListAssetKSO] Filtered result count: %d\n", len(assets))

	// Provide a list of years for the dropdown (e.g., from 2024 up to current year + 1)
	currentYear := time.Now().Year()
	var years []int
	for y := 2024; y <= currentYear+1; y++ {
		years = append(years, y)
	}

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso", map[string]interface{}{
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

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso_form", masterData)
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

	spec := r.FormValue("specification")
	if asset.Category == "Laptop" || asset.Category == "Komputer" {
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
			spec = fmt.Sprintf("%s, RAM %s, %s, %s", proc, ramInfo, storageInfo, os)
		}
	}
	asset.Specification = spec
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
		if asset.Category == "Laptop" {
			redirectPath = "/asset-management/laptop"
		} else if asset.Category == "Komputer" {
			redirectPath = "/asset-management/komputer"
		}
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

func (server *Server) CreateAssetKSOBulkForm(w http.ResponseWriter, r *http.Request) {
	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Sisipan Masal Aset KSO"

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso_bulk_form", masterData)
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

	// Helper to increment inventory number
	// It looks for digits at the end of the string
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
		// If no digits at end, we just append numbers
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

		spec := r.FormValue("specification")
		if asset.Category == "Laptop" || asset.Category == "Komputer" {
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
				spec = fmt.Sprintf("%s, RAM %s, %s, %s", proc, ramInfo, storageInfo, os)
			}
		}
		asset.Specification = spec
		asset.Location = r.FormValue("location")
		asset.PurchaseDate = purchaseDate
		asset.Status = r.FormValue("status")
		if err := server.DB.Create(&asset).Error; err != nil {
			// In a bulk operation, we might want to continue or stop.
			// Stopping here for safety, but wrapping in a transaction would be better.
			http.Error(w, "Gagal membuat aset masal: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

// EditAssetKSOForm menampilkan halaman form untuk mengubah data aset KSO yang sudah ada
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

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso_form", masterData)
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
	userID := r.FormValue("user_id")
	var userIDPtr *string
	if userID != "" {
		userIDPtr = &userID
	}

	asset.InventoryNumber = r.FormValue("inventory_number")
	asset.SerialNumber = r.FormValue("serial_number")
	asset.AssetName = r.FormValue("asset_name")
	asset.DeviceName = r.FormValue("device_name")
	asset.Category = r.FormValue("category")
	asset.Brand = r.FormValue("brand")
	asset.TypeModel = r.FormValue("type_model")

	spec := r.FormValue("specification")
	if asset.Category == "Laptop" || asset.Category == "Komputer" {
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
			spec = fmt.Sprintf("%s, RAM %s, %s, %s", proc, ramInfo, storageInfo, os)
		}
	}
	asset.Specification = spec

	asset.Color = r.FormValue("color")
	asset.Location = r.FormValue("location")
	asset.UserID = userIDPtr
	asset.PurchaseDate = purchaseDate
	asset.Status = r.FormValue("status")
	if err := server.DB.Save(&asset).Error; err != nil {
		http.Error(w, "Gagal memperbarui aset: "+err.Error(), http.StatusInternalServerError)
		return
	}

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
		if asset.Category == "Laptop" {
			redirectPath = "/asset-management/laptop"
		} else if asset.Category == "Komputer" {
			redirectPath = "/asset-management/komputer"
		}
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

// ListAssetLaptop menampilkan halaman manajemen aset khusus untuk kategori Laptop
func (server *Server) ListAssetLaptop(w http.ResponseWriter, r *http.Request) {
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ?", "Laptop").Order("inventory_number asc").Find(&assets)

	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "assets/laptop_management", map[string]interface{}{
		"title":  "Asset Management - Laptop",
		"assets": assets,
		"users":  users,
	})
}

// CreateAssetLaptopForm menampilkan form untuk menambah aset Laptop baru melalui menu Asset Management
func (server *Server) CreateAssetLaptopForm(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Laptop"
	masterData["category"] = "Laptop"
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets/laptop_mgmt_form", masterData)
}

// EditAssetLaptopForm menampilkan form untuk mengubah data aset Laptop yang sudah ada
func (server *Server) EditAssetLaptopForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var asset models.AssetKSO
	if err := server.DB.Preload("User").Where("id = ?", id).First(&asset).Error; err != nil {
		http.Redirect(w, r, "/asset-management/laptop", http.StatusSeeOther)
		return
	}

	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Edit Laptop"
	masterData["asset"] = asset
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets/laptop_mgmt_form", masterData)
}

// DeleteAssetLaptop menghapus data aset Laptop secara permanen (unscoped delete)
func (server *Server) DeleteAssetLaptop(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Unscoped().Where("id = ?", id).Delete(&models.AssetKSO{})
	http.Redirect(w, r, "/asset-management/laptop", http.StatusSeeOther)
}

// AssignAssetLaptop mengatur kaitan antara aset Laptop dengan user/karyawan tertentu
func (server *Server) AssignAssetLaptop(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	assetID := r.FormValue("asset_id")
	userID := r.FormValue("user_id")

	if assetID == "" {
		http.Redirect(w, r, "/asset-management/laptop", http.StatusSeeOther)
		return
	}

	var asset models.AssetKSO
	if err := server.DB.Where("id = ?", assetID).First(&asset).Error; err == nil {
		if userID == "" {
			asset.UserID = nil
		} else {
			asset.UserID = &userID
		}
		server.DB.Save(&asset)
	}

	http.Redirect(w, r, "/asset-management/laptop", http.StatusSeeOther)
}

// ListAssetKomputer menampilkan halaman manajemen aset khusus untuk kategori Komputer
func (server *Server) ListAssetKomputer(w http.ResponseWriter, r *http.Request) {
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ?", "Komputer").Order("inventory_number asc").Find(&assets)

	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "assets/komputer_management", map[string]interface{}{
		"title":  "Asset Management - Komputer",
		"assets": assets,
		"users":  users,
	})
}

// CreateAssetKomputerForm menampilkan form untuk menambah aset Komputer baru
func (server *Server) CreateAssetKomputerForm(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Komputer"
	masterData["category"] = "Komputer"
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets/komputer_mgmt_form", masterData)
}

func (server *Server) EditAssetKomputerForm(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var asset models.AssetKSO
	if err := server.DB.Preload("User").Where("id = ?", id).First(&asset).Error; err != nil {
		http.Redirect(w, r, "/asset-management/komputer", http.StatusSeeOther)
		return
	}

	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Edit Komputer"
	masterData["asset"] = asset
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets/komputer_mgmt_form", masterData)
}

func (server *Server) DeleteAssetKomputer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Unscoped().Where("id = ?", id).Delete(&models.AssetKSO{})
	http.Redirect(w, r, "/asset-management/komputer", http.StatusSeeOther)
}

func (server *Server) AssignAssetKomputer(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	assetID := r.FormValue("asset_id")
	userID := r.FormValue("user_id")

	if assetID == "" {
		http.Redirect(w, r, "/asset-management/komputer", http.StatusSeeOther)
		return
	}

	var asset models.AssetKSO
	if err := server.DB.Where("id = ?", assetID).First(&asset).Error; err == nil {
		if userID == "" {
			asset.UserID = nil
		} else {
			asset.UserID = &userID
		}
		server.DB.Save(&asset)
	}

	http.Redirect(w, r, "/asset-management/komputer", http.StatusSeeOther)
}

// UpdateAssetLabel mengubah "Nama Perangkat" secara individual pada sebuah aset
func (server *Server) UpdateAssetLabel(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id := r.FormValue("asset_id")
	newLabel := r.FormValue("device_name")
	redirectPath := r.FormValue("redirect_to")

	var asset models.AssetKSO
	if err := server.DB.Where("id = ?", id).First(&asset).Error; err != nil {
		if redirectPath != "" {
			http.Redirect(w, r, redirectPath, http.StatusSeeOther)
		} else {
			http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		}
		return
	}

	asset.DeviceName = newLabel
	server.DB.Save(&asset)

	if redirectPath == "" {
		redirectPath = "/dashboard"
	}
	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}

// BulkUpdateAssetLabel melakukan pembaruan "Nama Perangkat" secara massal untuk rentang nomor inventaris tertentu
func (server *Server) BulkUpdateAssetLabel(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	invStart := r.FormValue("inv_start")
	invEnd := r.FormValue("inv_end")
	labelStart := r.FormValue("label_start")
	redirectPath := r.FormValue("redirect_to")
	category := r.FormValue("category")

	// 1. Fetch assets in range
	var assets []models.AssetKSO
	query := server.DB.Where("inventory_number >= ? AND inventory_number <= ?", invStart, invEnd)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	query.Order("inventory_number asc").Find(&assets)

	if len(assets) == 0 {
		http.Redirect(w, r, redirectPath, http.StatusSeeOther)
		return
	}

	// 2. Prepare label sequence logic
	re := regexp.MustCompile(`(\d+)$`)
	matches := re.FindStringSubmatch(labelStart)

	var prefix string
	var currentNum int
	var padding int

	if len(matches) > 0 {
		numStr := matches[1]
		padding = len(numStr)
		currentNum, _ = strconv.Atoi(numStr)
		prefix = labelStart[:len(labelStart)-padding]
	} else {
		// If no digits at end, we just append numbers
		prefix = labelStart + "-"
		currentNum = 1
		padding = 1
	}

	// 3. Update assets sequentially
	for i, asset := range assets {
		newLabel := ""
		if len(matches) > 0 {
			newLabel = fmt.Sprintf("%s%0*d", prefix, padding, currentNum+i)
		} else {
			if i == 0 {
				newLabel = labelStart
			} else {
				newLabel = fmt.Sprintf("%s%d", prefix, currentNum+i)
			}
		}

		asset.DeviceName = newLabel
		server.DB.Save(&asset)
	}

	if redirectPath == "" {
		redirectPath = "/asset-management/laptop"
	}
	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
}
func (server *Server) MaintenanceLaptop(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	semester := r.URL.Query().Get("semester")
	branchParam := r.URL.Query().Get("branch")
	dept := r.URL.Query().Get("department")
	subDeptParam := r.URL.Query().Get("sub_department")
	_, _, adminRole, _ := GetCurrentAdmin(r)

	now := time.Now()
	if year == "" {
		year = fmt.Sprintf("%d", now.Year())
	}
	if semester == "" {
		if now.Month() <= 6 {
			semester = "S1"
		} else {
			semester = "S2"
		}
	}

	period := fmt.Sprintf("%s-%s", semester, year)
	selectedYearInt, _ := strconv.Atoi(year)

	// Provide a list of years for the dropdown
	var years []int
	for y := 2024; y <= now.Year()+1; y++ {
		years = append(years, y)
	}

	// Fetch all Master Data for dropdowns (Hierarchical)
	var branches []models.MasterBranch
	server.DB.Preload("Departments.SubDepartments").Find(&branches)

	// Fetch all simple lists for non-hierarchical use if needed, but we'll use branches mostly
	var departments []models.MasterDepartment
	var subDepartments []models.MasterSubDepartment
	server.DB.Find(&departments)
	server.DB.Find(&subDepartments)

	// Fetch all assets of category "Laptop"
	// We fetch all and filter in Go to handle historical report snapshots correctly.
	// Filtering via SQL JOIN with 'users' only filters by CURRENT assignment,
	// which breaks historical views when employees move or resign.
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ?", "Laptop").Find(&assets)

	// Fetch maintenance reports for this period that are NOT yet archived (document_id is null)
	var reports []models.MaintenanceReport
	server.DB.Where("period = ? AND document_id IS NULL", period).Find(&reports)

	// Map reports by AssetID for easy lookup
	reportMap := make(map[string]models.MaintenanceReport)
	for _, r := range reports {
		reportMap[r.AssetID] = r
	}

	// Group assets by SubDepartment with filtering
	groupedAssets := make(map[string][]map[string]interface{})
	for _, asset := range assets {

		report, exists := reportMap[asset.ID]

		// Ensure the report snapshot matches the selected year
		if exists && report.InspectionDate.Year() != selectedYearInt {
			exists = false
			report = models.MaintenanceReport{}
		}

		// Determine effective location for this asset in this period
		// Snapshot rule: Only use report snapshot if it has been submitted/approved.
		// If it's still a draft, use the latest data from the User record.
		effBranch := asset.User.Branch
		effDept := asset.User.Department
		effSubDept := asset.User.SubDepartment

		if exists && report.IsSubmitted && report.UserBranch != "" {
			effBranch = report.UserBranch
			effDept = report.UserDepartment
			effSubDept = report.UserSubDepartment
		}

		// Apply Filters (Branch, Dept, SubDept)
		if branchParam != "" && effBranch != branchParam {
			continue
		}
		if dept != "" && effDept != dept {
			continue
		}
		if subDeptParam != "" && effSubDept != subDeptParam {
			continue
		}

		// Grouping key
		groupKey := effSubDept
		if groupKey == "" {
			groupKey = "Lainnya"
		}

		assetData := map[string]interface{}{
			"Asset":     asset,
			"Report":    report,
			"HasReport": exists,
		}

		groupedAssets[groupKey] = append(groupedAssets[groupKey], assetData)
	}

	// Fetch signatures for the footer if the report is submitted/approved
	var submitter models.Admin
	var approver models.Admin
	var approvedDate *time.Time

	// We'll take the first report that matches the current filters and is submitted/approved
	for _, r := range reports {
		// Filter match check for signature display
		if branchParam != "" && r.UserBranch != branchParam {
			continue
		}
		if dept != "" && r.UserDepartment != dept {
			continue
		}
		if subDeptParam != "" && r.UserSubDepartment != subDeptParam {
			continue
		}

		if r.IsSubmitted && submitter.ID == "" {
			server.DB.First(&submitter, "id = ?", r.SubmittedByID)
			// Fetch employee info for submitter
			if submitter.UserID != "" {
				var u models.User
				server.DB.First(&u, "id = ?", submitter.UserID)
				submitter.Username = u.Name // Use actual name
				submitter.Role = u.Position // Temporarily reuse Role field or just pass separately
			}
		}
		if r.IsApproved && approver.ID == "" {
			server.DB.First(&approver, "id = ?", r.ApprovedByID)
			// Fetch employee info for approver
			if approver.UserID != "" {
				var u models.User
				server.DB.First(&u, "id = ?", approver.UserID)
				approver.Username = u.Name
				approver.Role = u.Position
			}
			approvedDate = r.ApprovedAt
		}
	}

	server.RenderHTML(w, r, http.StatusOK, "maintenance/laptop", map[string]interface{}{
		"title":           "Laporan Pemeliharaan Laptop",
		"groupedAssets":   groupedAssets,
		"period":          period,
		"currentYear":     year,
		"currentSemester": semester,
		"currentBranch":   branchParam,
		"currentDept":     dept,
		"currentSubDept":  subDeptParam,
		"branches":        branches,
		"now":             now,
		"submitter":       submitter,
		"approver":        approver,
		"approvedDate":    approvedDate,
		"AdminRole":       adminRole,
		"years":           years,
	})
}

func (server *Server) MaintenanceKomputer(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	semester := r.URL.Query().Get("semester")
	branchParam := r.URL.Query().Get("branch")
	dept := r.URL.Query().Get("department")
	subDeptParam := r.URL.Query().Get("sub_department")
	_, _, adminRole, _ := GetCurrentAdmin(r)

	now := time.Now()
	if year == "" {
		year = fmt.Sprintf("%d", now.Year())
	}
	if semester == "" {
		if now.Month() <= 6 {
			semester = "S1"
		} else {
			semester = "S2"
		}
	}

	period := fmt.Sprintf("%s-%s", semester, year)
	selectedYearInt, _ := strconv.Atoi(year)

	// Provide a list of years for the dropdown
	var years []int
	for y := 2024; y <= now.Year()+1; y++ {
		years = append(years, y)
	}

	// Fetch hierarchy for dropdowns
	var branches []models.MasterBranch
	server.DB.Preload("Departments.SubDepartments").Find(&branches)

	// Fetch all assets of category "Komputer"
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ?", "Komputer").Find(&assets)

	// Fetch maintenance reports for this period that are NOT yet archived (document_id is null)
	var reports []models.MaintenanceReport
	server.DB.Where("period = ? AND document_id IS NULL", period).Find(&reports)

	// Map reports by AssetID for easy lookup
	reportMap := make(map[string]models.MaintenanceReport)
	for _, r := range reports {
		reportMap[r.AssetID] = r
	}

	// Group assets by SubDepartment with filtering
	groupedAssets := make(map[string][]map[string]interface{})
	for _, asset := range assets {

		report, exists := reportMap[asset.ID]

		// Ensure the report snapshot matches the selected year
		if exists && report.InspectionDate.Year() != selectedYearInt {
			exists = false
			report = models.MaintenanceReport{}
		}

		// Snapshot rule: Only use report snapshot if it has been submitted/approved.
		effBranch := asset.User.Branch
		effDept := asset.User.Department
		effSubDept := asset.User.SubDepartment

		if exists && report.IsSubmitted && report.UserBranch != "" {
			effBranch = report.UserBranch
			effDept = report.UserDepartment
			effSubDept = report.UserSubDepartment
		}

		// Apply Filters (Branch, Dept, SubDept)
		if branchParam != "" && effBranch != branchParam {
			continue
		}
		if dept != "" && effDept != dept {
			continue
		}
		if subDeptParam != "" && effSubDept != subDeptParam {
			continue
		}

		// Grouping key
		groupKey := effSubDept
		if groupKey == "" {
			groupKey = "Lainnya"
		}

		assetData := map[string]interface{}{
			"Asset":     asset,
			"Report":    report,
			"HasReport": exists,
		}

		groupedAssets[groupKey] = append(groupedAssets[groupKey], assetData)
	}

	// Fetch signatures for the footer if the report is submitted/approved
	var submitter models.Admin
	var approver models.Admin
	var approvedDate *time.Time

	for _, r := range reports {
		// Filter match check for signature display
		if branchParam != "" && r.UserBranch != branchParam {
			continue
		}
		if dept != "" && r.UserDepartment != dept {
			continue
		}
		if subDeptParam != "" && r.UserSubDepartment != subDeptParam {
			continue
		}

		if r.IsSubmitted && submitter.ID == "" {
			server.DB.First(&submitter, "id = ?", r.SubmittedByID)
			if submitter.UserID != "" {
				var u models.User
				server.DB.First(&u, "id = ?", submitter.UserID)
				submitter.Username = u.Name
				submitter.Role = u.Position
			}
		}
		if r.IsApproved && approver.ID == "" {
			server.DB.First(&approver, "id = ?", r.ApprovedByID)
			if approver.UserID != "" {
				var u models.User
				server.DB.First(&u, "id = ?", approver.UserID)
				approver.Username = u.Name
				approver.Role = u.Position
			}
			approvedDate = r.ApprovedAt
		}
	}

	server.RenderHTML(w, r, http.StatusOK, "maintenance/komputer", map[string]interface{}{
		"title":           "Laporan Pemeliharaan Komputer",
		"groupedAssets":   groupedAssets,
		"period":          period,
		"currentYear":     year,
		"currentSemester": semester,
		"currentBranch":   branchParam,
		"currentDept":     dept,
		"currentSubDept":  subDeptParam,
		"branches":        branches,
		"now":             now,
		"submitter":       submitter,
		"approver":        approver,
		"approvedDate":    approvedDate,
		"AdminRole":       adminRole,
		"years":           years,
	})
}

func (server *Server) StoreMaintenanceLaptop(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	assetID := r.FormValue("asset_id")
	period := r.FormValue("period")
	antivirus := r.FormValue("antivirus_updated") == "true"
	clearTemp := r.FormValue("clear_temporary") == "true"
	condition := r.FormValue("overall_condition")
	inspectionDateStr := r.FormValue("inspection_date")
	remarks := r.FormValue("remarks")

	adminID, _, _, _ := GetCurrentAdmin(r)

	inspectionDate, err := time.Parse("2006-01-02", inspectionDateStr)
	if err != nil {
		inspectionDate = time.Now()
	}

	// Fetch current asset and user for snapshot
	var asset models.AssetKSO
	server.DB.Preload("User").Where("id = ?", assetID).First(&asset)

	var userName, userPos, userBranch, userDept, userSub string
	if asset.User.ID != "" {
		userName = asset.User.Name
		userPos = asset.User.Position
		userBranch = asset.User.Branch
		userDept = asset.User.Department
		userSub = asset.User.SubDepartment
	}

	// Check if a report already exists for this asset and period
	var existingReport models.MaintenanceReport
	server.DB.Where("asset_id = ? AND period = ?", assetID, period).Limit(1).Find(&existingReport)

	if existingReport.ID != "" {
		// Update existing
		existingReport.AntivirusUpdated = antivirus
		existingReport.ClearTemporary = clearTemp
		existingReport.OverallCondition = condition
		existingReport.InspectionDate = inspectionDate
		existingReport.Remarks = remarks
		existingReport.CheckerID = adminID

		// Optional: Only update snapshot if it was empty (for legacy data)
		if existingReport.UserName == "" {
			existingReport.UserName = userName
			existingReport.UserPosition = userPos
			existingReport.UserBranch = userBranch
			existingReport.UserDepartment = userDept
			existingReport.UserSubDepartment = userSub
		}

		server.DB.Save(&existingReport)
	} else {
		// Create new
		newReport := models.MaintenanceReport{
			ID:                uuid.New().String(),
			AssetID:           assetID,
			Period:            period,
			AntivirusUpdated:  antivirus,
			ClearTemporary:    clearTemp,
			OverallCondition:  condition,
			InspectionDate:    inspectionDate,
			Remarks:           remarks,
			CheckerID:         adminID,
			UserName:          userName,
			UserPosition:      userPos,
			UserBranch:        userBranch,
			UserDepartment:    userDept,
			UserSubDepartment: userSub,
		}
		server.DB.Create(&newReport)
	}

	year := r.FormValue("year")
	semester := r.URL.Query().Get("semester") // Fallback to Query if not in form for some reason
	if semester == "" {
		semester = r.FormValue("semester")
	}
	branch := r.FormValue("branch")
	dept := r.FormValue("department")
	subDept := r.FormValue("sub_department")

	redirectURL := fmt.Sprintf("/maintenance/laptop?year=%s&semester=%s&branch=%s&department=%s&sub_department=%s", year, semester, branch, dept, subDept)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func (server *Server) SubmitMaintenance(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	period := r.FormValue("period")
	branch := r.FormValue("branch")
	dept := r.FormValue("department")
	subDept := r.FormValue("sub_department")
	category := r.FormValue("category")

	adminID, _, _, _ := GetCurrentAdmin(r)
	now := time.Now()

	// 1. Create a MaintenanceDocument
	doc := models.MaintenanceDocument{
		ID:            uuid.New().String(),
		Branch:        branch,
		Department:    dept,
		SubDepartment: subDept,
		Period:        period,
		Status:        "Submitted",
		SubmittedByID: adminID,
		SubmittedAt:   &now,
	}

	if err := server.DB.Create(&doc).Error; err != nil {
		http.Error(w, "Gagal membuat dokumen: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Link all unbatched reports for this period/filter to this document
	query := server.DB.Model(&models.MaintenanceReport{}).
		Where("period = ? AND document_id IS NULL", period)

	if branch != "" {
		query = query.Where("user_branch = ?", branch)
	}
	if dept != "" {
		query = query.Where("user_department = ?", dept)
	}
	if subDept != "" {
		query = query.Where("user_sub_department = ?", subDept)
	}

	// We also need to filter by asset category if possible, but reports only have AssetID.
	// We'll trust the UI filter for now, or we could join with assets.

	err = query.Updates(map[string]interface{}{
		"document_id":     doc.ID,
		"is_submitted":    true,
		"submitted_by_id": adminID,
		"submitted_at":    &now,
	}).Error

	if err != nil {
		http.Error(w, "Gagal memperbarui laporan: "+err.Error(), http.StatusInternalServerError)
		return
	}

	redirectPath := "/maintenance/laptop"
	if category == "Komputer" {
		redirectPath = "/maintenance/komputer"
	}

	redirectURL := fmt.Sprintf("%s?year=%s&semester=%s&branch=%s&department=%s&sub_department=%s&msg=Berhasil disubmit ke history",
		redirectPath, r.FormValue("year"), r.FormValue("semester"), branch, dept, subDept)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func (server *Server) ApproveMaintenance(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	period := r.FormValue("period")
	branch := r.FormValue("branch")
	dept := r.FormValue("department")
	subDept := r.FormValue("sub_department")
	category := r.FormValue("category")

	adminID, _, _, _ := GetCurrentAdmin(r)
	now := time.Now()

	// 1. Find the current Submitted document for this filter
	var doc models.MaintenanceDocument
	err = server.DB.Where("branch = ? AND department = ? AND sub_department = ? AND period = ? AND status = ?",
		branch, dept, subDept, period, "Submitted").First(&doc).Error

	if err != nil {
		http.Error(w, "Dokumen pengajuan tidak ditemukan", http.StatusNotFound)
		return
	}

	// 2. Update Document
	doc.Status = "Approved"
	doc.ApprovedByID = adminID
	doc.ApprovedAt = &now
	server.DB.Save(&doc)

	// 3. Update all linked reports
	server.DB.Model(&models.MaintenanceReport{}).Where("document_id = ?", doc.ID).Updates(map[string]interface{}{
		"is_approved":    true,
		"approved_by_id": adminID,
		"approved_at":    &now,
	})

	redirectPath := "/maintenance/laptop"
	if category == "Komputer" {
		redirectPath = "/maintenance/komputer"
	}

	redirectURL := fmt.Sprintf("%s?year=%s&semester=%s&branch=%s&department=%s&sub_department=%s&msg=Berhasil disetujui",
		redirectPath, r.FormValue("year"), r.FormValue("semester"), branch, dept, subDept)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func (server *Server) MaintenanceHistory(w http.ResponseWriter, r *http.Request) {
	var documents []models.MaintenanceDocument
	server.DB.Order("created_at desc").Find(&documents)

	server.RenderHTML(w, r, http.StatusOK, "maintenance/history", map[string]interface{}{
		"title":     "Riwayat Pemeliharaan",
		"documents": documents,
	})
}

func (server *Server) MaintenanceHistoryDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var doc models.MaintenanceDocument
	if err := server.DB.Where("id = ?", id).First(&doc).Error; err != nil {
		http.Redirect(w, r, "/maintenance/history", http.StatusSeeOther)
		return
	}

	var reports []models.MaintenanceReport
	server.DB.Preload("Asset", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Where("document_id = ?", id).Find(&reports)

	// Group reports for display (using snapshot and asset info)
	groupedAssets := make(map[string][]map[string]interface{})
	for _, report := range reports {
		groupKey := report.UserSubDepartment
		if groupKey == "" {
			groupKey = "Lainnya"
		}

		assetData := map[string]interface{}{
			"Asset":     report.Asset,
			"Report":    report,
			"HasReport": true,
		}
		groupedAssets[groupKey] = append(groupedAssets[groupKey], assetData)
	}

	// Fetch signatures
	var submitter models.Admin
	var approver models.Admin
	if doc.SubmittedByID != "" {
		server.DB.First(&submitter, "id = ?", doc.SubmittedByID)
	}
	if doc.ApprovedByID != "" {
		server.DB.First(&approver, "id = ?", doc.ApprovedByID)
	}

	// Enhance submitter/approver info if they are also employees
	enhanceAdmin := func(a *models.Admin) {
		if a.ID != "" && a.UserID != "" {
			var u models.User
			server.DB.First(&u, "id = ?", a.UserID)
			a.Username = u.Name
			a.Role = u.Position
		}
	}
	enhanceAdmin(&submitter)
	enhanceAdmin(&approver)

	server.RenderHTML(w, r, http.StatusOK, "maintenance/history_detail", map[string]interface{}{
		"title":         "Detail Laporan Historis",
		"doc":           doc,
		"groupedAssets": groupedAssets,
		"submitter":     submitter,
		"approver":      approver,
	})
}
