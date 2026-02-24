package models

import (
	"time"

	"gorm.io/gorm"
)

type DMSFolder struct {
	ID        string     `gorm:"type:varchar(36);primary_key"`
	Name      string     `gorm:"type:varchar(255);not null"`
	Section   string     `gorm:"type:varchar(100);index"` // The DMS section this folder belongs to
	Color     string     `gorm:"type:varchar(20)"`        // Icon color
	ParentID  *string    `gorm:"type:varchar(36)"`        // For nested folders
	IsSystem  bool       `gorm:"default:false"`           // For folders like "Trash"
	TrashedAt *time.Time `gorm:"index"`                   // When it was moved to trash
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
	Files     []DMSFile      `gorm:"foreignKey:FolderID"`
}

type DMSFile struct {
	ID         string     `gorm:"type:varchar(36);primary_key"`
	FolderID   *string    `gorm:"type:varchar(36);index"`
	Section    string     `gorm:"type:varchar(100);index"` // The DMS section this file belongs to
	Name       string     `gorm:"type:varchar(255);not null"`
	Category   string     `gorm:"type:varchar(100)"`
	Size       int64      `gorm:"type:bigint"`
	Extension  string     `gorm:"type:varchar(10)"`
	FilePath   string     `gorm:"type:text"`
	UploadedBy string     `gorm:"type:varchar(36)"`
	TrashedAt  *time.Time `gorm:"index"` // When it was moved to trash
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
}
