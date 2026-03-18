package models

import (
	"time"

	"gorm.io/gorm"
)

// DMSFolder merepresentasikan folder dalam sistem Dokumen Manajemen (GoDMS)
type DMSFolder struct {
	ID        string         `gorm:"type:varchar(36);primary_key" json:"id"`        // ID unik folder (UUID)
	Name      string         `gorm:"type:varchar(255);not null" json:"name"`        // Nama folder
	Section   string         `gorm:"type:varchar(100);index" json:"section"`       // Bagian/Seksi pemilik folder (misal: "Sistem Informasi")
	Color     string         `gorm:"type:varchar(20)" json:"color"`                 // Kode warna ikon folder
	ParentID  *string        `gorm:"type:varchar(36)" json:"parent_id"`             // ID folder induk (untuk folder bersarang)
	IsSystem  bool           `gorm:"default:false" json:"is_system"`                // Penanda folder sistem (seperti "Trash")
	TrashedAt *time.Time     `gorm:"index" json:"trashed_at"`                       // Waktu folder dipindahkan ke tempat sampah
	CreatedAt time.Time      `json:"created_at"`                                    // Waktu folder dibuat
	UpdatedAt time.Time      `json:"updated_at"`                                    // Waktu terakhir folder diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                                // Waktu folder dihapus permanen (soft delete)
	Files     []DMSFile      `gorm:"foreignKey:FolderID" json:"files,omitempty"`    // Daftar file di dalam folder ini
}

// DMSFile merepresentasikan file dokumen dalam sistem GoDMS
type DMSFile struct {
	ID         string         `gorm:"type:varchar(36);primary_key" json:"id"`         // ID unik file (UUID)
	FolderID   *string        `gorm:"type:varchar(36);index" json:"folder_id"`        // ID folder tempat file berada
	Section    string         `gorm:"type:varchar(100);index" json:"section"`         // Bagian/Seksi pemilik file
	Name       string         `gorm:"type:varchar(255);not null" json:"name"`         // Nama file asli
	Category   string         `gorm:"type:varchar(100)" json:"category"`              // Kategori/Tipe dokumen
	Size       int64          `gorm:"type:bigint" json:"size"`                        // Ukuran file dalam bytes
	Extension  string         `gorm:"type:varchar(10)" json:"extension"`              // Ekstensi file (pdf, jpg, dll)
	FilePath   string         `gorm:"type:text" json:"file_path"`                     // Path/Lokasi penyimpanan file di server
	UploadedBy string         `gorm:"type:varchar(36)" json:"uploaded_by"`             // ID user yang mengunggah file
	TrashedAt  *time.Time     `gorm:"index" json:"trashed_at"`                        // Waktu file dipindahkan ke tempat sampah
	CreatedAt  time.Time      `json:"created_at"`                                     // Waktu file diunggah
	UpdatedAt  time.Time      `json:"updated_at"`                                     // Waktu terakhir data file diperbarui
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`                                 // Waktu file dihapus permanen (soft delete)
}
