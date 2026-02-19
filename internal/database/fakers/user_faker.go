package fakers

import (
	"time"

	"github.com/bxcodec/faker/v3"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserFaker menghasilkan data karyawan buatan (dummy) untuk keperluan testing atau seeding
func UserFaker(db *gorm.DB) *models.User {

	return &models.User{
		ID:             uuid.New().String(),
		NIK:            faker.Phonenumber(), // Use phonenumber or similar for NIK faker
		Name:           faker.Name(),
		Email:          faker.Email(),
		Branch:         faker.Word(),
		Department:     faker.Word(),
		SubDepartment:  faker.Word(),
		Position:       faker.Word(),
		StatusKaryawan: "Tetap",                                // or faker word
		Password:       "dfasfsadgfreagfeawfasdfasfsadfsdafas", //password
		CreatedAt:      time.Time{},
		UpdatedAt:      time.Time{},
		DeletedAt:      gorm.DeletedAt{},
	}
}
