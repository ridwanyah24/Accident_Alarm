import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IncidentMediaDto, UserRole } from '@accident-alarm/api-contracts';
import { config } from '../config';
import { getDbStore } from '../db';
import { NotFoundError, ValidationError, ForbiddenError } from '../common/errors';
import { authService } from '../auth/auth.service';

export class UploadsService {
  private ensureUploadDir(): string {
    const dir = path.resolve(process.cwd(), config.uploads.localDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async attachIncidentMedia(
    incidentId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    },
    guestToken?: string | null,
    uploaderUserId?: string | null,
    userRole?: UserRole
  ): Promise<IncidentMediaDto> {
    const store = getDbStore();
    const incident = await store.findIncidentById(incidentId);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }

    // Access check: Owner, valid guest token, or staff
    const isStaff = userRole && [UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN].includes(userRole);
    const isOwner = uploaderUserId && incident.createdByUserId === uploaderUserId;
    let isGuestValid = false;
    if (guestToken && incident.guestAccessTokenHash) {
      if (authService.hashGuestToken(guestToken) === incident.guestAccessTokenHash) {
        isGuestValid = true;
      }
    }

    if (!isStaff && !isOwner && !isGuestValid) {
      throw new ForbiddenError('You are not authorized to attach media to this incident.');
    }

    // Validate MIME type
    if (!config.uploads.allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, and WebP images are allowed.`,
        [{ field: 'media', message: 'Only image/jpeg, image/png, and image/webp are allowed.' }]
      );
    }

    // Validate size (5MB)
    if (file.size > config.uploads.maxFileSize) {
      throw new ValidationError('File size exceeds the 5MB limit.', [
        { field: 'media', message: 'Maximum file size is 5MB.' }
      ]);
    }

    // Validate Magic Numbers / File Signatures for safety
    if (!this.isValidImageHeader(file.buffer, file.mimetype)) {
      throw new ValidationError('File content does not match the expected image signature.', [
        { field: 'media', message: 'Corrupted or spoofed image file.' }
      ]);
    }

    const ext = file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : '.webp';
    const storageKey = `${uuidv4()}${ext}`;
    const targetDir = this.ensureUploadDir();
    const filePath = path.join(targetDir, storageKey);

    // Save file buffer
    fs.writeFileSync(filePath, file.buffer);

    const mediaRecord = await store.createMedia({
      incidentId,
      storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedByUserId: uploaderUserId || null,
      reviewStatus: 'APPROVED'
    });

    await store.createAuditLog({
      actorUserId: uploaderUserId || null,
      action: 'MEDIA_ATTACHED',
      entityType: 'INCIDENT_MEDIA',
      entityId: mediaRecord.id,
      ipAddress: null,
      metadata: JSON.stringify({
        incidentId,
        sizeBytes: file.size,
        mimeType: file.mimetype
      })
    });

    return {
      id: mediaRecord.id,
      storageKey: mediaRecord.storageKey,
      mimeType: mediaRecord.mimeType,
      sizeBytes: mediaRecord.sizeBytes,
      viewUrl: `/api/v1/uploads/files/${mediaRecord.storageKey}`,
      createdAt: mediaRecord.createdAt.toISOString(),
      reviewStatus: mediaRecord.reviewStatus
    };
  }

  getFilePath(storageKey: string): { filePath: string; mimeType: string } {
    const safeKey = path.basename(storageKey);
    const targetDir = this.ensureUploadDir();
    const fullPath = path.join(targetDir, safeKey);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Media file not found.');
    }

    const ext = path.extname(safeKey).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { filePath: fullPath, mimeType };
  }

  private isValidImageHeader(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 8) return false;
    // JPEG signature: FF D8 FF
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    // WebP signature: RIFF ... WEBP
    if (mimeType === 'image/webp') {
      const riff = buffer.toString('ascii', 0, 4);
      const webp = buffer.toString('ascii', 8, 12);
      return riff === 'RIFF' && webp === 'WEBP';
    }
    return false;
  }
}

export const uploadsService = new UploadsService();
