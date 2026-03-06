package models

import "time"

type RolePermission struct {
	ID        uint   `gorm:"primaryKey"`
	Role      string `gorm:"size:50;not null;index"`
	Resource  string `gorm:"size:100;not null;index"`
	CanAccess bool   `gorm:"default:false"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
