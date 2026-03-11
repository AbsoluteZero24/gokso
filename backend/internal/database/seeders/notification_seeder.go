package seeders

import (
	"log"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

// SeedNotifications fills notifications table with sample data
func SeedNotifications(db *gorm.DB) {
	var count int64
	db.Model(&models.Notification{}).Count(&count)
	if count > 0 {
		return
	}

	// Find a user to assign notifications to
	var user models.User
	if err := db.First(&user).Error; err != nil {
		log.Println("Skipping Notification Seeder: No user found")
		return
	}

	notifications := []models.Notification{
		{
			UserID:  user.ID,
			Title:   "New Asset Assigned",
			Message: "Laptop Dell XPS has been assigned to your department for verification.",
			Type:    "info",
			IsRead:  false,
		},
		{
			UserID:  user.ID,
			Title:   "Maintenance Reminder",
			Message: "Maintenance for Asset LPT-2024-001 is overdue by 3 days.",
			Type:    "warning",
			IsRead:  false,
		},
		{
			UserID:  user.ID,
			Title:   "System Update",
			Message: "GoKSO version 2.4.0 has been deployed successfully.",
			Type:    "success",
			IsRead:  true,
		},
		{
			UserID:  user.ID,
			Title:   "Form BAST Approved",
			Message: "Your request for Form BAST Laptop has been approved by Admin.",
			Type:    "success",
			IsRead:  true,
		},
	}

	for _, notif := range notifications {
		if err := db.Create(&notif).Error; err != nil {
			log.Printf("Could not seed notification: %v", err)
		}
	}

	log.Println("Notification table seeded successfully.")
}
