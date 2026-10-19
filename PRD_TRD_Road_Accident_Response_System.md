# Android-Based Road Accident Detection, Reporting and Emergency Response System

## Product Requirements Document (PRD), Technical Requirements Document (TRD), Architecture, and User Flows

**Project title:** Design and Implementation of an Android-Based Road
Accident Detection, Reporting and Emergency Response System\
**Student:** James Daniel\
**Registration number:** KASU/SCE/21/CSC/2022\
**Document version:** 1.0\
**Status:** Build-ready specification; confirm institutional and
deployment constraints before production use.

------------------------------------------------------------------------

## 1. Purpose of this document

This document defines the product, requirements, architecture, data
model, APIs, screens, user journeys, security expectations, and
acceptance criteria for an Android-first road accident reporting and
emergency coordination platform. It is intended to be supplied to an AI
coding agent as the source of truth for planning and implementing the
complete project.

The system must make it faster for a witness or victim to submit
accurate accident information and for authorised responders to receive,
assess, assign, and update incidents. It is an **incident reporting and
coordination aid**, not a replacement for official emergency dispatch
systems, and must never imply that emergency help has been dispatched
unless a real, configured responder workflow confirms it.

## 2. Problem statement

Road traffic accidents can result in serious injury and loss of life.
Emergency response is often delayed when witnesses cannot quickly
contact the correct authority, cannot describe the location accurately,
or must repeat incident details through manual channels. Calls and
informal reports can be delayed, incomplete, or difficult to coordinate
across multiple responders.

The proposed Android-based system provides a structured way to report an
accident, capture GPS coordinates and time, add severity and optional
evidence, and transmit the incident to a central service. Authorised
response personnel can view new reports, verify and prioritise them,
coordinate response, and update incident status. The system should
improve the completeness, traceability, and speed of information
transfer while clearly communicating the limits of the service.

## 3. Aim and objectives

### Aim

To design and develop an Android-based mobile application that enables
rapid reporting of road traffic accidents and facilitates timely
communication of critical incident data to emergency responders.

### Objectives

1.  Provide a simple mobile flow to submit accident reports containing
    location, time, severity, incident details, and optional media.
2.  Integrate device GPS to capture and transmit accident coordinates
    and location accuracy, with a manual location fallback.
3.  Implement a central backend and database for authenticated users,
    reports, responder accounts, incident assignment, and status
    history.
4.  Notify authorised responders and relevant administrators of newly
    submitted incidents using a configurable alert mechanism.
5.  Provide an incident-management dashboard for authorised responders
    to triage, assign, acknowledge, and update incidents.
6.  Evaluate usability, data accuracy, delivery reliability, and time
    taken to submit and acknowledge reports under controlled test
    conditions.

------------------------------------------------------------------------

# PART A --- PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 4. Product overview

### 4.1 Product vision

Enable a person at or near a road accident to send a clear,
location-aware report in as few steps as practical, and give authorised
responders a shared view of reported incidents.

### 4.2 Target users and roles

  -----------------------------------------------------------------------
  Role                    Description             Main capabilities
  ----------------------- ----------------------- -----------------------
  Public reporter         Victim, witness,        Submit report, attach
                          driver, passenger, or   evidence, view own
                          member of the public    report status, receive
                                                  status updates

  Responder               Approved                View assigned/eligible
                          emergency-service or    incidents, acknowledge,
                          response-agency staff   update status, add
                                                  operational notes

  Dispatcher / incident   Approved staff          Review incoming
  coordinator             coordinating incidents  reports, verify,
                                                  prioritise, assign
                                                  responders, monitor
                                                  progress

  Administrator           Trusted system operator Manage approved
                                                  responder
                                                  accounts/agencies,
                                                  review audit logs,
                                                  manage configuration
                                                  and abuse reports

  Guest                   Person who has not      Access emergency
                          created an account      information and submit
                                                  a report if guest
                                                  reporting is enabled by
                                                  configuration
  -----------------------------------------------------------------------

**MVP account policy:** Public reporting should be low-friction. Allow
either authenticated reporting or a limited guest flow with rate
limiting and a contact method optional/required according to deployment
policy. Responders, dispatchers, and administrators must always
authenticate and have role-based access. Do not expose responder-only
data to public users.

### 4.3 Platforms

-   **Primary client:** Android app.
-   **Operations interface:** Responsive web dashboard for dispatchers,
    responders, and administrators.
-   **Backend:** REST API with optional real-time event channel.
-   **Deployment:** Local development first; staging/production
    deployment only after the relevant emergency agency agrees to
    receive alerts.

### 4.4 Scope

#### MVP --- required

-   Onboarding and clear emergency-service disclaimer.
-   Accident report creation with incident type, severity, description,
    timestamp, GPS coordinates, accuracy, and optional photos.
-   Manual map pin/location entry when GPS is unavailable or inaccurate.
-   Report submission confirmation and unique incident reference.
-   Secure backend storage and report status tracking.
-   Responder/dispatcher sign-in and role-based dashboard.
-   Incident triage, acknowledgement, assignment, status updates, and
    internal notes.
-   Push notification or configured alert delivery for new reports and
    status changes.
-   Basic audit trail, validation, rate limiting, error handling, and
    privacy controls.
-   Admin management of responder accounts and agencies.
-   Basic metrics to support evaluation.

#### Future enhancements --- not required for initial MVP

-   Automatic crash detection using accelerometer/gyroscope or vehicle
    telemetry.
-   Direct integration with official dispatch/CAD systems.
-   SMS/USSD reporting, hotline integration, multilingual voice
    reporting.
-   Automated nearest-responder routing based on verified live
    availability.
-   AI-based severity classification, duplicate detection, or image
    analysis.
-   Live responder tracking, ambulance routing, hospital capacity
    integration.
-   Offline queue with background submission when connectivity returns.
-   Citizen community alerts or public incident maps.

**Important scope distinction:** The project title includes "detection,"
but the defined aim and objectives primarily describe **user-initiated
accident reporting**. For the MVP, implement manual reporting and
GPS-based location capture. Do not claim automatic crash detection
unless sensor-based detection is deliberately implemented, calibrated,
tested, and documented as a separate feature.

### 4.5 Out of scope

-   Guaranteeing an ambulance or police unit will be dispatched.
-   Replacing official emergency telephone numbers or agency systems.
-   Diagnosing injuries or providing medical advice.
-   Publicly displaying sensitive incident details or identifiable
    victim images.
