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
)

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

func (server *Server) ListAssetKSO(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")

	var assets []models.AssetKSO
	query := server.DB.Preload("User").Order("inventory_number asc")

	if year != "" {
		query = query.Where("EXTRACT(YEAR FROM purchase_date) = ?", year)
	}

	query.Find(&assets)

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso", map[string]interface{}{
		"title":        "Daftar Aset KSO",
		"assets":       assets,
		"selectedYear": year,
	})
}

func (server *Server) CreateAssetKSOForm(w http.ResponseWriter, r *http.Request) {
	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Aset KSO"

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso_form", masterData)
}

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

	server.DB.Create(&asset)

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
		server.DB.Create(&asset)
	}

	redirectPath := r.FormValue("redirect_to")
	if redirectPath == "" {
		redirectPath = "/inventori/aset-laptop"
	}

	http.Redirect(w, r, redirectPath, http.StatusSeeOther)
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

	server.RenderHTML(w, r, http.StatusOK, "assets/asetkso_form", masterData)
}

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

	server.DB.Save(&asset)

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

func (server *Server) DeleteAssetKSO(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Unscoped().Where("id = ?", id).Delete(&models.AssetKSO{})
	http.Redirect(w, r, "/inventori/aset-laptop", http.StatusSeeOther)
}

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

func (server *Server) CreateAssetLaptopForm(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Laptop"
	masterData["category"] = "Laptop"
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets/laptop_mgmt_form", masterData)
}

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

func (server *Server) DeleteAssetLaptop(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	server.DB.Unscoped().Where("id = ?", id).Delete(&models.AssetKSO{})
	http.Redirect(w, r, "/asset-management/laptop", http.StatusSeeOther)
}

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

	// Fetch maintenance reports for this period
	var reports []models.MaintenanceReport
	server.DB.Where("period = ?", period).Find(&reports)

	// Map reports by AssetID for easy lookup
	reportMap := make(map[string]models.MaintenanceReport)
	for _, r := range reports {
		reportMap[r.AssetID] = r
	}

	// Group assets by SubDepartment with filtering
	groupedAssets := make(map[string][]map[string]interface{})
	for _, asset := range assets {
		report, exists := reportMap[asset.ID]

		// Determine effective location for this asset in this period
		effBranch := asset.User.Branch
		effDept := asset.User.Department
		effSubDept := asset.User.SubDepartment

		if exists && report.UserBranch != "" {
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
	})
}

func (server *Server) MaintenanceKomputer(w http.ResponseWriter, r *http.Request) {
	year := r.URL.Query().Get("year")
	semester := r.URL.Query().Get("semester")
	branchParam := r.URL.Query().Get("branch")
	dept := r.URL.Query().Get("department")
	subDeptParam := r.URL.Query().Get("sub_department")

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

	// Fetch hierarchy for dropdowns
	var branches []models.MasterBranch
	server.DB.Preload("Departments.SubDepartments").Find(&branches)

	// Fetch all assets of category "Komputer"
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ?", "Komputer").Find(&assets)

	// Fetch maintenance reports for this period
	var reports []models.MaintenanceReport
	server.DB.Where("period = ?", period).Find(&reports)

	// Map reports by AssetID for easy lookup
	reportMap := make(map[string]models.MaintenanceReport)
	for _, r := range reports {
		reportMap[r.AssetID] = r
	}

	// Group assets by SubDepartment with filtering
	groupedAssets := make(map[string][]map[string]interface{})
	for _, asset := range assets {
		report, exists := reportMap[asset.ID]

		// Determine effective location for this asset in this period
		effBranch := asset.User.Branch
		effDept := asset.User.Department
		effSubDept := asset.User.SubDepartment

		if exists && report.UserBranch != "" {
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
	result := server.DB.Where("asset_id = ? AND period = ?", assetID, period).First(&existingReport)

	if result.Error == nil {
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
