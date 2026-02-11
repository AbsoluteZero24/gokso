package seeders

import (
	"github.com/AbsoluteZero24/goaset/internal/models"
	"gorm.io/gorm"
)

// SeedPermissions mengatur data izin akses (permission) default untuk setiap peran (role)
func SeedPermissions(db *gorm.DB) error {
	resources := []string{
		"dashboard",
		"inventori",
		"asset_management",
		"maintenance",
		"administration",
		"setting",
	}

	roles := []string{"super_admin", "asset_manager", "staf_it", "support"}

	for _, role := range roles {
		for _, res := range resources {
			var count int64
			db.Model(&models.RolePermission{}).Where("role = ? AND resource = ?", role, res).Count(&count)
			if count == 0 {
				canAccess := false
				if role == "super_admin" {
					canAccess = true
				} else if role == "asset_manager" {
					// Default for asset_manager
					if res == "dashboard" || res == "inventori" || res == "asset_management" || res == "maintenance" {
						canAccess = true
					}
				} else if role == "staf_it" {
					if res == "dashboard" || res == "asset_management" || res == "maintenance" {
						canAccess = true
					}
				} else if role == "support" {
					if res == "dashboard" {
						canAccess = true
					}
				}

				perm := models.RolePermission{
					Role:      role,
					Resource:  res,
					CanAccess: canAccess,
				}
				if err := db.Create(&perm).Error; err != nil {
					return err
				}
			}
		}
	}

	return nil
}