-   Tracking users continuously in the background.
-   Treating unverified user reports as confirmed emergencies.

## 5. Product principles

1.  **Speed first:** A reporter should be able to send a minimal report
    quickly.
2.  **Honest feedback:** Distinguish "report submitted," "received by
    server," "reviewed," "responder assigned," and "help arrived."
3.  **Location confidence:** Display whether coordinates are precise,
    approximate, or manually selected.
4.  **Safety and privacy:** Collect only necessary information and
    restrict access to sensitive details.
5.  **Resilience:** Explain failures and allow retry without duplicate
    reports.
6.  **Accountability:** Log responder actions and status changes.
7.  **Accessible design:** Large touch targets, strong contrast, plain
    language, screen-reader labels, and low-bandwidth support.

## 6. Functional requirements

### FR-01: Start and emergency guidance

-   The app must show a short explanation that it is a reporting tool
    and that users should contact the official local emergency number
    when immediate assistance is needed.
-   Show the configured local emergency numbers only after they have
    been verified for the target deployment location.
-   Do not invent or hard-code unverified emergency contacts.
-   Provide a prominent "Report an accident" action.

### FR-02: Create an accident report

The report form must support: - Incident category: collision, vehicle
rollover, pedestrian struck, motorcycle incident, vehicle fire,
obstruction/other. - Severity selected by the reporter: minor, serious,
critical, unsure. - Short description, optional. - Approximate number of
vehicles and injured persons, each with "unknown" available. - Whether
fire, trapped persons, or a road blockage is suspected, each with
"unknown" available. - Accident date/time, defaulting to current device
time and clearly labelled as device-reported time. - GPS latitude,
longitude, accuracy in metres, capture timestamp, and
permission/location state. - Optional photo evidence, with a warning not
to put oneself at risk to capture it. - Optional contact method, if
enabled by policy. - Consent/notice acknowledgement where required.

Validation: - Require a valid incident category and severity. - Require
location coordinates OR a manually selected location/landmark. - Limit
description length and media count/size. - Validate coordinates and file
types on both client and server. - Prevent duplicate submissions caused
by repeated taps using a client-generated idempotency key.

### FR-03: Location capture

-   Request location permission in context and explain why it is needed.
-   Capture a one-time location when the user taps "Use my location"; do
    not continuously track the public reporter.
-   Display accuracy and allow the user to retry or place a pin on a
    map.
-   If permission is denied, offer manual location entry and do not
    block all reporting.
-   If GPS is unavailable, show a clear fallback.
-   Store latitude, longitude, accuracy, source (`gps`, `map_pin`,
    `manual`), and capture time.
-   Do not describe a location as "live" unless the system is actually
    receiving live location updates.

### FR-04: Submit and confirm

-   Submit report to the backend over HTTPS.
-   Show loading, success, and recoverable error states.
-   On successful server persistence, show an incident reference and
    submission time.
-   State clearly that submission does not itself guarantee emergency
    dispatch.
-   Preserve form data after recoverable network failures.
-   Prevent accidental duplicate records through idempotency.

### FR-05: Reporter status and history

-   Reporter can view their own reports and the current public-facing
    status.
-   Statuses visible to the reporter should be understandable:
    Submitted, Under review, Acknowledged, Responder assigned, Response
    in progress, Resolved, Closed, or Unable to verify.
-   Do not expose internal notes, responder personal information, or
    sensitive details.
-   If guest reporting is enabled, use a secure, unguessable report
    access token or verified contact flow rather than a predictable
    report ID alone.

### FR-06: Responder and dispatcher authentication

-   Staff accounts are created/invited by an administrator or approved
    through a documented verification process.
-   No public self-registration for responder or admin roles.
-   Use secure password hashing through a maintained authentication
    framework or a managed identity provider.
-   Support logout, token expiry, and session revocation.
-   Apply role-based permissions on the server, not only in the
    frontend.

### FR-07: Incident dashboard

-   Show incident reference, received time, incident category, reporter
    severity, location, current status, and assignment.
-   Support filtering by status, severity, date, category, and
    assignment.
-   Support map/list views if a map provider is configured.
-   Clearly mark unverified reports.
-   Avoid exposing victim identities or media to users without a
    legitimate operational need.

### FR-08: Triage and assignment

Authorised dispatchers can: - Mark a report as reviewed/verified,
unverified, duplicate, or false/misuse suspected. - Set an operational
priority separate from reporter-selected severity. - Assign one or more
approved responders/teams. - Add internal notes. - Record reasons for
priority changes, closure, or duplicate marking. - Reassign an incident
and retain the audit history.

### FR-09: Incident lifecycle

Recommended internal statuses: `SUBMITTED`, `UNDER_REVIEW`,
`ACKNOWLEDGED`, `ASSIGNED`, `EN_ROUTE`, `ON_SCENE`, `RESOLVED`,
`CLOSED`, `UNVERIFIED`, `DUPLICATE`, `CANCELLED`.

-   Validate transitions on the server.
-   Every transition records actor, timestamp, previous status, new
    status, and optional note.
-   Only authorised roles can perform each transition.
-   Reporter-facing status may map multiple internal statuses into
    simpler language.

### FR-10: Notifications and alerts

-   Notify authorised dispatcher/response queues after a report has been
    successfully stored.
-   Notify assigned responders when an incident is assigned or
    materially updated.
-   Notify the reporter when public-facing status changes, if a
    supported contact channel is available.
-   Use push notifications as a convenience, not as the sole
    critical-alert mechanism.
-   Record delivery attempts and outcomes.
-   Retry transient failures with bounded exponential backoff and
    dead-letter handling.
-   Show the dashboard as the operational source of truth.
-   In a real deployment, agree on escalation rules, duty coverage,
    acknowledgement timeout, fallback channel, and responsible agency
    before enabling live alerts.

### FR-11: Administration

-   Create, suspend, and reactivate staff accounts.
-   Assign roles and agency/team membership.
-   Review incident and notification audit logs.
-   Configure categories, thresholds, alert destinations, retention, and
    feature flags.
-   Restrict administrative actions to authorised administrators and log
    all changes.

### FR-12: Abuse and duplicate handling

-   Apply request throttling and basic abuse monitoring.
-   Support duplicate linking rather than destructive deletion.
-   Record the reason and actor for flagging an incident.
-   Do not automatically discard a report solely because it resembles
    another report.
-   Provide a human review path for suspicious submissions.

### FR-13: Evaluation and reporting

