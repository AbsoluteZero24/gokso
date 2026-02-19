package seeders

import (
	"github.com/AbsoluteZero24/gokso/internal/models"
	"gorm.io/gorm"
)

// SeedMasterDataEmployee mengisi data master organisasi (cabang, bagian, jabatan) ke database
func SeedMasterDataEmployee(db *gorm.DB) error {
	// 1. KSO PUSAT
	pusat := models.MasterBranch{Name: "KSO PUSAT"}
	db.Where(models.MasterBranch{Name: pusat.Name}).FirstOrCreate(&pusat)

	// 1.1. Operasi Luar Negeri
	operasiLN := models.MasterDepartment{Name: "Operasi Luar Negeri", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: operasiLN.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&operasiLN)

	// Sub-departments for 1.1
	subLN := []string{"Cabang Luar Negeri", "Surveyor Luar Negeri"}
	for _, name := range subLN {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: operasiLN.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: operasiLN.ID,
		})
	}

	// 1.2. Keuangan & Administrasi
	keuanganAd := models.MasterDepartment{Name: "Keuangan & Administrasi", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: keuanganAd.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&keuanganAd)

	// Sub-departments for 1.2
	subKA := []string{"SDM, Umum, dan Hukum", "Keuangan & Akutansi"}
	for _, name := range subKA {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: keuanganAd.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: keuanganAd.ID,
		})
	}

	// 1.3. Sistem, Kepatuhan & Pelayanan Pelanggan
	sistemKepatuhan := models.MasterDepartment{Name: "Sistem, Kepatuhan & Pelayanan Pelanggan", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: sistemKepatuhan.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&sistemKepatuhan)

	// Sub-departments for 1.3
	subSK := []string{"Pelayanan Pelanggan", "Standarisasi & Pelaporan", "Sistem, Jaminan Mutu & Kepatuhan"}
	for _, name := range subSK {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: sistemKepatuhan.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: sistemKepatuhan.ID,
		})
	}

	// 1.4. Operasi Dalam Negeri
	operasiDN := models.MasterDepartment{Name: "Operasi Dalam Negeri", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: operasiDN.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&operasiDN)

	// Sub-departments for 1.4
	subDN := []string{"Operasi 1", "Operasi 2"}
	for _, name := range subDN {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: operasiDN.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: operasiDN.ID,
		})
	}

	// 1.5. Pengembangan Usaha, Hubungan Pemangku Kepentingan & Penjualan
	pengembangan := models.MasterDepartment{Name: "Pengembangan Usaha, Hubungan Pemangku Kepentingan & Penjualan", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: pengembangan.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&pengembangan)

	// Sub-departments for 1.5
	subP := []string{"Penjualan", "Pengembangan Usaha", "Hubungan Pemangku Kepentingan"}
	for _, name := range subP {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: pengembangan.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: pengembangan.ID,
		})
	}

	// 1.6. Sistem Informasi
	it := models.MasterDepartment{Name: "Sistem Informasi", MasterBranchID: pusat.ID}
	db.Where(models.MasterDepartment{Name: it.Name, MasterBranchID: pusat.ID}).FirstOrCreate(&it)

	// Sub-departments for 1.6
	subIT := []string{"Pengembangan Aplikasi", "Otomasi Sistem dan Pengelolaan Infrastruktur"}
	for _, name := range subIT {
		db.Where(models.MasterSubDepartment{Name: name, MasterDepartmentID: it.ID}).FirstOrCreate(&models.MasterSubDepartment{
			Name:               name,
			MasterDepartmentID: it.ID,
		})
	}

	// Other branches
	otherBranches := []string{
		"KSO Cabang Hongkong",
		"KSO Cabang Korea",
		"KSO Cabang Malaysia",
		"KSO Cabang Shenzhen",
		"KSO Cabang Singapura",
		"KSO Cabang Thailand",
		"KSO Cabang Vietnam",
	}
	for _, name := range otherBranches {
		db.Where(models.MasterBranch{Name: name}).FirstOrCreate(&models.MasterBranch{Name: name})
	}

	// 2. Positions
	positions := []string{
		"PIMPINAN",
		"WAKIL PIMPINAN",
		"Penasihat Bisnis",
		"Ka Bag Operasi Dalam Negeri",
		"Ka Sub Bag Operasi 1",
		"Koordinator Produk Agri",
		"Verifikator Teknis",
		"Verifikator Admin",
		"Penerima Order",
		"Koordinator Produk Sandang",
		"Asisten Koordinator",
		"Koordinator Produk Kimia & Farmasi",
		"Koordinator Rekonsiliasi & Pengolahan Data Produksi",
		"Petugas Distribusi & Dokumentasi LS",
		"Petugas Pengelolaan Data Importir",
		"Petugas Pengolahan Data & Quality Control",
		"Petugas Rekonsiliasi Kuota",
		"Ka Sub Bag Operasi 2",
		"Koordinator Produk Elektronika",
		"Asisten Koordinator 1",
		"Asisten Koordinator 2",
		"Koordinator Produk Baja",
		"Koordinator Produk Limbah Non B3",
		"Ka Bag Operasi Luar Negeri",
		"Ka Sub Bag Cabang Luar Negeri",
		"Koordinator Produk 1",
		"Petugas Klasifikasi HS (Agri)",
		"Petugas Klasifikasi HS (Sandang)",
		"Petugas Drafting LS",
		"Koordinator Produk 2",
		"Petugas Klasifikasi HS (Baja)",
		"Petugas Klasifikasi HS (Elektronika)",
		"Petugas Klasifikasi HS (Kimia)",
		"Petugas Retriever Inspection Report",
		"Koordinator Dukungan Operasi",
		"Petugas Administrasi Dukungan Operasi",
		"Koordinator Pemeriksaan Kawasan Pabean",
		"Petugas Administrasi Pemeriksaan Kawasan Pabean",
		"Ka Sub Bag Surveyor Luar Negeri",
		"Koordinator Penanganan Penyelesaian Permasalahan SLN",
		"Petugas SLN",
		"Koordinator Administrasi SLN",
		"Petugas Operasional SLN",
		"Petugas Standarisasi dan Monev SLN",
		"Ka Bag Keuangan & Administrasi",
		"Ka Sub Bag SDM & Umum",
		"Koordinator SDM",
		"Petugas Pengembangan SDM",
		"Petugas Rekrutmen & Penempatan SDM",
		"Petugas Perencanaan & Pengelolaan Data SDM",
		"Petugas Pengelolaan Remunerasi SDM",
		"SDM",
		"Koordinator Umum",
		"Petugas Pengadaan Barang/Jasa",
		"Petugas Umum (Fasilitasi)",
		"Petugas Kesekretariatan",
		"Driver",
		"Security",
		"Office Boy",
		"Office Girl",
		"Koordinator Hukum",
		"Petugas Pengelolaan Kontrak",
		"Ka Sub Bag Keuangan dan Akuntansi",
		"Koordinator Keuangan",
		"Petugas Pemeriksaan Dokumen Tagihan",
		"Petugas Pendistribusian Dokumen Tagihan",
		"Kasir",
		"Koordinator Pengelolaan Piutang",
		"Petugas Penagihan",
		"Petugas Rekonsiliasi Penerimaan Pembayaran",
		"Petugas Rekonsiliasi Penerimaan Pembayaran (PPID7)",
		"Petugas Rekonsiliasi Penerimaan Pembayaran (LS)",
		"Koordinator Akuntansi, Perpajakan & Pelaporan",
		"Petugas Akuntansi",
		"Petugas Perpajakan",
		"Petugas Verifikasi Pembayaran",
		"Ka Bag PU, HPK & Penjualan",
		"Ka Sub Bag Pengembangan Usaha",
		"Koordinator Pengembangan Usaha 1",
		"Petugas Pengembangan Usaha 1",
		"Koordinator Pengembangan Usaha 2",
		"Petugas Pengembangan Usaha 2",
		"Ka Sub Bag Hubungan Pemangku Kepentingan (HPK)",
		"Koordinator Hubungan Pemerintahan",
		"Petugas Hubungan Pemerintah",
		"Koordinator Hubungan Dunia Usaha",
		"Petugas Hubungan Dunia Usaha",
		"Ka Sub Bag Penjualan",
		"Koordinator Tenaga Sales Force",
		"Petugas Sales Force",
		"Koordinator Sales Support",
		"Petugas Sales Support",
		"Ka Bag Sistem Informasi",
		"Ka Sub Bag Aplikasi",
		"Koordinator Aplikasi Ops 1",
		"Petugas Programmer Analyst",
		"Koordinator Aplikasi Ops 2",
		"Ka Sub Bag Otomasi Sistem dan Infrastruktur",
		"Koordinator Pengelolaan Layanan IT dan Otomasi",
		"Petugas IT Service Desk & Admin",
		"Petugas Data Warehouse & Pelaporan",
		"Koordinator Pemeliharaan",
		"Petugas End User Support",
		"Petugas Network Support",
		"Petugas Cloud & Network Security",
		"Ka Bag Sistem, Kepatuhan & Pelayanan Pelanggan",
		"Ka Sub Bag Standarisasi dan Pelaporan",
		"Spesialis Produk",
		"Petugas Administrasi Spesialis Produk",
		"Koordinator Pelaporan",
		"Petugas Analisis Data",
		"Petugas Pelaporan",
		"Ka Sub Bag Pelayanan Pelanggan",
		"Koordinator Pelayanan Pelanggan",
		"Account Officer",
		"Petugas Front Office",
		"Petugas Call Center",
		"Petugas Back Office",
		"Petugas Web Chat",
		"Petugas Operator Telepon",
		"Koordinator Media Komunikasi Perusahaan",
		"Petugas Desain Multimedia",
		"Petugas Spesialis Sosial Media",
		"Ka Sub Bag Sistem, Jaminan Mutu & Kepatuhan",
		"Koordinator Sistem",
		"Petugas Pengelolaan KPI dan Program Kerja",
		"Petugas Sistem Manajemen Risiko",
		"Koordinator Jaminan Mutu & Kepatuhan",
		"Petugas Pengelolaan Kepuasan Pelanggan",
		"Petugas SMK3 & Peningkatan Budaya Kerja",
		"Petugas Manajemen Mutu 2",
	}
	for _, name := range positions {
		db.Where(models.MasterPosition{Name: name}).FirstOrCreate(&models.MasterPosition{Name: name})
	}

	return nil
}
