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
	// Cek apakah database sudah diinisialisasi (dengan mengecek tabel users)
	if db.Migrator().HasTable("users") {
		var count int64
		db.Table("users").Count(&count)
		if count > 0 {
			fmt.Println("Database already initialized. Ensuring new tables exist...")
		}
	}

	fmt.Println("Memulai proses migrasi database...")

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

	// 1. Migrate Admin table to User table before dropping it
	if db.Migrator().HasTable("admins") {
		fmt.Println("Migrating legacy 'admins' table data to 'users' table...")
		
		// Move system accounts (no UserID)
		db.Exec(`
			INSERT INTO users (id, nik, name, email, password, role, position, created_at, updated_at)
			SELECT id, 'SYS' || substr(id, 1, 8), username, username || '@system.local', password, role, 'System Account', created_at, updated_at
			FROM admins
			WHERE user_id IS NULL OR user_id = ''
			ON CONFLICT (id) DO NOTHING
		`)

		// Update existing users from linked admin accounts
		db.Exec(`
			UPDATE users
			SET role = admins.role,
			    password = admins.password
			FROM admins
			WHERE users.id = admins.user_id
			AND (users.role IS NULL OR users.role = '')
		`)

		fmt.Println("Dropping legacy 'admins' table...")
		db.Migrator().DropTable("admins")
	}

	for _, model := range models.RegisterModels() {
		err := db.Debug().AutoMigrate(model.Model)
		if err != nil {
			log.Fatal(err)
		}
	}

	// Migrate existing DMS file paths to new public/godms location
	db.Exec("UPDATE dms_files SET file_path = '/public' || file_path WHERE file_path LIKE '/godms/%'")

	fmt.Println("Database Migrated Successfully")
}
