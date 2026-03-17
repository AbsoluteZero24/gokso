package models

import (
	"time"

	"gorm.io/gorm"
)

type FMSI0101 struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Period    string         `gorm:"size:20;not null;index" json:"period"`
	IPAddress string         `gorm:"size:50" json:"ip_address"`
	OS        string         `gorm:"size:100" json:"os"`
	CPU       string         `gorm:"size:50" json:"cpu"`
	RAM       string         `gorm:"size:50" json:"ram"`
	Storage   string         `gorm:"size:50" json:"storage"`
	Function  string         `gorm:"type:text" json:"function"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FMSI0101) TableName() string {
	return "fmsi0101_servers"
}
