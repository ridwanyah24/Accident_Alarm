import bcrypt from 'bcryptjs';
import { UserRole, AccountStatus, AgencyType, IncidentCategory, ReporterSeverity, OperationalPriority, LocationSource, IncidentStatus, VerificationState, AssignmentStatus } from '@accident-alarm/api-contracts';
import { IDatabaseStore } from './store.interface';
import { InMemoryStore } from './in-memory-store';
import { PrismaStore } from './prisma-store';

let currentStore: IDatabaseStore | null = null;

export function getDbStore(): IDatabaseStore {
  if (!currentStore) {
    currentStore = process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'test' && Boolean(process.env.DATABASE_URL))
      ? new PrismaStore()
      : new InMemoryStore();
  }
  return currentStore;
}

export function setDbStore(store: IDatabaseStore): void {
  currentStore = store;
}

export async function provisionInitialAdmin(store: IDatabaseStore, email: string, password: string): Promise<void> {
  if (await store.findUserByEmail(email)) return;

  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(12));
  await store.createUser({
    fullName: 'System Administrator',
    email,
    phone: null,
    passwordHash,
    role: UserRole.ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    agencyId: null
  });
}

export async function seedDefaultData(store: IDatabaseStore): Promise<void> {
  const existingAdmin = await store.findUserByEmail('admin@accidentalarm.gov');
  if (existingAdmin) {
    return; // Already seeded
  }

  // 1. Seed Verified Agencies
  const roadSafety = await store.createAgency({
    name: 'Federal Road Safety Corps (FRSC) - Sector Command',
    agencyType: AgencyType.ROAD_SAFETY,
    contactConfiguration: JSON.stringify({ verifiedHelpline: '122', dispatchCenter: 'Kaduna Sector' }),
    serviceArea: 'Kaduna Metropolitan & Trunk Roads',
    isActive: true
  });

  const emsAmbulance = await store.createAgency({
    name: 'Emergency Medical Services (EMS) Rapid Ambulance',
    agencyType: AgencyType.AMBULANCE,
    contactConfiguration: JSON.stringify({ verifiedHelpline: '112', dispatchCenter: 'Central EMS' }),
    serviceArea: 'Kaduna Metropolitan & Environs',
    isActive: true
  });

  const fireService = await store.createAgency({
    name: 'State Fire and Rescue Service',
    agencyType: AgencyType.FIRE,
    contactConfiguration: JSON.stringify({ verifiedHelpline: '112', station: 'Central Fire Station' }),
    serviceArea: 'Kaduna Urban District',
    isActive: true
  });

  const policeTraffic = await store.createAgency({
    name: 'Police Traffic Enforcement & Accident Investigation Division',
    agencyType: AgencyType.POLICE,
    contactConfiguration: JSON.stringify({ verifiedHelpline: '199', division: 'Metropolitan Traffic' }),
    serviceArea: 'Kaduna State Command',
    isActive: true
  });

  // 2. Seed Default Staff Accounts (Hashed Passwords)
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', salt);
  const dispatchPasswordHash = await bcrypt.hash('DispatchPass123!', salt);
  const responderPasswordHash = await bcrypt.hash('ResponderPass123!', salt);
  const reporterPasswordHash = await bcrypt.hash('ReporterPass123!', salt);

  const admin = await store.createUser({
    fullName: 'Chief Systems Administrator',
    email: 'admin@accidentalarm.gov',
    phone: '+2348000000001',
    passwordHash: adminPasswordHash,
    role: UserRole.ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    agencyId: null
  });

  const dispatcher = await store.createUser({
    fullName: 'Senior Dispatcher Amina Lawal',
    email: 'dispatcher@accidentalarm.gov',
    phone: '+2348000000002',
    passwordHash: dispatchPasswordHash,
    role: UserRole.DISPATCHER,
    accountStatus: AccountStatus.ACTIVE,
    agencyId: roadSafety.id
  });

  const responder = await store.createUser({
    fullName: 'Officer Ibrahim Bello (Patrol Alpha)',
    email: 'responder@accidentalarm.gov',
    phone: '+2348000000003',
    passwordHash: responderPasswordHash,
    role: UserRole.RESPONDER,
    accountStatus: AccountStatus.ACTIVE,
    agencyId: roadSafety.id
  });

  const reporter = await store.createUser({
    fullName: 'Demo Citizen Reporter',
    email: 'reporter@accidentalarm.gov',
    phone: '+2348000000004',
    passwordHash: reporterPasswordHash,
    role: UserRole.REPORTER,
    accountStatus: AccountStatus.ACTIVE,
    agencyId: null
  });

  // 3. Seed Sample Initial Incidents for demonstration
  const sampleIncident = await store.createIncident({
    referenceCode: 'RA-DEMO01',
    createdByUserId: reporter.id,
    guestAccessTokenHash: null,
    idempotencyKey: 'seed-idempotency-key-01',
    category: IncidentCategory.COLLISION,
    reporterSeverity: ReporterSeverity.SERIOUS,
    operationalPriority: OperationalPriority.HIGH,
    description: 'Two-vehicle collision between a commercial bus and saloon car near Junction. One passenger with severe bleeding.',
    vehicleCount: 2,
    injuredPersonCount: 3,
    fireSuspected: false,
    trappedPersonsSuspected: true,
    roadBlockageSuspected: true,
    occurredAtDevice: new Date(Date.now() - 25 * 60 * 1000), // 25 mins ago
    latitude: 10.5105,
    longitude: 7.4165,
    locationAccuracyM: 14.5,
    locationSource: LocationSource.GPS,
    landmarkOrAddress: 'Independence Way by Stadium Junction, Kaduna',
    status: IncidentStatus.ASSIGNED,
    verificationState: VerificationState.VERIFIED,
    duplicateOfIncidentId: null,
    closedAt: null
  });

  await store.createStatusEvent({
    incidentId: sampleIncident.id,
    fromStatus: null,
    toStatus: IncidentStatus.SUBMITTED,
    actorUserId: reporter.id,
    note: 'Initial report submitted via Android client with verified GPS coordinates.',
    metadata: JSON.stringify({ accuracyMetres: 14.5, source: 'GPS' })
  });

  await store.createStatusEvent({
    incidentId: sampleIncident.id,
    fromStatus: IncidentStatus.SUBMITTED,
    toStatus: IncidentStatus.ACKNOWLEDGED,
    actorUserId: dispatcher.id,
    note: 'Dispatcher reviewed incident. Verified high-risk collision involving trapped casualties.',
    metadata: JSON.stringify({ prioritySet: 'HIGH' })
  });

  await store.createAssignment({
    incidentId: sampleIncident.id,
    agencyId: roadSafety.id,
    assignedToUserId: responder.id,
    assignedByUserId: dispatcher.id,
    status: AssignmentStatus.ACTIVE,
    notes: 'Urgent: dispatch heavy rescue vehicle and traffic diversion team.'
  });

  await store.createAssignment({
    incidentId: sampleIncident.id,
    agencyId: emsAmbulance.id,
    assignedToUserId: null,
    assignedByUserId: dispatcher.id,
    status: AssignmentStatus.ACTIVE,
    notes: 'Requesting 2 ambulances for 3 casualties.'
  });

  await store.createAuditLog({
    actorUserId: dispatcher.id,
    action: 'INCIDENT_TRIAGED_AND_ASSIGNED',
    entityType: 'INCIDENT',
    entityId: sampleIncident.id,
    ipAddress: '127.0.0.1',
    metadata: JSON.stringify({ referenceCode: 'RA-DEMO01', priority: 'HIGH' })
  });

  // Seed second new pending unverified incident
  const newIncident = await store.createIncident({
    referenceCode: 'RA-DEMO02',
    createdByUserId: null,
    guestAccessTokenHash: 'guest_token_hash_seed',
    idempotencyKey: 'seed-idempotency-key-02',
    category: IncidentCategory.PEDESTRIAN_STRUCK,
    reporterSeverity: ReporterSeverity.CRITICAL,
    operationalPriority: null,
    description: 'Motorcyclist hit pedestrian crossing near market entrance. Victim unconscious on pavement.',
    vehicleCount: 1,
    injuredPersonCount: 1,
    fireSuspected: false,
    trappedPersonsSuspected: false,
    roadBlockageSuspected: false,
    occurredAtDevice: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    latitude: 10.5230,
    longitude: 7.4380,
    locationAccuracyM: 22.0,
    locationSource: LocationSource.GPS,
    landmarkOrAddress: 'Opposite Central Market Gate 3, Ahmadu Bello Way',
    status: IncidentStatus.SUBMITTED,
    verificationState: VerificationState.PENDING,
    duplicateOfIncidentId: null,
    closedAt: null
  });

  await store.createStatusEvent({
    incidentId: newIncident.id,
    fromStatus: null,
    toStatus: IncidentStatus.SUBMITTED,
    actorUserId: null,
    note: 'Guest report submitted via Android application. Coordinates captured with 22m GPS accuracy.',
    metadata: JSON.stringify({ isGuest: true, accuracy: 22.0 })
  });
}
