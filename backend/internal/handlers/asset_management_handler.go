package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/gorilla/mux"
)

// ListAssetLaptop menampilkan halaman manajemen aset khusus untuk kategori Laptop
func (server *Server) ListAssetLaptop(w http.ResponseWriter, r *http.Request) {
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ? AND status = ?", "Laptop", "Ready").Order("inventory_number asc").Find(&assets)

	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/laptop_management", map[string]interface{}{
		"title":  "Asset Management - Laptop",
		"assets": assets,
		"users":  users,
	})
}

// ApiListAssetLaptop returns JSON list of laptop assets and users for assignment
func (server *Server) ApiListAssetLaptop(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	if category == "" {
		category = "Laptop"
	}

	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ? AND status = ?", category, "Ready").Order("inventory_number asc").Find(&assets)

	var users []models.User
	server.DB.Find(&users)

	var masterCategories []models.MasterAssetCategory
	server.DB.Find(&masterCategories)

	if assets == nil {
		assets = []models.AssetKSO{}
	}
	if users == nil {
		users = []models.User{}
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]interface{}{
		"assets":     assets,
		"users":      users,
		"categories": masterCategories,
		"category":   category,
	})
}

// ApiAssignAssetLaptop handles JSON request to assign/unassign employee to laptop
func (server *Server) ApiAssignAssetLaptop(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	assetID := r.FormValue("asset_id")
	userID := r.FormValue("user_id")

	var asset models.AssetKSO
	if err := server.DB.Where("id = ?", assetID).First(&asset).Error; err != nil {
		server.Renderer.JSON(w, http.StatusNotFound, map[string]string{"error": "Asset not found"})
		return
	}

	if userID == "" {
		asset.UserID = nil
	} else {
		asset.UserID = &userID
	}

	if err := server.DB.Save(&asset).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Assignment updated successfully"})
}

// ApiUpdateAssetLabel handles JSON request to update device label
func (server *Server) ApiUpdateAssetLabel(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	assetID := r.FormValue("asset_id")
	deviceName := r.FormValue("device_name")

	if err := server.DB.Model(&models.AssetKSO{}).Where("id = ?", assetID).Update("device_name", deviceName).Error; err != nil {
		server.Renderer.JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	server.Renderer.JSON(w, http.StatusOK, map[string]string{"message": "Label updated successfully"})
}

// CreateAssetLaptopForm menampilkan form untuk menambah aset Laptop baru melalui menu Asset Management
func (server *Server) CreateAssetLaptopForm(w http.ResponseWriter, r *http.Request) {
	var users []models.User
	server.DB.Find(&users)

	masterData, _ := server.fetchAssetMasterData()
	masterData["title"] = "Tambah Laptop"
	masterData["category"] = "Laptop"
	masterData["users"] = users

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/laptop_mgmt_form", masterData)
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

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/laptop_mgmt_form", masterData)
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

	http.Redirect(w, r, "/inventori/aset?msg=Tgl Perolehan & Label berhasil disimpan", http.StatusSeeOther)
}

// ListAssetKomputer menampilkan halaman manajemen aset khusus untuk kategori Komputer
func (server *Server) ListAssetKomputer(w http.ResponseWriter, r *http.Request) {
	var assets []models.AssetKSO
	server.DB.Preload("User").Where("category = ? AND status = ?", "Komputer", "Ready").Order("inventory_number asc").Find(&assets)

	var users []models.User
	server.DB.Find(&users)

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/komputer_management", map[string]interface{}{
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

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/komputer_mgmt_form", masterData)
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

	server.RenderHTML(w, r, http.StatusOK, "assets_kso/komputer_mgmt_form", masterData)
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