Capture timestamps sufficient to measure: - Report creation start
(client-side metric, where consented). - Server receipt time. - First
dispatcher acknowledgement time. - First assignment time. - First
responder status update. - Resolution/closure time. - Notification
attempt and delivery outcome.

Do not claim the app reduces real-world mortality or response time
unless the evaluation design and evidence support that conclusion.

## 7. Non-functional requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Target / verification
  ----------------------- ----------------------- -----------------------
  NFR-01 Performance      Typical report API      Target p95 under 2
                          response should be fast seconds for non-media
                          under expected load     report submission in
                                                  test environment

  NFR-02 Availability     Backend should be       Define deployment SLA;
                          observable and          MVP reports health,
                          recoverable             errors, and dependency
                                                  failures

  NFR-03 Security         TLS, server-side        Security checklist and
                          authorization, safe     tests
                          input handling, secure  
                          secrets                 

  NFR-04 Privacy          Minimise personal data; Documented privacy
                          limit access and        notice and retention
                          retention               policy

  NFR-05 Reliability      Retry-safe submissions  Idempotency and retry
                          and notification        tests
                          delivery                

  NFR-06 Accessibility    Usable by people with   Manual accessibility
                          varied abilities and in review and Android
                          stressful conditions    accessibility checks

  NFR-07 Compatibility    Android phones in the   Test on agreed minimum
                          intended user           Android version and
                          population              representative
                                                  low/mid-range devices

  NFR-08 Low bandwidth    Keep report form        Network throttling
                          lightweight; compress   tests
                          photos                  

  NFR-09 Maintainability  Modular code,           CI checks and code
                          migrations, typed       review
                          contracts, tests, API   
                          documentation           

  NFR-10 Auditability     Staff actions are       Audit-log acceptance
                          attributable and        tests
                          timestamped             

  NFR-11 Scalability      API and background jobs Load test at an agreed
                          can scale independently target; do not assume
                                                  production scale

  NFR-12 Localization     Keep user-facing        Initial language agreed
                          strings externalised    for MVP; design permits
                                                  later localisation
  -----------------------------------------------------------------------

## 8. Success metrics

MVP evaluation should report measured results rather than unsupported
claims: - Median and p95 time to complete a report in usability tests. -
Percentage of reports with valid coordinates or usable manual
location. - Percentage of submissions successfully persisted. -
Duplicate submission rate. - Time from server receipt to dispatcher
acknowledgement in a controlled simulation. - Notification attempt
success rate and time-to-delivery. - Percentage of users who understand
the difference between report submission and dispatch. - Number and
severity of security/privacy issues found during testing.

------------------------------------------------------------------------

# PART B --- TECHNICAL REQUIREMENTS DOCUMENT (TRD)

## 9. Recommended technology stack

Choose one coherent stack and keep it consistent. The following is the
default recommendation for a student project.

### Android client

-   Kotlin.
-   Jetpack Compose for UI.
-   Android Architecture Components: ViewModel, StateFlow, Navigation
    Compose.
-   Kotlin Coroutines for asynchronous work.
-   Retrofit + OkHttp for REST API calls; kotlinx.serialization or Moshi
    for JSON.
-   Google Play Services Location where available, with Android location
    APIs/fallback where practical.
-   Map SDK only if a map pin selector is included; use a provider whose
    terms and API key management are understood.
-   Firebase Cloud Messaging (FCM) for push notifications if configured.
-   Encrypted local storage only for short-lived sensitive session
    material; avoid storing incident media or sensitive reports
    unnecessarily.
-   WorkManager for safe retry/background work if offline queue is
    included.

### Operations dashboard

-   Next.js + TypeScript.
-   React, accessible component system, form validation (e.g. Zod), and
    a query/cache layer (e.g. TanStack Query).
-   Responsive design for desktop and tablet.
-   Role-protected routes, with permissions enforced again by the API.

### Backend

-   Node.js + TypeScript using NestJS (recommended) or Express with a
    clearly modular structure.
-   REST API documented with OpenAPI.
-   PostgreSQL as the primary relational database.
-   Prisma ORM or another migration-capable ORM.
-   Redis and a background job queue (e.g. BullMQ) for notification jobs
    if deployment complexity permits. For a simpler prototype, use a
    database-backed job table and worker.
-   Object storage for optional evidence media; do not store uploaded
    files as database blobs.
-   FCM for Android push notifications; email/SMS providers may be added
    only after credentials and operational policy are configured.
-   Docker Compose for local development.
-   Structured logging, health endpoints, and error monitoring.

### Why this stack

It separates the Android mobile app, staff operations dashboard, and
backend API; supports typed contracts and automated testing; and uses
PostgreSQL for reliable incident records and audit history. The specific
libraries are defaults, not a requirement to use every service. If an AI
coding environment or school constraints require alternatives, document
the change and preserve the requirements and API contract.

## 10. High-level architecture

``` mermaid
flowchart LR
    A[Android Reporter App] -->|HTTPS REST| B[API / Backend]
    C[Responder and Dispatcher Web Dashboard] -->|HTTPS REST / optional SSE| B
    B --> D[(PostgreSQL)]
    B --> E[Object Storage for Evidence]
    B --> F[Background Job Queue]
    F --> G[Notification Worker]
    G --> H[FCM Push Service]
    G --> I[Optional SMS / Email Provider]
    H --> A
    H --> C
    B --> J[Audit and Application Logs]
```

### Component responsibilities

-   **Android app:** Capture report details, request location
    permission, validate basic form data, submit securely, display
    report reference/status.
-   **Web dashboard:** Staff sign-in, queue management, triage,
    assignment, status updates, incident search, audit views.
-   **API:** Authentication, authorization, validation, report
    persistence, status transitions, assignment, notification
    orchestration.
-   **PostgreSQL:** Source of truth for users, agencies, incidents,
    assignments, status history, notification attempts, and audit logs.
-   **Object storage:** Optional photos with private access, size/type
    validation, and short-lived signed access URLs.
-   **Worker:** Asynchronous notification delivery, retry policy, and
    failure tracking.
-   **Notification providers:** Deliver best-effort notifications; the
    dashboard and persisted incident queue remain the operational source
    of truth.

## 11. Suggested repository structure

