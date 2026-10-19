package com.accidentalarm.app.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.accidentalarm.app.data.model.*
import com.accidentalarm.app.data.repository.IncidentRepository
import com.accidentalarm.app.location.AccidentLocationManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

// ──────────────────────────────────────────────────────────────────────────────
// UI State
// ──────────────────────────────────────────────────────────────────────────────

/** Represents every possible state of the report wizard. */
sealed class ReportUiState {
    /** No active operation. */
    object Idle : ReportUiState()
    /** Location is being acquired from the fused location provider. */
    object CapturingLocation : ReportUiState()
    /** Submitting incident to the API. */
    object Submitting : ReportUiState()
    /** Submission succeeded. Carries confirmation data for the result screen. */
    data class Success(
        val referenceCode: String,
        val status: String,
        val receivedAt: String
    ) : ReportUiState()
    /** Any recoverable error. */
    data class Error(val message: String) : ReportUiState()
}

// ──────────────────────────────────────────────────────────────────────────────
// ViewModel
// ──────────────────────────────────────────────────────────────────────────────

/**
 * ViewModel for the multi-step incident report wizard (PRD UC-02 / UC-03).
 *
 * Responsible for:
 * – Holding ephemeral form state across step transitions
 * – Driving one-time location capture (no background tracking per PRD NFR-04)
 * – Calling [IncidentRepository.submitIncident] and surfacing results
 */
class ReportViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = IncidentRepository(application)
    private val locationManager = AccidentLocationManager(application)

    // ── State ────────────────────────────────────────────────────────────────

    private val _uiState = MutableStateFlow<ReportUiState>(ReportUiState.Idle)
    val uiState: StateFlow<ReportUiState> = _uiState.asStateFlow()

    // ── Form Fields ──────────────────────────────────────────────────────────

    private val _selectedCategory = MutableStateFlow(IncidentCategory.COLLISION)
    val selectedCategory: StateFlow<IncidentCategory> = _selectedCategory.asStateFlow()

    private val _selectedSeverity = MutableStateFlow(ReporterSeverity.SERIOUS)
    val selectedSeverity: StateFlow<ReporterSeverity> = _selectedSeverity.asStateFlow()

    private val _description = MutableStateFlow("")
    val description: StateFlow<String> = _description.asStateFlow()

    private val _vehicleCount = MutableStateFlow(2)
    val vehicleCount: StateFlow<Int> = _vehicleCount.asStateFlow()

    private val _injuredCount = MutableStateFlow(1)
    val injuredCount: StateFlow<Int> = _injuredCount.asStateFlow()

    private val _fireSuspected = MutableStateFlow(false)
    val fireSuspected: StateFlow<Boolean> = _fireSuspected.asStateFlow()

    private val _trappedSuspected = MutableStateFlow(false)
    val trappedSuspected: StateFlow<Boolean> = _trappedSuspected.asStateFlow()

    private val _roadBlockage = MutableStateFlow(false)
    val roadBlockage: StateFlow<Boolean> = _roadBlockage.asStateFlow()

    // ── Location ─────────────────────────────────────────────────────────────

    private val _capturedLocation = MutableStateFlow<IncidentLocationDto?>(null)
    val capturedLocation: StateFlow<IncidentLocationDto?> = _capturedLocation.asStateFlow()

    private val _manualLatitude = MutableStateFlow("")
    val manualLatitude: StateFlow<String> = _manualLatitude.asStateFlow()

    private val _manualLongitude = MutableStateFlow("")
    val manualLongitude: StateFlow<String> = _manualLongitude.asStateFlow()

    private val _landmarkOrAddress = MutableStateFlow("")
    val landmarkOrAddress: StateFlow<String> = _landmarkOrAddress.asStateFlow()

    // ── Setters ──────────────────────────────────────────────────────────────

    fun setCategory(v: IncidentCategory) { _selectedCategory.value = v }
    fun setSeverity(v: ReporterSeverity) { _selectedSeverity.value = v }
    fun setDescription(v: String) { _description.value = v }
    fun setVehicleCount(v: Int) { _vehicleCount.value = v.coerceIn(1, 20) }
    fun setInjuredCount(v: Int) { _injuredCount.value = v.coerceIn(0, 50) }
    fun setFireSuspected(v: Boolean) { _fireSuspected.value = v }
    fun setTrappedSuspected(v: Boolean) { _trappedSuspected.value = v }
    fun setRoadBlockage(v: Boolean) { _roadBlockage.value = v }
    fun setManualLatitude(v: String) { _manualLatitude.value = v }
    fun setManualLongitude(v: String) { _manualLongitude.value = v }
    fun setLandmarkOrAddress(v: String) { _landmarkOrAddress.value = v }

    // ── Location Capture ─────────────────────────────────────────────────────

    /**
     * Triggers one-time GPS reading. Complies with PRD NFR-04: no background
     * location tracking.  After 10 seconds the location provider times out and
     * the user is invited to enter coordinates manually.
     */
    fun captureLocation() {
        viewModelScope.launch {
            _uiState.value = ReportUiState.CapturingLocation
            val loc = locationManager.getOneTimeLocation()
            _capturedLocation.value = loc
            _uiState.value = if (loc != null) ReportUiState.Idle
            else ReportUiState.Error("Unable to determine GPS location. Please enter coordinates manually or use the map.")
        }
    }

    /** Sets a manual coordinate pair instead of GPS. */
    fun useManualLocation() {
        val lat = _manualLatitude.value.toDoubleOrNull()
        val lng = _manualLongitude.value.toDoubleOrNull()
        if (lat != null && lng != null && locationManager.isValidCoordinates(lat, lng)) {
            _capturedLocation.value = IncidentLocationDto(
                latitude         = lat,
                longitude        = lng,
                source           = LocationSource.MANUAL,
                landmarkOrAddress = _landmarkOrAddress.value.ifBlank { null }
            )
            _uiState.value = ReportUiState.Idle
        } else {
            _uiState.value = ReportUiState.Error("Invalid coordinates. Latitude must be between -90 and 90, longitude -180 and 180.")
        }
    }

    // ── Submission ───────────────────────────────────────────────────────────

    /** Validates the form and submits to the API. */
    fun submitReport() {
        val location = _capturedLocation.value
            ?: run {
                _uiState.value = ReportUiState.Error("Location is required. Please capture GPS or enter coordinates.")
                return
            }

        viewModelScope.launch {
            _uiState.value = ReportUiState.Submitting

            val request = CreateIncidentRequest(
                category                  = _selectedCategory.value,
                reporterSeverity          = _selectedSeverity.value,
                description               = _description.value.ifBlank { null },
                vehicleCount              = _vehicleCount.value,
                injuredPersonCount        = _injuredCount.value,
                fireSuspected             = _fireSuspected.value,
                trappedPersonsSuspected   = _trappedSuspected.value,
                roadBlockageSuspected     = _roadBlockage.value,
                location                  = location,
                contactMethod             = null
            )

            repository.submitIncident(request).fold(
                onSuccess = { result ->
                    _uiState.value = ReportUiState.Success(
                        referenceCode = result.referenceCode,
                        status        = result.status.name,
                        receivedAt    = result.receivedAt
                    )
                },
                onFailure = { err ->
                    _uiState.value = ReportUiState.Error(
                        err.message ?: "Submission failed. Please try again."
                    )
                }
            )
        }
    }

    /** Saves the current form state as a draft in SharedPreferences. */
    fun saveDraft() {
        val location = _capturedLocation.value ?: return
        repository.saveDraft(
            CreateIncidentRequest(
                category               = _selectedCategory.value,
                reporterSeverity       = _selectedSeverity.value,
                description            = _description.value.ifBlank { null },
                vehicleCount           = _vehicleCount.value,
                injuredPersonCount     = _injuredCount.value,
                fireSuspected          = _fireSuspected.value,
                trappedPersonsSuspected = _trappedSuspected.value,
                roadBlockageSuspected  = _roadBlockage.value,
                location               = location
            )
        )
    }

    /** Resets all fields and clears any error / success state. */
    fun resetForm() {
        _uiState.value = ReportUiState.Idle
        _selectedCategory.value = IncidentCategory.COLLISION
        _selectedSeverity.value = ReporterSeverity.SERIOUS
        _description.value = ""
        _vehicleCount.value = 2
        _injuredCount.value = 1
        _fireSuspected.value = false
        _trappedSuspected.value = false
        _roadBlockage.value = false
        _capturedLocation.value = null
        _manualLatitude.value = ""
        _manualLongitude.value = ""
        _landmarkOrAddress.value = ""
        repository.clearDraft()
    }

    fun clearError() {
        if (_uiState.value is ReportUiState.Error) {
            _uiState.value = ReportUiState.Idle
        }
    }
}
