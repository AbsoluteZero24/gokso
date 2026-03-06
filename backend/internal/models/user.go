package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID             string `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	NIK            string `gorm:"size:20;uniqueIndex"`
	Name           string `gorm:"size:100;not null"`
	Email          string `gorm:"size:100;not null;uniqueIndex"`
	Branch         string `gorm:"size:100"`         // Cabang
	Department     string `gorm:"size:100"`         // Bagian
	SubDepartment  string `gorm:"size:100"`         // Sub Bagian
	Position       string `gorm:"size:50;not null"` // Jabatan
	StatusKaryawan string `gorm:"size:50"`
	PhoneNumber    string `gorm:"size:20"`
	Password       string `gorm:"size:100;not null"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt
}
