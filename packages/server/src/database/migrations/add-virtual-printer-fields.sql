-- Migration: Add virtual printer fields to printers table
-- Date: 2025-11-14

-- Add virtual_printer_enabled column (defaults to 1/true for all existing printers)
ALTER TABLE printers ADD COLUMN virtual_printer_enabled INTEGER DEFAULT 1;

-- Add tags column for categorizing printers
ALTER TABLE printers ADD COLUMN tags TEXT;

-- Update existing printers to be enabled for virtual printer by default
UPDATE printers SET virtual_printer_enabled = 1 WHERE virtual_printer_enabled IS NULL;
