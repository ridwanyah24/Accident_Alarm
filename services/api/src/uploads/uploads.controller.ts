import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiResponse, IncidentMediaDto, UserRole } from '@accident-alarm/api-contracts';
import { uploadsService } from './uploads.service';
import { optionalAuth } from '../auth/auth.middleware';
import { ValidationError } from '../common/errors';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 } // 6MB buffer limit
});

// POST /api/v1/incidents/:id/media
router.post(
  '/incidents/:id/media',
  optionalAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const guestToken = (req.headers['x-guest-token'] as string) || (req.query.guestToken as string) || null;
      const uploaderUserId = req.user ? req.user.id : null;
      const userRole = req.user ? (req.user.role as UserRole) : undefined;

      if (!req.file) {
        throw new ValidationError('No image file was provided in the multipart request.', [
          { field: 'file', message: 'An image file attachment is required.' }
        ]);
      }

      const result = await uploadsService.attachIncidentMedia(
        id,
        {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size,
          originalname: req.file.originalname
        },
        guestToken,
        uploaderUserId,
        userRole
      );

      const response: ApiResponse<IncidentMediaDto> = {
        data: result
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/uploads/files/:storageKey
router.get(
  '/uploads/files/:storageKey',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { storageKey } = req.params;
      const { filePath, mimeType } = uploadsService.getFilePath(storageKey);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
);

export const uploadsRouter = router;
