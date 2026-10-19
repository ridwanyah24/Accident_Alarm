import {
  AssignmentStatus,
  IncidentStatus,
  NotificationChannel,
  DeliveryStatus,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  IncidentAssignmentDto
} from '@accident-alarm/api-contracts';
import { getDbStore } from '../db';
import { NotFoundError, ValidationError } from '../common/errors';

export class AssignmentsService {
  async assignIncident(
    incidentId: string,
    data: CreateAssignmentRequest,
    assignedByUserId: string
  ): Promise<IncidentAssignmentDto> {
    const store = getDbStore();
    const incident = await store.findIncidentById(incidentId);
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }

    const agency = await store.findAgencyById(data.agencyId);
    if (!agency) {
      throw new ValidationError('The specified response agency does not exist.');
    }

    let assignedUser = null;
    if (data.assignedToUserId) {
      assignedUser = await store.findUserById(data.assignedToUserId);
      if (!assignedUser) {
        throw new ValidationError('The specified responder does not exist.');
      }
    }

    const assignment = await store.createAssignment({
      incidentId,
      agencyId: data.agencyId,
      assignedToUserId: data.assignedToUserId || null,
      assignedByUserId,
      status: AssignmentStatus.ACTIVE,
      notes: data.notes || null
    });

    // Automatically advance incident status to ASSIGNED if in prior state
    if ([IncidentStatus.SUBMITTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.ACKNOWLEDGED].includes(incident.status)) {
      await store.updateIncident(incidentId, { status: IncidentStatus.ASSIGNED });
      await store.createStatusEvent({
        incidentId,
        fromStatus: incident.status,
        toStatus: IncidentStatus.ASSIGNED,
        actorUserId: assignedByUserId,
        note: `Assigned to ${agency.name}${assignedUser ? ` (${assignedUser.fullName})` : ''}. Notes: ${data.notes || 'None'}`,
        metadata: JSON.stringify({ agencyId: data.agencyId, responderId: data.assignedToUserId })
      });
    }

    // Queue notification to responder or duty queue
    await store.createNotificationDelivery({
      incidentId,
      recipientUserId: data.assignedToUserId || null,
      channel: NotificationChannel.IN_APP,
      eventType: 'INCIDENT_ASSIGNED',
      providerMessageId: null,
      status: DeliveryStatus.QUEUED,
      lastErrorCode: null
    });

    // Record audit log
    await store.createAuditLog({
      actorUserId: assignedByUserId,
      action: 'INCIDENT_ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
      ipAddress: null,
      metadata: JSON.stringify({
        incidentId,
        agencyName: agency.name,
        assignedToUserId: data.assignedToUserId
      })
    });

    const assigner = await store.findUserById(assignedByUserId);

    return {
      id: assignment.id,
      agencyId: agency.id,
      agencyName: agency.name,
      agencyType: agency.agencyType,
      assignedToUserId: assignment.assignedToUserId,
      assignedToName: assignedUser ? assignedUser.fullName : null,
      assignedByName: assigner ? assigner.fullName || 'Dispatcher' : 'Dispatcher',
      status: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
      acceptedAt: null,
      completedAt: null,
      notes: assignment.notes
    };
  }

  async updateAssignment(
    assignmentId: string,
    data: UpdateAssignmentRequest,
    actorUserId: string
  ): Promise<IncidentAssignmentDto> {
    const store = getDbStore();
    const assignment = await store.findAssignmentById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment record not found.');
    }

    const updates: Partial<typeof assignment> = {
      status: data.status
    };

    if (data.notes) {
      updates.notes = data.notes;
    }

    if (data.status === AssignmentStatus.ACTIVE && !assignment.acceptedAt) {
      updates.acceptedAt = new Date();
    } else if (data.status === AssignmentStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    const updated = await store.updateAssignment(assignmentId, updates);
    const agency = await store.findAgencyById(updated.agencyId);
    const assignedUser = updated.assignedToUserId ? await store.findUserById(updated.assignedToUserId) : null;
    const assigner = await store.findUserById(updated.assignedByUserId);

    // Record audit log
    await store.createAuditLog({
      actorUserId,
      action: 'ASSIGNMENT_UPDATED',
      entityType: 'ASSIGNMENT',
      entityId: assignmentId,
      ipAddress: null,
      metadata: JSON.stringify({ status: data.status, notes: data.notes })
    });

    return {
      id: updated.id,
      agencyId: updated.agencyId,
      agencyName: agency ? agency.name : 'Unknown Agency',
      agencyType: agency ? agency.agencyType : ('OTHER' as any),
      assignedToUserId: updated.assignedToUserId,
      assignedToName: assignedUser ? assignedUser.fullName : null,
      assignedByName: assigner ? assigner.fullName || 'Dispatcher' : 'Dispatcher',
      status: updated.status,
      assignedAt: updated.assignedAt.toISOString(),
      acceptedAt: updated.acceptedAt ? updated.acceptedAt.toISOString() : null,
      completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
      notes: updated.notes
    };
  }
}

export const assignmentsService = new AssignmentsService();
