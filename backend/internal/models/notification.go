package models

import (
	"time"

	"gorm.io/gorm"
)

// Notification merepresentasikan pemberitahuan sistem kepada user tertentu
type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`               // ID unik notifikasi (Auto Increment)
	UserID    string         `gorm:"size:36;not null" json:"user_id"`    // ID user penerima notifikasi
	Title     string         `gorm:"size:100;not null" json:"title"`     // Judul notifikasi
	Message   string         `gorm:"type:text;not null" json:"message"`  // Isi pesan notifikasi
	Type      string         `gorm:"size:20;default:'info'" json:"type"` // Tipe (info, warning, success, error)
	Link      string         `gorm:"size:255" json:"link"`               // URL tujuan saat notifikasi diklik
	IsRead    bool           `gorm:"default:false" json:"is_read"`       // Status apakah sudah dibaca
	CreatedAt time.Time      `json:"created_at"`                         // Waktu notifikasi dikirim
	UpdatedAt time.Time      `json:"updated_at"`                         // Waktu terakhir status diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                     // Waktu notifikasi dihapus (soft delete)
}
