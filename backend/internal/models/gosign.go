package models

import (
	"time"
)

type GoSignTask struct {
	ID             string         `gorm:"size:36;primaryKey" json:"id"`
	FormID         string         `gorm:"size:50;index" json:"form_id"` // e.g. form-bast-laptop
	FormName       string         `gorm:"size:255" json:"form_name"`
	FileName       string         `gorm:"size:255" json:"file_name"`
	FilePath       string         `gorm:"size:255" json:"file_path"` // Path to draft/preview
	DataJSON       string         `gorm:"type:text" json:"data_json"` // Serialized form data
	Status         string         `gorm:"size:20;default:'Pending'" json:"status"` // Pending, Completed, Rejected
	CreatorID      string         `gorm:"size:36;index" json:"creator_id"`
	CreatorName    string         `gorm:"size:255" json:"creator_name"`
	TargetFolderID string         `gorm:"size:36" json:"target_folder_id"`
	Section        string         `gorm:"size:100" json:"section"`
	RejectionReason string        `gorm:"type:text" json:"rejection_reason"`
	RejectorID      string        `gorm:"size:36" json:"rejector_id"`
	RejectorName    string        `gorm:"size:255" json:"rejector_name"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	Signers        []GoSignSigner `gorm:"foreignKey:TaskID" json:"signers"`
}

type GoSignSigner struct {
	ID        string     `gorm:"size:36;primaryKey" json:"id"`
	TaskID    string     `gorm:"size:36;index" json:"task_id"`
	UserID   string     `gorm:"size:36;index" json:"user_id"`
	UserName string     `gorm:"size:255" json:"user_name"`
	Role      string     `gorm:"size:50" json:"role"` // Pihak Pertama, Pihak Kedua
	Signed    bool       `gorm:"default:false" json:"signed"`
	SignedAt  *time.Time `json:"signed_at"`
	Rejected  bool       `gorm:"default:false" json:"rejected"`
	RejectedAt *time.Time `json:"rejected_at"`
}
