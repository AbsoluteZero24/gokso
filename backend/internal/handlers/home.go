package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
)

// Home menampilkan halaman dashboard dengan ringkasan statistik aset dan karyawan
func (server *Server) Home(w http.ResponseWriter, r *http.Request) {
	var totalAssets int64
	var readyAssets int64
	var brokenAssets int64
	var totalEmployees int64

	server.DB.Model(&models.AssetKSO{}).Count(&totalAssets)
	server.DB.Model(&models.AssetKSO{}).Where("status = ?", "Ready").Count(&readyAssets)
	server.DB.Model(&models.AssetKSO{}).Where("status = ?", "Rusak").Count(&brokenAssets)
	server.DB.Model(&models.User{}).Count(&totalEmployees)

	// Get assets by category for chart
	type CategoryStat struct {
		Category string
		Count    int64
	}
	var categoryStats []CategoryStat
	server.DB.Model(&models.AssetKSO{}).Select("category, count(*) as count").Group("category").Scan(&categoryStats)

	// Get assets by status for chart
	type StatusStat struct {
		Status string
		Count  int64
	}
	var statusStats []StatusStat
	server.DB.Model(&models.AssetKSO{}).Select("status, count(*) as count").Group("status").Scan(&statusStats)

	server.RenderHTML(w, r, http.StatusOK, "home", map[string]interface{}{
		"title":          "Dashboard",
		"totalAssets":    totalAssets,
		"readyAssets":    readyAssets,
		"brokenAssets":   brokenAssets,
		"totalEmployees": totalEmployees,
		"categoryStats":  categoryStats,
		"statusStats":    statusStats,
	})
}
