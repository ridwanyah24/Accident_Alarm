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

export interface UserRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  agencyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AgencyRecord {
  id: string;
  name: string;
  agencyType: AgencyType;
  contactConfiguration: string | null;
  serviceArea: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentRecord {
  id: string;
  referenceCode: string;
  createdByUserId: string | null;
  guestAccessTokenHash: string | null;
  idempotencyKey: string | null;
  category: IncidentCategory;
  reporterSeverity: ReporterSeverity;
  operationalPriority: OperationalPriority | null;
  description: string | null;
  vehicleCount: number | null;
  injuredPersonCount: number | null;
  fireSuspected: boolean | null;
  trappedPersonsSuspected: boolean | null;
  roadBlockageSuspected: boolean | null;
  occurredAtDevice: Date | null;
  receivedAt: Date;
  latitude: number;
  longitude: number;
  locationAccuracyM: number | null;
  locationSource: LocationSource;
  landmarkOrAddress: string | null;
  status: IncidentStatus;
  verificationState: VerificationState;
  duplicateOfIncidentId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentMediaRecord {
  id: string;
  incidentId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
  reviewStatus: string;
  createdAt: Date;
}

export interface AssignmentRecord {
  id: string;
  incidentId: string;
  agencyId: string;
  assignedToUserId: string | null;
  assignedByUserId: string;
  status: AssignmentStatus;
  assignedAt: Date;
  acceptedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
}

export interface IncidentStatusEventRecord {
  id: string;
  incidentId: string;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  actorUserId: string | null;
  note: string | null;
  metadata: string | null;
  createdAt: Date;
}

export interface NotificationDeliveryRecord {
  id: string;
  incidentId: string | null;
  recipientUserId: string | null;
  channel: NotificationChannel;
  eventType: string;
  providerMessageId: string | null;
  status: DeliveryStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  createdAt: Date;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  metadata: string | null;
  createdAt: Date;
}

export interface IDatabaseStore {
  // Users
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<UserRecord>;
  updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord>;
  listUsers(role?: UserRole): Promise<UserRecord[]>;

  // Agencies
  findAgencyById(id: string): Promise<AgencyRecord | null>;
  listAgencies(): Promise<AgencyRecord[]>;
  createAgency(agency: Omit<AgencyRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgencyRecord>;

  // Incidents
  findIncidentById(id: string): Promise<IncidentRecord | null>;
  findIncidentByReference(referenceCode: string): Promise<IncidentRecord | null>;
  findIncidentByIdempotencyKey(key: string): Promise<IncidentRecord | null>;
  createIncident(incident: Omit<IncidentRecord, 'id' | 'receivedAt' | 'createdAt' | 'updatedAt'>): Promise<IncidentRecord>;
  updateIncident(id: string, updates: Partial<IncidentRecord>): Promise<IncidentRecord>;
  listIncidents(filters?: IncidentFilterQuery, scopedAgencyId?: string | null): Promise<{ items: IncidentRecord[]; total: number }>;

  // Assignments
  findAssignmentById(id: string): Promise<AssignmentRecord | null>;
  listAssignmentsByIncident(incidentId: string): Promise<AssignmentRecord[]>;
  createAssignment(assignment: Omit<AssignmentRecord, 'id' | 'assignedAt' | 'acceptedAt' | 'completedAt'>): Promise<AssignmentRecord>;
  updateAssignment(id: string, updates: Partial<AssignmentRecord>): Promise<AssignmentRecord>;

  // Status Events
  listStatusEventsByIncident(incidentId: string): Promise<IncidentStatusEventRecord[]>;
  createStatusEvent(event: Omit<IncidentStatusEventRecord, 'id' | 'createdAt'>): Promise<IncidentStatusEventRecord>;

  // Media
  listMediaByIncident(incidentId: string): Promise<IncidentMediaRecord[]>;
  createMedia(media: Omit<IncidentMediaRecord, 'id' | 'createdAt'>): Promise<IncidentMediaRecord>;

  // Notifications
  createNotificationDelivery(delivery: Omit<NotificationDeliveryRecord, 'id' | 'createdAt' | 'attemptCount' | 'nextAttemptAt' | 'sentAt' | 'deliveredAt'>): Promise<NotificationDeliveryRecord>;
  listPendingNotificationDeliveries(limit?: number): Promise<NotificationDeliveryRecord[]>;
  updateNotificationDelivery(id: string, updates: Partial<NotificationDeliveryRecord>): Promise<NotificationDeliveryRecord>;
  listNotificationDeliveries(limit?: number): Promise<NotificationDeliveryRecord[]>;

  // Audit Logs
  createAuditLog(log: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  listAuditLogs(limit?: number): Promise<AuditLogRecord[]>;

  // Health / Reset
  checkHealth(): Promise<boolean>;
  reset(): Promise<void>;
}
