/**
 * Road Accident Detection, Reporting and Emergency Response System
 * API Contracts, Enums, DTOs, and Type Definitions
 */

// ==========================================
// 1. Enums
// ==========================================

export enum UserRole {
  REPORTER = 'REPORTER',
  RESPONDER = 'RESPONDER',
  DISPATCHER = 'DISPATCHER',
  ADMIN = 'ADMIN'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED'
}

export enum AgencyType {
  AMBULANCE = 'AMBULANCE',
  POLICE = 'POLICE',
  FIRE = 'FIRE',
  ROAD_SAFETY = 'ROAD_SAFETY',
  DISASTER_MANAGEMENT = 'DISASTER_MANAGEMENT',
  OTHER = 'OTHER'
}

export enum IncidentCategory {
  COLLISION = 'COLLISION',
  VEHICLE_ROLLOVER = 'VEHICLE_ROLLOVER',
  PEDESTRIAN_STRUCK = 'PEDESTRIAN_STRUCK',
  MOTORCYCLE_INCIDENT = 'MOTORCYCLE_INCIDENT',
  VEHICLE_FIRE = 'VEHICLE_FIRE',
  OBSTRUCTION_OR_OTHER = 'OBSTRUCTION_OR_OTHER'
}

export enum ReporterSeverity {
  MINOR = 'MINOR',
  SERIOUS = 'SERIOUS',
  CRITICAL = 'CRITICAL',
  UNSURE = 'UNSURE'
}

export enum OperationalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum LocationSource {
  GPS = 'GPS',
  MAP_PIN = 'MAP_PIN',
  MANUAL = 'MANUAL'
}

export enum VerificationState {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  DUPLICATE = 'DUPLICATE',
  FALSE_REPORT_SUSPECTED = 'FALSE_REPORT_SUSPECTED'
}

export enum IncidentStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ASSIGNED = 'ASSIGNED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SCENE = 'ON_SCENE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  UNVERIFIED = 'UNVERIFIED',
  DUPLICATE = 'DUPLICATE',
  CANCELLED = 'CANCELLED'
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  REASSIGNED = 'REASSIGNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum NotificationChannel {
  FCM = 'FCM',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP'
}

export enum DeliveryStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN'
}

// ==========================================
// 2. Standard API Response Shapes
// ==========================================

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    requestId?: string;
    [key: string]: unknown;
  };
}

// ==========================================
// 3. Location Contract
// ==========================================

export interface IncidentLocationDto {
  latitude: number;
  longitude: number;
  accuracyMetres?: number | null;
  source: LocationSource;
  landmarkOrAddress?: string | null;
}

// ==========================================
// 4. Incident Request & Response DTOs
// ==========================================

export interface CreateIncidentRequest {
  category: IncidentCategory;
  reporterSeverity: ReporterSeverity;
  description?: string | null;
  vehicleCount?: number | null;
  injuredPersonCount?: number | null;
  fireSuspected?: boolean | null;
  trappedPersonsSuspected?: boolean | null;
  roadBlockageSuspected?: boolean | null;
  occurredAtDevice?: string | null;
  location: IncidentLocationDto;
  contactMethod?: string | null;
}

export interface IncidentCreationResult {
  id: string;
  referenceCode: string;
  status: IncidentStatus;
  receivedAt: string;
  guestAccessToken?: string; // Only returned on creation for guests so they can check status
  message: string;
}

export interface IncidentPublicResponse {
  id: string;
  referenceCode: string;
  category: IncidentCategory;
  reporterSeverity: ReporterSeverity;
  status: IncidentStatus;
  statusDisplay: string;
  receivedAt: string;
  location: {
    source: LocationSource;
    landmarkOrAddress?: string | null;
    approximateLatitude?: number;
    approximateLongitude?: number;
  };
  hasMedia: boolean;
}

export interface IncidentStatusEventDto {
  id: string;
  fromStatus?: IncidentStatus | null;
  toStatus: IncidentStatus;
  actorRole?: UserRole | 'SYSTEM';
  actorName?: string;
  note?: string | null;
  createdAt: string;
}

export interface IncidentAssignmentDto {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyType: AgencyType;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  assignedByName: string;
  status: AssignmentStatus;
  assignedAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}

export interface IncidentMediaDto {
  id: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  viewUrl: string;
  createdAt: string;
  reviewStatus: string;
}

export interface IncidentStaffDetailResponse {
  id: string;
  referenceCode: string;
  createdByUserId?: string | null;
  category: IncidentCategory;
  reporterSeverity: ReporterSeverity;
  operationalPriority?: OperationalPriority | null;
  description?: string | null;
  vehicleCount?: number | null;
  injuredPersonCount?: number | null;
  fireSuspected?: boolean | null;
  trappedPersonsSuspected?: boolean | null;
  roadBlockageSuspected?: boolean | null;
  occurredAtDevice?: string | null;
  receivedAt: string;
  location: IncidentLocationDto;
  status: IncidentStatus;
  verificationState: VerificationState;
  duplicateOfIncidentId?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: IncidentAssignmentDto[];
  statusEvents: IncidentStatusEventDto[];
  media: IncidentMediaDto[];
  internalNotes: string[];
}

