"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbStore = getDbStore;
exports.setDbStore = setDbStore;
exports.seedDefaultData = seedDefaultData;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const api_contracts_1 = require("@accident-alarm/api-contracts");
const in_memory_store_1 = require("./in-memory-store");
let currentStore = null;
function getDbStore() {
    if (!currentStore) {
        // Default to in-memory store for instant zero-dependency execution
        // Prisma PostgreSQL connector can be plugged in when live DATABASE_URL is reachable
        currentStore = new in_memory_store_1.InMemoryStore();
    }
    return currentStore;
}
function setDbStore(store) {
    currentStore = store;
}
async function seedDefaultData(store) {
    const existingAdmin = await store.findUserByEmail('admin@accidentalarm.gov');
    if (existingAdmin) {
        return; // Already seeded
    }
    // 1. Seed Verified Agencies
    const roadSafety = await store.createAgency({
        name: 'Federal Road Safety Corps (FRSC) - Sector Command',
        agencyType: api_contracts_1.AgencyType.ROAD_SAFETY,
        contactConfiguration: JSON.stringify({ verifiedHelpline: '122', dispatchCenter: 'Kaduna Sector' }),
        serviceArea: 'Kaduna Metropolitan & Trunk Roads',
        isActive: true
    });
    const emsAmbulance = await store.createAgency({
        name: 'Emergency Medical Services (EMS) Rapid Ambulance',
        agencyType: api_contracts_1.AgencyType.AMBULANCE,
        contactConfiguration: JSON.stringify({ verifiedHelpline: '112', dispatchCenter: 'Central EMS' }),
        serviceArea: 'Kaduna Metropolitan & Environs',
        isActive: true
    });
    const fireService = await store.createAgency({
        name: 'State Fire and Rescue Service',
        agencyType: api_contracts_1.AgencyType.FIRE,
        contactConfiguration: JSON.stringify({ verifiedHelpline: '112', station: 'Central Fire Station' }),
        serviceArea: 'Kaduna Urban District',
        isActive: true
    });
    const policeTraffic = await store.createAgency({
        name: 'Police Traffic Enforcement & Accident Investigation Division',
        agencyType: api_contracts_1.AgencyType.POLICE,
        contactConfiguration: JSON.stringify({ verifiedHelpline: '199', division: 'Metropolitan Traffic' }),
        serviceArea: 'Kaduna State Command',
        isActive: true
    });
    // 2. Seed Default Staff Accounts (Hashed Passwords)
    const salt = await bcryptjs_1.default.genSalt(10);
    const adminPasswordHash = await bcryptjs_1.default.hash('AdminPass123!', salt);
    const dispatchPasswordHash = await bcryptjs_1.default.hash('DispatchPass123!', salt);
    const responderPasswordHash = await bcryptjs_1.default.hash('ResponderPass123!', salt);
    const reporterPasswordHash = await bcryptjs_1.default.hash('ReporterPass123!', salt);
    const admin = await store.createUser({
        fullName: 'Chief Systems Administrator',
        email: 'admin@accidentalarm.gov',
        phone: '+2348000000001',
        passwordHash: adminPasswordHash,
        role: api_contracts_1.UserRole.ADMIN,
        accountStatus: api_contracts_1.AccountStatus.ACTIVE,
        agencyId: null
    });
    const dispatcher = await store.createUser({
        fullName: 'Senior Dispatcher Amina Lawal',
        email: 'dispatcher@accidentalarm.gov',
        phone: '+2348000000002',
        passwordHash: dispatchPasswordHash,
        role: api_contracts_1.UserRole.DISPATCHER,
        accountStatus: api_contracts_1.AccountStatus.ACTIVE,
        agencyId: roadSafety.id
    });
    const responder = await store.createUser({
        fullName: 'Officer Ibrahim Bello (Patrol Alpha)',
        email: 'responder@accidentalarm.gov',
        phone: '+2348000000003',
        passwordHash: responderPasswordHash,
        role: api_contracts_1.UserRole.RESPONDER,
        accountStatus: api_contracts_1.AccountStatus.ACTIVE,
        agencyId: roadSafety.id
    });
    const reporter = await store.createUser({
        fullName: 'Demo Citizen Reporter',
        email: 'reporter@accidentalarm.gov',
        phone: '+2348000000004',
        passwordHash: reporterPasswordHash,
        role: api_contracts_1.UserRole.REPORTER,
        accountStatus: api_contracts_1.AccountStatus.ACTIVE,
        agencyId: null
    });
    // 3. Seed Sample Initial Incidents for demonstration
    const sampleIncident = await store.createIncident({
        referenceCode: 'RA-DEMO01',
        createdByUserId: reporter.id,
        guestAccessTokenHash: null,
        idempotencyKey: 'seed-idempotency-key-01',
        category: api_contracts_1.IncidentCategory.COLLISION,
        reporterSeverity: api_contracts_1.ReporterSeverity.SERIOUS,
        operationalPriority: api_contracts_1.OperationalPriority.HIGH,
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
        locationSource: api_contracts_1.LocationSource.GPS,
        landmarkOrAddress: 'Independence Way by Stadium Junction, Kaduna',
        status: api_contracts_1.IncidentStatus.ASSIGNED,
        verificationState: api_contracts_1.VerificationState.VERIFIED,
        duplicateOfIncidentId: null,
        closedAt: null
    });
    await store.createStatusEvent({
        incidentId: sampleIncident.id,
        fromStatus: null,
        toStatus: api_contracts_1.IncidentStatus.SUBMITTED,
        actorUserId: reporter.id,
        note: 'Initial report submitted via Android client with verified GPS coordinates.',
        metadata: JSON.stringify({ accuracyMetres: 14.5, source: 'GPS' })
    });
    await store.createStatusEvent({
        incidentId: sampleIncident.id,
        fromStatus: api_contracts_1.IncidentStatus.SUBMITTED,
        toStatus: api_contracts_1.IncidentStatus.ACKNOWLEDGED,
        actorUserId: dispatcher.id,
        note: 'Dispatcher reviewed incident. Verified high-risk collision involving trapped casualties.',
        metadata: JSON.stringify({ prioritySet: 'HIGH' })
    });
    await store.createAssignment({
        incidentId: sampleIncident.id,
        agencyId: roadSafety.id,
        assignedToUserId: responder.id,
        assignedByUserId: dispatcher.id,
        status: api_contracts_1.AssignmentStatus.ACTIVE,
        notes: 'Urgent: dispatch heavy rescue vehicle and traffic diversion team.'
    });
    await store.createAssignment({
        incidentId: sampleIncident.id,
        agencyId: emsAmbulance.id,
        assignedToUserId: null,
        assignedByUserId: dispatcher.id,
        status: api_contracts_1.AssignmentStatus.ACTIVE,
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
        category: api_contracts_1.IncidentCategory.PEDESTRIAN_STRUCK,
        reporterSeverity: api_contracts_1.ReporterSeverity.CRITICAL,
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
        locationSource: api_contracts_1.LocationSource.GPS,
        landmarkOrAddress: 'Opposite Central Market Gate 3, Ahmadu Bello Way',
        status: api_contracts_1.IncidentStatus.SUBMITTED,
        verificationState: api_contracts_1.VerificationState.PENDING,
        duplicateOfIncidentId: null,
        closedAt: null
    });
    await store.createStatusEvent({
        incidentId: newIncident.id,
        fromStatus: null,
        toStatus: api_contracts_1.IncidentStatus.SUBMITTED,
        actorUserId: null,
        note: 'Guest report submitted via Android application. Coordinates captured with 22m GPS accuracy.',
        metadata: JSON.stringify({ isGuest: true, accuracy: 22.0 })
    });
}
