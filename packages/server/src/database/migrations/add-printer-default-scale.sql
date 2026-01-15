-- Migration: Add default_scale column to printers table
-- Date: 2026-01-15

-- Add default_scale column to printers table
ALTER TABLE printers ADD COLUMN default_scale TEXT DEFAULT 'noscale';

-- Add other missing default columns if they don't exist
-- These may already exist, SQLite will ignore if column exists
ALTER TABLE printers ADD COLUMN default_paper_size TEXT;
ALTER TABLE printers ADD COLUMN default_orientation TEXT;
ALTER TABLE printers ADD COLUMN default_color_mode TEXT;
ALTER TABLE printers ADD COLUMN default_duplex TEXT;
