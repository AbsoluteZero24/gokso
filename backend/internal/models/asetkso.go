package models

import (
	"time"

	"gorm.io/gorm"
)

// AssetKSO merepresentasikan data aset (seperti Laptop, Komputer, dll) yang dimiliki KSO SCSI
type AssetKSO struct {
	ID              string  `gorm:"size:36;not null;uniqueIndex;primaryKey" json:"id"`                      // ID unik aset (UUID)
	InventoryNumber string  `gorm:"size:100;not null;uniqueIndex:idx_inv_num_deleted_at" json:"inventory_number"` // Nomor inventaris unik
	SerialNumber    string  `gorm:"size:100" json:"serial_number"`                                           // Nomor seri perangkat
	AssetName       string  `gorm:"size:100;not null" json:"asset_name"`                                     // Nama model aset (misal: "ThinkPad X1")
	DeviceName      string  `gorm:"size:100" json:"device_name"`                                              // Nama perangkat yang diberikan user
	Category        string  `gorm:"size:100;not null" json:"category"`                                        // Kategori aset (Laptop, Komputer, dll)
	Brand           string  `gorm:"size:100" json:"brand"`                                                   // Merek aset (Lenovo, Dell, dll)
	TypeModel       string  `gorm:"size:100" json:"type_model"`                                              // Tipe atau model spesifik
	Specification   string  `gorm:"type:text" json:"specification"`                                          // Spesifikasi teknis aset
	Color           string  `gorm:"size:50" json:"color"`                                                    // Warna aset
	Location        string  `gorm:"size:100" json:"location"`                                                 // Lokasi fisik aset (Gudang, Jakarta, dll)
	UserID          *string `gorm:"size:36" json:"user_id"`                                                  // ID pengguna yang memegang aset ini (opsional)
	User            User    `gorm:"foreignKey:UserID" json:"user,omitempty"`                                 // Relasi ke data Pengguna
	PurchaseDate    time.Time `json:"purchase_date"`                                                         // Tanggal perolehan aset
	Status          string `gorm:"size:50;not null" json:"status"`                                           // Status kondisi aset (Ready, Rusak, dll)
	CreatedAt       time.Time `json:"created_at"`                                                            // Waktu data dibuat
	UpdatedAt       time.Time `json:"updated_at"`                                                            // Waktu data terakhir diperbarui
	DeletedAt       gorm.DeletedAt `gorm:"index;uniqueIndex:idx_inv_num_deleted_at" json:"-"`                 // Waktu data dihapus (soft delete)
}

// TableName mengembalikan nama tabel kustom untuk GORM
func (AssetKSO) TableName() string {
	return "asset_kso"
}
