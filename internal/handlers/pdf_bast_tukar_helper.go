package handlers

import (
	"fmt"
	"path/filepath"

	"github.com/jung-kurt/gofpdf"
)

func (server *Server) GenerateBASTTukarPDF(data BASTData, title string, outputPath string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Header Logos
	logoDir := filepath.Join("public", "assets", "img")
	registerLogo(pdf, filepath.Join(logoDir, "logo-danantara.png"), "logo1")
	pdf.Image("logo1", 20, 15, 38, 0, false, "", 0, "")

	registerLogo(pdf, filepath.Join(logoDir, "logo-idsurvey.png"), "logo2")
	pdf.Image("logo2", 85, 15, 40, 0, false, "", 0, "")

	registerLogo(pdf, filepath.Join(logoDir, "logo-ksoscisi.png"), "logo3")
	pdf.Image("logo3", 145, 15, 45, 0, false, "", 0, "")

	pdf.SetY(45)

	// Title
	pdf.SetFont("Arial", "B", 14)
	if title == "" {
		title = "BERITA ACARA SERAH TERIMA\nPERTUKARAN ASET"
	}
	pdf.MultiCell(0, 7, title, "", "C", false)
	pdf.Ln(4)

	// Opening text
	pdf.SetFont("Arial", "", 11)
	dayName := getIndonesianDay(data.HandoverDate)
	dateStr := translateMonth(data.HandoverDate.Format("02 January 2006"))

	openingText := fmt.Sprintf("Pada hari ini %s, tanggal %s, Kami yang bertanda tangan dibawah ini:", dayName, dateStr)
	pdf.MultiCell(0, 6, openingText, "", "L", false)
	pdf.Ln(2)

	// Pihak Pertama
	renderPerson(pdf, "PIHAK PERTAMA", data.P1)
	pdf.SetFont("Arial", "I", 10)
	pdf.CellFormat(0, 6, "Selanjutnya disebut sebagai \"PIHAK PERTAMA\"", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(0, 6, "dan", "", 1, "C", false, 0, "")

	// Pihak Kedua
	renderPerson(pdf, "PIHAK KEDUA", data.P2)
	pdf.SetFont("Arial", "I", 10)
	pdf.CellFormat(0, 6, "Selanjutnya disebut sebagai \"PIHAK KEDUA\"", "", 1, "L", false, 0, "")
	pdf.Ln(4)

	// Middle Text
	pdf.SetFont("Arial", "", 11)
	middleText := "PIHAK PERTAMA dan PIHAK KEDUA telah melakukan pertukaran barang dengan rincian sebagai berikut:"
	pdf.MultiCell(0, 6, middleText, "", "J", false)
	pdf.Ln(4)

	// Table Pertukaran
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 230, 230)
	pdf.CellFormat(10, 8, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(70, 8, "JENIS BARANG", "1", 0, "C", true, 0, "")
	pdf.CellFormat(90, 8, "NAMA BARANG / SN", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 10)
	// Row 1: Old Asset
	pdf.CellFormat(10, 8, "1", "1", 0, "C", false, 0, "")
	pdf.CellFormat(70, 8, "Aset Lama (Ditarik)", "1", 0, "L", false, 0, "")
	oldText := "-"
	if data.OldAsset != nil {
		oldText = fmt.Sprintf("%s (%s)", data.OldAsset.AssetName, data.OldAsset.SerialNumber)
	}
	pdf.CellFormat(90, 8, oldText, "1", 1, "L", false, 0, "")

	// Row 2: New Asset
	pdf.CellFormat(10, 8, "2", "1", 0, "C", false, 0, "")
	pdf.CellFormat(70, 8, "Aset Baru (Diserahkan)", "1", 0, "L", false, 0, "")
	newText := "-"
	if data.NewAsset != nil {
		newText = fmt.Sprintf("%s (%s)", data.NewAsset.AssetName, data.NewAsset.SerialNumber)
	}
	pdf.CellFormat(90, 8, newText, "1", 1, "L", false, 0, "")

	pdf.Ln(6)

	// Closing Text
	closingText := "Demikian berita acara pertukaran barang ini kami buat oleh kedua belah pihak."
	pdf.MultiCell(0, 6, closingText, "", "J", false)
	pdf.Ln(10)

	// Signature Section
	renderSignatures(pdf, data)

	// Footer (Page Number)
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Arial", "I", 8)
		pdf.CellFormat(0, 10, fmt.Sprintf("Hal. %d dari {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})
	pdf.AliasNbPages("{nb}")

	return pdf.OutputFileAndClose(outputPath)
}
