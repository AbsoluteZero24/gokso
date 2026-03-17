package seeders

import (
	"fmt"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

func SeedEDID(db *gorm.DB) error {
	var oldDoc models.EDIDDocument
	if err := db.Where("doc_no = ?", "FM.SI.01").First(&oldDoc).Error; err == nil {
		db.Exec("TRUNCATE table edid_documents RESTART IDENTITY")
	}

	var count int64
	db.Model(&models.EDIDDocument{}).Count(&count)
	if count > 0 {
		return nil
	}

	documents := []models.EDIDDocument{
		// DOKUMEN INTERNAL
		{DocNo: "DI.32", Name: "Tata Cara Penyusunan Daftar Inventaris Teknologi Informasi (TI)", Revision: 1, Date: "2023-12-13", Category: "DOKUMEN INTERNAL"},

		// FORMULIR
		{DocNo: "FM.SI.0101", Name: "Daftar Server KSO SCSI", Revision: 5, Date: "2025-10-07", Category: "FORMULIR"},
		{DocNo: "FM.SI.0102", Name: "Laporan Pemeliharaan Komputer dan Laptop", Revision: 6, Date: "2025-10-07", Category: "FORMULIR"},
		{DocNo: "FM.SI.0103", Name: "Laporan Pemeliharaan Printer", Revision: 2, Date: "2025-10-07", Category: "FORMULIR"},
		{DocNo: "FM.SI.0104", Name: "Laporan Pemeliharaan Server", Revision: 2, Date: "2025-10-07", Category: "FORMULIR"},
		{DocNo: "FM.SI.0201", Name: "Form Backup", Revision: 5, Date: "2025-10-07", Category: "FORMULIR"},
		{DocNo: "FM.SI.0202", Name: "Form Restore", Revision: 3, Date: "2024-06-24", Category: "FORMULIR"},
		{DocNo: "FM.SI.0203", Name: "Rekapitulasi Permintaan Backup Data", Revision: 2, Date: "2024-06-24", Category: "FORMULIR"},
		{DocNo: "FM.SI.04", Name: "Log Book Data Center", Revision: 6, Date: "2024-03-26", Category: "FORMULIR"},
		{DocNo: "FM.SI.11", Name: "Daftar Pemantauan Peralatan Pemadam Api", Revision: 3, Date: "2024-03-27", Category: "FORMULIR"},
		
		// PROSEDUR
		{DocNo: "PM.SI.01", Name: "Prosedur Pemeliharaan dan Perbaikan Hardware", Revision: 12, Date: "2024-03-26", Category: "PROSEDUR"},
		{DocNo: "PM.SI.02", Name: "Prosedur Backup dan Restore Data", Revision: 12, Date: "2024-06-24", Category: "PROSEDUR"},
		{DocNo: "PM.SI.04", Name: "Prosedur Pemeliharaan Perangkat Pendukung Data Center", Revision: 5, Date: "2024-03-27", Category: "PROSEDUR"},
		{DocNo: "PM.SI.05", Name: "Prosedur Keamanan Teknologi Informasi", Revision: 6, Date: "2024-07-26", Category: "PROSEDUR"},
		{DocNo: "PM.SI.06", Name: "Prosedur Pengelolaan Insiden", Revision: 3, Date: "2024-12-24", Category: "PROSEDUR"},
		
		// MANUAL MUTU
		{DocNo: "MM.05", Name: "Manual SMKI", Revision: 4, Date: "2024-06-28", Category: "MANUAL MUTU"},
	}

	for _, doc := range documents {
		if err := db.Create(&doc).Error; err != nil {
			return fmt.Errorf("failed to seed edid document: %w", err)
		}
	}

	return nil
}
