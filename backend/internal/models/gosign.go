package models

import (
	"time"
)

// GoSignTask merepresentasikan proses pengajuan tanda tangan digital (workflow)
type GoSignTask struct {
	ID              string         `gorm:"size:36;primaryKey" json:"id"`            // ID unik tugas (UUID)
	FormID          string         `gorm:"size:50;index" json:"form_id"`            // Kode form asal (misal: "form-bast-laptop")
	FormName        string         `gorm:"size:255" json:"form_name"`               // Nama formulir
	FileName        string         `gorm:"size:255" json:"file_name"`               // Nama file PDF yang dihasilkan
	FilePath        string         `gorm:"size:255" json:"file_path"`               // Path penyimpanan draft/preview berkas
	DataJSON        string         `gorm:"type:text" json:"data_json"`              // Data formulir dalam format JSON (serialized)
	Status          string         `gorm:"size:20;default:'Pending'" json:"status"` // Status tugas (Pending, Completed, Rejected)
	CreatorID       string         `gorm:"size:36;index" json:"creator_id"`         // ID user pembuat tugas
	CreatorName     string         `gorm:"size:255" json:"creator_name"`            // Nama user pembuat tugas
	TargetFolderID  string         `gorm:"size:36" json:"target_folder_id"`         // ID folder tujuan di GoDMS jika sudah selesai
	Section         string         `gorm:"size:100" json:"section"`                // Bagian/Departemen penanggung jawab
	RejectionReason string         `gorm:"type:text" json:"rejection_reason"`       // Alasan jika tanda tangan ditolak
	RejectorID      string         `gorm:"size:36" json:"rejector_id"`              // ID user yang menolak
	RejectorName    string         `gorm:"size:255" json:"rejector_name"`           // Nama user yang menolak
	CreatedAt       time.Time      `json:"created_at"`                              // Waktu tugas diajukan
	UpdatedAt       time.Time      `json:"updated_at"`                              // Waktu terakhir status diperbarui
	Signers         []GoSignSigner `gorm:"foreignKey:TaskID" json:"signers"`        // Daftar penanda tangan terkait
}

// GoSignSigner merepresentasikan individu yang harus menandatangani dokumen GoSign
type GoSignSigner struct {
	ID         string     `gorm:"size:36;primaryKey" json:"id"`            // ID unik signer (UUID)
	TaskID     string     `gorm:"size:36;index" json:"task_id"`            // ID tugas terkait (GoSignTask)
	UserID     string     `gorm:"size:36;index" json:"user_id"`            // ID user penanda tangan
	UserName   string     `gorm:"size:255" json:"user_name"`               // Nama user penanda tangan
	Role       string     `gorm:"size:50" json:"role"`                     // Peran dalam dokumen (misal: "Pihak Pertama")
	Signed     bool       `gorm:"default:false" json:"signed"`             // Status apakah sudah tanda tangan
	SignedAt   *time.Time `json:"signed_at"`                               // Waktu saat tanda tangan dilakukan
	Rejected   bool       `gorm:"default:false" json:"rejected"`           // Status apakah menolak tanda tangan
	RejectedAt *time.Time `json:"rejected_at"`                             // Waktu saat penolakan dilakukan
}
