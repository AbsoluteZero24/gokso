package models

import (
	"time"

	"gorm.io/gorm"
)

type MaintenanceReport struct {
	ID                string    `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	AssetID           string    `gorm:"size:36;not null;index"`
	Asset             AssetKSO  `gorm:"foreignKey:AssetID"`
	CheckerID         string    `gorm:"size:36"` // Admin ID (Admin model or User model?)
	AntivirusUpdated  bool      `gorm:"default:false"`
	ClearTemporary    bool      `gorm:"default:false"`
	OverallCondition  string    `gorm:"size:50"` // Normal / Tidak Normal
	InspectionDate    time.Time `gorm:"not null"`
	Remarks           string    `gorm:"type:text"`
	Period            string    `gorm:"size:50"` // e.g., "S1-2026", "S2-2026"
	UserName          string    `gorm:"size:100"`
	UserPosition      string    `gorm:"size:100"`
	UserBranch        string    `gorm:"size:100"`
	UserDepartment    string    `gorm:"size:100"`
	UserSubDepartment string    `gorm:"size:100"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         gorm.DeletedAt `gorm:"index"`
}

func (MaintenanceReport) TableName() string {
	return "maintenance_reports"
}