``` text
road-accident-response/
├── README.md
├── docs/
│   ├── PRD-TRD.md
│   ├── API.md
│   └── threat-model.md
├── apps/
│   ├── android/
│   │   ├── app/
│   │   └── ...
│   └── web-dashboard/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   ├── lib/
│       │   └── types/
│       └── ...
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── agencies/
│   │   │   ├── incidents/
│   │   │   ├── assignments/
│   │   │   ├── notifications/
│   │   │   ├── audit/
│   │   │   ├── uploads/
│   │   │   └── common/
│   │   └── test/
│   └── worker/
├── packages/
│   └── api-contracts/   # OpenAPI-generated types or shared schema
├── infra/
│   ├── docker-compose.yml
│   └── ...
└── .env.example
```

The AI agent may adapt the monorepo structure, but it must keep clear
boundaries between mobile, dashboard, API, and background jobs.

## 12. Backend modules

1.  **AuthModule:** staff login, token/session handling, password reset
    or managed identity integration, revocation.
2.  **UsersModule:** reporter profiles where used, staff profile, roles,
    account state.
3.  **AgenciesModule:** agency/team records and membership.
4.  **IncidentsModule:** create/read/update incidents, filtering,
    validation, duplicate links.
5.  **LocationModule:** coordinate validation and location metadata; no
    continuous public-user tracking.
6.  **AssignmentsModule:** assign/reassign teams and responders.
7.  **IncidentHistoryModule:** immutable or append-only status events.
8.  **NotificationsModule:** notification templates, dispatch jobs,
    delivery attempts, retries.
9.  **UploadsModule:** pre-signed upload or controlled multipart upload,
    file validation.
10. **AdminModule:** staff management and system configuration.
11. **AuditModule:** security-sensitive and operational action log.
12. **HealthModule:** liveness/readiness checks and dependency status.

## 13. Data model

Use UUIDs for primary keys, UTC timestamps in storage, and database
migrations. Add indexes for frequent filters. Exact field names can be
adapted, but equivalent data and constraints must be preserved.

### 13.1 `users`

-   `id` UUID primary key
-   `full_name` nullable for guest reporters
-   `email` nullable, unique when present
-   `phone` nullable
-   `password_hash` nullable if managed identity is used
-   `role` enum: `REPORTER`, `RESPONDER`, `DISPATCHER`, `ADMIN`
-   `account_status` enum: `ACTIVE`, `INVITED`, `SUSPENDED`, `DISABLED`
-   `agency_id` nullable for public reporters
-   `created_at`, `updated_at`, `last_login_at`

Do not store raw passwords. For guest access, do not create fake
permanent user accounts unless necessary; use a dedicated report access
mechanism.

### 13.2 `agencies`

-   `id` UUID
-   `name`
-   `agency_type` (e.g. ambulance, police, fire, road safety, other)
-   `service_area` JSON/geometry or a separate service-area table
-   `contact_configuration` protected configuration reference, not
    public credentials
-   `is_active`
-   timestamps

### 13.3 `incidents`

-   `id` UUID primary key
-   `reference_code` unique, non-sequential or sufficiently unguessable
    for public display
-   `created_by_user_id` nullable
-   `guest_access_token_hash` nullable; never store a raw access token
-   `category`
-   `reporter_severity`
-   `operational_priority` nullable until triage
-   `description` nullable
-   `vehicle_count` nullable
-   `injured_person_count` nullable
-   `fire_suspected` nullable boolean
-   `trapped_persons_suspected` nullable boolean
-   `road_blockage_suspected` nullable boolean
-   `occurred_at_device` nullable
-   `received_at` server timestamp
-   `latitude`, `longitude`
-   `location_accuracy_m` nullable
-   `location_source` enum: `GPS`, `MAP_PIN`, `MANUAL`
-   `landmark_or_address` nullable
-   `status`
-   `verification_state` enum: `PENDING`, `VERIFIED`, `UNVERIFIED`,
    `DUPLICATE`, `FALSE_REPORT_SUSPECTED`
-   `duplicate_of_incident_id` nullable
-   `closed_at` nullable
-   `created_at`, `updated_at`

Use PostGIS only if geographic querying/radius calculations are required
and supported by the deployment. Never assume that the nearest responder
is available or suitable just because coordinates are close.

### 13.4 `incident_media`

-   `id` UUID
-   `incident_id` foreign key
-   `storage_key`
-   `mime_type`
-   `size_bytes`
-   `uploaded_by_user_id` nullable
-   `created_at`
-   `review_status` (e.g. `PENDING`, `APPROVED`, `RESTRICTED`)

Use private storage, file-size limits, content-type validation, malware
scanning where available, and short-lived access URLs. Strip unnecessary
metadata such as EXIF GPS from images unless there is a documented
operational need to retain it.

### 13.5 `assignments`

-   `id` UUID
-   `incident_id`
-   `agency_id`
-   `assigned_to_user_id` nullable
-   `assigned_by_user_id`
-   `status` (`ACTIVE`, `REASSIGNED`, `COMPLETED`, `CANCELLED`)
-   `assigned_at`, `accepted_at` nullable, `completed_at` nullable
-   `notes` private to authorised staff

### 13.6 `incident_status_events`

-   `id` UUID
-   `incident_id`
-   `from_status` nullable
-   `to_status`
-   `actor_user_id` nullable for system event
-   `note` nullable
-   `created_at`
-   `metadata` JSON for non-sensitive structured context

Append events instead of overwriting history. Restrict
modification/deletion of audit-relevant events.

### 13.7 `notification_deliveries`

