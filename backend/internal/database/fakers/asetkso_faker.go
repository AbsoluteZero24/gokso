package fakers

import (
	"math/rand"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/bxcodec/faker/v3"
	"github.com/google/uuid"
)

// AssetKSOFaker menghasilkan data aset KSO buatan (dummy) untuk keperluan testing atau seeding
func AssetKSOFaker() *models.AssetKSO {
	categories := []string{"Laptop", "Komputer"}
	statuses := []string{"Ready", "Rusak"}

	return &models.AssetKSO{
		ID:              uuid.New().String(),
		InventoryNumber: "INV-" + faker.UUIDDigit(),
		AssetName:       faker.Word(),
		DeviceName:      faker.FirstName() + "'s Laptop", // Mocking device name
		Category:        categories[rand.Intn(len(categories))],
		PurchaseDate:    time.Now().AddDate(0, 0, -rand.Intn(1000)),
		Status:          statuses[rand.Intn(len(statuses))],
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
}
