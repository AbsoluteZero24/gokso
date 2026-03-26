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
	"io"

	"github.com/AbsoluteZero24/gokso/internal/models"
	"github.com/jung-kurt/gofpdf"
	"github.com/jung-kurt/gofpdf/contrib/gofpdi"
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

func (server *Server) OverlaySignaturesOnPDF(inputPath, outputPath string, signers []models.GoSignSigner) error {
	fmt.Println("-----------------------------------------------")
	fmt.Println("DEBUG: CALLING OVERLAY ON PDF")
	fmt.Println("INPUT:", inputPath)
	fmt.Println("-----------------------------------------------")

	pdf := gofpdf.New("P", "mm", "A4", "")
	
	// Check if file exists and is readable
	if info, err := os.Stat(inputPath); os.IsNotExist(err) {
		fmt.Printf("[GoSign] CRITICAL: File does not exist during overlay: %s\n", inputPath)
		return fmt.Errorf("input file does not exist: %s", inputPath)
	} else {
		fmt.Printf("[GoSign] File Info: Name=%s, Size=%d\n", info.Name(), info.Size())
	}

	// Signatures mapping by page
	sigsByPage := make(map[int][]models.GoSignSigner)
	for _, s := range signers {
		if s.Signed {
			sigsByPage[s.Page] = append(sigsByPage[s.Page], s)
		}
	}

	// Create isolated importer to prevent global cache corruption across multiple uploads
	// This is CRITICAL. Without this, gofpdi thinks a file with the same name was already processed 
	// and tries to use closed file descriptors from previous tasks.
	imp := gofpdi.NewImporter()

	// Open input file once as a ReadSeeker for better Windows compatibility
	rs, err := os.Open(inputPath)
	if err != nil {
		fmt.Printf("[GoSign] CRITICAL: Failed to open input file stream: %v\n", err)
		return fmt.Errorf("failed to open input file stream: %v", err)
	}
	defer rs.Close()

	// Import pages and copy them to the new PDF
	for i := 1; i <= 500; i++ { // Increased limit for larger documents
		var tpl int
		// Try multiple box types for better compatibility (/CropBox first matches react-pdf)
		boxes := []string{"/CropBox", "/MediaBox", "/BleedBox", "/TrimBox", "/ArtBox", ""}
		for _, box := range boxes {
			func() {
				defer func() {
					if r := recover(); r != nil {
						fmt.Printf("[GoSign] CRITICAL: ImportPageFromStream page %d box [%s] panicked: %v\n", i, box, r)
					}
				}()
				// Seek back to start for each box attempt if needed
				rs.Seek(0, io.SeekStart)
				fmt.Printf("[GoSign] Attempting ImportPageFromStream: Page: %d, Box: [%s]\n", i, box)
				var seeker io.ReadSeeker = rs
				tpl = imp.ImportPageFromStream(pdf, &seeker, i, box)
				fmt.Printf("[GoSign] ImportPageFromStream Result: %d\n", tpl)
			}()
			if tpl != 0 {
				break
			}
		}

		if tpl == 0 {
			if i == 1 {
				fmt.Printf("[GoSign] ERROR: All box import attempts failed for stream %s page 1\n", inputPath)
				return fmt.Errorf("failed to import first page of PDF using any standard box: %s", inputPath)
			}
			break 
		}
		
		pdf.AddPage() // Default A4
		// Draw proportional (w:210, h:0) so Y coords match the frontend calculation 650/210 exactly.
		imp.UseImportedTemplate(pdf, tpl, 0, 0, 210, 0)

		// Overlay signatures for this page
		if sigs, ok := sigsByPage[i]; ok {
			fmt.Printf("[GoSign] Overlaying %d signatures on page %d\n", len(sigs), i)
			for _, s := range sigs {
				// Get User Signature
				var u models.User
				if err := server.DB.Where("id = ?", s.UserID).First(&u).Error; err == nil && u.Signature != "" {
					sigPath := filepath.Join("public/uploads/signatures", u.Signature)
					if _, err := os.Stat(sigPath); err == nil {
						// Render image proportionally inside the box, allowing up to Width x Width*0.4
						drawW := s.Width * 0.8
						drawH := s.Width * 0.4 * 0.8
						drawX := s.X + (s.Width - drawW) / 2
						drawY := s.Y + (s.Width*0.4 - drawH) / 2

						// Detect image dimensions to preserve aspect ratio
						file, err := os.Open(sigPath)
						if err == nil {
							config, _, err := image.DecodeConfig(file)
							file.Close()
							if err == nil && config.Width > 0 && config.Height > 0 {
								imgRatio := float64(config.Height) / float64(config.Width)
								if drawW * imgRatio > drawH {
									// constrained by height
									drawW = drawH / imgRatio
								} else {
									// constrained by width
									drawH = drawW * imgRatio
								}
								drawX = s.X + (s.Width - drawW) / 2
								drawY = s.Y + (s.Width*0.4 - drawH) / 2
							}
						}

						// Image Options explicitly sets H so it squeezes correctly
						pdf.ImageOptions(sigPath, drawX, drawY, drawW, drawH, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")

						if !s.HideRole {
							// Add name explicitly BELOW the box to match where Name normally is if text is requested
							pdf.SetFont("Arial", "B", 8)
							textY := s.Y + (s.Width * 0.4) + 1.0 // 1mm below the signature box
							pdf.SetXY(s.X, textY)
							pdf.CellFormat(s.Width, 4, u.Name, "", 0, "C", false, 0, "")
							
							// Add role/position
							pdf.SetFont("Arial", "", 7)
							pdf.SetXY(s.X, textY+3.5)
							pdf.CellFormat(s.Width, 3, s.Role, "", 0, "C", false, 0, "")
						}
					}
				}
			}
		}
	}

	return pdf.OutputFileAndClose(outputPath)
}
