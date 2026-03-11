package fakers

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/bxcodec/faker/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"
)

// UserFaker creates a fake user
func UserFaker(db *gorm.DB) *models.User {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	
	return &models.User{
		ID:             uuid.New().String(),
		NIK:            faker.UUIDDigit()[:10],
		Name:           faker.Name(),
		Email:          faker.Email(),
		Branch:         "KSO PUSAT",
		Department:     "Sistem Informasi",
		Position:       "Staff",
		StatusKaryawan: "Tetap",
		Password:       string(hashedPassword),
	}
}
