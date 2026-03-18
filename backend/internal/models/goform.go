package models

import "time"

// GoForm merepresentasikan template formulir digital yang tersedia di sistem
type GoForm struct {
	ID             uint      `gorm:"primaryKey" json:"id"`                           // ID unik form (Auto Increment)
	FormID         string    `gorm:"size:100;not null;uniqueIndex" json:"form_id"`    // Kode unik form (misal: "form-bast-laptop")
	Name           string    `gorm:"size:255;not null" json:"name"`                  // Nama judul formulir
	Description    string    `gorm:"size:255" json:"description"`                   // Penjelasan fungsi formulir
	Icon           string    `gorm:"size:50;default:'FileText'" json:"icon"`        // Nama ikon Lucide yang digunakan
	Color          string    `gorm:"size:20;default:'#1e59c5'" json:"color"`        // Kode warna tema formulir
	Category       string    `gorm:"size:100" json:"category"`                       // Kategori formulir (misal: "Inventory", "HR")
	Section        string    `gorm:"type:text" json:"section"`                      // Daftar departemen yang boleh akses (dipisahkan koma)
	TargetFolderID *string   `gorm:"size:255" json:"target_folder_id"`               // ID folder tujuan di GoDMS untuk hasil PDF nya
	Status         string    `gorm:"size:20;default:'Active'" json:"status"`        // Status aktif formulir (Active/Draft/Inactive)
	CreatedAt      time.Time `json:"created_at"`                                     // Waktu template dibuat
	UpdatedAt      time.Time `json:"updated_at"`                                     // Waktu terakhir template diperbarui
}
