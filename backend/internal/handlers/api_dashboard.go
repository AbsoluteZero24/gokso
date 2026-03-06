package handlers

import (
	"net/http"

	"github.com/AbsoluteZero24/gokso/internal/models"
)

// ApiDashboard returns dashboard statistic data in JSON format
func (server *Server) ApiDashboard(w http.ResponseWriter, r *http.Request) {
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
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var categoryStats []CategoryStat
	server.DB.Model(&models.AssetKSO{}).Select("category, count(*) as count").Group("category").Scan(&categoryStats)

	if categoryStats == nil {
		categoryStats = []CategoryStat{}
	}

	// Get assets by status for chart
	type StatusStat struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var statusStats []StatusStat
	server.DB.Model(&models.AssetKSO{}).Select("status, count(*) as count").Group("status").Scan(&statusStats)

	if statusStats == nil {
		statusStats = []StatusStat{}
	}

	data := map[string]interface{}{
		"totalAssets":    totalAssets,
		"readyAssets":    readyAssets,
		"brokenAssets":   brokenAssets,
		"totalEmployees": totalEmployees,
		"categoryStats":  categoryStats,
		"statusStats":    statusStats,
	}

	server.Renderer.JSON(w, http.StatusOK, data)
}
