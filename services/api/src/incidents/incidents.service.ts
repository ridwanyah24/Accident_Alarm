import {
  IncidentCategory,
  ReporterSeverity,
  OperationalPriority,
  IncidentStatus,
  VerificationState,
  LocationSource,
  NotificationChannel,
  DeliveryStatus,
  CreateIncidentRequest,
  IncidentCreationResult,
  IncidentPublicResponse,
  IncidentStaffDetailResponse,
  IncidentFilterQuery,
  TriageIncidentRequest,
  UserRole,
  mapInternalToPublicStatus,
  isValidLatitude,
  isValidLongitude,
  VALID_STATUS_TRANSITIONS
} from '@accident-alarm/api-contracts';
import { getDbStore } from '../db';
import { authService } from '../auth/auth.service';
import { ValidationError, NotFoundError, ForbiddenError } from '../common/errors';

export class IncidentsService {
  async createIncident(
    data: CreateIncidentRequest,
    idempotencyKey?: string | null,
    creatorUserId?: string | null
  ): Promise<IncidentCreationResult> {
    const store = getDbStore();

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await store.findIncidentByIdempotencyKey(idempotencyKey);
      if (existing) {
        return {
          id: existing.id,
          referenceCode: existing.referenceCode,
          status: existing.status,
          receivedAt: existing.receivedAt.toISOString(),
          message: 'Your report was received. This does not confirm that emergency services have been dispatched.'
        };
      }
    }

    // 2. Validate Coordinate Ranges
    if (!isValidLatitude(data.location.latitude)) {
      throw new ValidationError('Invalid latitude. Latitude must be between -90 and 90 degrees.', [
        { field: 'location.latitude', message: 'Latitude must be between -90 and 90.' }
      ]);
    }
    if (!isValidLongitude(data.location.longitude)) {
      throw new ValidationError('Invalid longitude. Longitude must be between -180 and 180 degrees.', [
        { field: 'location.longitude', message: 'Longitude must be between -180 and 180.' }
      ]);
    }

    // Manual location requires landmark or address
    if (data.location.source === LocationSource.MANUAL && (!data.location.landmarkOrAddress || data.location.landmarkOrAddress.trim().length === 0)) {
      throw new ValidationError('A landmark or address description is required when using manual location entry.', [
        { field: 'location.landmarkOrAddress', message: 'Landmark or street address is required for manual location.' }
      ]);
    }

    // 3. Generate Reference Code and Guest Access Token (if guest)
    const referenceCode = authService.generateReferenceCode();
    let guestAccessToken: string | undefined = undefined;
    let guestAccessTokenHash: string | null = null;

    if (!creatorUserId) {
      guestAccessToken = authService.generateGuestToken();
      guestAccessTokenHash = authService.hashGuestToken(guestAccessToken);
    }

    // 4. Persist Incident
    const incident = await store.createIncident({
      referenceCode,
      createdByUserId: creatorUserId || null,
      guestAccessTokenHash,
      idempotencyKey: idempotencyKey || null,
      category: data.category,
      reporterSeverity: data.reporterSeverity,
      operationalPriority: null,
      description: data.description || null,
      vehicleCount: data.vehicleCount ?? null,
      injuredPersonCount: data.injuredPersonCount ?? null,
      fireSuspected: data.fireSuspected ?? null,
      trappedPersonsSuspected: data.trappedPersonsSuspected ?? null,
      roadBlockageSuspected: data.roadBlockageSuspected ?? null,
      occurredAtDevice: data.occurredAtDevice ? new Date(data.occurredAtDevice) : null,
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      locationAccuracyM: data.location.accuracyMetres ?? null,
      locationSource: data.location.source,
      landmarkOrAddress: data.location.landmarkOrAddress || null,
      status: IncidentStatus.SUBMITTED,
      verificationState: VerificationState.PENDING,
      duplicateOfIncidentId: null,
      closedAt: null
    });

    // 5. Append Initial Status Event
    await store.createStatusEvent({
      incidentId: incident.id,
      fromStatus: null,
      toStatus: IncidentStatus.SUBMITTED,
      actorUserId: creatorUserId || null,
      note: creatorUserId ? 'Incident report submitted by authenticated user.' : 'Incident report submitted as guest reporter.',
      metadata: JSON.stringify({
        source: data.location.source,
        accuracy: data.location.accuracyMetres
      })
    });

