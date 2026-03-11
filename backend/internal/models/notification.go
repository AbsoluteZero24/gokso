package models

import (
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    string         `gorm:"size:36;not null" json:"user_id"` // Target user ID
	Title     string         `gorm:"size:100;not null" json:"title"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	Type      string         `gorm:"size:20;default:'info'" json:"type"` // info, warning, success, error
	Link      string         `gorm:"size:255" json:"link"`               // Re-route URL
	IsRead    bool           `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
