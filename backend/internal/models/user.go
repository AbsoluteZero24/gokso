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
	Branch         string `gorm:"size:100;index"`         // Cabang
	Department     string `gorm:"size:100;index"`         // Bagian
	SubDepartment  string `gorm:"size:100;index"`         // Sub Bagian
	Position       string `gorm:"size:50;not null;index"` // Jabatan
	StatusKaryawan string `gorm:"size:50"`
	PhoneNumber    string `gorm:"size:20"`
	Password       string `gorm:"size:255;not null"`
	Role           string `gorm:"size:50;index"` // Super Admin, Koordinator, staf, etc.
	Avatar         string `gorm:"size:255"`
	Signature      string `gorm:"size:255"`
	Paraf          string `gorm:"size:255"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      gorm.DeletedAt
}

func (User) TableName() string {
	return "users" // Keep the table name as 'users'
}
