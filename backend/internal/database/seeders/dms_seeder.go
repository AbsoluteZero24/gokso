package seeders

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SeedDMS(db *gorm.DB) error {
	var count int64
	db.Model(&models.DMSFolder{}).Where("name = ?", "Dokumen Legal").Count(&count)

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

	if count == 0 {
		legalFolder := models.DMSFolder{
			ID:    uuid.New().String(),
			Name:  "Dokumen Legal",
			Color: "#fbbf24",
		}
		if err := db.Create(&legalFolder).Error; err != nil {
			return err
		}

		// Add sample files to Dokumen Legal
		files := []models.DMSFile{
			{
				ID:        uuid.New().String(),
				FolderID:  &legalFolder.ID,
				Name:      "SOP_Pengadaan_2024.pdf",
				Category:  "Legal",
				Size:      2500000,
				Extension: "pdf",
			},
			{
				ID:        uuid.New().String(),
				FolderID:  &legalFolder.ID,
				Name:      "Kontrak_Kerja_Sama.docx",
				Category:  "Legal",
				Size:      120000,
				Extension: "docx",
			},
		}
		for _, f := range files {
			db.Create(&f)
		}
	}
	return nil
}
