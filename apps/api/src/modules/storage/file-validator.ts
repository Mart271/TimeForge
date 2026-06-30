import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { FileConstraints } from './storage.types';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_ALLOWED = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

/** Validates uploads against size + MIME-type allowlists. */
@Injectable()
export class FileValidator {
  validate(file: { contentType: string; size: number }, constraints?: FileConstraints): void {
    const maxBytes = constraints?.maxBytes ?? DEFAULT_MAX_BYTES;
    const allowed = constraints?.allowedMimeTypes ?? DEFAULT_ALLOWED;

    if (!file.size || file.size <= 0) {
      throw new UnprocessableEntityException('Empty file');
    }
    if (file.size > maxBytes) {
      throw new UnprocessableEntityException(`File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
    }
    if (!allowed.includes(file.contentType)) {
      throw new UnprocessableEntityException(`Unsupported file type: ${file.contentType}`);
    }
  }
}
