import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

const THUMBNAIL_SIZE = 128;
const THUMBNAIL_DIR = process.env.THUMBNAIL_DIR || './thumbnails';

// Ensure thumbnail directory exists
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

export async function generateThumbnail(
  filePath: string,
  mimeType: string
): Promise<string | null> {
  try {
    const thumbnailId = uuidv4();
    const thumbnailPath = path.join(THUMBNAIL_DIR, `${thumbnailId}.jpg`);

    if (mimeType.startsWith('image/')) {
      return await generateImageThumbnail(filePath, thumbnailPath);
    } else if (mimeType === 'application/pdf') {
      return await generatePdfThumbnail(filePath, thumbnailPath);
    }

    // No thumbnail for other file types
    return null;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

async function generateImageThumbnail(
  inputPath: string,
  outputPath: string
): Promise<string | null> {
  try {
    await sharp(inputPath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error('Error generating image thumbnail:', error);
    return null;
  }
}

async function generatePdfThumbnail(
  inputPath: string,
  outputPath: string
): Promise<string | null> {
  try {
    // Use pdftoppm to convert first page to image
    // pdftoppm is part of poppler-utils on Ubuntu
    const tempOutputBase = outputPath.replace('.jpg', '');

    await execAsync(
      `pdftoppm -jpeg -f 1 -l 1 -scale-to ${THUMBNAIL_SIZE * 2} "${inputPath}" "${tempOutputBase}"`
    );

    // pdftoppm adds -1 suffix for page 1
    const tempOutput = `${tempOutputBase}-1.jpg`;

    if (fs.existsSync(tempOutput)) {
      // Resize and crop to square thumbnail
      await sharp(tempOutput)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: 'cover',
          position: 'top'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      // Clean up temp file
      fs.unlinkSync(tempOutput);
      return outputPath;
    }

    return null;
  } catch (error: any) {
    // pdftoppm might not be installed
    if (error.message?.includes('pdftoppm')) {
      console.warn('pdftoppm not available for PDF thumbnails. Install poppler-utils.');
    } else {
      console.error('Error generating PDF thumbnail:', error);
    }
    return null;
  }
}

export function deleteThumbnail(thumbnailPath: string | null): void {
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    try {
      fs.unlinkSync(thumbnailPath);
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
    }
  }
}
