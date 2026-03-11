package models

import "time"

type Role struct {
	ID          uint   `gorm:"primaryKey"`
	Name        string `gorm:"size:100;not null;uniqueIndex"`
	Description string `gorm:"size:255"`
	Permissions     string `gorm:"type:text"` // Comma separated permission IDs
	DMSFilterScope  string `gorm:"size:20;default:'All'"` // All, Department
	AllowedSections string `gorm:"type:text"`             // Comma separated allowed sections for this role
	UserCount       int64  `gorm:"-" json:"user_count"`   // Count of users assigned to this role
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type RolePermission struct {
	ID        uint   `gorm:"primaryKey"`
	Role      string `gorm:"size:50;not null;index"`
	Resource  string `gorm:"size:100;not null;index"`
	CanAccess bool   `gorm:"default:false"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
