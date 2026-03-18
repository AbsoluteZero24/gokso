package models

import "time"

// Role merepresentasikan peran pengguna dalam sistem (misal: Super Admin, Staf, dll.)
type Role struct {
	ID              uint      `gorm:"primaryKey" json:"id"`                               // ID unik untuk role
	Name            string    `gorm:"size:100;not null;uniqueIndex" json:"name"`          // Nama role (misal: "Super Admin")
	Description     string    `gorm:"size:255" json:"description"`                        // Deskripsi fungsi role
	Permissions     string    `gorm:"type:text" json:"permissions"`                       // Daftar ID izin yang dipisahkan koma
	DMSFilterScope  string    `gorm:"size:20;default:'All'" json:"dms_filter_scope"`      // Cakupan filter dokumen (All atau Department)
	AllowedSections string    `gorm:"type:text" json:"allowed_sections"`                  // Bagian yang diizinkan untuk role ini (dipisahkan koma)
	UserCount       int64     `gorm:"-" json:"user_count"`                                // Jumlah pengguna yang menggunakan role ini (dihitung saat query)
	CreatedAt       time.Time `json:"created_at"`                                         // Waktu data dibuat
	UpdatedAt       time.Time `json:"updated_at"`                                         // Waktu data terakhir diperbarui
}

// RolePermission mendefinisikan hubungan antara role dan sumber daya (resource) tertentu
type RolePermission struct {
	ID        uint      `gorm:"primaryKey" json:"id"`                   // ID unik izin
	Role      string    `gorm:"size:50;not null;index" json:"role"`     // Nama role terkait
	Resource  string    `gorm:"size:100;not null;index" json:"resource"` // Nama sumber daya yang diizinkan (misal: "dashboard")
	CanAccess bool      `gorm:"default:false" json:"can_access"`        // Status apakah boleh mengakses atau tidak
	CreatedAt time.Time `json:"created_at"`                             // Waktu data dibuat
	UpdatedAt time.Time `json:"updated_at"`                             // Waktu data terakhir diperbarui
}
