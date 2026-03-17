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
	Category     string // Pengambilan, Pengembalian, Tukar
	OldAsset     *models.AssetKSO
	NewAsset     *models.AssetKSO
}

func (server *Server) GenerateBASTPDF(data BASTData, title string, outputPath string) error {
	switch data.Category {
	case "Pengembalian":
		return server.GenerateBASTPengembalianPDF(data, title, outputPath)
	case "Tukar":
		return server.GenerateBASTTukarPDF(data, title, outputPath)
	default:
		// Default to Penerimaan/Pengambilan
		return server.GenerateBASTPenerimaanPDF(data, title, outputPath)
	}
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
	// Paging Check
	// Estimated height: Date(6) + Ln(5) + Yang(6) + Pihak(6) + Sig(40) + Name(6) + Pos(5) = ~75mm
	// Page height 297mm (Portrait) - Footer(15) = 282mm
	if pdf.GetY() > 200 {
		pdf.AddPage()
	}
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
