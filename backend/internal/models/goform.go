package models

import "time"

type GoForm struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	FormID      string    `gorm:"size:100;not null;uniqueIndex" json:"form_id"` // e.g. form-bast-laptop
	Name        string    `gorm:"size:255;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	Icon        string    `gorm:"size:50;default:'FileText'" json:"icon"`
	Color       string    `gorm:"size:20;default:'#1e59c5'" json:"color"`
	Category    string    `gorm:"size:100" json:"category"`
	Section     string    `gorm:"type:text" json:"section"` // Comma separated allowed departments. Empty means ALL.
	Status      string    `gorm:"size:20;default:'Active'" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
