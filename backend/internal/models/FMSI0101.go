package models

import (
	"time"

	"gorm.io/gorm"
)

// FMSI0101 merepresentasikan data inventori server (FM.SI.0101)
type FMSI0101 struct {
	ID        uint           `gorm:"primaryKey" json:"id"`          // ID unik data server
	Name      string         `gorm:"size:100;not null" json:"name"` // Nama server
	Period    string         `gorm:"size:20;not null;index" json:"period"` // Periode pembaruan data
	IPAddress string         `gorm:"size:50" json:"ip_address"`     // Alamat IP server
	OS        string         `gorm:"size:100" json:"os"`            // Sistem Operasi
	CPU       string         `gorm:"size:50" json:"cpu"`           // Spesifikasi CPU
	RAM       string         `gorm:"size:50" json:"ram"`           // Kapasitas RAM
	Storage   string         `gorm:"size:50" json:"storage"`       // Kapasitas Penyimpanan
	Function  string         `gorm:"type:text" json:"function"`    // Fungsi/Role server
	CreatedAt time.Time      `json:"created_at"`                   // Waktu data dibuat
	UpdatedAt time.Time      `json:"updated_at"`                   // Waktu terakhir diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`               // Waktu data dihapus (soft delete)
}

// TableName mengembalikan nama tabel kustom untuk GORM
func (FMSI0101) TableName() string {
	return "fmsi0101_servers"
}
