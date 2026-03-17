package models

type Model struct {
	Model interface{}
}

// RegisterModels mengembalikan daftar semua model database untuk keperluan migrasi
func RegisterModels() []Model {
	return []Model{
		{Model: User{}},
		{Model: AssetKSO{}},
		{Model: MasterBranch{}},
		{Model: MasterDepartment{}},
		{Model: MasterSubDepartment{}},
		{Model: MasterPosition{}},
		{Model: MasterAssetCategory{}},
		{Model: MasterRamType{}},
		{Model: MasterStorageType{}},
		{Model: RolePermission{}},
		{Model: Role{}},
		{Model: DMSFolder{}},
		{Model: DMSFile{}},
		{Model: Notification{}},
		{Model: GoSignTask{}},
		{Model: GoSignSigner{}},
		{Model: &FMSI0101{}},
		{Model: GoForm{}},
		{Model: EDIDDocument{}},
	}
}
