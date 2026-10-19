import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AssignmentStatus, UserRole, ApiResponse, IncidentAssignmentDto } from '@accident-alarm/api-contracts';
import { assignmentsService } from './assignments.service';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../common/middleware';

const router = Router();

const createAssignmentSchema = z.object({
  agencyId: z.string().uuid('A valid agency ID is required.'),
  assignedToUserId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable()
});

const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus),
  notes: z.string().max(1000).optional().nullable()
});

// POST /api/v1/staff/incidents/:id/assignments
router.post(
  '/incidents/:id/assignments',
  authenticate,
  requireRole(UserRole.DISPATCHER, UserRole.ADMIN),
  validateBody(createAssignmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const result = await assignmentsService.assignIncident(id, req.body, req.user.id);
      const response: ApiResponse<IncidentAssignmentDto> = {
        data: result
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/staff/assignments/:id
router.patch(
  '/assignments/:id',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  validateBody(updateAssignmentSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const result = await assignmentsService.updateAssignment(id, req.body, req.user.id);
      const response: ApiResponse<IncidentAssignmentDto> = {
        data: result
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export const assignmentsRouter = router;
