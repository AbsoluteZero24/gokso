package models

import (
	"time"

	"gorm.io/gorm"
)

type MasterBranch struct {
	ID          uint               `gorm:"primaryKey"`
	Name        string             `gorm:"size:100;not null;uniqueIndex"`
	Departments []MasterDepartment `gorm:"foreignKey:MasterBranchID"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

type MasterDepartment struct {
	ID             uint                  `gorm:"primaryKey"`
	MasterBranchID uint                  `gorm:"index"`
	MasterBranch   MasterBranch          `gorm:"foreignKey:MasterBranchID"`
	Name           string                `gorm:"size:100;not null"`
	SubDepartments []MasterSubDepartment `gorm:"foreignKey:MasterDepartmentID"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt `gorm:"index"`
}

type MasterSubDepartment struct {
	ID                 uint             `gorm:"primaryKey"`
	MasterDepartmentID uint             `gorm:"index"`
	MasterDepartment   MasterDepartment `gorm:"foreignKey:MasterDepartmentID"`
	Name               string           `gorm:"size:100;not null"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
	DeletedAt          gorm.DeletedAt `gorm:"index"`
}

type MasterPosition struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"size:100;not null;uniqueIndex"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type MasterAssetCategory struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"size:100;not null;uniqueIndex"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type MasterRamType struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"size:100;not null;uniqueIndex"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type MasterStorageType struct {
	ID        uint   `gorm:"primaryKey"`
	Name      string `gorm:"size:100;not null;uniqueIndex"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}
