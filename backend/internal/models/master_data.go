package models

import (
	"time"

	"gorm.io/gorm"
)

// MasterBranch menyimpan data cabang/lokasi kerja KSO SCSI
type MasterBranch struct {
	ID          uint               `gorm:"primaryKey" json:"id"`                      // ID unik cabang
	Name        string             `gorm:"size:100;not null;uniqueIndex" json:"name"` // Nama cabang (misal: "KSO PUSAT")
	Departments []MasterDepartment `gorm:"foreignKey:MasterBranchID" json:"departments,omitempty"` // Relasi ke bagian/departemen
	CreatedAt   time.Time          `json:"created_at"`                                // Waktu data dibuat
	UpdatedAt   time.Time          `json:"updated_at"`                                // Waktu data terakhir diperbarui
	DeletedAt   gorm.DeletedAt     `gorm:"index" json:"-"`                            // Waktu data dihapus (soft delete)
}

// MasterDepartment menyimpan data bagian atau unit kerja di bawah cabang tertentu
type MasterDepartment struct {
	ID             uint                  `gorm:"primaryKey" json:"id"`                  // ID unik bagian
	MasterBranchID uint                  `gorm:"index" json:"master_branch_id"`        // ID cabang terkait
	MasterBranch   MasterBranch          `gorm:"foreignKey:MasterBranchID" json:"master_branch,omitempty"` // Data cabang lengkap
	Name           string                `gorm:"size:100;not null" json:"name"`         // Nama bagian (misal: "Sistem Informasi")
	SubDepartments []MasterSubDepartment `gorm:"foreignKey:MasterDepartmentID" json:"sub_departments,omitempty"` // Relasi ke sub-bagian
	CreatedAt      time.Time             `json:"created_at"`                            // Waktu data dibuat
	UpdatedAt      time.Time             `json:"updated_at"`                            // Waktu data terakhir diperbarui
	DeletedAt      gorm.DeletedAt        `gorm:"index" json:"-"`                        // Waktu data dihapus (soft delete)
}

// MasterSubDepartment menyimpan data unit kerja yang lebih spesifik di bawah departemen
type MasterSubDepartment struct {
	ID                 uint             `gorm:"primaryKey" json:"id"`                   // ID unik sub-bagian
	MasterDepartmentID uint             `gorm:"index" json:"master_department_id"`      // ID departemen terkait
	MasterDepartment   MasterDepartment `gorm:"foreignKey:MasterDepartmentID" json:"master_department,omitempty"` // Data departemen lengkap
	Name               string           `gorm:"size:100;not null" json:"name"`          // Nama unit kerja spesifik
	CreatedAt          time.Time        `json:"created_at"`                             // Waktu data dibuat
	UpdatedAt          time.Time        `json:"updated_at"`                             // Waktu data terakhir diperbarui
	DeletedAt          gorm.DeletedAt   `gorm:"index" json:"-"`                         // Waktu data dihapus (soft delete)
}

// MasterPosition menyimpan data jabatan resmi karyawan
type MasterPosition struct {
	ID        uint           `gorm:"primaryKey" json:"id"`                      // ID unik jabatan
	Name      string         `gorm:"size:100;not null;uniqueIndex" json:"name"` // Nama jabatan (misal: "Staf IT")
	CreatedAt time.Time      `json:"created_at"`                                // Waktu data dibuat
	UpdatedAt time.Time      `json:"updated_at"`                                // Waktu data terakhir diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                            // Waktu data dihapus (soft delete)
}

// MasterAssetCategory menyimpan kategori aset (Laptop, Gedung, dll)
type MasterAssetCategory struct {
	ID        uint           `gorm:"primaryKey" json:"id"`                      // ID unik kategori
	Name      string         `gorm:"size:100;not null;uniqueIndex" json:"name"` // Nama kategori
	CreatedAt time.Time      `json:"created_at"`                                // Waktu data dibuat
	UpdatedAt time.Time      `json:"updated_at"`                                // Waktu data terakhir diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                            // Waktu data dihapus (soft delete)
}

// MasterRamType menyimpan tipe RAM untuk spesifikasi komputer/laptop
type MasterRamType struct {
	ID        uint           `gorm:"primaryKey" json:"id"`                      // ID unik tipe RAM
	Name      string         `gorm:"size:100;not null;uniqueIndex" json:"name"` // Nama tipe RAM (misal: "DDR4")
	CreatedAt time.Time      `json:"created_at"`                                // Waktu data dibuat
	UpdatedAt time.Time      `json:"updated_at"`                                // Waktu data terakhir diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                            // Waktu data dihapus (soft delete)
}

// MasterStorageType menyimpan tipe penyimpanan (SSD/HDD)
type MasterStorageType struct {
	ID        uint           `gorm:"primaryKey" json:"id"`                      // ID unik tipe storage
	Name      string         `gorm:"size:100;not null;uniqueIndex" json:"name"` // Nama tipe storage (misal: "SSD NVMe")
	CreatedAt time.Time      `json:"created_at"`                                // Waktu data dibuat
	UpdatedAt time.Time      `json:"updated_at"`                                // Waktu data terakhir diperbarui
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`                            // Waktu data dihapus (soft delete)
}
