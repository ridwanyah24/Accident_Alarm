package com.accidentalarm.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.accidentalarm.app.data.model.CreateIncidentRequest
import com.google.gson.Gson

data class SubmittedReportRecord(
    val id: String,
    val referenceCode: String,
    val guestAccessToken: String?,
    val category: String,
    val receivedAt: String
)

class LocalReportStorage(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("accident_alarm_reports", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun saveSubmittedReport(record: SubmittedReportRecord) {
        val existing = getSubmittedReports().toMutableList()
        existing.removeAll { it.id == record.id }
        existing.add(0, record)
        val json = gson.toJson(existing)
        prefs.edit().putString("submitted_reports", json).apply()
    }

    fun getSubmittedReports(): List<SubmittedReportRecord> {
        val json = prefs.getString("submitted_reports", null) ?: return emptyList()
        return try {
            val type = object : com.google.gson.reflect.TypeToken<List<SubmittedReportRecord>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveDraft(draft: CreateIncidentRequest) {
        val json = gson.toJson(draft)
        prefs.edit().putString("draft_incident", json).apply()
    }

    fun getDraft(): CreateIncidentRequest? {
        val json = prefs.getString("draft_incident", null) ?: return null
        return try {
            gson.fromJson(json, CreateIncidentRequest::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clearDraft() {
        prefs.edit().remove("draft_incident").apply()
    }
}
