import { v4 as uuidv4 } from 'uuid';
import {
  UserRole,
  AccountStatus,
  AgencyType,
  IncidentCategory,
  ReporterSeverity,
  OperationalPriority,
  LocationSource,
  VerificationState,
  IncidentStatus,
  AssignmentStatus,
  NotificationChannel,
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

export class InMemoryStore implements IDatabaseStore {
  private users: Map<string, UserRecord> = new Map();
  private agencies: Map<string, AgencyRecord> = new Map();
  private incidents: Map<string, IncidentRecord> = new Map();
  private assignments: Map<string, AssignmentRecord> = new Map();
  private statusEvents: Map<string, IncidentStatusEventRecord> = new Map();
  private media: Map<string, IncidentMediaRecord> = new Map();
  private notifications: Map<string, NotificationDeliveryRecord> = new Map();
  private auditLogs: Map<string, AuditLogRecord> = new Map();

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email && user.email.toLowerCase().trim() === normalized) {
        return user;
      }
    }
    return null;
  }

  async createUser(data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<UserRecord> {
    const now = new Date();
    const id = uuidv4();
    const user: UserRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User ${id} not found`);
    }
    const updated: UserRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.users.set(id, updated);
    return updated;
  }

  async listUsers(role?: UserRole): Promise<UserRecord[]> {
    const list = Array.from(this.users.values());
    if (!role) return list;
    return list.filter(u => u.role === role);
  }

  async findAgencyById(id: string): Promise<AgencyRecord | null> {
    return this.agencies.get(id) || null;
  }

  async listAgencies(): Promise<AgencyRecord[]> {
    return Array.from(this.agencies.values());
  }

  async createAgency(data: Omit<AgencyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgencyRecord> {
    const id = uuidv4();
    const now = new Date();
    const agency: AgencyRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.agencies.set(id, agency);
    return agency;
  }

  async findIncidentById(id: string): Promise<IncidentRecord | null> {
    return this.incidents.get(id) || null;
  }

  async findIncidentByReference(referenceCode: string): Promise<IncidentRecord | null> {
    const normalized = referenceCode.toUpperCase().trim();
    for (const incident of this.incidents.values()) {
      if (incident.referenceCode.toUpperCase().trim() === normalized) {
        return incident;
      }
    }
    return null;
  }

  async findIncidentByIdempotencyKey(key: string): Promise<IncidentRecord | null> {
    for (const incident of this.incidents.values()) {
      if (incident.idempotencyKey === key) {
        return incident;
      }
    }
    return null;
  }

  async createIncident(data: Omit<IncidentRecord, 'id' | 'receivedAt' | 'createdAt' | 'updatedAt'>): Promise<IncidentRecord> {
    const id = uuidv4();
    const now = new Date();
    const incident: IncidentRecord = {
      ...data,
      id,
      receivedAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.incidents.set(id, incident);
    return incident;
  }

  async updateIncident(id: string, updates: Partial<IncidentRecord>): Promise<IncidentRecord> {
    const existing = this.incidents.get(id);
    if (!existing) {
      throw new Error(`Incident ${id} not found`);
    }
    const updated: IncidentRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.incidents.set(id, updated);
    return updated;
  }

  async listIncidents(
    filters: IncidentFilterQuery = {},
    scopedAgencyId?: string | null
  ): Promise<{ items: IncidentRecord[]; total: number }> {
    let list = Array.from(this.incidents.values());

    // Agency scoping: If user is restricted to a specific agency, filter by active assignments
    if (scopedAgencyId) {
      const allowedIncidentIds = new Set(
        Array.from(this.assignments.values())
          .filter(a => a.agencyId === scopedAgencyId)
          .map(a => a.incidentId)
      );
      list = list.filter(inc => allowedIncidentIds.has(inc.id));
    }

    if (filters.status) {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters.severity) {
      list = list.filter(i => i.reporterSeverity === filters.severity);
    }
    if (filters.priority) {
      list = list.filter(i => i.operationalPriority === filters.priority);
    }
    if (filters.category) {
      list = list.filter(i => i.category === filters.category);
    }
    if (filters.verificationState) {
      list = list.filter(i => i.verificationState === filters.verificationState);
    }
    if (filters.unassignedOnly) {
      const assignedIncidentIds = new Set(
        Array.from(this.assignments.values())
          .filter(a => a.status === AssignmentStatus.ACTIVE)
          .map(a => a.incidentId)
      );
      list = list.filter(i => !assignedIncidentIds.has(i.id));
    }
    if (filters.assignedToUserId) {
      const assignedIncidentIds = new Set(
        Array.from(this.assignments.values())
          .filter(a => a.assignedToUserId === filters.assignedToUserId && a.status === AssignmentStatus.ACTIVE)
          .map(a => a.incidentId)
      );
      list = list.filter(i => assignedIncidentIds.has(i.id));
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      list = list.filter(i =>
        i.referenceCode.toLowerCase().includes(term) ||
        (i.landmarkOrAddress && i.landmarkOrAddress.toLowerCase().includes(term)) ||
        (i.description && i.description.toLowerCase().includes(term))
      );
    }

    // Sort newest first
    list.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    const total = list.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return { items, total };
  }

  async findAssignmentById(id: string): Promise<AssignmentRecord | null> {
    return this.assignments.get(id) || null;
  }

  async listAssignmentsByIncident(incidentId: string): Promise<AssignmentRecord[]> {
    return Array.from(this.assignments.values())
      .filter(a => a.incidentId === incidentId)
      .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
  }

  async createAssignment(data: Omit<AssignmentRecord, 'id' | 'assignedAt' | 'acceptedAt' | 'completedAt'>): Promise<AssignmentRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: AssignmentRecord = {
      ...data,
      id,
      assignedAt: now,
      acceptedAt: null,
      completedAt: null
    };
    this.assignments.set(id, record);
    return record;
  }

  async updateAssignment(id: string, updates: Partial<AssignmentRecord>): Promise<AssignmentRecord> {
    const existing = this.assignments.get(id);
    if (!existing) {
      throw new Error(`Assignment ${id} not found`);
    }
    const updated: AssignmentRecord = {
      ...existing,
      ...updates
    };
    this.assignments.set(id, updated);
    return updated;
  }

  async listStatusEventsByIncident(incidentId: string): Promise<IncidentStatusEventRecord[]> {
    return Array.from(this.statusEvents.values())
      .filter(e => e.incidentId === incidentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createStatusEvent(data: Omit<IncidentStatusEventRecord, 'id' | 'createdAt'>): Promise<IncidentStatusEventRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: IncidentStatusEventRecord = {
      ...data,
      id,
      createdAt: now
    };
    this.statusEvents.set(id, record);
    return record;
  }

  async listMediaByIncident(incidentId: string): Promise<IncidentMediaRecord[]> {
    return Array.from(this.media.values())
      .filter(m => m.incidentId === incidentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMedia(data: Omit<IncidentMediaRecord, 'id' | 'createdAt'>): Promise<IncidentMediaRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: IncidentMediaRecord = {
      ...data,
      id,
      createdAt: now
    };
    this.media.set(id, record);
    return record;
  }

  async createNotificationDelivery(data: Omit<NotificationDeliveryRecord, 'id' | 'createdAt' | 'attemptCount' | 'nextAttemptAt' | 'sentAt' | 'deliveredAt'>): Promise<NotificationDeliveryRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: NotificationDeliveryRecord = {
      ...data,
      id,
      attemptCount: 0,
      createdAt: now,
      nextAttemptAt: null,
      sentAt: null,
      deliveredAt: null
    };
    this.notifications.set(id, record);
    return record;
  }

  async listPendingNotificationDeliveries(limit = 20): Promise<NotificationDeliveryRecord[]> {
    const now = Date.now();
    return Array.from(this.notifications.values())
      .filter(n => n.status === DeliveryStatus.QUEUED || (
        n.status === DeliveryStatus.FAILED &&
        n.attemptCount < 5 &&
        (!n.nextAttemptAt || n.nextAttemptAt.getTime() <= now)
      ))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async updateNotificationDelivery(id: string, updates: Partial<NotificationDeliveryRecord>): Promise<NotificationDeliveryRecord> {
    const existing = this.notifications.get(id);
    if (!existing) {
      throw new Error(`NotificationDelivery ${id} not found`);
    }
    const updated: NotificationDeliveryRecord = {
      ...existing,
      ...updates
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async listNotificationDeliveries(limit = 100): Promise<NotificationDeliveryRecord[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createAuditLog(data: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: AuditLogRecord = {
      ...data,
      id,
      createdAt: now
    };
    this.auditLogs.set(id, record);
    return record;
  }

  async listAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }

  async reset(): Promise<void> {
    this.users.clear();
    this.agencies.clear();
    this.incidents.clear();
    this.assignments.clear();
    this.statusEvents.clear();
    this.media.clear();
    this.notifications.clear();
    this.auditLogs.clear();
  }
}
