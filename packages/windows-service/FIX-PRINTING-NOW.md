# Fix Printing - Simple Steps

Follow these steps IN ORDER to fix printing once and for all.

## Step 1: Fix PowerShell Execution Policy

Open PowerShell **AS ADMINISTRATOR** and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

## Step 2: Install Dependencies

In the same PowerShell window, navigate to your RPrint directory and run:

```powershell
cd C:\rprint
npm install
```

## Step 3: Install SumatraPDF

Still in the same PowerShell window, run:

```powershell
.\setup-sumatra.ps1
```

This will:
- Download SumatraPDF
- Place it in the correct locations for pdf-to-printer
- Clean up temporary files

## Step 4: Restart RPrint Service

If you have RPrint running as a Windows service:

```powershell
Restart-Service "RPrint Worker"
```

Or if running manually, stop it (Ctrl+C) and start again:

```powershell
npm start
```

## Step 5: Test Printing

Run the diagnostic to verify everything is working:

```powershell
node diagnose.js
```

Then test printing:

```powershell
node test-print-simple.js
```

## If It Still Doesn't Work

Check the following:

1. **Printer Name Must Match Exactly**
   - Open PowerShell and run: `Get-Printer | Select Name`
   - Copy the EXACT name of your Rollo printer
   - Make sure the database has this exact name

2. **Create Custom Paper Size in Windows**
   - Control Panel > Devices and Printers
   - Right-click "Rollo Printer" > Printer Properties
   - Go to Device Settings or Printing Preferences
   - Create new paper form: "Label_1.5x3"
   - Width: 1.5 inches
   - Height: 3.0 inches

3. **Check Service Logs**
   - Look in: `C:\rprint\logs\`
   - Check for any error messages

## Still Having Issues?

Run this command to see detailed printer info:

```powershell
Get-Printer | Where-Object {$_.Name -like "*Rollo*"} | Format-List *
```

This will show all properties of the Rollo printer.
