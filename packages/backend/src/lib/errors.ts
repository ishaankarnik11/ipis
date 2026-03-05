export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Array<{ field?: string; message: string }>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Array<{ field?: string; message: string }>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class UploadRejectedError extends AppError {
  constructor(message: string, details?: Array<{ field?: string; message: string }>) {
    super('UPLOAD_REJECTED', message, 422, details);
    this.name = 'UploadRejectedError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class GoneError extends AppError {
  constructor(message: string, code: string = 'GONE') {
    super(code, message, 410);
    this.name = 'GoneError';
  }
}

export class PdfGenerationError extends AppError {
  constructor(message: string = 'PDF generation failed') {
    super('PDF_GENERATION_FAILED', message, 500);
    this.name = 'PdfGenerationError';
  }
}
