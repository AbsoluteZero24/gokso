package app

import (
	"flag"
	"log"
	"os"

	"github.com/AbsoluteZero24/goaset/internal/config"
	"github.com/AbsoluteZero24/goaset/internal/handlers"
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

	appConfig.AppName = Getenv("APP_NAME", "Goaset")
	appConfig.AppEnv = Getenv("APP_ENV", "development")
	appConfig.AppPort = Getenv("APP_PORT", "9001")

	dbConfig.DBHost = Getenv("DB_HOST", "localhost")
	dbConfig.DBUser = Getenv("DB_USER", "postgres")
	dbConfig.DBPassword = Getenv("DB_PASSWORD", "Sci$iK50")
	dbConfig.DBName = Getenv("DB_NAME", "goasetdb")
	dbConfig.DBPort = Getenv("DB_PORT", "5432")

	flag.Parse()
	arg := flag.Arg(0)

	if arg != "" {
		server.InitCommands(appConfig, dbConfig)
	} else {
		server.Initialize(appConfig, dbConfig)
		server.Run(":" + appConfig.AppPort)
	}
}
