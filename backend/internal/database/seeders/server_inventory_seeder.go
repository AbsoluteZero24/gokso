package seeders

import (
	"fmt"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

func SeedFMSI0101(db *gorm.DB) error {
	// If table exists but period is empty/null, clear it
	var check models.FMSI0101
	if err := db.Where("period IS NULL OR period = ?", "").First(&check).Error; err == nil {
		db.Exec("TRUNCATE table fmsi0101_servers RESTART IDENTITY")
	}

	var count int64
	db.Model(&models.FMSI0101{}).Count(&count)
	if count > 0 {
		return nil
	}

	servers := []models.FMSI0101{
		{Name: "SRV-DW", Period: "2026", IPAddress: "192.168.1.203", OS: "WINDOWS SERVER 2016", CPU: "16 Core", RAM: "192 GB", Storage: "1.9 TB", Function: "Sebagai database datawarehouse"},
		{Name: "KSOSRV-1", Period: "2026", IPAddress: "192.168.1.105", OS: "WINDOWS SERVER 2016", CPU: "32 Core", RAM: "256 GB", Storage: "1.1 TB", Function: "Sebagai server database aplikasi keuangan"},
		{Name: "WEBSRV-VPTI02", Period: "2026", IPAddress: "192.168.1.249", OS: "CENTOS 6.7", CPU: "8 Core", RAM: "32 GB", Storage: "838 GB", Function: "Sebagai Web Server VPTI Online"},
		{Name: "DB-HISTORY", Period: "2026", IPAddress: "192.168.1.1212", OS: "WINDOWS SERVER 2012 R2", CPU: "16 Core", RAM: "64 GB", Storage: "2.72 TB", Function: "Sebagai Database Reporting dan Database History"},
		{Name: "KSOSRV-DR", Period: "2026", IPAddress: "192.168.1.130", OS: "WINDOWS SERVER 2012 R2", CPU: "6 Core", RAM: "12 GB", Storage: "1.08 TB", Function: "Sebagai Server Data Warehouse"},
		{Name: "eFAKTUR", Period: "2026", IPAddress: "192.168.1.69", OS: "WINDOWS SERVER 2016", CPU: "6 Core", RAM: "16 GB", Storage: "557 GB", Function: "Server untuk mengirim faktur ke kantor pajak"},
		{Name: "KSOSRV-2", Period: "2026", IPAddress: "192.168.1.211", OS: "WINDOWS SERVER 2016", CPU: "20 Core", RAM: "64 GB", Storage: "544 GB", Function: "Sebagai DB history server keuangan"},
		{Name: "FTPCLN", Period: "2026", IPAddress: "192.168.1.100", OS: "WINDOWS SERVER 2012 R2", CPU: "6 Core", RAM: "16 GB", Storage: "884 GB", Function: "Sebagai fasilitas pengiriman draft LS dari KSO CLN menggunakan FTP Filezilla"},
		{Name: "SRV-BACKUP", Period: "2026", IPAddress: "192.168.1.112", OS: "WINDOWS SERVER 2016", CPU: "16 Core", RAM: "32 GB", Storage: "17.9 TB", Function: "Sebagai server backup"},
		{Name: "SRV-VPTIDB01", Period: "2026", IPAddress: "192.168.1.114", OS: "WINDOWS SERVER 2016", CPU: "32 Core", RAM: "256 GB", Storage: "1.8 TB", Function: "Sebagai database aplikasi VPTI Online"},
		{Name: "SRV-KEUDB01", Period: "2026", IPAddress: "192.168.1.204", OS: "WINDOWS SERVER 2016", CPU: "40 Core", RAM: "256 GB", Storage: "3.2 TB", Function: "Sebagai Server Database Keuangan (Aplikasi KSO Onesoft, Aplikasi KSO-SOA, Payment Online)"},
		{Name: "VM-Host01", Period: "2026", IPAddress: "192.168.1.52", OS: "ESXi 7.0", CPU: "40 Core", RAM: "384 GB", Storage: "267 GB", Function: "Sebagai Host VM"},
		{Name: "VM-Host02", Period: "2026", IPAddress: "192.168.1.53", OS: "ESXi 7.0", CPU: "40 Core", RAM: "384 GB", Storage: "267 GB", Function: "Sebagai Host VM"},
		{Name: "VM-Host03", Period: "2026", IPAddress: "192.168.1.54", OS: "ESXi 7.0", CPU: "40 Core", RAM: "384 GB", Storage: "267 GB", Function: "Sebagai Host VM"},
		{Name: "VM-Host04", Period: "2026", IPAddress: "192.168.1.71", OS: "ESXi 7.0", CPU: "40 Core", RAM: "384 GB", Storage: "267 GB", Function: "Sebagai Host VM"},
		{Name: "ContactCenter-DB", Period: "2026", IPAddress: "192.168.1.236", OS: "WINDOWS SERVER 2016", CPU: "4 Core", RAM: "8 GB", Storage: "580 GB", Function: "Sebagai Database Contact Center"},
	}

	for _, s := range servers {
		if err := db.Create(&s).Error; err != nil {
			return fmt.Errorf("failed to seed FMSI0101: %w", err)
		}
	}

	return nil
}
