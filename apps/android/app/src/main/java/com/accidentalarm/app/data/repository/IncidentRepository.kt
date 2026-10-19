package com.accidentalarm.app.data.repository

import android.content.Context
import com.accidentalarm.app.data.api.AccidentApiService
import com.accidentalarm.app.data.api.ApiClient
import com.accidentalarm.app.data.local.LocalReportStorage
import com.accidentalarm.app.data.local.SubmittedReportRecord
import com.accidentalarm.app.data.model.*

/**
 * Repository mediating between the UI layer, the remote API, and local
 * persistent storage. All public functions return a [Result] so the
 * ViewModel can surface success or failure without knowing the source.
 *
 * Per PRD NFR-04: no background location tracking. Location is captured
 * once, at the time the report is submitted.
 */
class IncidentRepository(
    private val context: Context,
    private val api: AccidentApiService = ApiClient.service,
    private val storage: LocalReportStorage = LocalReportStorage(context)
) {

    // ──────────────────────────────────────────────────────────────────────────
    // Remote API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Submit an incident report. Generates a random idempotency key per
     * submission so duplicate network retries are safely de-duplicated
     * server-side (PRD API-01).
     */
    suspend fun submitIncident(
        request: CreateIncidentRequest
    ): Result<IncidentCreationResult> = runCatching {
        val idempotencyKey = java.util.UUID.randomUUID().toString()
        val response = api.submitIncident(idempotencyKey, request)
        if (response.isSuccessful && response.body() != null) {
            val result = response.body()!!.data
            // Persist locally for offline status polling
            storage.saveSubmittedReport(
                SubmittedReportRecord(
                    id               = result.id,
                    referenceCode    = result.referenceCode,
                    guestAccessToken = result.guestAccessToken,
                    category         = request.category.name,
                    receivedAt       = result.receivedAt
                )
            )
            result
        } else {
            val code = response.code()
            val errorBody = response.errorBody()?.string() ?: "Unknown error"
            throw ApiException(code, errorBody)
        }
    }

    /**
     * Fetch status for a specific incident. Uses the guest token that was
     * returned at submission time so the reporter can check progress without
     * creating an account (PRD UC-04).
     */
    suspend fun getIncidentStatus(
        incidentId: String,
        guestToken: String?
    ): Result<IncidentPublicResponse> = runCatching {
        val response = api.getIncidentStatus(incidentId, guestToken)
        if (response.isSuccessful && response.body() != null) {
            response.body()!!.data
        } else {
            throw ApiException(response.code(), "Failed to fetch status")
        }
    }

    /**
     * Fetch all incidents submitted by the authenticated user.
     */
    suspend fun getMyReports(): Result<List<IncidentPublicResponse>> = runCatching {
        val response = api.getMyReports()
        if (response.isSuccessful && response.body() != null) {
            response.body()!!.data
        } else {
            throw ApiException(response.code(), "Failed to fetch reports")
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Local Storage
    // ──────────────────────────────────────────────────────────────────────────

    fun getLocalReports(): List<SubmittedReportRecord> = storage.getSubmittedReports()

    fun saveDraft(draft: CreateIncidentRequest) = storage.saveDraft(draft)

    fun getDraft(): CreateIncidentRequest? = storage.getDraft()

    fun clearDraft() = storage.clearDraft()
}

/** Wraps an HTTP error code + body for structured error handling. */
class ApiException(val httpCode: Int, message: String) : Exception(message)
