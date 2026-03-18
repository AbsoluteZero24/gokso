package models

import (
	"time"

	"gorm.io/gorm"
)

// EDIDDocument merepresentasikan dokumen eDID (Electronic Document ID) dalam sistem GoDMS
type EDIDDocument struct {
	ID         uint           `gorm:"primaryKey" json:"id"`                                        // ID unik dokumen (Auto Increment)
	DocNo      string         `gorm:"type:varchar(100);uniqueIndex:idx_doc_category;not null" json:"doc_no"` // Nomor dokumen resmi
	Name       string         `gorm:"type:varchar(255);not null" json:"name"`                       // Nama atau judul dokumen
	Revision   int            `gorm:"type:int;default:0" json:"revision"`                           // Nomor revisi dokumen
	Date       string         `gorm:"type:varchar(20)" json:"date"`                                 // Tanggal dokumen (Format: YYYY-MM-DD)
	Category   string         `gorm:"type:varchar(100);uniqueIndex:idx_doc_category;index" json:"category"` // Kategori dokumen (misal: "SOP", "Instruksi Kerja")
	FilePath   string         `gorm:"type:text" json:"file_path"`                                   // Path penyimpanan file di server
	CreatedBy  string         `gorm:"type:varchar(36)" json:"created_by"`                           // ID user yang menambahkan dokumen
	CreatedAt  time.Time      `json:"created_at"`                                                   // Waktu data dibuat
	UpdatedAt  time.Time      `json:"updated_at"`                                                   // Waktu terakhir data diperbarui
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`                                               // Waktu data dihapus (soft delete)
}

// TableName mengembalikan nama tabel kustom untuk GORM
func (EDIDDocument) TableName() string {
	return "edid_documents"
}
