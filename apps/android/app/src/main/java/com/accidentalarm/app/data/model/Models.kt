package com.accidentalarm.app.data.model

import com.google.gson.annotations.SerializedName

enum class IncidentCategory {
    @SerializedName("COLLISION") COLLISION,
    @SerializedName("VEHICLE_ROLLOVER") VEHICLE_ROLLOVER,
    @SerializedName("PEDESTRIAN_STRUCK") PEDESTRIAN_STRUCK,
    @SerializedName("MOTORCYCLE_INCIDENT") MOTORCYCLE_INCIDENT,
    @SerializedName("VEHICLE_FIRE") VEHICLE_FIRE,
    @SerializedName("OBSTRUCTION_OR_OTHER") OBSTRUCTION_OR_OTHER
}

enum class ReporterSeverity {
    @SerializedName("MINOR") MINOR,
    @SerializedName("SERIOUS") SERIOUS,
    @SerializedName("CRITICAL") CRITICAL,
    @SerializedName("UNSURE") UNSURE
}

enum class LocationSource {
    @SerializedName("GPS") GPS,
    @SerializedName("MAP_PIN") MAP_PIN,
    @SerializedName("MANUAL") MANUAL
}

enum class IncidentStatus {
    @SerializedName("SUBMITTED") SUBMITTED,
    @SerializedName("UNDER_REVIEW") UNDER_REVIEW,
    @SerializedName("ACKNOWLEDGED") ACKNOWLEDGED,
    @SerializedName("ASSIGNED") ASSIGNED,
    @SerializedName("EN_ROUTE") EN_ROUTE,
    @SerializedName("ON_SCENE") ON_SCENE,
    @SerializedName("RESOLVED") RESOLVED,
    @SerializedName("CLOSED") CLOSED,
    @SerializedName("UNVERIFIED") UNVERIFIED,
    @SerializedName("DUPLICATE") DUPLICATE,
    @SerializedName("CANCELLED") CANCELLED
}

data class IncidentLocationDto(
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("accuracyMetres") val accuracyMetres: Float? = null,
    @SerializedName("source") val source: LocationSource = LocationSource.GPS,
    @SerializedName("landmarkOrAddress") val landmarkOrAddress: String? = null
)

data class CreateIncidentRequest(
    @SerializedName("category") val category: IncidentCategory,
    @SerializedName("reporterSeverity") val reporterSeverity: ReporterSeverity,
    @SerializedName("description") val description: String? = null,
    @SerializedName("vehicleCount") val vehicleCount: Int? = null,
    @SerializedName("injuredPersonCount") val injuredPersonCount: Int? = null,
    @SerializedName("fireSuspected") val fireSuspected: Boolean? = null,
    @SerializedName("trappedPersonsSuspected") val trappedPersonsSuspected: Boolean? = null,
    @SerializedName("roadBlockageSuspected") val roadBlockageSuspected: Boolean? = null,
    @SerializedName("occurredAtDevice") val occurredAtDevice: String? = null,
    @SerializedName("location") val location: IncidentLocationDto,
    @SerializedName("contactMethod") val contactMethod: String? = null
)

data class IncidentCreationResult(
    @SerializedName("id") val id: String,
    @SerializedName("referenceCode") val referenceCode: String,
    @SerializedName("status") val status: IncidentStatus,
    @SerializedName("receivedAt") val receivedAt: String,
    @SerializedName("guestAccessToken") val guestAccessToken: String? = null,
    @SerializedName("message") val message: String
)

data class IncidentPublicResponse(
    @SerializedName("id") val id: String,
    @SerializedName("referenceCode") val referenceCode: String,
    @SerializedName("category") val category: IncidentCategory,
    @SerializedName("reporterSeverity") val reporterSeverity: ReporterSeverity,
    @SerializedName("status") val status: IncidentStatus,
    @SerializedName("statusDisplay") val statusDisplay: String,
    @SerializedName("receivedAt") val receivedAt: String,
    @SerializedName("location") val location: PublicLocationSummary,
    @SerializedName("hasMedia") val hasMedia: Boolean
)

data class PublicLocationSummary(
    @SerializedName("source") val source: LocationSource,
    @SerializedName("landmarkOrAddress") val landmarkOrAddress: String? = null,
    @SerializedName("approximateLatitude") val approximateLatitude: Double? = null,
    @SerializedName("approximateLongitude") val approximateLongitude: Double? = null
)

data class ApiResponse<T>(
    @SerializedName("data") val data: T
)

data class PublicEmergencyConfig(
    @SerializedName("helplines") val helplines: HelplinesConfig,
    @SerializedName("countryCode") val countryCode: String,
    @SerializedName("disclaimer") val disclaimer: String,
    @SerializedName("incidentCategories") val incidentCategories: List<IncidentCategory>,
    @SerializedName("reporterSeverities") val reporterSeverities: List<ReporterSeverity>
)

data class HelplinesConfig(
    @SerializedName("primary") val primary: String,
    @SerializedName("police") val police: String,
    @SerializedName("ambulance") val ambulance: String,
    @SerializedName("fire") val fire: String
)
