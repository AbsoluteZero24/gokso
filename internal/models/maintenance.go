package models

import (
	"time"

	"gorm.io/gorm"
)

type MaintenanceDocument struct {
	ID            string `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	Category      string `gorm:"size:50;index"`
	Branch        string `gorm:"size:100;index"`
	Department    string `gorm:"size:100;index"`
	SubDepartment string `gorm:"size:100;index"`
	Period        string `gorm:"size:50;index"` // e.g., "S1-2026"
	Status        string `gorm:"size:20;default:'Draft'"`
	SubmittedByID string `gorm:"size:36"`
	ApprovedByID  string `gorm:"size:36"`
	SubmittedAt   *time.Time
	ApprovedAt    *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"`
}

func (MaintenanceDocument) TableName() string {
	return "maintenance_documents"
}

type MaintenanceReport struct {
	ID                string               `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	DocumentID        *string              `gorm:"size:36;index"` // Nullable for draft states not yet batched
	Document          *MaintenanceDocument `gorm:"foreignKey:DocumentID"`
	AssetID           string               `gorm:"size:36;not null;index"`
	Asset             AssetKSO             `gorm:"foreignKey:AssetID"`
	CheckerID         string               `gorm:"size:36"` // Admin ID (Admin model or User model?)
	AntivirusUpdated  bool                 `gorm:"default:false"`
	ClearTemporary    bool                 `gorm:"default:false"`
	OverallCondition  string               `gorm:"size:50"` // Normal / Tidak Normal
	InspectionDate    time.Time            `gorm:"not null"`
	Remarks           string               `gorm:"type:text"`
	Period            string               `gorm:"size:50"` // e.g., "S1-2026", "S2-2026"
	UserName          string               `gorm:"size:100"`
	UserPosition      string               `gorm:"size:100"`
	UserBranch        string               `gorm:"size:100"`
	UserDepartment    string               `gorm:"size:100"`
	UserSubDepartment string               `gorm:"size:100"`
	SubmittedByID     string               `gorm:"size:36"`
	ApprovedByID      string               `gorm:"size:36"`
	IsSubmitted       bool                 `gorm:"default:false"`
	IsApproved        bool                 `gorm:"default:false"`
	SubmittedAt       *time.Time
	ApprovedAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         gorm.DeletedAt `gorm:"index"`
}

func (MaintenanceReport) TableName() string {
	return "maintenance_reports"
}
