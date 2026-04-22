package seeders

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedDMS(db *gorm.DB) error {
	// Seed System Trash Folder
	var trashCount int64
	db.Model(&models.DMSFolder{}).Where("is_system = ? AND name = ?", true, "Trash").Count(&trashCount)
	if trashCount == 0 {
		trashFolder := models.DMSFolder{
			ID:       uuid.New().String(),
			Name:     "Trash",
			Color:    "#64748b",
			IsSystem: true,
		}
		db.Create(&trashFolder)
	}

	return nil
}