-   `id` UUID
-   `incident_id` nullable
-   `recipient_user_id` nullable
-   `channel` (`FCM`, `SMS`, `EMAIL`, `IN_APP`)
-   `event_type`
-   `provider_message_id` nullable
-   `status` (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`, `UNKNOWN`)
-   `attempt_count`
-   `last_error_code` nullable; do not log secrets or sensitive message
    bodies
-   `created_at`, `sent_at` nullable, `delivered_at` nullable

### 13.8 `audit_logs`

-   `id` UUID
-   `actor_user_id` nullable
-   `action`
-   `entity_type`, `entity_id`
-   `ip_address` and user-agent only where justified by policy
-   `created_at`
-   `metadata` JSON with allowlisted fields only

Avoid logging full incident descriptions, access tokens, passwords,
uploaded image content, or unnecessary personal data.

## 14. API conventions

-   Prefix: `/api/v1`
-   Transport: HTTPS in all non-local environments.
-   JSON request/response bodies.
-   ISO 8601 timestamps in UTC.
-   UUIDs for internal IDs; use a separate public incident reference.
-   Standard error shape:

``` json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "details": [
      { "field": "severity", "message": "A severity value is required." }
    ],
    "requestId": "correlation-id"
  }
}
```

-   Never return stack traces, database details, secrets, or internal
    notes in client-facing errors.
-   Use pagination (`limit`, `cursor` or page-based pagination) for
    incident lists.
-   Use an `Idempotency-Key` header on incident creation.
-   Enforce validation, access control, rate limiting, and business
    rules on the server.

## 15. Proposed REST endpoints

### Public / reporter

  ---------------------------------------------------------------------------------------
  Method            Endpoint                          Purpose           Access
  ----------------- --------------------------------- ----------------- -----------------
  GET               `/api/v1/config/public`           Public app config Public
                                                      and verified      
                                                      emergency         
                                                      guidance          

  POST              `/api/v1/incidents`               Create an         Public or
                                                      incident report   reporter,
                                                                        rate-limited

  GET               `/api/v1/incidents/mine`          List own reports  Authenticated
                                                                        reporter

  GET               `/api/v1/incidents/{id}/status`   Get public status Owner or secure
                                                                        guest token

  POST              `/api/v1/incidents/{id}/media`    Attach evidence   Owner/valid guest
                                                                        token,
                                                                        constrained

  POST              `/api/v1/device-tokens`           Register push     Authenticated
                                                      token             user or secure
                                                                        device
                                                                        registration
  ---------------------------------------------------------------------------------------

### Staff

  ---------------------------------------------------------------------------------------------------------------
  Method            Endpoint                                       Purpose           Access
  ----------------- ---------------------------------------------- ----------------- ----------------------------
  POST              `/api/v1/auth/login`                           Staff sign-in     Public endpoint with rate
                                                                                     limiting

  POST              `/api/v1/auth/logout`                          Revoke            Authenticated
                                                                   session/token     

  GET               `/api/v1/staff/incidents`                      Filtered incident Responder/dispatcher/admin
                                                                   queue             

  GET               `/api/v1/staff/incidents/{id}`                 Full operational  Authorised staff
                                                                   detail            

  PATCH             `/api/v1/staff/incidents/{id}/triage`          Verify,           Dispatcher/admin
                                                                   prioritise, flag  
                                                                   duplicate         

  POST              `/api/v1/staff/incidents/{id}/assignments`     Assign            Dispatcher/admin
                                                                   team/responder    

  PATCH             `/api/v1/staff/assignments/{id}`               Accept, reassign, Appropriate staff
                                                                   or complete       
                                                                   assignment        

  POST              `/api/v1/staff/incidents/{id}/status-events`   Add valid status  Appropriate staff
                                                                   transition        

  POST              `/api/v1/staff/incidents/{id}/notes`           Add internal note Appropriate staff

  GET               `/api/v1/staff/incidents/{id}/history`         View status/audit Authorised staff
                                                                   history           

  GET               `/api/v1/staff/notifications`                  Notification      Dispatcher/admin
                                                                   status/queue view 

  GET               `/api/v1/admin/users`                          List/manage staff Admin

  POST              `/api/v1/admin/users/invitations`              Invite staff      Admin

  PATCH             `/api/v1/admin/users/{id}`                     Update            Admin
                                                                   role/account      
                                                                   status            

  GET               `/api/v1/admin/audit-logs`                     Review audit      Admin
                                                                   events            
  ---------------------------------------------------------------------------------------------------------------

Implement endpoint contracts in OpenAPI and generate or share typed
clients where possible. Do not expose a generic unrestricted CRUD
endpoint for incidents.

## 16. Example incident creation contract

### Request

``` json
{
  "category": "COLLISION",
  "reporterSeverity": "SERIOUS",
  "description": "Two vehicles collided near the junction.",
  "vehicleCount": 2,
  "injuredPersonCount": 1,
  "fireSuspected": false,
  "trappedPersonsSuspected": null,
  "roadBlockageSuspected": true,
  "occurredAtDevice": "2026-10-16T09:20:00+01:00",
  "location": {
    "latitude": 10.5105,
    "longitude": 7.4165,
    "accuracyMetres": 18,
    "source": "GPS",
    "landmarkOrAddress": "Near the identified junction"
  }
}
```

### Successful response

``` json
{
  "data": {
    "id": "uuid",
    "referenceCode": "RA-7K4M2P",
    "status": "SUBMITTED",
    "receivedAt": "2026-10-16T08:22:14Z",
    "message": "Your report was received. This does not confirm that emergency services have been dispatched."
  }
}
```

The example coordinates and times are illustrative only. The application
must use actual device input and server timestamps; do not hard-code
sample values.

## 17. Authentication and authorisation

-   Prefer a maintained authentication library or managed identity
    provider over custom cryptography.
-   If using JWT, define short access-token lifetimes, safe
    refresh/revocation strategy, issuer/audience validation, and secure
    client storage.
-   Enforce RBAC in API guards/policies and at the service/data-access
    boundary.
-   A responder should access only incidents permitted by agency policy;
    dispatchers may have broader scope according to assigned
    jurisdiction.
-   Admin accounts should use stronger authentication (MFA if
    supported).
-   Rate-limit login, guest report creation, token registration, and
    media upload.
-   Never put API secrets or privileged service credentials in Android
    or web client bundles.
-   Configure CORS narrowly for the dashboard origins.
-   Use CSRF protection if cookie-based authentication is chosen.
-   Validate every input, encode output, and use parameterised database
    operations through the ORM.
-   Maintain dependency updates and security scanning.

## 18. Location, maps, and emergency-data safeguards

-   Request only foreground/one-time location for report creation in the
    MVP.
-   Explain permission denial and provide manual entry.
-   Display accuracy radius or an "approximate location" label where
    possible.
-   Validate latitude range `[-90, 90]` and longitude range
    `[-180, 180]`.
-   Do not silently replace user-confirmed manual location with later
    GPS data.
-   Store the source and accuracy of the location so dispatchers can
    judge confidence.
-   Do not send precise coordinates to unrelated third parties.
-   Emergency contacts and agency alert destinations must be
    configurable and verified by the institution/agency before
    deployment.
-   A simulated notification provider may be used for the academic demo,
    but the UI must label it as a simulation and must not imply that a
    real agency was contacted.

## 19. Media upload rules

-   Media is optional; the report must be possible without a photo.
-   Client-side compression is encouraged.
-   Set a configurable file size and count limit.
-   Allow only expected image types; validate file signatures
    server-side rather than trusting extensions.
-   Store media in private object storage and serve only via short-lived
    signed URLs after authorization.
-   Avoid capturing or retaining graphic imagery beyond the documented
    purpose.
-   Provide a privacy/safety reminder before upload.
-   If storage or upload fails, preserve the incident report and allow
    media retry independently.

## 20. Notification design

1.  API persists the incident and transactionally records an outbox/job
    entry.
2.  Worker picks up the job and sends configured notification(s).
3.  Worker stores each attempt and provider response.
4.  Transient failures retry with bounded exponential backoff.
5.  Permanent failures are marked failed and surfaced to the staff
    dashboard.
6.  Critical alert escalation requires an agreed operational policy and
    verified fallback channel.

Use a transactional outbox pattern or equivalent to avoid the case where
an incident is stored but the notification job is lost. FCM delivery is
not guaranteed; the dispatcher dashboard must always query the persisted
incident queue.

## 21. Frontend design system and screens

### Visual direction

-   Calm, high-contrast, utilitarian interface. Use red/orange only for
    meaningful emergency severity/status, not as decorative background
    everywhere.
-   Large primary actions, readable labels, minimal typing, strong focus
    states, and clear confirmation.
-   Do not use alarming animation or sound by default.
-   Make the app usable outdoors in bright light and on lower-end
    phones.
-   Keep visual design separate from emergency contact truth: no fake
    hotline numbers, logos, or claims of agency partnership.

### Android screens

1.  **Splash / startup:** brand mark, loading and configuration error
    state.
2.  **Welcome / safety notice:** what the app does, limitations, privacy
    link, continue.
3.  **Home:** prominent Report Accident button, own report history,
    emergency guidance.
4.  **Report --- incident details:** category, severity, short
    description, counts, hazard toggles.
5.  **Report --- location:** use my location, accuracy indicator, map
    pin/manual landmark fallback.
6.  **Report --- evidence:** optional photo picker/camera, safety
    notice, remove preview.
7.  **Review and submit:** summary of details and location, edit
    actions, submit.
8.  **Submission result:** incident reference, received time, current
    status, limitation disclaimer.
9.  **My reports:** list by newest, status chips, empty/error/loading
    states.
10. **Report detail/status:** safe public details and status timeline.
11. **Settings/privacy:** privacy notice, permissions explanation, sign
    out if authenticated.
12. **Error/offline state:** preserve form draft locally where safe;
    explain whether submission reached the server.

### Web dashboard screens

1.  **Staff login**
2.  **Incident queue:** filters, severity/status indicators, received
    time, location confidence, assignment.
3.  **Incident detail:** map/location, submitted details, media access
    based on permissions, timeline, triage panel.
4.  **Assignment dialog/page:** agency/team, responder, notes,
    confirmation.
5.  **Responder workspace:** assigned incidents, accept assignment,
    update progress.
6.  **Notifications/alerts:** queued, sent, failed, retry/manual
    follow-up.
7.  **Staff management:** invite, role, agency, active/suspended status.
8.  **Audit log:** filterable actor/action/time/entity records.
9.  **System configuration:** only verified alert channels and public
    guidance; protect high-risk settings.
10. **Access denied / session expired / not found / server error
    states.**

## 22. UI state and error requirements

Every data-driven screen must implement: - Loading state. - Empty
state. - Success state. - Validation state. - Network/server error state
with retry. - Permission-denied state where relevant. -
Session-expired/unauthorised state for staff. - Offline or degraded
state if supported.

Do not rely only on colour to communicate severity/status. Use text
labels and icons with accessible descriptions. Confirm destructive or
high-impact actions such as closing an incident, suspending a staff
account, or marking a report as duplicate.

------------------------------------------------------------------------

# PART C --- USER FLOW DESIGN

## 23. Primary public reporter flow

``` mermaid
flowchart TD
    A[Open app] --> B[Welcome and emergency guidance]
    B --> C[Home]
    C --> D[Tap Report Accident]
    D --> E[Enter incident details]
    E --> F[Capture GPS location]
    F --> G{Location usable?}
    G -->|Yes| H[Review location and details]
    G -->|No| I[Manual map pin or landmark]
    I --> H
    H --> J[Optional photo evidence]
    J --> K[Review report]
    K --> L{Submit valid?}
    L -->|No| E
    L -->|Yes| M[Submit to API]
    M --> N{Server confirms persistence?}
    N -->|No| O[Show error and preserve draft]
    O --> M
    N -->|Yes| P[Show reference and submitted status]
    P --> Q[View status/history]
