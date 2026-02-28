/**
 * SSE event emitter for upload progress and recalculation feedback.
 * Uses Node.js EventEmitter — no external broker.
 * Events are keyed by uploadEventId so each client subscribes to its own upload.
 */
import { EventEmitter } from 'node:events';

export const uploadEvents = new EventEmitter();

// Prevent memory leak warnings for many concurrent SSE listeners
uploadEvents.setMaxListeners(50);

export type UploadSSEEvent =
  | { type: 'UPLOAD_PROGRESS'; stage: string; percent: number }
  | { type: 'RECALC_COMPLETE'; runId: string; projectsProcessed: number; snapshotsWritten: number }
  | { type: 'RECALC_FAILED'; error: string };

/**
 * Emit an SSE event for a specific upload.
 * @param uploadEventId - The upload event ID to emit on
 * @param event - The SSE event payload
 */
export function emitUploadEvent(uploadEventId: string, event: UploadSSEEvent): void {
  uploadEvents.emit(uploadEventId, event);
}
