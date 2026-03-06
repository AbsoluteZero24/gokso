package models

import (
	"time"
)

type Admin struct {
	ID        string `gorm:"size:36;not null;uniqueIndex;primaryKey"`
	UserID    string `gorm:"size:36;index"` // link to User model
	Username  string `gorm:"size:50;not null;uniqueIndex"`
	Password  string `gorm:"size:255;not null"` // hashed password with bcrypt
	Role      string `gorm:"size:50;not null"`  // super_admin, asset_manager
	Avatar    string `gorm:"size:255"`          // profile picture filename
	Signature string `gorm:"size:255"`          // signature picture filename
	CreatedAt time.Time
	UpdatedAt time.Time
}
