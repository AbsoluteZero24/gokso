package seeders

import (
	"log"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

// SeedRoles memasukkan data role default ke dalam tabel roles
func SeedRoles(db *gorm.DB) error {
	roles := []models.Role{
		{
			Name:            "Super Admin",
			Description:     "Administrator dengan akses penuh ke seluruh sistem",
			Permissions:     "view_dashboard,view_goasset,view_inventory,view_asset_list,view_asset_service,view_asset_warehouse,view_asset_inactive,view_asset_management,view_goform,view_gosign,view_godms,view_edoc,view_trash,view_administration,view_user_list,view_employee_list,view_local_user,view_setting,view_master_collection,view_master_category,view_master_branch,view_master_department,view_master_position,view_roles",
			DMSFilterScope:  "All",
			AllowedSections: "", // All access
		},
		{
			Name:            "Koordinator",
			Description:     "Koordinator operasional",
			Permissions:     "view_dashboard,view_goasset,view_inventory,view_asset_list,view_asset_service,view_asset_warehouse,view_asset_inactive",
			DMSFilterScope:  "Department",
			AllowedSections: "",
		},
		{
			Name:            "Top Management",
			Description:     "Akses monitoring manajemen tingkat atas",
			Permissions:     "view_dashboard,view_goasset,view_godms,view_edoc",
			DMSFilterScope:  "All",
			AllowedSections: "",
		},
	}

	for _, role := range roles {
		var existing models.Role
		// Look for either the new name or the old name to handle upgrades
		oldNameMap := map[string]string{
			"Super Admin": "super_admin",
		}
		
		query := db.Where("name = ?", role.Name)
		if oldName, ok := oldNameMap[role.Name]; ok {
			query = db.Where("name = ? OR name = ?", role.Name, oldName)
		}
		
		if err := query.Limit(1).Find(&existing).Error; err == nil && existing.ID != 0 {
			// Update name if it was the old one
			if existing.Name != role.Name {
				db.Model(&existing).Update("name", role.Name)
				log.Printf("Renamed role from %s to %s\n", existing.Name, role.Name)
			}
			
			// Always sync permissions for Super Admin
			if role.Name == "Super Admin" {
				db.Model(&existing).Updates(map[string]interface{}{
					"DMSFilterScope": "All",
					"Permissions":    role.Permissions,
				})
			}
			continue
		}

		if err := db.Create(&role).Error; err != nil {
			return err
		}
		log.Printf("Created role: %s\n", role.Name)
	}

	// Optional: Remove old roles that are no longer needed
	oldRoles := []string{"staf_it", "asset_manager", "staf sdm", "support"}
	for _, oldRole := range oldRoles {
		db.Where("name = ?", oldRole).Delete(&models.Role{})
	}

	// Sync existing employees and admins to new role names
	syncMap := map[string]string{
		"super_admin":   "Super Admin",
		"staf_it":       "staf",
		"asset_manager": "Koordinator",
		"staf sdm":      "staf",
		"support":       "staf",
	}

	for old, new := range syncMap {
		db.Model(&models.User{}).Where("role = ?", old).Update("role", new)
	}

	return nil
}
