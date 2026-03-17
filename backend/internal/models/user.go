package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID             string         `gorm:"size:36;not null;uniqueIndex;primaryKey" json:"id"`
	NIK            string         `gorm:"size:20;uniqueIndex" json:"nik"`
	Name           string         `gorm:"size:100;not null" json:"name"`
	Email          string         `gorm:"size:100;not null;uniqueIndex" json:"email"`
	Branch         string         `gorm:"size:100;index" json:"branch"`
	Department     string         `gorm:"size:100;index" json:"department"`
	SubDepartment  string         `gorm:"size:100;index" json:"sub_department"`
	Position       string         `gorm:"size:50;not null;index" json:"position"`
	StatusKaryawan string         `gorm:"size:50" json:"status_karyawan"`
	PhoneNumber    string         `gorm:"size:20" json:"phone_number"`
	Password       string         `gorm:"size:255;not null" json:"-"`
	Role           string         `gorm:"size:50;index" json:"role"`
	Avatar         string         `gorm:"size:255" json:"avatar"`
	Signature      string         `gorm:"size:255" json:"signature"`
	Paraf          string         `gorm:"size:255" json:"paraf"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-"`
}

func (User) TableName() string {
	return "users" // Keep the table name as 'users'
}