    // 6. Record Notification Outbox Entry
    await store.createNotificationDelivery({
      incidentId: incident.id,
      recipientUserId: null,
      channel: NotificationChannel.IN_APP,
      eventType: 'INCIDENT_SUBMITTED',
      providerMessageId: null,
      status: DeliveryStatus.QUEUED,
      lastErrorCode: null
    });

    // 7. Record Audit Log
    await store.createAuditLog({
      actorUserId: creatorUserId || null,
      action: 'INCIDENT_SUBMITTED',
      entityType: 'INCIDENT',
      entityId: incident.id,
      ipAddress: null,
      metadata: JSON.stringify({
        referenceCode,
        category: data.category,
        severity: data.reporterSeverity,
        source: data.location.source
      })
    });

    return {
      id: incident.id,
      referenceCode: incident.referenceCode,
      status: incident.status,
      receivedAt: incident.receivedAt.toISOString(),
      guestAccessToken,
      message: 'Your report was received. This does not confirm that emergency services have been dispatched.'
    };
  }

  async getPublicIncidentStatus(
    id: string,
    guestToken?: string | null,
    requestingUserId?: string | null,
    userRole?: UserRole
  ): Promise<IncidentPublicResponse> {
    const store = getDbStore();
    const incident = await store.findIncidentById(id);

    if (!incident) {
      throw new NotFoundError('Incident report not found.');
    }

    // Access control:
    // Authorized if:
    // 1. Staff member (RESPONDER, DISPATCHER, ADMIN)
    // 2. Incident created by requesting authenticated user
    // 3. Valid guest token matching hash
    const isStaff = userRole && [UserRole.RESPONDER, UserRole.DISPATCHER, UserRole.ADMIN].includes(userRole);
    const isOwner = requestingUserId && incident.createdByUserId === requestingUserId;
    
    let isGuestTokenValid = false;
    if (guestToken && incident.guestAccessTokenHash) {
      const computedHash = authService.hashGuestToken(guestToken);
      if (computedHash === incident.guestAccessTokenHash) {
        isGuestTokenValid = true;
      }
    }

    if (!isStaff && !isOwner && !isGuestTokenValid) {
      throw new ForbiddenError('You do not have permission to view the status of this incident.');
    }

    const mediaList = await store.listMediaByIncident(incident.id);

    return {
      id: incident.id,
      referenceCode: incident.referenceCode,
      category: incident.category,
      reporterSeverity: incident.reporterSeverity,
      status: incident.status,
      statusDisplay: mapInternalToPublicStatus(incident.status),
      receivedAt: incident.receivedAt.toISOString(),
      location: {
        source: incident.locationSource,
        landmarkOrAddress: incident.landmarkOrAddress,
        approximateLatitude: Math.round(incident.latitude * 100) / 100,
        approximateLongitude: Math.round(incident.longitude * 100) / 100
      },
      hasMedia: mediaList.length > 0
    };
  }

  async listUserIncidents(userId: string): Promise<IncidentPublicResponse[]> {
    const store = getDbStore();
    const { items } = await store.listIncidents();
    const userIncidents = items.filter(i => i.createdByUserId === userId);

    return Promise.all(
      userIncidents.map(async incident => {
        const media = await store.listMediaByIncident(incident.id);
        return {
          id: incident.id,
          referenceCode: incident.referenceCode,
          category: incident.category,
          reporterSeverity: incident.reporterSeverity,
          status: incident.status,
          statusDisplay: mapInternalToPublicStatus(incident.status),
          receivedAt: incident.receivedAt.toISOString(),
          location: {
            source: incident.locationSource,
            landmarkOrAddress: incident.landmarkOrAddress,
            approximateLatitude: Math.round(incident.latitude * 100) / 100,
            approximateLongitude: Math.round(incident.longitude * 100) / 100
          },
          hasMedia: media.length > 0
        };
      })
    );
  }

  async getStaffIncidents(
    filters: IncidentFilterQuery,
    userRole: UserRole,
    userAgencyId?: string | null
  ): Promise<{ items: IncidentStaffDetailResponse[]; total: number }> {
    const store = getDbStore();

    // If responder, scope to their agency
    const scopedAgencyId = userRole === UserRole.RESPONDER ? userAgencyId : null;
    const { items, total } = await store.listIncidents(filters, scopedAgencyId);

    const detailedItems = await Promise.all(
      items.map(async inc => this.buildStaffIncidentDetail(inc))
    );

    return { items: detailedItems, total };
  }

  async getStaffIncidentDetail(id: string): Promise<IncidentStaffDetailResponse> {
    const store = getDbStore();
    const incident = await store.findIncidentById(id);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }
    return this.buildStaffIncidentDetail(incident);
  }

  async triageIncident(
    id: string,
    data: TriageIncidentRequest,
    actorUserId: string
  ): Promise<IncidentStaffDetailResponse> {
    const store = getDbStore();
    const incident = await store.findIncidentById(id);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }

    const updates: Partial<typeof incident> = {
      verificationState: data.verificationState,
      operationalPriority: data.operationalPriority
    };

    if (data.duplicateOfIncidentId) {
      const parent = await store.findIncidentById(data.duplicateOfIncidentId);
      if (!parent) {
        throw new ValidationError('The specified primary incident does not exist.');
      }
      updates.duplicateOfIncidentId = data.duplicateOfIncidentId;
      updates.status = IncidentStatus.DUPLICATE;
    }

    const updated = await store.updateIncident(id, updates);

    // Record audit event
    await store.createAuditLog({
      actorUserId,
      action: 'INCIDENT_TRIAGED',
      entityType: 'INCIDENT',
      entityId: id,
      ipAddress: null,
      metadata: JSON.stringify({
        verificationState: data.verificationState,
        operationalPriority: data.operationalPriority,
        notes: data.notes
      })
    });

    if (data.notes) {
      await store.createStatusEvent({
        incidentId: id,
        fromStatus: incident.status,
        toStatus: updated.status,
        actorUserId,
        note: `Triage Assessment: [${data.verificationState}] Priority: [${data.operationalPriority}]. Note: ${data.notes}`,
        metadata: null
      });
    }

    return this.buildStaffIncidentDetail(updated);
  }

  async updateIncidentStatus(
    id: string,
    toStatus: IncidentStatus,
    note: string | undefined,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<IncidentStaffDetailResponse> {
    const store = getDbStore();
    const incident = await store.findIncidentById(id);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }

    // Validate Status Transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[incident.status] || [];
    if (!allowedTransitions.includes(toStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${incident.status}' to '${toStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}].`
      );
    }

    const updates: Partial<typeof incident> = {
      status: toStatus
    };

    if (toStatus === IncidentStatus.CLOSED || toStatus === IncidentStatus.RESOLVED) {
      updates.closedAt = new Date();
    }

    const updated = await store.updateIncident(id, updates);

    // Append Status Event
    await store.createStatusEvent({
      incidentId: id,
      fromStatus: incident.status,
      toStatus,
      actorUserId,
      note: note || `Status changed from ${incident.status} to ${toStatus} by ${actorRole}.`,
      metadata: JSON.stringify({ actorRole })
    });

    // Record Audit Log
    await store.createAuditLog({
      actorUserId,
      action: 'INCIDENT_STATUS_UPDATED',
      entityType: 'INCIDENT',
      entityId: id,
      ipAddress: null,
      metadata: JSON.stringify({
        fromStatus: incident.status,
        toStatus,
        note
      })
    });

    // Queue notification delivery for status change
    await store.createNotificationDelivery({
      incidentId: id,
      recipientUserId: incident.createdByUserId,
      channel: NotificationChannel.IN_APP,
      eventType: `STATUS_CHANGED_${toStatus}`,
      providerMessageId: null,
      status: DeliveryStatus.QUEUED,
      lastErrorCode: null
    });

    return this.buildStaffIncidentDetail(updated);
  }

  async addInternalNote(
    id: string,
    note: string,
    actorUserId: string
  ): Promise<IncidentStaffDetailResponse> {
    const store = getDbStore();
    const incident = await store.findIncidentById(id);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }

    await store.createStatusEvent({
      incidentId: id,
      fromStatus: incident.status,
      toStatus: incident.status,
      actorUserId,
      note: `INTERNAL NOTE: ${note}`,
      metadata: JSON.stringify({ isInternalNote: true })
    });

    await store.createAuditLog({
      actorUserId,
      action: 'INTERNAL_NOTE_ADDED',
      entityType: 'INCIDENT',
      entityId: id,
      ipAddress: null,
      metadata: JSON.stringify({ notePreview: note.substring(0, 50) })
    });

    return this.buildStaffIncidentDetail(incident);
  }

  private async buildStaffIncidentDetail(incident: any): Promise<IncidentStaffDetailResponse> {
    const store = getDbStore();
    const assignments = await store.listAssignmentsByIncident(incident.id);
    const statusEvents = await store.listStatusEventsByIncident(incident.id);
    const media = await store.listMediaByIncident(incident.id);

    const assignmentDtos = await Promise.all(
      assignments.map(async a => {
        const agency = await store.findAgencyById(a.agencyId);
        const assignedUser = a.assignedToUserId ? await store.findUserById(a.assignedToUserId) : null;
        const assignedByUser = await store.findUserById(a.assignedByUserId);

        return {
          id: a.id,
          agencyId: a.agencyId,
          agencyName: agency ? agency.name : 'Unknown Agency',
          agencyType: agency ? agency.agencyType : ('OTHER' as any),
          assignedToUserId: a.assignedToUserId,
          assignedToName: assignedUser ? assignedUser.fullName : null,
          assignedByName: assignedByUser ? assignedByUser.fullName || 'Dispatcher' : 'Dispatcher',
          status: a.status,
          assignedAt: a.assignedAt.toISOString(),
          acceptedAt: a.acceptedAt ? a.acceptedAt.toISOString() : null,
          completedAt: a.completedAt ? a.completedAt.toISOString() : null,
          notes: a.notes
        };
      })
    );

    const eventDtos = await Promise.all(
      statusEvents.map(async e => {
        const actor = e.actorUserId ? await store.findUserById(e.actorUserId) : null;
        const actorRole: UserRole | 'SYSTEM' = actor ? actor.role : 'SYSTEM';

        return {
          id: e.id,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          actorRole,
          actorName: actor ? actor.fullName || actor.role : 'Automated System',
          note: e.note,
          createdAt: e.createdAt.toISOString()
        };
      })
    );

    const mediaDtos = media.map(m => ({
      id: m.id,
      storageKey: m.storageKey,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      viewUrl: `/api/v1/uploads/files/${m.storageKey}`,
      createdAt: m.createdAt.toISOString(),
      reviewStatus: m.reviewStatus
    }));

    const internalNotes = statusEvents
      .filter(e => e.note && e.note.startsWith('INTERNAL NOTE:'))
      .map(e => e.note!.replace('INTERNAL NOTE: ', ''));

    return {
      id: incident.id,
      referenceCode: incident.referenceCode,
      createdByUserId: incident.createdByUserId,
      category: incident.category,
      reporterSeverity: incident.reporterSeverity,
      operationalPriority: incident.operationalPriority,
      description: incident.description,
      vehicleCount: incident.vehicleCount,
      injuredPersonCount: incident.injuredPersonCount,
      fireSuspected: incident.fireSuspected,
      trappedPersonsSuspected: incident.trappedPersonsSuspected,
      roadBlockageSuspected: incident.roadBlockageSuspected,
      occurredAtDevice: incident.occurredAtDevice ? incident.occurredAtDevice.toISOString() : null,
      receivedAt: incident.receivedAt.toISOString(),
      location: {
        latitude: incident.latitude,
        longitude: incident.longitude,
        accuracyMetres: incident.locationAccuracyM,
        source: incident.locationSource,
        landmarkOrAddress: incident.landmarkOrAddress
      },
      status: incident.status,
      verificationState: incident.verificationState,
      duplicateOfIncidentId: incident.duplicateOfIncidentId,
      closedAt: incident.closedAt ? incident.closedAt.toISOString() : null,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      assignments: assignmentDtos,
      statusEvents: eventDtos,
      media: mediaDtos,
      internalNotes
    };
  }
}

export const incidentsService = new IncidentsService();
