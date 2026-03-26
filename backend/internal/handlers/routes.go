package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

func (server *Server) initializeRoutes() {
	server.Router = mux.NewRouter()

	// CORS Middleware
	server.Router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Cookie")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			if strings.HasPrefix(r.URL.Path, "/api/profile") {
				fmt.Printf("[%s] %s %s\n", r.Method, r.URL.Path, r.RemoteAddr)
			}
			next.ServeHTTP(w, r)
		})
	})

	// 1. API ROUTES (Prefix: /api)
	// All backend communication from React frontend goes through here
	api := server.Router.PathPrefix("/api").Subrouter()

	// Auth & User Session
	api.HandleFunc("/login", server.ApiLogin).Methods("POST")
	api.HandleFunc("/logout", server.Logout).Methods("GET")
	api.HandleFunc("/check-auth", server.ApiCheckAuth).Methods("GET")

	// Dashboard
	api.HandleFunc("/dashboard", server.ApiDashboard).Methods("GET")

	// Asset KSO (General Inventory)
	api.HandleFunc("/assets-kso", server.ApiListAssetKSO).Methods("GET")
	api.HandleFunc("/assets-kso/store", server.ApiStoreAssetKSO).Methods("POST")
	api.HandleFunc("/assets-kso/bulk-store", server.ApiStoreAssetKSOBulk).Methods("POST")
	api.HandleFunc("/assets-kso/update/{id}", server.ApiUpdateAssetKSO).Methods("POST")
	api.HandleFunc("/assets-kso/delete/{id}", server.ApiDeleteAssetKSO).Methods("DELETE")
	api.HandleFunc("/assets-kso/bulk-delete", server.ApiBulkDeleteAssetKSO).Methods("POST")
	api.HandleFunc("/assets-kso/export", server.ApiExportAssets).Methods("GET")
	api.HandleFunc("/assets-kso/import", server.ApiImportAssets).Methods("POST")

	// Asset Management (Laptop/Komputer assignment & label)
	api.HandleFunc("/assets-kso/laptop", server.ApiListAssetLaptop).Methods("GET")
	api.HandleFunc("/assets-kso/laptop/assign", server.ApiAssignAssetLaptop).Methods("POST")
	api.HandleFunc("/assets-kso/update-label", server.ApiUpdateAssetLabel).Methods("POST")

	// Users (Data)
	api.HandleFunc("/users", server.ApiListUsers).Methods("GET")
	api.HandleFunc("/users/store", server.ApiStoreUser).Methods("POST")
	api.HandleFunc("/users/update/{id}", server.ApiUpdateUser).Methods("POST")
	api.HandleFunc("/users/delete/{id}", server.ApiDeleteUser).Methods("DELETE")
	api.HandleFunc("/users/bulk-delete", server.ApiBulkDeleteUser).Methods("POST")
	api.HandleFunc("/users/export", server.ApiExportUsers).Methods("GET")
	api.HandleFunc("/users/import", server.ApiImportUsers).Methods("POST")

	// GoDMS (Document Management System)
	api.HandleFunc("/godms/edoc", server.ApiListEDoc).Methods("GET")
	api.HandleFunc("/godms/edoc/{id}", server.ApiListFolderContent).Methods("GET")
	api.HandleFunc("/godms/folders/list-all", server.ApiListAllFolders).Methods("GET")
	api.HandleFunc("/godms/folder/store", server.ApiStoreFolder).Methods("POST")
	api.HandleFunc("/godms/folder/rename", server.RenameFolder).Methods("POST")
	api.HandleFunc("/godms/folder/trash", server.MoveFolderToTrash).Methods("POST")
	api.HandleFunc("/godms/folder/restore", server.RestoreFolder).Methods("POST")
	api.HandleFunc("/godms/file/upload", server.UploadFile).Methods("POST")
	api.HandleFunc("/godms/file/download/{id}", server.DownloadFile).Methods("GET")
	api.HandleFunc("/godms/file/trash", server.MoveFileToTrash).Methods("POST")
	api.HandleFunc("/godms/file/restore", server.RestoreFile).Methods("POST")
	api.HandleFunc("/godms/folder/delete", server.DeleteFolderPermanently).Methods("POST")
	api.HandleFunc("/godms/file/delete", server.DeleteFilePermanently).Methods("POST")
	api.HandleFunc("/godms/trash", server.ViewTrash).Methods("GET")
	api.HandleFunc("/godms/bulk/move", server.BulkMove).Methods("POST")
	api.HandleFunc("/godms/bulk/trash", server.BulkTrash).Methods("POST")
	api.HandleFunc("/godms/bulk/restore", server.BulkRestore).Methods("POST")
	api.HandleFunc("/godms/bulk/delete", server.BulkDeletePermanent).Methods("POST")
	api.HandleFunc("/godms/migrate", server.MigrateDMS).Methods("GET")

	// GoDID (Digital Internal Documents)
	api.HandleFunc("/godms/edid", server.ApiListEDID).Methods("GET")
	api.HandleFunc("/godms/edid/store", server.ApiStoreEDIDDocument).Methods("POST")
	api.HandleFunc("/godms/edid/update/{id}", server.ApiUpdateEDIDDocument).Methods("POST")
	api.HandleFunc("/godms/edid/delete/{id}", server.ApiDeleteEDIDDocument).Methods("DELETE")
	api.HandleFunc("/godms/server-inventory", server.ApiListFMSI0101).Methods("GET")
	api.HandleFunc("/godms/server-inventory/store", server.ApiStoreFMSI0101).Methods("POST")
	api.HandleFunc("/godms/server-inventory/import", server.ApiImportFMSI0101).Methods("POST")
	api.HandleFunc("/godms/server-inventory/delete/{id}", server.ApiDeleteFMSI0101).Methods("DELETE")
	api.HandleFunc("/godms/server-inventory/bulk-delete", server.ApiBulkDeleteFMSI0101).Methods("POST")
	api.HandleFunc("/godms/server-inventory/update/{id}", server.ApiUpdateFMSI0101).Methods("PUT")
	api.HandleFunc("/godms/server-inventory/export", server.ApiExportFMSI0101).Methods("POST")
	api.HandleFunc("/godms/server-inventory/preview", server.ApiGetFMSI0101Preview).Methods("GET")

	// GoForm (Digital Form Catalog & Submission)
	api.HandleFunc("/goform/list", server.ApiListGoForm).Methods("GET")
	api.HandleFunc("/goform/init/{id}", server.ApiGetGoFormInitData).Methods("GET")
	api.HandleFunc("/goform/submit/{id}", server.SubmitGoForm).Methods("POST")
	api.HandleFunc("/goform/update-visibility", server.ApiUpdateGoFormSettings).Methods("POST")

	// Master Data (Configurations)
	api.HandleFunc("/master-data/branch", server.ApiListMasterBranch).Methods("GET")
	api.HandleFunc("/master-data/branch/store", server.ApiStoreMasterBranch).Methods("POST")
	api.HandleFunc("/master-data/branch/update/{id}", server.ApiUpdateMasterBranch).Methods("POST")
	api.HandleFunc("/master-data/branch/delete/{id}", server.ApiDeleteMasterBranch).Methods("DELETE")

	api.HandleFunc("/master-data/department", server.ApiListMasterDepartment).Methods("GET")
	api.HandleFunc("/master-data/department/store", server.ApiStoreMasterDepartment).Methods("POST")
	api.HandleFunc("/master-data/department/update/{id}", server.ApiUpdateMasterDepartment).Methods("POST")
	api.HandleFunc("/master-data/department/delete/{id}", server.ApiDeleteMasterDepartment).Methods("DELETE")

	api.HandleFunc("/master-data/position", server.ApiListMasterPosition).Methods("GET")
	api.HandleFunc("/master-data/position/store", server.ApiStoreMasterPosition).Methods("POST")
	api.HandleFunc("/master-data/position/update/{id}", server.ApiUpdateMasterPosition).Methods("POST")
	api.HandleFunc("/master-data/position/delete/{id}", server.ApiDeleteMasterPosition).Methods("DELETE")

	api.HandleFunc("/master-data/sub-department", server.ApiListMasterSubDepartment).Methods("GET")
	api.HandleFunc("/master-data/sub-department/store", server.ApiStoreMasterSubDepartment).Methods("POST")
	api.HandleFunc("/master-data/sub-department/update/{id}", server.ApiUpdateMasterSubDepartment).Methods("POST")
	api.HandleFunc("/master-data/sub-department/delete/{id}", server.ApiDeleteMasterSubDepartment).Methods("DELETE")

	api.HandleFunc("/master-data/asset-category", server.ApiListMasterAssetCategory).Methods("GET")
	api.HandleFunc("/master-data/asset-category/store", server.ApiStoreMasterAssetCategory).Methods("POST")
	api.HandleFunc("/master-data/asset-category/update/{id}", server.ApiUpdateMasterAssetCategory).Methods("POST")
	api.HandleFunc("/master-data/asset-category/delete/{id}", server.ApiDeleteMasterAssetCategory).Methods("DELETE")

	api.HandleFunc("/master-data/asset-specs", server.ApiGetAssetSpecs).Methods("GET")

	// Settings & Profile
	api.HandleFunc("/roles", server.ApiListRoles).Methods("GET")
	api.HandleFunc("/roles/store", server.ApiStoreRole).Methods("POST")
	api.HandleFunc("/roles/update/{id}", server.ApiUpdateRole).Methods("POST")
	api.HandleFunc("/roles/delete/{id}", server.ApiDeleteRole).Methods("DELETE")

	api.HandleFunc("/setting/users", server.ApiListSettingUser).Methods("GET")
	api.HandleFunc("/setting/users/store", server.ApiStoreSettingUser).Methods("POST")
	api.HandleFunc("/setting/users/update/{id}", server.ApiUpdateSettingUser).Methods("POST")
	api.HandleFunc("/setting/users/delete/{id}", server.ApiDeleteSettingUser).Methods("DELETE")
	api.HandleFunc("/profile/update-password", server.UpdatePassword).Methods("POST")
	api.HandleFunc("/profile/update-avatar", server.UpdateAvatar).Methods("POST")
	api.HandleFunc("/profile/update-signature", server.UpdateSignature).Methods("POST")
	api.HandleFunc("/profile/update-signature-paraf", server.ApiUpdateSignatureParaf).Methods("POST")

	// GoSign
	api.HandleFunc("/gosign/tasks", server.ApiListGoSignTasks).Methods("GET")
	api.HandleFunc("/gosign/sign", server.ApiSignTask).Methods("POST")
	api.HandleFunc("/gosign/preview/{id}", server.ApiPreviewGoSignTask).Methods("GET")
	api.HandleFunc("/gosign/reject", server.ApiRejectTask).Methods("POST")
	api.HandleFunc("/gosign/submit-upload", server.ApiSubmitGoSignUpload).Methods("POST")
	api.HandleFunc("/gosign/delete/{id}", server.ApiDeleteGoSignTask).Methods("DELETE")

	// Notifications
	api.HandleFunc("/notifications", server.ApiListNotifications).Methods("GET")
	api.HandleFunc("/notifications/mark-read", server.ApiMarkNotificationsRead).Methods("POST")
	api.HandleFunc("/notifications/mark-read/{id}", server.ApiMarkSingleNotificationRead).Methods("POST")
	api.HandleFunc("/notifications/clear", server.ApiClearNotifications).Methods("POST")

	// 2. STATIC FILES
	// Serving images, uploads, and other public assets
	staticFileDirectory := http.Dir("./public")
	staticFileHandler := http.StripPrefix("/public/", http.FileServer(staticFileDirectory))
	server.Router.PathPrefix("/public/").Handler(staticFileHandler)

	// GoForm (Digital Form Catalog & Submission)
	server.Router.HandleFunc("/goform", server.ListGoForm).Methods("GET")
	server.Router.HandleFunc("/goform/fill/{id}", server.FillGoForm).Methods("GET")

	// 3. HTML ROUTES (Server-side rendering)
	server.Router.HandleFunc("/", server.Home).Methods("GET")
	
	// Inventori
	server.Router.HandleFunc("/inventori/aset-laptop", server.ListAssetKSO).Methods("GET")
	
	// Asset Management
	server.Router.HandleFunc("/asset-management/laptop", server.ListAssetLaptop).Methods("GET")
	server.Router.HandleFunc("/asset-management/komputer", server.ListAssetKomputer).Methods("GET")

	// Administration
	server.Router.HandleFunc("/administration/user", server.ListUsers).Methods("GET")
	server.Router.HandleFunc("/administration/user/create", server.CreateUserForm).Methods("GET")
	server.Router.HandleFunc("/administration/user/store", server.StoreUser).Methods("POST")
	server.Router.HandleFunc("/administration/user/edit/{id}", server.EditUserForm).Methods("GET")
	server.Router.HandleFunc("/administration/user/update/{id}", server.UpdateUser).Methods("POST")
	server.Router.HandleFunc("/administration/user/delete/{id}", server.DeleteUser).Methods("GET")

	// Setting
	server.Router.HandleFunc("/setting/user", server.ListSettingUser).Methods("GET")
	server.Router.HandleFunc("/setting/user/create", server.CreateSettingUserForm).Methods("GET")
	server.Router.HandleFunc("/setting/user/store", server.StoreSettingUser).Methods("POST")
	server.Router.HandleFunc("/setting/user/edit/{id}", server.EditSettingUserForm).Methods("GET")
	server.Router.HandleFunc("/setting/user/update/{id}", server.UpdateSettingUser).Methods("POST")
	server.Router.HandleFunc("/setting/user/delete/{id}", server.DeleteSettingUser).Methods("GET")
	server.Router.HandleFunc("/setting/role", server.ListSettingRole).Methods("GET")
	server.Router.HandleFunc("/setting/role/update", server.UpdateSettingRole).Methods("POST")

	// 4. REACT FRONTEND (SPA Routing)
	// Catch-all handler: If request is not API or Static, serve the React app
	// This allows React Router to handle clientside transitions even on refresh
	frontendDir := http.Dir("./frontend/dist")
	fileServer := http.FileServer(frontendDir)

	server.Router.PathPrefix("/").Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Direct root access
		if path == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Check if the requested file actually exists in the build folder (e.g. assets/index-hash.js)
		f, err := frontendDir.Open(path)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// If it's a route (like /goform), serve the main index.html
		http.ServeFile(w, r, "./frontend/dist/index.html")
	}))
}