export interface IncidentFilterQuery {
  status?: IncidentStatus;
  severity?: ReporterSeverity;
  priority?: OperationalPriority;
  category?: IncidentCategory;
  verificationState?: VerificationState;
  agencyId?: string;
  assignedToUserId?: string;
  unassignedOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TriageIncidentRequest {
  verificationState: VerificationState;
  operationalPriority: OperationalPriority;
  duplicateOfIncidentId?: string | null;
  notes?: string | null;
}

export interface CreateAssignmentRequest {
  agencyId: string;
  assignedToUserId?: string | null;
  notes?: string | null;
}

export interface UpdateAssignmentRequest {
  status: AssignmentStatus;
  notes?: string | null;
}

export interface UpdateStatusRequest {
  toStatus: IncidentStatus;
  note?: string | null;
}

export interface AddInternalNoteRequest {
  note: string;
}

// ==========================================
// 5. Auth & User DTOs
// ==========================================

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  agencyId?: string | null;
  agencyName?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface StaffInviteRequest {
  email: string;
  fullName: string;
  role: UserRole;
  agencyId?: string | null;
}

export interface UpdateStaffRequest {
  role?: UserRole;
  accountStatus?: AccountStatus;
  agencyId?: string | null;
}

// ==========================================
// 6. Agency DTOs
// ==========================================

export interface AgencyDto {
  id: string;
  name: string;
  agencyType: AgencyType;
  isActive: boolean;
  contactNumber?: string | null;
  serviceAreaDescription?: string | null;
}

// ==========================================
// 7. Notification & Audit DTOs
// ==========================================

export interface NotificationDeliveryDto {
  id: string;
  incidentId?: string | null;
  incidentReferenceCode?: string | null;
  channel: NotificationChannel;
  eventType: string;
  status: DeliveryStatus;
  attemptCount: number;
  lastErrorCode?: string | null;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
}

export interface AuditLogDto {
  id: string;
  actorUserId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

// ==========================================
// 8. Public Configuration DTO
// ==========================================

export interface PublicEmergencyConfig {
  helplines: {
    primary: string;
    police: string;
    ambulance: string;
    fire: string;
  };
  countryCode: string;
  disclaimer: string;
  incidentCategories: IncidentCategory[];
  reporterSeverities: ReporterSeverity[];
}

// ==========================================
// 9. Status Mapping & Validation Utilities
// ==========================================

export function mapInternalToPublicStatus(status: IncidentStatus): string {
  switch (status) {
    case IncidentStatus.SUBMITTED:
      return 'Report Received';
    case IncidentStatus.UNDER_REVIEW:
      return 'Under Review';
    case IncidentStatus.ACKNOWLEDGED:
      return 'Acknowledged by Dispatch';
    case IncidentStatus.ASSIGNED:
      return 'Response Assigned';
    case IncidentStatus.EN_ROUTE:
      return 'Responder En Route';
    case IncidentStatus.ON_SCENE:
      return 'Responders On Scene';
    case IncidentStatus.RESOLVED:
      return 'Incident Resolved';
    case IncidentStatus.CLOSED:
      return 'Report Closed';
    case IncidentStatus.UNVERIFIED:
      return 'Unable to Verify';
    case IncidentStatus.DUPLICATE:
      return 'Marked as Duplicate Report';
    case IncidentStatus.CANCELLED:
      return 'Report Cancelled';
    default:
      return 'Report Processing';
  }
}

export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
}

export const VALID_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.SUBMITTED]: [IncidentStatus.UNDER_REVIEW, IncidentStatus.ACKNOWLEDGED, IncidentStatus.UNVERIFIED, IncidentStatus.DUPLICATE, IncidentStatus.CANCELLED],
  [IncidentStatus.UNDER_REVIEW]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.UNVERIFIED, IncidentStatus.DUPLICATE, IncidentStatus.CANCELLED],
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.ASSIGNED, IncidentStatus.EN_ROUTE, IncidentStatus.CLOSED, IncidentStatus.CANCELLED],
  [IncidentStatus.ASSIGNED]: [IncidentStatus.EN_ROUTE, IncidentStatus.ON_SCENE, IncidentStatus.ACKNOWLEDGED, IncidentStatus.CANCELLED],
  [IncidentStatus.EN_ROUTE]: [IncidentStatus.ON_SCENE, IncidentStatus.ASSIGNED, IncidentStatus.CANCELLED],
  [IncidentStatus.ON_SCENE]: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.ON_SCENE],
  [IncidentStatus.CLOSED]: [],
  [IncidentStatus.UNVERIFIED]: [IncidentStatus.UNDER_REVIEW, IncidentStatus.CLOSED],
  [IncidentStatus.DUPLICATE]: [IncidentStatus.CLOSED],
  [IncidentStatus.CANCELLED]: [IncidentStatus.CLOSED]
};
