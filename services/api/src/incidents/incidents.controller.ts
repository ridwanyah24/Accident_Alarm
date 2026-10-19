import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  IncidentCategory,
  ReporterSeverity,
  OperationalPriority,
  LocationSource,
  VerificationState,
  IncidentStatus,
  UserRole,
  ApiResponse,
  IncidentCreationResult,
  IncidentPublicResponse,
  IncidentStaffDetailResponse
} from '@accident-alarm/api-contracts';
import { incidentsService } from './incidents.service';
import { authenticate, optionalAuth, requireRole } from '../auth/auth.middleware';
import { validateBody, createRateLimiter } from '../common/middleware';
import { config } from '../config';

const router = Router();

// Rate limiter for incident creation to prevent spam and denial of service
const incidentRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxIncidentSubmit,
  message: 'Incident submission limit reached. Please wait before submitting another report.'
});

const createIncidentSchema = z.object({
  category: z.nativeEnum(IncidentCategory, {
    errorMap: () => ({ message: 'A valid incident category is required.' })
  }),
  reporterSeverity: z.nativeEnum(ReporterSeverity, {
    errorMap: () => ({ message: 'A valid severity rating is required.' })
  }),
  description: z.string().max(2000, 'Description must not exceed 2000 characters.').optional().nullable(),
  vehicleCount: z.number().int().min(0).max(100).optional().nullable(),
  injuredPersonCount: z.number().int().min(0).max(500).optional().nullable(),
  fireSuspected: z.boolean().optional().nullable(),
  trappedPersonsSuspected: z.boolean().optional().nullable(),
  roadBlockageSuspected: z.boolean().optional().nullable(),
  occurredAtDevice: z.string().optional().nullable(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMetres: z.number().positive().optional().nullable(),
    source: z.nativeEnum(LocationSource),
    landmarkOrAddress: z.string().max(500).optional().nullable()
  }),
  contactMethod: z.string().max(100).optional().nullable()
});

const triageSchema = z.object({
  verificationState: z.nativeEnum(VerificationState),
  operationalPriority: z.nativeEnum(OperationalPriority),
  duplicateOfIncidentId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

const statusTransitionSchema = z.object({
  toStatus: z.nativeEnum(IncidentStatus),
  note: z.string().max(1000).optional().nullable()
});

const internalNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty.').max(2000)
});

// ==========================================
// Public & Reporter Endpoints
// ==========================================

// POST /api/v1/incidents
router.post(
  '/',
  incidentRateLimiter,
  optionalAuth,
  validateBody(createIncidentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || null;
      const creatorUserId = req.user ? req.user.id : null;

      const result = await incidentsService.createIncident(req.body, idempotencyKey, creatorUserId);
      const response: ApiResponse<IncidentCreationResult> = {
        data: result
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/incidents/mine
router.get(
  '/mine',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const list = await incidentsService.listUserIncidents(req.user.id);
      const response: ApiResponse<IncidentPublicResponse[]> = {
        data: list,
        meta: { total: list.length }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/incidents/:id/status
router.get(
  '/:id/status',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const guestToken = (req.headers['x-guest-token'] as string) || (req.query.guestToken as string) || null;
      const userId = req.user ? req.user.id : null;
      const userRole = req.user ? (req.user.role as UserRole) : undefined;

      const result = await incidentsService.getPublicIncidentStatus(id, guestToken, userId, userRole);
      const response: ApiResponse<IncidentPublicResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export const incidentsRouter = router;

// ==========================================
// Staff Operations Endpoints
// ==========================================

const staffRouter = Router();

// GET /api/v1/staff/incidents
staffRouter.get(
  '/incidents',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const filters = {
        status: req.query.status as any,
        severity: req.query.severity as any,
        priority: req.query.priority as any,
        category: req.query.category as any,
        verificationState: req.query.verificationState as any,
        search: req.query.search as string,
        unassignedOnly: req.query.unassignedOnly === 'true',
        assignedToUserId: req.query.assignedToUserId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50
      };

      const result = await incidentsService.getStaffIncidents(
        filters,
        req.user.role as UserRole,
        req.user.agencyId
      );

      const response: ApiResponse<IncidentStaffDetailResponse[]> = {
        data: result.items,
        meta: {
          total: result.total,
          page: filters.page,
          limit: filters.limit
        }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/staff/incidents/:id
staffRouter.get(
  '/incidents/:id',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await incidentsService.getStaffIncidentDetail(id);
      const response: ApiResponse<IncidentStaffDetailResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/staff/incidents/:id/triage
staffRouter.patch(
  '/incidents/:id/triage',
  authenticate,
  requireRole(UserRole.DISPATCHER, UserRole.ADMIN),
  validateBody(triageSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const result = await incidentsService.triageIncident(id, req.body, req.user.id);
      const response: ApiResponse<IncidentStaffDetailResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/staff/incidents/:id/status-events
staffRouter.post(
  '/incidents/:id/status-events',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  validateBody(statusTransitionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const { toStatus, note } = req.body;

      const result = await incidentsService.updateIncidentStatus(
        id,
        toStatus,
        note,
        req.user.id,
        req.user.role as UserRole
      );

      const response: ApiResponse<IncidentStaffDetailResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/staff/incidents/:id/notes
staffRouter.post(
  '/incidents/:id/notes',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  validateBody(internalNoteSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const { note } = req.body;

      const result = await incidentsService.addInternalNote(id, note, req.user.id);
      const response: ApiResponse<IncidentStaffDetailResponse> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export const staffIncidentsRouter = staffRouter;
