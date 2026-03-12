package seeders

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

// SeedPermissions mengatur data izin akses (permission) default untuk setiap peran (role)
func SeedPermissions(db *gorm.DB) error {
	resources := []string{
		"view_dashboard",
		"view_goasset",
		"view_inventory",
		"view_asset_list",
		"view_asset_service",
		"view_asset_warehouse",
		"view_asset_inactive",
		"view_asset_management",
		"view_goform",
		"view_gosign",
		"view_godms",
		"view_edoc",
		"view_trash",
		"view_administration",
		"view_user_list",
		"view_employee_list",
		"view_local_user",
		"view_setting",
		"view_master_collection",
		"view_master_category",
		"view_master_branch",
		"view_master_department",
		"view_master_position",
		"view_roles",
	}

	roles := []string{"Super Admin", "Koordinator", "Top Management"}

	for _, role := range roles {
		for _, res := range resources {
			var count int64
			db.Model(&models.RolePermission{}).Where("role = ? AND resource = ?", role, res).Count(&count)
			if count == 0 {
				canAccess := false
				if role == "Super Admin" {
					canAccess = true
				} else if role == "Koordinator" {
					if res == "view_dashboard" || res == "view_goasset" || res == "view_inventory" || res == "view_asset_list" || res == "view_asset_service" || res == "view_asset_warehouse" || res == "view_asset_inactive" {
						canAccess = true
					}
				} else if role == "Top Management" {
					if res == "view_dashboard" || res == "view_goasset" || res == "view_godms" || res == "view_edoc" {
						canAccess = true
					}
				} else if role == "staf" {
					if res == "view_dashboard" || res == "view_goform" || res == "view_gosign" {
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
