package models

import (
	"time"

	"gorm.io/gorm"
)

type EDIDDocument struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	DocNo      string         `gorm:"type:varchar(100);uniqueIndex:idx_doc_category;not null" json:"doc_no"`
	Name       string         `gorm:"type:varchar(255);not null" json:"name"`
	Revision   int            `gorm:"type:int;default:0" json:"revision"`
	Date       string         `gorm:"type:varchar(20)" json:"date"` // stored as YYYY-MM-DD
	Category   string         `gorm:"type:varchar(100);uniqueIndex:idx_doc_category;index" json:"category"`
	FilePath   string         `gorm:"type:text" json:"file_path"`
	CreatedBy  string         `gorm:"type:varchar(36)" json:"created_by"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (EDIDDocument) TableName() string {
	return "edid_documents"
}
