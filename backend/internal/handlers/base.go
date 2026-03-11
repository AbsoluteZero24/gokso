package handlers

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/AbsoluteZero24/gokso/internal/config"
	"github.com/AbsoluteZero24/gokso/internal/database"
	"github.com/AbsoluteZero24/gokso/internal/database/seeders"
	"github.com/gorilla/mux"
	"github.com/unrolled/render"
	"github.com/urfave/cli"
	"gorm.io/gorm"
)

type Server struct {
	DB       *gorm.DB
	Router   *mux.Router
	Renderer *render.Render
}

// Initialize mengatur koneksi database, sistem render template, dan inisialisasi rute
func (server *Server) Initialize(appConfig config.AppConfig, dbConfig config.DBConfig) {
	fmt.Println("Welcome to " + appConfig.AppName)

	var err error
	server.DB, err = database.Initialize(dbConfig)
	if err != nil {
		log.Fatal(err)
	}

	server.Renderer = render.New(render.Options{
		Layout: "layout",
		Funcs: []template.FuncMap{
			{
				"add": func(a, b int) int {
					return a + b
				},
				"formatSize": func(size int64) string {
					const (
						KB = 1024
						MB = KB * 1024
						GB = MB * 1024
						TB = GB * 1024
					)
					s := float64(size)
					if size >= TB {
						return fmt.Sprintf("%.2f TB", s/TB)
					}
					if size >= GB {
						return fmt.Sprintf("%.2f GB", s/GB)
					}
					if size >= MB {
						return fmt.Sprintf("%.2f MB", s/MB)
					}
					if size >= KB {
						return fmt.Sprintf("%.2f KB", s/KB)
					}
					return fmt.Sprintf("%.2f KB", s/KB) // Show small files in KB instead of 0 GB
				},
			},
		},
	})

	server.initializeRoutes()
}

// Run menjalankan server HTTP pada alamat (address) yang ditentukan
func (server *Server) Run(addr string) {
	fmt.Printf("Listening to port %s\n", addr)
	log.Fatal(http.ListenAndServe(addr, server.Router))
}

// InitCommands mendefinisikan dan menjalankan perintah CLI seperti migrasi dan seeding database
func (server *Server) InitCommands(appConfig config.AppConfig, dbConfig config.DBConfig) {
	var err error
	server.DB, err = database.Initialize(dbConfig)
	if err != nil {
		log.Fatal(err)
	}

	cmdApp := cli.NewApp()
	cmdApp.Commands = []cli.Command{
		{
			Name: "db:migrate",
			Action: func(c *cli.Context) error {
				database.Migrate(server.DB)
				return nil
			},
		},
		{
			Name: "db:seed",
			Action: func(c *cli.Context) error {
				err := seeders.DBSeed(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
		{
			Name: "db:seed_masterdata_user",
			Action: func(c *cli.Context) error {
				err := seeders.SeedMasterDataUser(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
		{
			Name: "db:seed_admin",
			Action: func(c *cli.Context) error {
				err := seeders.SeedAdmin(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
		{
			Name: "db:seed_permission",
			Action: func(c *cli.Context) error {
				err := seeders.SeedPermissions(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
		{
			Name: "db:seed_masterdata_asset",
			Action: func(c *cli.Context) error {
				err := seeders.SeedMasterDataAsset(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
		{
			Name: "db:seed_dms",
			Action: func(c *cli.Context) error {
				err := seeders.SeedDMS(server.DB)
				if err != nil {
					log.Fatal(err)
				}
				return nil
			},
		},
	}

	err = cmdApp.Run(os.Args)
	if err != nil {
		log.Fatal(err)
	}
}

// parseUint melakukan konversi string ke tipe data uint secara aman
func (server *Server) parseUint(s string) uint {
	u, _ := strconv.ParseUint(s, 10, 32)
	return uint(u)
}

// RenderHTML wraps renderer.HTML to include global data like Admin info
// RenderHTML membungkus proses rendering template dengan tambahan data global (seperti info Admin)
func (server *Server) RenderHTML(w http.ResponseWriter, r *http.Request, status int, name string, binding interface{}) {
	var data map[string]interface{}

	if binding == nil {
		data = make(map[string]interface{})
	} else {
		// Convert binding to map if possible, or wrap it
		if m, ok := binding.(map[string]interface{}); ok {
			data = m
		} else {
			data = map[string]interface{}{
				"Data": binding,
			}
		}
	}

	// Add Admin Data
	adminData := server.GetAdminData(r)
	for k, v := range adminData {
		data[k] = v
	}

	_ = server.Renderer.HTML(w, status, name, data)
}
