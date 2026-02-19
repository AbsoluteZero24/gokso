package handlers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/jung-kurt/gofpdf"
)

type BASTData struct {
	DocNumber    string
	HandoverDate time.Time
	P1           models.User
	P2           models.User
	Items        []models.AssetKSO
	Notes        string
	SigP1Data    string // Base64
	SigP2Data    string // Base64
}

func (server *Server) GenerateBASTPDF(data BASTData, outputPath string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Header Logos
	logoDir := filepath.Join("public", "assets", "img")

	// Danantara Logo (Left)
	danantaraPath := filepath.Join(logoDir, "logo-danantara.png")
	if err := registerLogo(pdf, danantaraPath, "logo1"); err == nil {
		fmt.Println("[PDF Helper] Danantara logo registered successfully")
		pdf.Image("logo1", 20, 15, 38, 0, false, "", 0, "")
	} else {
		fmt.Printf("[PDF Helper] Danantara logo FAILED: %v (Path: %s)\n", err, danantaraPath)
	}

	// IDSurvey Logo (Center)
	if err := registerLogo(pdf, filepath.Join(logoDir, "logo-idsurvey.png"), "logo2"); err == nil {
		fmt.Println("[PDF Helper] IDSurvey logo registered successfully")
		pdf.Image("logo2", 85, 15, 40, 0, false, "", 0, "")
	}

	// KSOSCISI Logo (Right)
	if err := registerLogo(pdf, filepath.Join(logoDir, "logo-ksoscisi.png"), "logo3"); err == nil {
		fmt.Println("[PDF Helper] KSOSCISI logo registered successfully")
		pdf.Image("logo3", 145, 15, 45, 0, false, "", 0, "")
	}

	pdf.SetY(45)

	// Title
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(0, 7, "BERITA ACARA SERAH TERIMA", "", 1, "C", false, 0, "")
	pdf.Ln(8)

	// Opening text
	pdf.SetFont("Arial", "", 11)
	dayName := getIndonesianDay(data.HandoverDate)
	dateStr := data.HandoverDate.Format("02 January 2006")
	// Translate month to Indonesian
	dateStr = translateMonth(dateStr)

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
	middleText := "PIHAK PERTAMA telah menyerahkan barang kepada PIHAK KEDUA, dan PIHAK KEDUA menyatakan telah menerima barang dari PIHAK PERTAMA berupa daftar terlampir."
	pdf.MultiCell(0, 6, middleText, "", "J", false)
	pdf.Ln(4)

	// Table
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 230, 230)
	pdf.CellFormat(10, 8, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(90, 8, "NAMA BARANG", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 8, "Jumlah", "1", 0, "C", true, 0, "")
	pdf.CellFormat(50, 8, "KETERANGAN", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 10)
	for i, item := range data.Items {
		pdf.CellFormat(10, 8, fmt.Sprintf("%d", i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(90, 8, fmt.Sprintf("%s - %s", item.AssetName, item.SerialNumber), "1", 0, "L", false, 0, "")
		pdf.CellFormat(20, 8, "1 Unit", "1", 0, "C", false, 0, "")
		pdf.CellFormat(50, 8, item.Category, "1", 1, "L", false, 0, "")
	}
	pdf.Ln(6)

	// Closing Text
	closingText := "Demikian berita acara serah terima barang ini kami buat oleh kedua belah pihak, adapun barang-barang tersebut dalam keadaan baik dan cukup. Maka barang tersebut menjadi tanggung jawab PIHAK KEDUA, memelihara/ merawat dengan baik serta dipergunakan sebagaimana mestinya."
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

func renderPerson(pdf *gofpdf.Fpdf, title string, user models.User) {
	pdf.SetFont("Arial", "B", 11)
	// pdf.CellFormat(0, 6, title, "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(35, 6, "Nama", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 6, user.Name, "", 1, "L", false, 0, "")

	pdf.CellFormat(35, 6, "Nama Bagian", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 6, user.Department, "", 1, "L", false, 0, "")

	pdf.CellFormat(35, 6, "Jabatan", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 6, user.Position, "", 1, "L", false, 0, "")
}

func renderSignatures(pdf *gofpdf.Fpdf, data BASTData) {
	pdf.Ln(5)
	dateStr := data.HandoverDate.Format("02 January 2006")
	dateStr = translateMonth(dateStr)
	pdf.CellFormat(0, 6, fmt.Sprintf("Jakarta, %s", dateStr), "", 1, "R", false, 0, "")
	pdf.Ln(5)

	y := pdf.GetY()

	// Left side (Penerima)
	pdf.SetX(20)
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(85, 6, "Yang Menerima", "", 1, "C", false, 0, "")
	pdf.SetX(20)
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(85, 6, "PIHAK KEDUA,", "", 0, "C", false, 0, "")

	// Right side (Menyerahkan)
	pdf.SetY(y)
	pdf.SetX(115)
	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(85, 6, "Yang Menyerahkan", "", 1, "C", false, 0, "")
	pdf.SetX(115)
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(85, 6, "PIHAK PERTAMA,", "", 1, "C", false, 0, "")

	// Render Signatures if data exists
	sigY := y + 18
	if data.SigP2Data != "" {
		if err := registerBase64Image(pdf, data.SigP2Data, "sig_p2"); err == nil {
			// Center in left block (20-105): Center is 62.5. Width 65 -> X = 30
			pdf.Image("sig_p2", 30, sigY, 65, 0, false, "", 0, "")
		}
	}
	if data.SigP1Data != "" {
		if err := registerBase64Image(pdf, data.SigP1Data, "sig_p1"); err == nil {
			// Center in right block (115-200): Center is 157.5. Width 65 -> X = 125
			pdf.Image("sig_p1", 125, sigY, 65, 0, false, "", 0, "")
		}
	}

	pdf.Ln(40) // Space for signature

	// Names
	y = pdf.GetY()
	pdf.SetX(20)
	pdf.SetFont("Arial", "BU", 11)
	pdf.CellFormat(85, 6, data.P2.Name, "", 1, "C", false, 0, "")
	pdf.SetX(20)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(85, 5, data.P2.Position, "", 0, "C", false, 0, "")

	pdf.SetY(y)
	pdf.SetX(115)
	pdf.SetFont("Arial", "BU", 11)
	pdf.CellFormat(85, 6, data.P1.Name, "", 1, "C", false, 0, "")
	pdf.SetX(115)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(85, 5, data.P1.Position, "", 1, "C", false, 0, "")
}

func registerBase64Image(pdf *gofpdf.Fpdf, base64Str, name string) error {
	// Remove header if present (data:image/png;base64,)
	if idx := strings.Index(base64Str, ","); idx != -1 {
		base64Str = base64Str[idx+1:]
	}

	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return err
	}

	buf := bytes.NewBuffer(data)
	img, _, err := image.Decode(buf)
	if err != nil {
		return err
	}

	// Signatures often have transparency, convert to JPEG with white background
	newImg := image.NewRGBA(img.Bounds())
	draw.Draw(newImg, newImg.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)
	draw.Draw(newImg, newImg.Bounds(), img, img.Bounds().Min, draw.Over)

	var outBuf bytes.Buffer
	if err := jpeg.Encode(&outBuf, newImg, &jpeg.Options{Quality: 100}); err != nil {
		return err
	}

	pdf.RegisterImageReader(name, "JPEG", &outBuf)
	return nil
}

func getIndonesianDay(t time.Time) string {
	days := map[string]string{
		"Sunday":    "Minggu",
		"Monday":    "Senin",
		"Tuesday":   "Selasa",
		"Wednesday": "Rabu",
		"Thursday":  "Kamis",
		"Friday":    "Jumat",
		"Saturday":  "Sabtu",
	}
	return days[t.Weekday().String()]
}

func translateMonth(s string) string {
	months := map[string]string{
		"January":   "Januari",
		"February":  "Februari",
		"March":     "Maret",
		"April":     "April",
		"May":       "Mei",
		"June":      "Juni",
		"July":      "Juli",
		"August":    "Agustus",
		"September": "September",
		"October":   "Oktober",
		"November":  "November",
		"December":  "Desember",
	}
	for en, id := range months {
		if strings.Contains(s, en) {
			return strings.Replace(s, en, id, 1)
		}
	}
	return s
}

func registerLogo(pdf *gofpdf.Fpdf, path, name string) error {
	file, err := os.Open(path)
	if err != nil {
		fmt.Printf("[PDF Helper] Error opening file %s: %v\n", path, err)
		return err
	}
	defer file.Close()

	img, format, err := image.Decode(file)
	if err != nil {
		fmt.Printf("[PDF Helper] Error decoding image %s (Format: %s): %v\n", path, format, err)
		return err
	}

	// Create a new image with white background
	newImg := image.NewRGBA(img.Bounds())
	draw.Draw(newImg, newImg.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)
	draw.Draw(newImg, newImg.Bounds(), img, img.Bounds().Min, draw.Over)

	// Re-encode as JPEG
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, newImg, &jpeg.Options{Quality: 100}); err != nil {
		fmt.Printf("[PDF Helper] Error encoding jpeg for %s: %v\n", path, err)
		return err
	}

	// Register the JPEG image
	pdf.RegisterImageReader(name, "JPEG", &buf)
	return nil
}
