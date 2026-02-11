package seeders

import (
	"math/rand"

	"github.com/AbsoluteZero24/goaset/internal/database/fakers"
	"gorm.io/gorm"
)

// DBSeed menjalankan semua seeder utama untuk mengisi data awal database
func DBSeed(db *gorm.DB) error {
	// Seed Users
	var userIDs []string
	for i := 0; i < 10; i++ {
		user := fakers.UserFaker(db)
		if err := db.Create(user).Error; err != nil {
			return err
		}
		userIDs = append(userIDs, user.ID)
	}

	// Seed AssetKSO
	for i := 0; i < 20; i++ {
		assetKSO := fakers.AssetKSOFaker()
		// Randomly assign some assets to users
		if len(userIDs) > 0 && rand.Intn(10) > 2 {
			uid := userIDs[rand.Intn(len(userIDs))]
			assetKSO.UserID = &uid
		}

		if err := db.Create(assetKSO).Error; err != nil {
			return err
		}
	}

	return nil
}
