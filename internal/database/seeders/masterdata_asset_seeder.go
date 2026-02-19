package seeders

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

// SeedMasterDataAsset mengisi data master aset (kategori, RAM, penyimpanan) ke database
func SeedMasterDataAsset(db *gorm.DB) error {
	// 1. Asset Categories
	categories := []string{"Laptop", "Komputer", "Printer", "Scanner", "Proyektor", "Lain-lain"}
	for _, name := range categories {
		db.Where(models.MasterAssetCategory{Name: name}).FirstOrCreate(&models.MasterAssetCategory{Name: name})
	}

	// 2. RAM Types
	ramTypes := []string{"DDR3", "DDR3L", "DDR4", "DDR5", "LPDDR3", "LPDDR4", "LPDDR5"}
	for _, name := range ramTypes {
		db.Where(models.MasterRamType{Name: name}).FirstOrCreate(&models.MasterRamType{Name: name})
	}

	// 3. Storage Types
	storageTypes := []string{"HDD", "SSD", "NVMe SSD", "SATA SSD", "M.2 SATA SSD"}
	for _, name := range storageTypes {
		db.Where(models.MasterStorageType{Name: name}).FirstOrCreate(&models.MasterStorageType{Name: name})
	}

	return nil
}