```

### Reporter flow details

1.  Open the app and see a concise safety notice.
2.  Tap **Report Accident**.
3.  Select category and severity; add optional details.
4.  Tap **Use my location** and review accuracy. If GPS is unavailable,
    choose a map pin or enter a landmark.
5.  Optionally attach a photo only if safe.
6.  Review the summary and submit.
7.  The backend stores the report and returns a reference.
8.  The app displays **Report received** and explicitly says this does
    not mean a responder has been dispatched.
9.  The reporter can later view status updates, if the app has a secure
    way to identify their report.

### Fast-report option

Consider a future fast-report mode with only category, severity/unsure,
and location required. Do not remove essential safeguards or create the
impression that a one-tap action has contacted emergency services.

## 24. Staff incident-handling flow

``` mermaid
flowchart TD
    A[Staff sign in] --> B[Incident queue]
    B --> C[Open new incident]
    C --> D[Review location, severity, and details]
    D --> E{Valid actionable report?}
    E -->|Unclear| F[Request clarification or mark unverified]
    E -->|Duplicate| G[Link duplicate to primary incident]
    E -->|Yes| H[Confirm verification and operational priority]
    H --> I[Assign agency/team/responder]
    I --> J[Send assignment notification]
    J --> K[Responder acknowledges]
    K --> L[Responder updates en route / on scene]
    L --> M[Resolve incident]
    M --> N[Close with outcome note]
    F --> O[Record audit event]
    G --> O
    N --> O
