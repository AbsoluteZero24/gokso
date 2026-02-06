package models

type Model struct {
	Model interface{}
}

func RegisterModels() []Model {
	return []Model{
		{Model: User{}},
		{Model: Admin{}},
		{Model: AssetKSO{}},
		{Model: MasterBranch{}},
		{Model: MasterDepartment{}},
		{Model: MasterSubDepartment{}},
		{Model: MasterPosition{}},
		{Model: MasterAssetCategory{}},
		{Model: MasterRamType{}},
		{Model: MasterStorageType{}},
		{Model: RolePermission{}},
		{Model: MaintenanceReport{}},
	}
}
