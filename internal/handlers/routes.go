package handlers

import (
	"net/http"

	"github.com/gorilla/mux"
)

func (server *Server) initializeRoutes() {
	server.Router = mux.NewRouter()

	// Rute Autentikasi (Login, Logout)
	server.Router.HandleFunc("/login", server.LoginForm).Methods("GET")
	server.Router.HandleFunc("/login", server.Login).Methods("POST")
	server.Router.HandleFunc("/logout", server.Logout).Methods("GET")

	// Rute Dashboard dan Utama (Terproteksi)
	server.Router.HandleFunc("/", server.PermissionRequired("dashboard", server.Home)).Methods("GET")

	// Manajemen Administrasi dan Karyawan
	server.Router.HandleFunc("/administration/employee", server.PermissionRequired("administration", server.ListEmployees)).Methods("GET")
	server.Router.HandleFunc("/administration/employee/create", server.PermissionRequired("administration", server.CreateEmployeeForm)).Methods("GET")
	server.Router.HandleFunc("/administration/employee", server.PermissionRequired("administration", server.StoreEmployee)).Methods("POST")
	server.Router.HandleFunc("/administration/employee/edit/{id}", server.PermissionRequired("administration", server.EditEmployeeForm)).Methods("GET")
	server.Router.HandleFunc("/administration/employee/update/{id}", server.PermissionRequired("administration", server.UpdateEmployee)).Methods("POST")
	server.Router.HandleFunc("/administration/employee/delete/{id}", server.PermissionRequired("administration", server.DeleteEmployee)).Methods("GET")

	// Data Master Administrasi (Cabang, Departemen, dll)
	server.Router.HandleFunc("/administration/master-data/branch", server.PermissionRequired("administration", server.ListMasterBranch)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/branch/store", server.PermissionRequired("administration", server.StoreMasterBranch)).Methods("POST")
	server.Router.HandleFunc("/administration/master-data/branch/delete/{id}", server.PermissionRequired("administration", server.DeleteMasterBranch)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/branch/edit/{id}", server.PermissionRequired("administration", server.EditMasterBranch)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/branch/update/{id}", server.PermissionRequired("administration", server.UpdateMasterBranch)).Methods("POST")

	server.Router.HandleFunc("/administration/master-data/department", server.PermissionRequired("administration", server.ListMasterDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/department/store", server.PermissionRequired("administration", server.StoreMasterDepartment)).Methods("POST")
	server.Router.HandleFunc("/administration/master-data/department/delete/{id}", server.PermissionRequired("administration", server.DeleteMasterDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/department/edit/{id}", server.PermissionRequired("administration", server.EditMasterDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/department/update/{id}", server.PermissionRequired("administration", server.UpdateMasterDepartment)).Methods("POST")

	server.Router.HandleFunc("/administration/master-data/sub-department", server.PermissionRequired("administration", server.ListMasterSubDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/sub-department/store", server.PermissionRequired("administration", server.StoreMasterSubDepartment)).Methods("POST")
	server.Router.HandleFunc("/administration/master-data/sub-department/delete/{id}", server.PermissionRequired("administration", server.DeleteMasterSubDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/sub-department/edit/{id}", server.PermissionRequired("administration", server.EditMasterSubDepartment)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/sub-department/update/{id}", server.PermissionRequired("administration", server.UpdateMasterSubDepartment)).Methods("POST")

	server.Router.HandleFunc("/administration/master-data/position", server.PermissionRequired("administration", server.ListMasterPosition)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/position/store", server.PermissionRequired("administration", server.StoreMasterPosition)).Methods("POST")
	server.Router.HandleFunc("/administration/master-data/position/delete/{id}", server.PermissionRequired("administration", server.DeleteMasterPosition)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/position/edit/{id}", server.PermissionRequired("administration", server.EditMasterPosition)).Methods("GET")
	server.Router.HandleFunc("/administration/master-data/position/update/{id}", server.PermissionRequired("administration", server.UpdateMasterPosition)).Methods("POST")

	// Rute Inventori (Data Dasar Aset)
	server.Router.HandleFunc("/inventori/master-data/asset-category", server.PermissionRequired("inventori", server.ListMasterAssetCategory)).Methods("GET")
	server.Router.HandleFunc("/inventori/master-data/asset-category/store", server.PermissionRequired("inventori", server.StoreMasterAssetCategory)).Methods("POST")
	server.Router.HandleFunc("/inventori/master-data/asset-category/delete/{id}", server.PermissionRequired("inventori", server.DeleteMasterAssetCategory)).Methods("GET")
	server.Router.HandleFunc("/inventori/master-data/asset-category/edit/{id}", server.PermissionRequired("inventori", server.EditMasterAssetCategory)).Methods("GET")
	server.Router.HandleFunc("/inventori/master-data/asset-category/update/{id}", server.PermissionRequired("inventori", server.UpdateMasterAssetCategory)).Methods("POST")

	server.Router.HandleFunc("/inventori/aset-laptop", server.PermissionRequired("inventori", server.ListAssetKSO)).Methods("GET")
	server.Router.HandleFunc("/inventori/aset-laptop/create", server.PermissionRequired("inventori", server.CreateAssetKSOForm)).Methods("GET")
	server.Router.HandleFunc("/inventori/aset-laptop/bulk-create", server.PermissionRequired("inventori", server.CreateAssetKSOBulkForm)).Methods("GET")
	server.Router.HandleFunc("/inventori/aset-laptop", server.PermissionRequired("inventori", server.StoreAssetKSO)).Methods("POST")
	server.Router.HandleFunc("/inventori/aset-laptop/bulk-store", server.PermissionRequired("inventori", server.StoreAssetKSOBulk)).Methods("POST")
	server.Router.HandleFunc("/inventori/aset-laptop/edit/{id}", server.PermissionRequired("inventori", server.EditAssetKSOForm)).Methods("GET")
	server.Router.HandleFunc("/inventori/aset-laptop/update/{id}", server.PermissionRequired("inventori", server.UpdateAssetKSO)).Methods("POST")
	server.Router.HandleFunc("/inventori/aset-laptop/delete/{id}", server.PermissionRequired("inventori", server.DeleteAssetKSO)).Methods("GET")
	server.Router.HandleFunc("/inventori/aset-laptop/bulk-delete", server.PermissionRequired("inventori", server.BulkDeleteAssetKSO)).Methods("POST")

	// Manajemen Aset (Laptop & Komputer)
	server.Router.HandleFunc("/asset-management/laptop", server.PermissionRequired("asset_management", server.ListAssetLaptop)).Methods("GET")
	server.Router.HandleFunc("/asset-management/laptop/create", server.PermissionRequired("asset_management", server.CreateAssetLaptopForm)).Methods("GET")
	server.Router.HandleFunc("/asset-management/laptop/edit/{id}", server.PermissionRequired("asset_management", server.EditAssetLaptopForm)).Methods("GET")
	server.Router.HandleFunc("/asset-management/laptop/delete/{id}", server.PermissionRequired("asset_management", server.DeleteAssetLaptop)).Methods("GET")
	server.Router.HandleFunc("/asset-management/laptop/assign", server.PermissionRequired("asset_management", server.AssignAssetLaptop)).Methods("POST")
	server.Router.HandleFunc("/asset-management/update-label", server.PermissionRequired("asset_management", server.UpdateAssetLabel)).Methods("POST")
	server.Router.HandleFunc("/asset-management/bulk-update-label", server.PermissionRequired("asset_management", server.BulkUpdateAssetLabel)).Methods("POST")

	server.Router.HandleFunc("/asset-management/komputer", server.PermissionRequired("asset_management", server.ListAssetKomputer)).Methods("GET")
	server.Router.HandleFunc("/asset-management/komputer/create", server.PermissionRequired("asset_management", server.CreateAssetKomputerForm)).Methods("GET")
	server.Router.HandleFunc("/asset-management/komputer/edit/{id}", server.PermissionRequired("asset_management", server.EditAssetKomputerForm)).Methods("GET")
	server.Router.HandleFunc("/asset-management/komputer/delete/{id}", server.PermissionRequired("asset_management", server.DeleteAssetKomputer)).Methods("GET")
	server.Router.HandleFunc("/asset-management/komputer/assign", server.PermissionRequired("asset_management", server.AssignAssetKomputer)).Methods("POST")

	// Rute Maintenance (Laporan Rutin)
	server.Router.HandleFunc("/maintenance/laptop", server.PermissionRequired("maintenance", server.MaintenanceLaptop)).Methods("GET")
	server.Router.HandleFunc("/maintenance/laptop/store", server.PermissionRequired("maintenance", server.StoreMaintenanceLaptop)).Methods("POST")
	server.Router.HandleFunc("/maintenance/submit", server.PermissionRequired("maintenance", server.SubmitMaintenance)).Methods("POST")
	server.Router.HandleFunc("/maintenance/approve", server.PermissionRequired("maintenance", server.ApproveMaintenance)).Methods("POST")
	server.Router.HandleFunc("/maintenance/komputer", server.PermissionRequired("maintenance", server.MaintenanceKomputer)).Methods("GET")
	server.Router.HandleFunc("/maintenance/history", server.PermissionRequired("maintenance", server.MaintenanceHistory)).Methods("GET")
	server.Router.HandleFunc("/maintenance/history/detail/{id}", server.PermissionRequired("maintenance", server.MaintenanceHistoryDetail)).Methods("GET")

	// Rute GoDMS / DMS
	server.Router.HandleFunc("/godms/doc", server.AuthRequired(server.ListEDoc)).Methods("GET")
	server.Router.HandleFunc("/godms/doc/{id}", server.AuthRequired(server.ListFolderContent)).Methods("GET")
	server.Router.HandleFunc("/godms/folder/store", server.AuthRequired(server.StoreFolder)).Methods("POST")
	server.Router.HandleFunc("/godms/folder/rename", server.AuthRequired(server.RenameFolder)).Methods("POST")
	server.Router.HandleFunc("/godms/folder/trash", server.AuthRequired(server.MoveFolderToTrash)).Methods("POST")
	server.Router.HandleFunc("/godms/folder/restore", server.AuthRequired(server.RestoreFolder)).Methods("POST")
	server.Router.HandleFunc("/godms/folder/delete-permanent", server.AuthRequired(server.DeleteFolderPermanently)).Methods("POST")
	server.Router.HandleFunc("/godms/file/rename", server.AuthRequired(server.RenameFile)).Methods("POST")
	server.Router.HandleFunc("/godms/file/trash", server.AuthRequired(server.MoveFileToTrash)).Methods("POST")
	server.Router.HandleFunc("/godms/file/restore", server.AuthRequired(server.RestoreFile)).Methods("POST")
	server.Router.HandleFunc("/godms/file/delete-permanent", server.AuthRequired(server.DeleteFilePermanently)).Methods("POST")
	server.Router.HandleFunc("/godms/file/upload", server.AuthRequired(server.UploadFile)).Methods("POST")
	server.Router.HandleFunc("/godms/folder/upload", server.AuthRequired(server.UploadFolder)).Methods("POST")
	server.Router.HandleFunc("/godms/bulk-move", server.AuthRequired(server.BulkMove)).Methods("POST")
	server.Router.HandleFunc("/godms/bulk-trash", server.AuthRequired(server.BulkTrash)).Methods("POST")
	server.Router.HandleFunc("/godms/bulk-restore", server.AuthRequired(server.BulkRestore)).Methods("POST")
	server.Router.HandleFunc("/godms/bulk-delete-permanent", server.AuthRequired(server.BulkDeletePermanent)).Methods("POST")
	server.Router.HandleFunc("/godms/bulk-download", server.AuthRequired(server.BulkDownload)).Methods("POST")
	server.Router.HandleFunc("/godms/folder-list", server.AuthRequired(server.GetFolderList)).Methods("GET")
	server.Router.HandleFunc("/godms/trash", server.AuthRequired(server.ViewTrash)).Methods("GET")
	server.Router.HandleFunc("/goform", server.AuthRequired(server.ListGoForm)).Methods("GET")
	server.Router.HandleFunc("/goform/fill/{id}", server.AuthRequired(server.FillGoForm)).Methods("GET")
	server.Router.HandleFunc("/goform/submit/{id}", server.AuthRequired(server.SubmitGoForm)).Methods("POST")

	// Pengaturan Pengguna (Hanya Super Admin)
	server.Router.HandleFunc("/setting/user", server.RoleRequired([]string{"super_admin"}, server.ListSettingUser)).Methods("GET")
	server.Router.HandleFunc("/setting/user/create", server.RoleRequired([]string{"super_admin"}, server.CreateSettingUserForm)).Methods("GET")
	server.Router.HandleFunc("/setting/user/store", server.RoleRequired([]string{"super_admin"}, server.StoreSettingUser)).Methods("POST")
	server.Router.HandleFunc("/setting/user/edit/{id}", server.RoleRequired([]string{"super_admin"}, server.EditSettingUserForm)).Methods("GET")
	server.Router.HandleFunc("/setting/user/update/{id}", server.RoleRequired([]string{"super_admin"}, server.UpdateSettingUser)).Methods("POST")
	server.Router.HandleFunc("/setting/user/delete/{id}", server.RoleRequired([]string{"super_admin"}, server.DeleteSettingUser)).Methods("GET")

	server.Router.HandleFunc("/setting/role", server.RoleRequired([]string{"super_admin"}, server.ListSettingRole)).Methods("GET")
	server.Router.HandleFunc("/setting/role/update", server.RoleRequired([]string{"super_admin"}, server.UpdateSettingRole)).Methods("POST")

	// Profile routes - Available for all logged in users
	server.Router.HandleFunc("/profile", server.AuthRequired(server.Profile)).Methods("GET")
	server.Router.HandleFunc("/profile/password", server.AuthRequired(server.UpdatePassword)).Methods("POST")
	server.Router.HandleFunc("/profile/avatar", server.AuthRequired(server.UpdateAvatar)).Methods("POST")
	server.Router.HandleFunc("/profile/signature", server.AuthRequired(server.UpdateSignature)).Methods("POST")

	// Static files
	staticFileDirectory := http.Dir("./public")
	staticFileHandler := http.StripPrefix("/public/", http.FileServer(staticFileDirectory))
	server.Router.PathPrefix("/public/").Handler(staticFileHandler)
}
