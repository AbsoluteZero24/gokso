package app

import (
	"flag"
	"log"
	"os"

	"github.com/AbsoluteZero24/gokso/internal/config"
	"github.com/AbsoluteZero24/gokso/internal/database"
	"github.com/AbsoluteZero24/gokso/internal/database/seeders"
	"github.com/AbsoluteZero24/gokso/internal/handlers"
	"github.com/joho/godotenv"
)

// Getenv mengambil nilai environment variable atau mengembalikan fallback jika tidak ditemukan
func Getenv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}

	return fallback
}

// Run mengatur konfigurasi awal dan menjalankan aplikasi
func Run() {
	var server = handlers.Server{}
	var appConfig = config.AppConfig{}
	var dbConfig = config.DBConfig{}

	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	appConfig.AppName = Getenv("APP_NAME", "gokso")
	appConfig.AppEnv = Getenv("APP_ENV", "development")
	appConfig.AppPort = Getenv("APP_PORT", "9001")

	dbConfig.DBHost = Getenv("DB_HOST", "localhost")
	dbConfig.DBUser = Getenv("DB_USER", "postgres")
	dbConfig.DBPassword = Getenv("DB_PASSWORD", "Sci$iK50")
	dbConfig.DBName = Getenv("DB_NAME", "goksodb")
	dbConfig.DBPort = Getenv("DB_PORT", "5432")

	flag.Parse()
	arg := flag.Arg(0)

	// Support for monolithic initialization via env var
	autoMigrate := Getenv("APP_AUTO_MIGRATE", "true") == "true"

	if arg != "" {
		server.InitCommands(appConfig, dbConfig)
	} else {
		server.Initialize(appConfig, dbConfig)

		if autoMigrate {
			log.Println("Auto-migration enabled. Initializing database...")
			database.Migrate(server.DB)

			log.Println("Seeding database...")
			// We can call specific seeders or the main DBSeed
			seeders.SeedRoles(server.DB)
			seeders.SeedAdmin(server.DB)
			seeders.SeedPermissions(server.DB)
			seeders.SeedMasterDataUser(server.DB)
			seeders.SeedMasterDataAsset(server.DB)
			seeders.SeedDMS(server.DB)
			log.Println("Database initialization complete.")
		}

		server.Run(":" + appConfig.AppPort)
	}
}
