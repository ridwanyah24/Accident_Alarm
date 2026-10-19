import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  UserRole,
  AccountStatus,
  ApiResponse,
  UserProfile,
  AuditLogDto,
  AgencyDto,
  NotificationDeliveryDto
} from '@accident-alarm/api-contracts';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../common/middleware';
import { getDbStore } from '../db';
import { authService } from '../auth/auth.service';
import { NotFoundError, ValidationError } from '../common/errors';

const router = Router();

const inviteStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.nativeEnum(UserRole),
  agencyId: z.string().uuid().optional().nullable(),
  temporaryPassword: z.string().min(8).optional()
});

const updateStaffSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  accountStatus: z.nativeEnum(AccountStatus).optional(),
  agencyId: z.string().uuid().optional().nullable()
});

// GET /api/v1/admin/users
router.get(
  '/users',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const store = getDbStore();
      const users = await store.listUsers();
      const staffProfiles: UserProfile[] = await Promise.all(
        users.map(async u => {
          let agencyName: string | null = null;
          if (u.agencyId) {
            const agency = await store.findAgencyById(u.agencyId);
            if (agency) agencyName = agency.name;
          }
          return {
            id: u.id,
            fullName: u.fullName || 'Staff Member',
            email: u.email || '',
            role: u.role,
            accountStatus: u.accountStatus,
            agencyId: u.agencyId,
            agencyName
          };
        })
      );

      const response: ApiResponse<UserProfile[]> = {
        data: staffProfiles,
        meta: { total: staffProfiles.length }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/admin/users/invitations
router.post(
  '/users/invitations',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateBody(inviteStaffSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const store = getDbStore();
      const { email, fullName, role, agencyId, temporaryPassword } = req.body;

      const existing = await store.findUserByEmail(email);
      if (existing) {
        throw new ValidationError('A user with this email address already exists.', [
          { field: 'email', message: 'Email address is already in use.' }
        ]);
      }

      if (agencyId) {
        const agency = await store.findAgencyById(agencyId);
        if (!agency) {
          throw new ValidationError('The specified agency does not exist.');
        }
      }

      const tempPass = temporaryPassword || 'WelcomePass123!';
      const passwordHash = await authService.hashPassword(tempPass);

      const newUser = await store.createUser({
        fullName,
        email,
        phone: null,
        passwordHash,
        role,
        accountStatus: AccountStatus.ACTIVE,
        agencyId: agencyId || null
      });

      await store.createAuditLog({
        actorUserId: req.user.id,
        action: 'STAFF_INVITED',
        entityType: 'USER',
        entityId: newUser.id,
        ipAddress: null,
        metadata: JSON.stringify({ email, role, agencyId })
      });

      let agencyName: string | null = null;
      if (newUser.agencyId) {
        const agency = await store.findAgencyById(newUser.agencyId);
        if (agency) agencyName = agency.name;
      }

      const userProfile: UserProfile = {
        id: newUser.id,
        fullName: newUser.fullName || '',
        email: newUser.email || '',
        role: newUser.role,
        accountStatus: newUser.accountStatus,
        agencyId: newUser.agencyId,
        agencyName
      };

      const response: ApiResponse<UserProfile> = {
        data: userProfile
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/admin/users/:id
router.patch(
  '/users/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  validateBody(updateStaffSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return;
      const { id } = req.params;
      const store = getDbStore();
      const user = await store.findUserById(id);
      if (!user) {
        throw new NotFoundError('User not found.');
      }

      const updates: Partial<typeof user> = {};
      if (req.body.role) updates.role = req.body.role;
      if (req.body.accountStatus) updates.accountStatus = req.body.accountStatus;
      if (req.body.agencyId !== undefined) updates.agencyId = req.body.agencyId;

      const updated = await store.updateUser(id, updates);

      await store.createAuditLog({
        actorUserId: req.user.id,
        action: 'STAFF_UPDATED',
        entityType: 'USER',
        entityId: id,
        ipAddress: null,
        metadata: JSON.stringify(updates)
      });

      let agencyName: string | null = null;
      if (updated.agencyId) {
        const agency = await store.findAgencyById(updated.agencyId);
        if (agency) agencyName = agency.name;
      }

      const response: ApiResponse<UserProfile> = {
        data: {
          id: updated.id,
          fullName: updated.fullName || '',
          email: updated.email || '',
          role: updated.role,
          accountStatus: updated.accountStatus,
          agencyId: updated.agencyId,
          agencyName
        }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/admin/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const store = getDbStore();
      const logs = await store.listAuditLogs(100);

      const dtos: AuditLogDto[] = await Promise.all(
        logs.map(async l => {
          let actorName: string | null = null;
          if (l.actorUserId) {
            const actor = await store.findUserById(l.actorUserId);
            if (actor) actorName = actor.fullName;
          }
          let parsedMeta = null;
          try {
            if (l.metadata) parsedMeta = JSON.parse(l.metadata);
          } catch {
            // Ignore parse errors
          }

          return {
            id: l.id,
            actorUserId: l.actorUserId,
            actorName,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            createdAt: l.createdAt.toISOString(),
            metadata: parsedMeta
          };
        })
      );

      const response: ApiResponse<AuditLogDto[]> = {
        data: dtos,
        meta: { total: dtos.length }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/staff/agencies
router.get(
  '/agencies',
  authenticate,
  requireRole(UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const store = getDbStore();
      const agencies = await store.listAgencies();

      const dtos: AgencyDto[] = agencies.map(a => ({
        id: a.id,
        name: a.name,
        agencyType: a.agencyType,
        isActive: a.isActive,
        contactNumber: a.contactConfiguration ? JSON.parse(a.contactConfiguration)?.verifiedHelpline || null : null,
        serviceAreaDescription: a.serviceArea
      }));

      const response: ApiResponse<AgencyDto[]> = {
        data: dtos,
        meta: { total: dtos.length }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/staff/notifications
router.get(
  '/notifications',
  authenticate,
  requireRole(UserRole.DISPATCHER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const store = getDbStore();
      const deliveries = await store.listNotificationDeliveries(100);

      const dtos: NotificationDeliveryDto[] = await Promise.all(
        deliveries.map(async d => {
          let refCode: string | null = null;
          if (d.incidentId) {
            const inc = await store.findIncidentById(d.incidentId);
            if (inc) refCode = inc.referenceCode;
          }

          return {
            id: d.id,
            incidentId: d.incidentId,
            incidentReferenceCode: refCode,
            channel: d.channel,
            eventType: d.eventType,
            status: d.status,
            attemptCount: d.attemptCount,
            lastErrorCode: d.lastErrorCode,
            createdAt: d.createdAt.toISOString(),
            sentAt: d.sentAt ? d.sentAt.toISOString() : null,
            deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null
          };
        })
      );

      const response: ApiResponse<NotificationDeliveryDto[]> = {
        data: dtos,
        meta: { total: dtos.length }
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export const adminRouter = router;