```

### Staff flow rules

-   Queue access is role- and agency-scoped.
-   A reporter-selected severity is not the same as a
    dispatcher-assessed operational priority.
-   The dispatcher must not mark an incident "dispatched" merely because
    a notification was sent.
-   Assignment, acknowledgement, en-route, on-scene, resolved, and
    closed are distinct events.
-   Every operational status change must be recorded in history.

## 25. Admin flow

1.  Admin signs in.
2.  Opens Staff Management.
3.  Invites a responder/dispatcher and selects role and agency.
4.  Invitee completes approved identity/onboarding process.
5.  Admin activates the account and the action is audited.
6.  Admin configures notification destinations only after they have been
    verified.
7.  Admin reviews delivery failures and audit events.
8.  Admin can suspend accounts or disable integrations; high-impact
    actions require confirmation and audit logging.

## 26. Permissions and location-denied flow

1.  User taps "Use my location."
2.  App explains location use and requests permission.
3.  If granted, request one-time coordinates and accuracy.
4.  If denied, show manual location option and allow reporting to
    continue.
5.  If location is too inaccurate, offer retry and manual pin.
6.  Save `location_source` and accuracy metadata.
7.  Do not request background location for the MVP.

## 27. Offline / failed submission flow

-   If the device has no connection before submit, preserve the draft
    and show "Not submitted."
-   If the request times out and the outcome is unknown, retry with the
    same idempotency key so the backend does not create a duplicate.
-   If the backend confirms persistence but notification delivery later
    fails, the report remains submitted; alert staff through the
    operational dashboard.
-   Never display "Emergency services notified" based only on local
    button interaction or a queued network request.

------------------------------------------------------------------------

# PART D --- IMPLEMENTATION AND QUALITY PLAN

## 28. Suggested build phases

### Phase 0 --- Project setup

-   Create monorepo and README.
-   Establish linting, formatting, environment configuration, Docker
    Compose, database migrations, CI.
-   Write OpenAPI contracts and environment variable documentation.
-   Create seeded demo accounts only for local development; never use
    production credentials in source control.

### Phase 1 --- Backend foundation

-   Implement PostgreSQL schema and migrations.
-   Implement auth/RBAC for staff.
-   Implement incident creation, validation, idempotency, status
    history, audit logging.
-   Add tests for permissions and incident lifecycle.
-   Add API documentation and health endpoints.

### Phase 2 --- Android reporter app

-   Implement navigation, safety notice, home, report form, location,
    review/submit, reference screen, report history.
-   Implement permission rationale and manual location fallback.
-   Add form state handling, loading/error states, idempotent
    submission, and basic accessibility.

### Phase 3 --- Web operations dashboard

-   Implement staff login and protected routes.
-   Implement incident queue, filtering, incident details, triage,
    assignment, status timeline, responder workspace.
-   Enforce role permissions in both UI and API.

### Phase 4 --- Notifications and media

-   Add private media storage and secure uploads.
-   Add FCM registration and notification worker.
-   Add retries, delivery records, and a visible failure queue.
-   Keep a mock provider for development and clearly label all simulated
    alerts.

### Phase 5 --- Integration and evaluation

-   End-to-end tests across Android, API, database, dashboard, and
    notification worker.
-   Test low bandwidth, GPS denied, poor accuracy, duplicate taps,
    server errors, invalid media, unauthorised access, and notification
    failure.
-   Conduct usability tests and report measured findings.
-   Prepare screenshots, diagrams, test evidence, deployment notes, and
    limitations for the academic report.

## 29. Testing strategy

### Unit tests

-   Report validation and coordinate bounds.
-   Incident status transition rules.
-   RBAC policies.
-   Idempotency behaviour.
-   Severity/priority mapping.
-   Notification retry/backoff policy.
-   Reporter-facing status mapping.

### API/integration tests

-   Valid and invalid incident creation.
-   Duplicate submission with the same idempotency key.
-   Guest token access boundaries.
-   Staff cannot access incidents outside their permissions.
-   Dispatcher assignment and status transitions.
-   Audit event creation.
-   Media type and size enforcement.
-   Notification job created when incident is persisted.
-   Transaction rollback and recoverability.

### Android tests

-   Form validation.
-   Permission granted/denied.
-   GPS unavailable/manual location fallback.
-   Network timeout and retry.
-   Submit button double-tap.
-   Screen-reader labels and touch target checks.
-   Rotation/process recreation if supported.

### Dashboard tests

-   Login/logout and session expiry.
-   Role-based route restrictions.
-   Incident filters and pagination.
-   Assignment and status update flows.
-   Error/empty/loading states.
-   No internal notes in reporter-facing responses.

### Security tests

-   Unauthenticated staff endpoints are rejected.
-   Reporter cannot read another reporter's incident.
-   Predictable IDs do not grant access.
-   Rate limiting works.
-   Uploaded file content is validated.
-   Secrets are absent from repository and client bundles.
-   Audit logs do not contain credentials or unnecessary personal data.
-   SQL injection, XSS, CSRF (if cookie auth), and CORS checks
    appropriate to selected stack.

### Acceptance criteria

The MVP is accepted when: 1. A reporter can submit a valid accident
report with GPS or manual location. 2. The backend persists the report
and returns a unique reference. 3. Repeated submission with the same
idempotency key does not create duplicate incidents. 4. A dispatcher can
see the incident in the queue and open its details. 5. An authorised
dispatcher can triage and assign it. 6. An authorised responder can
acknowledge and update its progress. 7. Every status change is
timestamped and attributed. 8. The reporter can see an appropriate
public status without internal staff data. 9. Notification
success/failure is recorded; failed notifications do not erase the
report. 10. The app clearly distinguishes report receipt from actual
dispatch. 11. Location denial and network errors have usable fallbacks.
12. Automated tests cover the core incident lifecycle and access-control
rules.

## 30. Deployment and environment variables

Create `.env.example` with placeholder names only, for example:

``` dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://app:app@localhost:5432/road_accident
REDIS_URL=redis://localhost:6379
AUTH_SECRET=replace_for_local_development
WEB_APP_ORIGIN=http://localhost:3000
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
MAPS_API_KEY=
```

Rules: - Never commit real secrets. - Validate required configuration at
startup. - Do not put server-side credentials in Android resources or
browser-exposed environment variables. - Provide a mock notification
adapter for local development. - Use managed secrets in deployed
environments. - Provide database migration and backup/restore
instructions. - Use HTTPS and secure headers in staging/production. -
Configure log retention and avoid storing sensitive data in logs.

## 31. Observability and operations

-   Use structured logs with a request/correlation ID.
-   Monitor API error rate, latency, database health, worker queue
    depth, notification failures, and storage failures.
-   Expose readiness/liveness endpoints that do not leak secrets.
-   Add a dashboard view for failed notifications and unacknowledged
    reports.
-   Define a documented manual fallback process for a real operational
    deployment.
-   Establish retention, backup, restoration, and incident-response
    procedures.
-   Keep production data out of local test fixtures.

## 32. Privacy, ethics, and operational limitations

-   Display a clear privacy notice before collecting reports.
-   Collect only information required to coordinate a response.
-   Define retention/deletion rules with the institution and any
    participating agency.
-   Restrict precise location and media to authorised operational staff.
-   Do not expose reports publicly by default.
-   Do not use victim images for model training or unrelated purposes.
-   Use synthetic/demo data during academic demonstrations.
-   Do not send test alerts to real emergency agencies without explicit
    written authorisation.
-   Do not claim official agency integration unless it exists and has
    been tested.
-   Automatic sensor-based accident detection is a separate feature and
    may produce false positives/negatives; if added, it requires
    explicit consent, calibration, cancellation flow, battery impact
    assessment, and evaluation.
-   The application is not a medical device and must not provide
    diagnosis or replace emergency services.

## 33. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Incorrect GPS location              Show accuracy, allow retry/manual
                                      pin, preserve source metadata

  Poor network connectivity           Preserve draft, idempotent retry,
                                      clear "not submitted" state

  False or duplicate reports          Rate limiting, human review,
                                      duplicate linking, audit trail

  Push notification not delivered     Persist queue, retry, dashboard
                                      source of truth, operational
                                      fallback

  Unauthorised access to incident     RBAC, scoped queries, secure guest
  data                                token, tests, audit

  Sensitive photos leaked             Private object storage, short-lived
                                      URLs, restricted access, retention
                                      policy

  False confidence that help is       Clear status language and explicit
  coming                              disclaimer

  Unverified agency contacts          Configurable contacts; require
                                      verification before production

  Automatic detection false alarms    Keep out of MVP unless separately
                                      designed and tested

  Service unavailable during          Do not position as sole emergency
  emergency                           channel; provide verified official
                                      guidance
  -----------------------------------------------------------------------

## 34. Decisions the project owner must confirm

The AI coding agent should proceed with the defaults in this document
unless the project owner specifies otherwise, but must not invent: -
Minimum Android version and target devices. - Whether public reporters
must register or may submit as guests. - Whether a map SDK is required
or manual landmark entry is sufficient. - Which country/state and
verified emergency numbers apply to the deployment. - Whether real
agency integrations exist; otherwise use a mock/demo integration. -
Hosting provider, domain, database service, and object-storage
provider. - Whether FCM credentials are available; otherwise implement a
mock adapter. - Whether the MVP must include automatic sensor-based
crash detection. Default: no, user-initiated reporting only. - Whether
SMS/email alerts are required. Default: optional adapter, disabled until
configured. - Data retention period and agency access rules.

## 35. Definition of done

A feature is complete only when: - The UI implements loading, empty,
success, validation, and error states. - Backend validation and
authorization are implemented where applicable. - Data migrations and
API documentation are updated. - Unit/integration tests cover the
important business rules. - No secrets or fake emergency claims are
present. - Accessibility and privacy implications are considered. -
README instructions allow another developer to run the feature
locally. - The feature has been verified against its acceptance
criteria.

------------------------------------------------------------------------

# PART E --- MASTER PROMPT FOR AN AI CODING AGENT

Copy the following prompt into the coding agent together with this
document.

> You are the senior product engineer and software architect responsible
> for implementing the project specified in `PRD-TRD.md`. Treat that
> document as the product source of truth.
>
> Build a complete, coherent MVP consisting of: 1. An Android app in
> Kotlin and Jetpack Compose for public accident reporting. 2. A
> responsive Next.js + TypeScript web dashboard for dispatchers,
> responders, and administrators. 3. A TypeScript backend REST API,
> PostgreSQL database, migrations, and notification worker. 4. Automated
> tests, OpenAPI documentation, Docker-based local development,
> `.env.example`, and a clear README.
>
> **Work method** - First inspect the existing repository and report its
> current structure. Do not overwrite working code blindly. - Create a
> short implementation plan and list any truly blocking questions. For
> non-blocking decisions, use the defaults in the specification and
> document them. - Implement in vertical slices, beginning with
> database/schema and API contracts, then authentication/permissions,
> incident submission, Android flow, dashboard queue,
> triage/assignment/status history, and notifications. - Keep Android,
> dashboard, API, and worker boundaries clear. Use typed API contracts
> and consistent enum values. - Add migrations rather than relying on
> manual database setup. - Implement real persistence and working
> end-to-end flows; do not substitute static mock screens for core
> features. Mock only external services that lack credentials, and label
> mock integrations clearly. - Add meaningful tests as you implement.
> Run formatting, linting, type checks, tests, and builds; fix errors
> before claiming completion. - Keep a `BUILD_STATUS.md` with completed
> work, commands run, test results, known issues, and next steps.
>
> **Safety and correctness rules** - Never hard-code invented emergency
> numbers, agency contacts, agency affiliations, or claims that
> responders have been contacted. - The MVP is user-initiated reporting
> with GPS/manual location. Do not claim automatic crash detection
> unless it is separately implemented and tested. - Persist the report
> before queuing notifications. Notification failure must not lose the
> report. - Use idempotency keys to prevent duplicate incident creation
> on retry. - Enforce role-based access in the backend, not only in the
> UI. - Never store raw passwords or commit secrets. Provide
> `.env.example` with placeholders. - Protect guest report access with
> an unguessable token or equivalent secure mechanism. - Keep incident
> media private and validate uploads server-side. - Clearly distinguish
> submitted, acknowledged, assigned, en route, on scene, resolved, and
> closed. - Do not tell a reporter that help is on the way unless an
> authorised operational workflow confirms it.
>
> **Quality bar** - Implement all required MVP functional requirements
> and the acceptance criteria in the specification. - Include loading,
> empty, error, retry, and permission-denied states. - Use accessible
> controls and readable high-contrast layouts. - Include seed data only
> for local development and label demo users/alerts. - Provide exact
> setup commands, required environment variables, migration commands,
> test commands, and deployment notes. - If a requirement cannot be
> completed because credentials or external services are unavailable,
> implement a well-defined adapter/mock, explain the limitation, and
> leave a precise setup step rather than pretending it works.
>
> Start by inspecting the repository and creating the implementation
> plan. Then build and verify the system incrementally. Do not stop
> after producing a plan or a visual prototype.

------------------------------------------------------------------------

## 36. Final implementation note

This is a build specification for an academic MVP. Before any real-world
use, the project needs a verified operational partner, approved
emergency contact information, privacy and retention review, security
testing, and a tested escalation/fallback procedure. A technically
successful report submission is not the same as a confirmed emergency
dispatch.
