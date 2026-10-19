-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REPORTER', 'RESPONDER', 'DISPATCHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('AMBULANCE', 'POLICE', 'FIRE', 'ROAD_SAFETY', 'DISASTER_MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('COLLISION', 'VEHICLE_ROLLOVER', 'PEDESTRIAN_STRUCK', 'MOTORCYCLE_INCIDENT', 'VEHICLE_FIRE', 'OBSTRUCTION_OR_OTHER');

-- CreateEnum
CREATE TYPE "ReporterSeverity" AS ENUM ('MINOR', 'SERIOUS', 'CRITICAL', 'UNSURE');

-- CreateEnum
CREATE TYPE "OperationalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'MAP_PIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('PENDING', 'VERIFIED', 'UNVERIFIED', 'DUPLICATE', 'FALSE_REPORT_SUSPECTED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'CLOSED', 'UNVERIFIED', 'DUPLICATE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'REASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('FCM', 'SMS', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REPORTER',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "agency_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency_type" "AgencyType" NOT NULL,
    "contact_configuration" TEXT,
    "service_area" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "guest_access_token_hash" TEXT,
    "idempotency_key" TEXT,
    "category" "IncidentCategory" NOT NULL,
    "reporter_severity" "ReporterSeverity" NOT NULL,
    "operational_priority" "OperationalPriority",
    "description" TEXT,
    "vehicle_count" INTEGER,
    "injured_person_count" INTEGER,
    "fire_suspected" BOOLEAN,
    "trapped_persons_suspected" BOOLEAN,
    "road_blockage_suspected" BOOLEAN,
    "occurred_at_device" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "location_accuracy_m" DOUBLE PRECISION,
    "location_source" "LocationSource" NOT NULL DEFAULT 'GPS',
    "landmark_or_address" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "verification_state" "VerificationState" NOT NULL DEFAULT 'PENDING',
    "duplicate_of_incident_id" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_media" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "assigned_by_user_id" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_status_events" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "from_status" "IncidentStatus",
    "to_status" "IncidentStatus" NOT NULL,
    "actor_user_id" TEXT,
    "note" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "recipient_user_id" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "next_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_account_status_idx" ON "users"("role", "account_status");

-- CreateIndex
CREATE INDEX "users_agency_id_idx" ON "users"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_reference_code_key" ON "incidents"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_idempotency_key_key" ON "incidents"("idempotency_key");

-- CreateIndex
CREATE INDEX "incidents_status_received_at_idx" ON "incidents"("status", "received_at");

-- CreateIndex
CREATE INDEX "incidents_verification_state_idx" ON "incidents"("verification_state");

-- CreateIndex
CREATE INDEX "incidents_category_idx" ON "incidents"("category");

-- CreateIndex
CREATE INDEX "incidents_operational_priority_idx" ON "incidents"("operational_priority");

-- CreateIndex
CREATE INDEX "incident_media_incident_id_idx" ON "incident_media"("incident_id");

-- CreateIndex
CREATE INDEX "assignments_incident_id_idx" ON "assignments"("incident_id");

-- CreateIndex
CREATE INDEX "assignments_agency_id_idx" ON "assignments"("agency_id");

-- CreateIndex
CREATE INDEX "assignments_assigned_to_user_id_status_idx" ON "assignments"("assigned_to_user_id", "status");

-- CreateIndex
CREATE INDEX "incident_status_events_incident_id_created_at_idx" ON "incident_status_events"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_created_at_idx" ON "notification_deliveries"("status", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_incident_id_idx" ON "notification_deliveries"("incident_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_duplicate_of_incident_id_fkey" FOREIGN KEY ("duplicate_of_incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_media" ADD CONSTRAINT "incident_media_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_media" ADD CONSTRAINT "incident_media_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_status_events" ADD CONSTRAINT "incident_status_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_status_events" ADD CONSTRAINT "incident_status_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
