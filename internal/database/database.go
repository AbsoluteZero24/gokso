package database

import (
	"fmt"
	"log"

	"github.com/AbsoluteZero24/gokso/internal/config"
	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Initialize melakukan koneksi ke database PostgreSQL menggunakan konfigurasi yang diberikan
func Initialize(dbConfig config.DBConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable Timezone=Asia/Jakarta",
		dbConfig.DBHost, dbConfig.DBUser, dbConfig.DBPassword, dbConfig.DBName, dbConfig.DBPort)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return db, nil
}

// Migrate melakukan migrasi skema database untuk semua model yang terdaftar
func Migrate(db *gorm.DB) {
	// Drop any potential old indices or constraints that don't account for soft delete
	db.Exec("DROP INDEX IF EXISTS idx_asset_kso_inventory_number")
	db.Exec("DROP INDEX IF EXISTS inventory_number")
	db.Exec("ALTER TABLE asset_kso DROP CONSTRAINT IF EXISTS idx_asset_kso_inventory_number")
	db.Exec("ALTER TABLE asset_kso DROP CONSTRAINT IF EXISTS asset_kso_inventory_number_key")
	db.Exec("ALTER TABLE asset_kso DROP CONSTRAINT IF EXISTS inventory_number_key")
	db.Exec("ALTER TABLE asset_kso DROP CONSTRAINT IF EXISTS uni_asset_kso_inventory_number")
	db.Exec("ALTER TABLE dms_files ALTER COLUMN folder_id DROP NOT NULL")
	db.Exec("UPDATE dms_files SET folder_id = NULL WHERE folder_id = ''")
	db.Exec("ALTER TABLE dms_folders ALTER COLUMN parent_id DROP NOT NULL")
	db.Exec("UPDATE dms_folders SET parent_id = NULL WHERE parent_id = ''")

	for _, model := range models.RegisterModels() {
		err := db.Debug().AutoMigrate(model.Model)
		if err != nil {
			log.Fatal(err)
		}
	}

	fmt.Println("Database Migrated Successfully")
}
