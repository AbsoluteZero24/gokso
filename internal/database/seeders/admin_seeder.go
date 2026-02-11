package seeders

import (
	"log"

	"github.com/AbsoluteZero24/goaset/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// hashPassword melakukan enkripsi password menggunakan algoritma bcrypt
func hashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	return string(bytes)
}

// SeedAdmin memasukkan data admin default (Super Admin & Asset Manager) ke database
func SeedAdmin(db *gorm.DB) error {
	admins := []models.Admin{
		{
			ID:       uuid.New().String(),
			Username: "useradmin",
			Password: hashPassword("admin123"),
			Role:     "super_admin",
		},
		{
			ID:       uuid.New().String(),
			Username: "useraset",
			Password: hashPassword("aset123"),
			Role:     "asset_manager",
		},
	}

	for _, admin := range admins {
		var existing models.Admin
		if err := db.Where("username = ?", admin.Username).First(&existing).Error; err == nil {
			log.Printf("Admin '%s' already exists, skipping...\n", admin.Username)
			continue
		}

		if err := db.Create(&admin).Error; err != nil {
			return err
		}
		log.Printf("Created admin: %s (role: %s)\n", admin.Username, admin.Role)
	}

	return nil
}
