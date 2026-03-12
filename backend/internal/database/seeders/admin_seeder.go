package seeders

import (
	"log"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedAdmin seeds the default admin user
func SeedAdmin(db *gorm.DB) error {
	var count int64
	db.Model(&models.User{}).Where("nik = ?", "admin").Count(&count)
	if count > 0 {
		return nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("1qaz2wsx"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := models.User{
		ID:             uuid.New().String(),
		NIK:            "admin",
		Name:           "Administrator",
		Email:          "admin@gokso.id",
		Branch:         "KSO PUSAT",
		Department:     "Sistem Informasi",
		Position:       "Super Admin",
		StatusKaryawan: "Tetap",
		Password:       string(hashedPassword),
		Role:           "Super Admin",
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("Error seeding admin: %v", err)
		return err
	}

	log.Println("Default admin user created successfully.")
	return nil
}
