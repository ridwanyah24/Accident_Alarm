package com.accidentalarm.app.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import com.accidentalarm.app.data.model.IncidentLocationDto
import com.accidentalarm.app.data.model.LocationSource
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

class AccidentLocationManager(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }

    /**
     * Captures a single one-time foreground location reading.
     * Complies with PRD requirements: no continuous background tracking.
     */
    @SuppressLint("MissingPermission")
    suspend fun getOneTimeLocation(): IncidentLocationDto? {
        return try {
            val cancellationTokenSource = CancellationTokenSource()

            // 10 second timeout for GPS fix
            val location: Location? = withTimeoutOrNull(10000L) {
                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cancellationTokenSource.token
                ).await()
            }

            if (location != null && isValidCoordinates(location.latitude, location.longitude)) {
                IncidentLocationDto(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracyMetres = if (location.hasAccuracy()) location.accuracy else null,
                    source = LocationSource.GPS,
                    landmarkOrAddress = null
                )
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    fun isValidCoordinates(lat: Double, lng: Double): Boolean {
        return isValidCoordinatesValue(lat, lng)
    }

    companion object {
        fun isValidCoordinatesValue(lat: Double, lng: Double): Boolean {
        return !lat.isNaN() && !lng.isNaN() && lat in -90.0..90.0 && lng in -180.0..180.0
        }
    }
}
