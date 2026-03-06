package models

import (
	"time"

	"gorm.io/gorm"
)

type AssetKSO struct {
	ID              string  `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	InventoryNumber string  `gorm:"size:100;not null;uniqueIndex:idx_inv_num_deleted_at"`
	SerialNumber    string  `gorm:"size:100"` // Added for Serial Number
	AssetName       string  `gorm:"size:100;not null"`
	DeviceName      string  `gorm:"size:100"`          // Added for "Nama Perangkat"
	Category        string  `gorm:"size:100;not null"` // Laptop, Komputer, etc.
	Brand           string  `gorm:"size:100"`          // Added for "Merk"
	TypeModel       string  `gorm:"size:100"`          // Added for "Type/Model"
	Specification   string  `gorm:"type:text"`         // Added for "Spesifikasi"
	Color           string  `gorm:"size:50"`           // Added for "Warna"
	Location        string  `gorm:"size:100"`          // Added for "Lokasi"
	UserID          *string `gorm:"size:36"`           // Added for link to User
	User            User    `gorm:"foreignKey:UserID"` // Added relationship
	PurchaseDate    time.Time
	Status          string `gorm:"size:50;not null"` // Ready, Rusak, etc.
	CreatedAt       time.Time
	UpdatedAt       time.Time
	DeletedAt       gorm.DeletedAt `gorm:"index;uniqueIndex:idx_inv_num_deleted_at"`
}

func (AssetKSO) TableName() string {
	return "asset_kso"
}
