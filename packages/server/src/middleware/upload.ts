import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/postscript', // PostScript files from CUPS/virtual printers
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'application/octet-stream' // Allow binary files temporarily for debugging
  ];

  // Log what we're receiving
  console.log(`[UPLOAD] File: ${file.originalname}, MIME: ${file.mimetype}, Size: ${file.size || 'unknown'}`);

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`[UPLOAD] REJECTED - MIME type not allowed: ${file.mimetype}`);
    cb(new Error('Invalid file type. Only PDF, documents, spreadsheets, and images are allowed.'));
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize
  }
});
