import multer from 'multer';
import type { RequestHandler } from 'express';
import { ValidationError } from '../lib/errors.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const uploadSingle: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== XLSX_MIME || !file.originalname.toLowerCase().endsWith('.xlsx')) {
      cb(new ValidationError('Only .xlsx files are accepted'));
      return;
    }
    cb(null, true);
  },
}).single('file');
