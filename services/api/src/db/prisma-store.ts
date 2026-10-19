import { PrismaClient } from '@prisma/client';
import {
  UserRole,
  AssignmentStatus,
  DeliveryStatus,
  IncidentFilterQuery
} from '@accident-alarm/api-contracts';
import {
  IDatabaseStore,
  UserRecord,
  AgencyRecord,
  IncidentRecord,
  IncidentMediaRecord,
  AssignmentRecord,
  IncidentStatusEventRecord,
  NotificationDeliveryRecord,
  AuditLogRecord
} from './store.interface';

const prisma = new PrismaClient();

export class PrismaStore implements IDatabaseStore {
  async findUserById(id: string): Promise<UserRecord | null> {
    return await prisma.user.findUnique({ where: { id } }) as unknown as UserRecord | null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } }) as unknown as UserRecord | null;
  }

  async createUser(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<UserRecord> {
    return await prisma.user.create({ data }) as unknown as UserRecord;
  }

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const { id: _id, createdAt: _createdAt, ...data } = updates;
    return await prisma.user.update({ where: { id }, data }) as unknown as UserRecord;
  }

  async listUsers(role?: UserRole): Promise<UserRecord[]> {
    return await prisma.user.findMany({ where: role ? { role: role as never } : undefined }) as unknown as UserRecord[];
  }

  async findAgencyById(id: string): Promise<AgencyRecord | null> {
    return await prisma.agency.findUnique({ where: { id } }) as unknown as AgencyRecord | null;
  }

  async listAgencies(): Promise<AgencyRecord[]> {
    return await prisma.agency.findMany({ orderBy: { createdAt: 'asc' } }) as unknown as AgencyRecord[];
  }

  async createAgency(data: Omit<AgencyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgencyRecord> {
    return await prisma.agency.create({ data }) as unknown as AgencyRecord;
  }

  async findIncidentById(id: string): Promise<IncidentRecord | null> {
    return await prisma.incident.findUnique({ where: { id } }) as unknown as IncidentRecord | null;
  }

  async findIncidentByReference(referenceCode: string): Promise<IncidentRecord | null> {
    return await prisma.incident.findUnique({ where: { referenceCode: referenceCode.toUpperCase().trim() } }) as unknown as IncidentRecord | null;
  }

  async findIncidentByIdempotencyKey(key: string): Promise<IncidentRecord | null> {
    return await prisma.incident.findUnique({ where: { idempotencyKey: key } }) as unknown as IncidentRecord | null;
  }

  async createIncident(data: Omit<IncidentRecord, 'id' | 'receivedAt' | 'createdAt' | 'updatedAt'>): Promise<IncidentRecord> {
    return await prisma.incident.create({ data }) as unknown as IncidentRecord;
  }

  async updateIncident(id: string, updates: Partial<IncidentRecord>): Promise<IncidentRecord> {
    const { id: _id, createdAt: _createdAt, ...data } = updates;
    return await prisma.incident.update({ where: { id }, data }) as unknown as IncidentRecord;
  }

  async listIncidents(filters: IncidentFilterQuery = {}, scopedAgencyId?: string | null): Promise<{ items: IncidentRecord[]; total: number }> {
    const where = {
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.severity ? { reporterSeverity: filters.severity as never } : {}),
      ...(filters.priority ? { operationalPriority: filters.priority as never } : {}),
      ...(filters.category ? { category: filters.category as never } : {}),
      ...(filters.verificationState ? { verificationState: filters.verificationState as never } : {}),
      ...(filters.search ? {
        OR: [
          { referenceCode: { contains: filters.search, mode: 'insensitive' as const } },
          { landmarkOrAddress: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      } : {}),
      ...(filters.unassignedOnly ? { assignments: { none: { status: AssignmentStatus.ACTIVE as never } } } : {}),
      ...(filters.assignedToUserId ? { assignments: { some: { assignedToUserId: filters.assignedToUserId, status: AssignmentStatus.ACTIVE as never } } } : {}),
      ...(scopedAgencyId ? { assignments: { some: { agencyId: scopedAgencyId } } } : {})
    };
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const take = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const [items, total] = await Promise.all([
      prisma.incident.findMany({ where, orderBy: { receivedAt: 'desc' }, skip: (page - 1) * take, take }),
      prisma.incident.count({ where })
    ]);
    return { items: items as unknown as IncidentRecord[], total };
  }

  async findAssignmentById(id: string): Promise<AssignmentRecord | null> {
    return await prisma.assignment.findUnique({ where: { id } }) as unknown as AssignmentRecord | null;
  }

  async listAssignmentsByIncident(incidentId: string): Promise<AssignmentRecord[]> {
    return await prisma.assignment.findMany({ where: { incidentId }, orderBy: { assignedAt: 'desc' } }) as unknown as AssignmentRecord[];
  }

  async createAssignment(data: Omit<AssignmentRecord, 'id' | 'assignedAt' | 'acceptedAt' | 'completedAt'>): Promise<AssignmentRecord> {
    return await prisma.assignment.create({ data }) as unknown as AssignmentRecord;
  }

  async updateAssignment(id: string, updates: Partial<AssignmentRecord>): Promise<AssignmentRecord> {
    const { id: _id, assignedAt: _assignedAt, ...data } = updates;
    return await prisma.assignment.update({ where: { id }, data }) as unknown as AssignmentRecord;
  }

  async listStatusEventsByIncident(incidentId: string): Promise<IncidentStatusEventRecord[]> {
    return await prisma.incidentStatusEvent.findMany({ where: { incidentId }, orderBy: { createdAt: 'asc' } }) as unknown as IncidentStatusEventRecord[];
  }

  async createStatusEvent(data: Omit<IncidentStatusEventRecord, 'id' | 'createdAt'>): Promise<IncidentStatusEventRecord> {
    return await prisma.incidentStatusEvent.create({ data }) as unknown as IncidentStatusEventRecord;
  }

  async listMediaByIncident(incidentId: string): Promise<IncidentMediaRecord[]> {
    return await prisma.incidentMedia.findMany({ where: { incidentId }, orderBy: { createdAt: 'asc' } }) as unknown as IncidentMediaRecord[];
  }

  async createMedia(data: Omit<IncidentMediaRecord, 'id' | 'createdAt'>): Promise<IncidentMediaRecord> {
    return await prisma.incidentMedia.create({ data }) as unknown as IncidentMediaRecord;
  }

  async createNotificationDelivery(data: Omit<NotificationDeliveryRecord, 'id' | 'createdAt' | 'attemptCount' | 'nextAttemptAt' | 'sentAt' | 'deliveredAt'>): Promise<NotificationDeliveryRecord> {
    return await prisma.notificationDelivery.create({ data }) as unknown as NotificationDeliveryRecord;
  }

  async listPendingNotificationDeliveries(limit = 20): Promise<NotificationDeliveryRecord[]> {
    return await prisma.notificationDelivery.findMany({
      where: {
        OR: [
          { status: DeliveryStatus.QUEUED as never },
          { status: DeliveryStatus.FAILED as never, attemptCount: { lt: 5 }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    }) as unknown as NotificationDeliveryRecord[];
  }

  async updateNotificationDelivery(id: string, updates: Partial<NotificationDeliveryRecord>): Promise<NotificationDeliveryRecord> {
    const { id: _id, createdAt: _createdAt, ...data } = updates;
    return await prisma.notificationDelivery.update({ where: { id }, data }) as unknown as NotificationDeliveryRecord;
  }

  async listNotificationDeliveries(limit = 100): Promise<NotificationDeliveryRecord[]> {
    return await prisma.notificationDelivery.findMany({ orderBy: { createdAt: 'desc' }, take: limit }) as unknown as NotificationDeliveryRecord[];
  }

  async createAuditLog(data: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
    return await prisma.auditLog.create({ data }) as unknown as AuditLogRecord;
  }

  async listAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    return await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit }) as unknown as AuditLogRecord[];
  }

  async checkHealth(): Promise<boolean> {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  }

  async reset(): Promise<void> {
    await prisma.$transaction([
      prisma.notificationDelivery.deleteMany(),
      prisma.incidentStatusEvent.deleteMany(),
      prisma.incidentMedia.deleteMany(),
      prisma.assignment.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.incident.deleteMany(),
      prisma.user.deleteMany(),
      prisma.agency.deleteMany()
    ]);
  }
}