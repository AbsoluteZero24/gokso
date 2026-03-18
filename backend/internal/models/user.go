package models

import (
	"time"

	"gorm.io/gorm"
)

// User merepresentasikan data karyawan sekaligus akun login dalam sistem
type User struct {
	ID             string         `gorm:"size:36;not null;uniqueIndex;primaryKey" json:"id"` // ID unik user (UUID)
	NIK            string         `gorm:"size:20;uniqueIndex" json:"nik"`                    // Nomor Induk Karyawan
	Name           string         `gorm:"size:100;not null" json:"name"`                     // Nama lengkap karyawan
	Email          string         `gorm:"size:100;not null;uniqueIndex" json:"email"`        // Alamat email kantor
	Branch         string         `gorm:"size:100;index" json:"branch"`                      // Cabang lokasi kerja
	Department     string         `gorm:"size:100;index" json:"department"`                  // Bagian/Departemen
	SubDepartment  string         `gorm:"size:100;index" json:"sub_department"`              // Sub-Bagian (opsional)
	Position       string         `gorm:"size:50;not null;index" json:"position"`            // Jabatan
	StatusKaryawan string         `gorm:"size:50" json:"status_karyawan"`                    // Status (Tetap/Kontrak/Probation)
	PhoneNumber    string         `gorm:"size:20" json:"phone_number"`                       // Nomor telepon/WhatsApp
	Password       string         `gorm:"size:255;not null" json:"-"`                        // Password hash (tidak dikirim ke frontend)
	Role           string         `gorm:"size:50;index" json:"role"`                         // Jenjang akses sistem
	Avatar         string         `gorm:"size:255" json:"avatar"`                            // Path file foto profil
	Signature      string         `gorm:"size:255" json:"signature"`                         // Path file tanda tangan digital
	Paraf          string         `gorm:"size:255" json:"paraf"`                             // Path file paraf digital
	CreatedAt      time.Time      `json:"created_at"`                                        // Waktu data dibuat
	UpdatedAt      time.Time      `json:"updated_at"`                                        // Waktu data terakhir diperbarui
	DeletedAt      gorm.DeletedAt `json:"-"`                                                 // Waktu data dihapus (soft delete)
}

// TableName mengembalikan nama tabel kustom untuk GORM
func (User) TableName() string {
	return "users"
}
