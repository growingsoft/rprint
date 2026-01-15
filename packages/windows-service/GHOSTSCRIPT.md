# Ghostscript Installation for RPrint

## Why is Ghostscript Required?

RPrint uses **SumatraPDF** (via the `pdf-to-printer` library) to print documents. SumatraPDF requires **Ghostscript** to:

- Process and render PDF files
- Convert PostScript to PDF
- Handle image printing to label printers
- Properly format documents for thermal printers like Rollo, Zebra, etc.

**Without Ghostscript**: Print jobs will complete with "success" status but nothing actually prints!

## Automatic Installation

### For New Installations

When you run `INSTALL.bat`, the installer will automatically:
1. Check if Ghostscript is installed
2. Offer to download and install it
3. Guide you through the installation process

### For Existing Installations

If you already have RPrint installed and need to add Ghostscript:

**Simply run:**
```batch
install-ghostscript.bat
```

This standalone script will:
- Check if Ghostscript is already installed
- Download the latest version (10.04.0)
- Install it automatically
- Verify the installation

## Manual Installation

If the automatic installer doesn't work, install manually:

1. **Download Ghostscript:**
   - URL: https://ghostscript.com/releases/gsdnld.html
   - Choose: **Ghostscript 10.x for Windows (64-bit)**
   - Direct link: https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10041/gs10.04.0-win64.exe

2. **Run the installer:**
   - Use the default installation path: `C:\Program Files\gs\gs10.xx.x\`
   - Accept all default settings

3. **Verify installation:**
   Open PowerShell and run:
   ```powershell
   gswin64c -version
   ```
   You should see the version number.

4. **Restart RPrint Service:**
   ```batch
   sc stop RPrintService
   sc start RPrintService
   ```
   Or restart from Services (services.msc)

## Troubleshooting

### Ghostscript Not Found After Installation

If you installed Ghostscript but it's still not found:

1. **Check if it's in PATH:**
   ```powershell
   $env:Path -split ';' | Select-String 'ghost'
   ```

2. **Add to PATH manually:**
   - Right-click "This PC" → Properties
   - Advanced system settings → Environment Variables
   - Edit "Path" variable
   - Add: `C:\Program Files\gs\gs10.04.0\bin`

3. **Restart the service**

### Print Jobs Still Not Printing

1. **Check the logs** in `logs/` folder
2. **Verify Ghostscript** with: `gswin64c -version`
3. **Check printer status** - make sure it's online
4. **Test with a simple PDF** first before trying images

### Error: "Failed to convert PostScript"

This error means Ghostscript is not installed or not in the PATH. Follow the installation steps above.

## Version Information

- **Recommended Version**: Ghostscript 10.04.0 or later
- **Download Size**: ~55 MB
- **Installation Time**: ~2 minutes
- **License**: AGPL (free for use)

## After Installation

Once Ghostscript is installed:

1. ✅ PDF files will print correctly
2. ✅ Image files (PNG, JPG) will print
3. ✅ Label printers (Rollo, Zebra) will work properly
4. ✅ Custom paper sizes will be respected
5. ✅ Print quality will be optimal

## Need Help?

If you encounter issues:
1. Check the `logs/error.log` file
2. Look for "Ghostscript" errors
3. Verify installation with `gswin64c -version`
4. Restart the RPrint service after installing
