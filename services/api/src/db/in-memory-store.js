"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStore = void 0;
const uuid_1 = require("uuid");
const api_contracts_1 = require("@accident-alarm/api-contracts");
class InMemoryStore {
    users = new Map();
    agencies = new Map();
    incidents = new Map();
    assignments = new Map();
    statusEvents = new Map();
    media = new Map();
    notifications = new Map();
    auditLogs = new Map();
    async findUserById(id) {
        return this.users.get(id) || null;
    }
    async findUserByEmail(email) {
        const normalized = email.toLowerCase().trim();
        for (const user of this.users.values()) {
            if (user.email && user.email.toLowerCase().trim() === normalized) {
                return user;
            }
        }
        return null;
    }
    async createUser(data) {
        const now = new Date();
        const id = (0, uuid_1.v4)();
        const user = {
            ...data,
            id,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
        };
        this.users.set(id, user);
        return user;
    }
    async updateUser(id, updates) {
        const existing = this.users.get(id);
        if (!existing) {
            throw new Error(`User ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };
        this.users.set(id, updated);
        return updated;
    }
    async listUsers(role) {
        const list = Array.from(this.users.values());
        if (!role)
            return list;
        return list.filter(u => u.role === role);
    }
    async findAgencyById(id) {
        return this.agencies.get(id) || null;
    }
    async listAgencies() {
        return Array.from(this.agencies.values());
    }
    async createAgency(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const agency = {
            ...data,
            id,
            createdAt: now,
            updatedAt: now
        };
        this.agencies.set(id, agency);
        return agency;
    }
    async findIncidentById(id) {
        return this.incidents.get(id) || null;
    }
    async findIncidentByReference(referenceCode) {
        const normalized = referenceCode.toUpperCase().trim();
        for (const incident of this.incidents.values()) {
            if (incident.referenceCode.toUpperCase().trim() === normalized) {
                return incident;
            }
        }
        return null;
    }
    async findIncidentByIdempotencyKey(key) {
        for (const incident of this.incidents.values()) {
            if (incident.idempotencyKey === key) {
                return incident;
            }
        }
        return null;
    }
    async createIncident(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const incident = {
            ...data,
            id,
            receivedAt: now,
            createdAt: now,
            updatedAt: now
        };
        this.incidents.set(id, incident);
        return incident;
    }
    async updateIncident(id, updates) {
        const existing = this.incidents.get(id);
        if (!existing) {
            throw new Error(`Incident ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };
        this.incidents.set(id, updated);
        return updated;
    }
    async listIncidents(filters = {}, scopedAgencyId) {
        let list = Array.from(this.incidents.values());
        // Agency scoping: If user is restricted to a specific agency, filter by active assignments
        if (scopedAgencyId) {
            const allowedIncidentIds = new Set(Array.from(this.assignments.values())
                .filter(a => a.agencyId === scopedAgencyId)
                .map(a => a.incidentId));
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
            const assignedIncidentIds = new Set(Array.from(this.assignments.values())
                .filter(a => a.status === api_contracts_1.AssignmentStatus.ACTIVE)
                .map(a => a.incidentId));
            list = list.filter(i => !assignedIncidentIds.has(i.id));
        }
        if (filters.assignedToUserId) {
            const assignedIncidentIds = new Set(Array.from(this.assignments.values())
                .filter(a => a.assignedToUserId === filters.assignedToUserId && a.status === api_contracts_1.AssignmentStatus.ACTIVE)
                .map(a => a.incidentId));
            list = list.filter(i => assignedIncidentIds.has(i.id));
        }
        if (filters.search) {
            const term = filters.search.toLowerCase();
            list = list.filter(i => i.referenceCode.toLowerCase().includes(term) ||
                (i.landmarkOrAddress && i.landmarkOrAddress.toLowerCase().includes(term)) ||
                (i.description && i.description.toLowerCase().includes(term)));
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
    async findAssignmentById(id) {
        return this.assignments.get(id) || null;
    }
    async listAssignmentsByIncident(incidentId) {
        return Array.from(this.assignments.values())
            .filter(a => a.incidentId === incidentId)
            .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
    }
    async createAssignment(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const record = {
            ...data,
            id,
            assignedAt: now,
            acceptedAt: null,
            completedAt: null
        };
        this.assignments.set(id, record);
        return record;
    }
    async updateAssignment(id, updates) {
        const existing = this.assignments.get(id);
        if (!existing) {
            throw new Error(`Assignment ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates
        };
        this.assignments.set(id, updated);
        return updated;
    }
    async listStatusEventsByIncident(incidentId) {
        return Array.from(this.statusEvents.values())
            .filter(e => e.incidentId === incidentId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    async createStatusEvent(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const record = {
            ...data,
            id,
            createdAt: now
        };
        this.statusEvents.set(id, record);
        return record;
    }
    async listMediaByIncident(incidentId) {
        return Array.from(this.media.values())
            .filter(m => m.incidentId === incidentId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    async createMedia(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const record = {
            ...data,
            id,
            createdAt: now
        };
        this.media.set(id, record);
        return record;
    }
    async createNotificationDelivery(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const record = {
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
    async listPendingNotificationDeliveries(limit = 20) {
        const now = Date.now();
        return Array.from(this.notifications.values())
            .filter(n => n.status === api_contracts_1.DeliveryStatus.QUEUED || (n.status === api_contracts_1.DeliveryStatus.FAILED &&
            n.attemptCount < 5 &&
            (!n.nextAttemptAt || n.nextAttemptAt.getTime() <= now)))
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .slice(0, limit);
    }
    async updateNotificationDelivery(id, updates) {
        const existing = this.notifications.get(id);
        if (!existing) {
            throw new Error(`NotificationDelivery ${id} not found`);
        }
        const updated = {
            ...existing,
            ...updates
        };
        this.notifications.set(id, updated);
        return updated;
    }
    async listNotificationDeliveries(limit = 100) {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async createAuditLog(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const record = {
            ...data,
            id,
            createdAt: now
        };
        this.auditLogs.set(id, record);
        return record;
    }
    async listAuditLogs(limit = 100) {
        return Array.from(this.auditLogs.values())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async checkHealth() {
        return true;
    }
    async reset() {
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
exports.InMemoryStore = InMemoryStore;
