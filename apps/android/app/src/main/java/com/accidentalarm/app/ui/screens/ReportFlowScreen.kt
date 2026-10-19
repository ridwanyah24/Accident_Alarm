package com.accidentalarm.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.accidentalarm.app.R
import com.accidentalarm.app.data.api.ApiClient
import com.accidentalarm.app.data.local.LocalReportStorage
import com.accidentalarm.app.data.local.SubmittedReportRecord
import com.accidentalarm.app.data.model.*
import com.accidentalarm.app.location.AccidentLocationManager
import com.accidentalarm.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportFlowScreen(
    onNavigateBack: () -> Unit,
    onSubmissionSuccess: (referenceCode: String, status: String, receivedAt: String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val locationManager = remember { AccidentLocationManager(context) }
    val storage = remember { LocalReportStorage(context) }

    // Step state (1: Details, 2: Location, 3: Review)
    var currentStep by remember { mutableStateOf(1) }

    // Form Fields
    var selectedCategory by remember { mutableStateOf(IncidentCategory.COLLISION) }
    var selectedSeverity by remember { mutableStateOf(ReporterSeverity.SERIOUS) }
    var description by remember { mutableStateOf("") }
    var vehicleCount by remember { mutableStateOf(2) }
    var injuredCount by remember { mutableStateOf(1) }
    var fireSuspected by remember { mutableStateOf(false) }
    var trappedSuspected by remember { mutableStateOf(false) }
    var roadBlockageSuspected by remember { mutableStateOf(true) }

    // Location Fields
    var locationSource by remember { mutableStateOf(LocationSource.GPS) }
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    var manualLatitude by remember { mutableStateOf("") }
    var manualLongitude by remember { mutableStateOf("") }
    var accuracyMetres by remember { mutableStateOf<Float?>(null) }
    var landmarkOrAddress by remember { mutableStateOf("") }
    var isCapturingLocation by remember { mutableStateOf(false) }
    var locationCaptured by remember { mutableStateOf(false) }
    var locationMessage by remember { mutableStateOf<String?>(null) }

    // Submission State
    var isSubmitting by remember { mutableStateOf(false) }
    var submissionError by remember { mutableStateOf<String?>(null) }
    var idempotencyKey by remember { mutableStateOf(UUID.randomUUID().toString()) }

    fun captureCurrentLocation() {
        isCapturingLocation = true
        locationMessage = null
        coroutineScope.launch {
            val captured = locationManager.getOneTimeLocation()
            isCapturingLocation = false
            if (captured != null) {
                latitude = captured.latitude
                longitude = captured.longitude
                accuracyMetres = captured.accuracyMetres
                locationSource = LocationSource.GPS
                locationCaptured = true
                locationMessage = "GPS location captured. Confirm the landmark before submitting."
            } else {
                locationCaptured = false
                locationMessage = "GPS location is unavailable. Enter coordinates and a nearby landmark manually."
            }
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.any { it }) {
            captureCurrentLocation()
        } else {
            locationCaptured = false
            locationMessage = "Location permission was denied. You can enter coordinates and a landmark manually."
        }
    }

    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = when (currentStep) {
                            1 -> stringResource(R.string.title_report_details)
                            2 -> stringResource(R.string.title_report_location)
                            else -> stringResource(R.string.title_report_review)
                        },
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep > 1) currentStep-- else onNavigateBack()
                    }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.cd_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgPrimary)
            )
        },
        containerColor = BgPrimary
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .verticalScroll(scrollState)
        ) {
            // Step Progress Bar
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf(1, 2, 3).forEach { step ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .padding(horizontal = 2.dp)
                            .background(
                                if (step <= currentStep) EmergencyCyan else BgTertiary,
                                RoundedCornerShape(2.dp)
                            )
                    )
                }
            }

            if (submissionError != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D).copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                ) {
                    Text(
                        text = submissionError ?: "",
                        color = Color(0xFFFCA5A5),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // ==========================================
            // STEP 1: INCIDENT DETAILS
            // ==========================================
            if (currentStep == 1) {
                Text(
                    text = stringResource(R.string.label_category),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 8.dp, bottom = 8.dp)
                )

                // Category Selector Chips
                IncidentCategory.values().forEach { cat ->
                    val isSelected = selectedCategory == cat
                    OutlinedButton(
                        onClick = { selectedCategory = cat },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = if (isSelected) EmergencyCyan.copy(alpha = 0.2f) else BgTertiary,
                            contentColor = if (isSelected) EmergencyCyan else TextPrimary
                        ),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
                    ) {
                        Text(cat.name.replace("_", " "), fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = stringResource(R.string.label_severity),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                // Severity Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ReporterSeverity.values().forEach { sev ->
                        val isSelected = selectedSeverity == sev
                        val color = when (sev) {
                            ReporterSeverity.CRITICAL -> EmergencyRed
                            ReporterSeverity.SERIOUS -> EmergencyOrange
                            ReporterSeverity.MINOR -> EmergencyEmerald
                            ReporterSeverity.UNSURE -> Color.Gray
                        }
                        Button(
                            onClick = { selectedSeverity = sev },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) color else BgTertiary,
                                contentColor = if (isSelected) Color.White else TextSecondary
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(sev.name, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Casualty & Hazard Summary
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Vehicles Involved: $vehicleCount", fontWeight = FontWeight.SemiBold)
                    Row {
                        IconButton(onClick = { if (vehicleCount > 0) vehicleCount-- }) { Text("-", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                        IconButton(onClick = { vehicleCount++ }) { Text("+", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Injured Casualties: $injuredCount", fontWeight = FontWeight.SemiBold)
                    Row {
                        IconButton(onClick = { if (injuredCount > 0) injuredCount-- }) { Text("-", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                        IconButton(onClick = { injuredCount++ }) { Text("+", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Hazard Switches
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.label_fire_suspected), fontSize = 14.sp)
                    Switch(checked = fireSuspected, onCheckedChange = { fireSuspected = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.label_trapped_suspected), fontSize = 14.sp)
                    Switch(checked = trappedSuspected, onCheckedChange = { trappedSuspected = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.label_road_blockage), fontSize = 14.sp)
                    Switch(checked = roadBlockageSuspected, onCheckedChange = { roadBlockageSuspected = it })
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text(stringResource(R.string.label_description)) },
                    placeholder = { Text(stringResource(R.string.hint_description)) },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { currentStep = 2 },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = EmergencyCyan),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text("Proceed to Location Capture", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                }
            }

            // ==========================================
            // STEP 2: LOCATION CAPTURE
            // ==========================================
            if (currentStep == 2) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = BgTertiary),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Accurate location ensures responders reach the correct scene immediately.",
                            fontSize = 13.sp,
                            color = TextSecondary
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                val hasLocationPermission = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.ACCESS_FINE_LOCATION
                                ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                ) == PackageManager.PERMISSION_GRANTED

                                if (hasLocationPermission) {
                                    captureCurrentLocation()
                                } else {
                                    locationPermissionLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION
                                        )
                                    )
                                }
                            },
                            enabled = !isCapturingLocation,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EmergencyCyan),
                            modifier = Modifier.fillMaxWidth().height(50.dp)
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF0F172A))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isCapturingLocation) "Capturing GPS..." else stringResource(R.string.action_use_gps),
                                color = Color(0xFF0F172A),
                                fontWeight = FontWeight.Bold
                            )
                        }

                        if (locationCaptured && latitude != null && longitude != null) {
                            Text(
                                text = if (accuracyMetres != null) {
                                    "Coordinates: ${String.format("%.5f", latitude)}, ${String.format("%.5f", longitude)} (±${accuracyMetres?.toInt()}m)"
                                } else {
                                    "Coordinates: ${String.format("%.5f", latitude)}, ${String.format("%.5f", longitude)} (manual entry)"
                                },
                                fontSize = 12.sp,
                                color = EmergencyEmerald,
                                modifier = Modifier.padding(top = 10.dp)
                            )
                        }
                        if (locationMessage != null) {
                            Text(locationMessage.orEmpty(), fontSize = 12.sp, color = TextSecondary, modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                }

                Text(
                    text = "If GPS is unavailable or inaccurate, enter the scene coordinates and a nearby landmark.",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = manualLatitude,
                        onValueChange = { manualLatitude = it },
                        label = { Text("Latitude") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = manualLongitude,
                        onValueChange = { manualLongitude = it },
                        label = { Text("Longitude") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                OutlinedButton(
                    onClick = {
                        val enteredLatitude = manualLatitude.toDoubleOrNull()
                        val enteredLongitude = manualLongitude.toDoubleOrNull()
                        if (
                            enteredLatitude != null && enteredLongitude != null &&
                            landmarkOrAddress.isNotBlank() &&
                            AccidentLocationManager.isValidCoordinatesValue(enteredLatitude, enteredLongitude)
                        ) {
                            latitude = enteredLatitude
                            longitude = enteredLongitude
                            accuracyMetres = null
                            locationSource = LocationSource.MANUAL
                            locationCaptured = true
                            locationMessage = "Manual coordinates selected. Check the values and landmark carefully."
                        } else {
                            locationCaptured = false
                            locationMessage = "Enter valid coordinates and a nearby landmark before using manual location."
                        }
                    },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                ) {
                    Text("Use entered location")
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = stringResource(R.string.label_landmark),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 6.dp)
                )

                OutlinedTextField(
                    value = landmarkOrAddress,
                    onValueChange = { landmarkOrAddress = it },
                    label = { Text(stringResource(R.string.label_landmark)) },
                    placeholder = { Text(stringResource(R.string.hint_landmark)) },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(28.dp))

                Button(
                    onClick = {
                        if (locationCaptured && latitude != null && longitude != null && landmarkOrAddress.isNotBlank()) {
                            currentStep = 3
                        } else {
                            locationMessage = "Capture GPS or select valid manual coordinates and enter a landmark before continuing."
                        }
                    },
                    enabled = locationCaptured && latitude != null && longitude != null && landmarkOrAddress.isNotBlank(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = EmergencyCyan),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text("Review & Transmit", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                }
            }

            // ==========================================
            // STEP 3: REVIEW & TRANSMIT
            // ==========================================
            if (currentStep == 3) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = BgTertiary),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("INCIDENT SUMMARY", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextMuted)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Category: ${selectedCategory.name.replace("_", " ")}", fontWeight = FontWeight.Bold)
                        Text("Severity: ${selectedSeverity.name}", color = EmergencyRed, fontWeight = FontWeight.Bold)
                        Text("Casualties: $injuredCount injured, $vehicleCount vehicles")
                        Text("Hazards: ${if (fireSuspected) "Fire " else ""}${if (trappedSuspected) "Trapped-Persons " else ""}${if (roadBlockageSuspected) "Road-Blocked" else ""}")
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("LOCATION SUMMARY", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextMuted)
                        Text(landmarkOrAddress, fontWeight = FontWeight.Bold)
                        Text("Coordinates: ${String.format("%.5f", latitude)}, ${String.format("%.5f", longitude)} (${locationSource.name})")
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        isSubmitting = true
                        submissionError = null

                        coroutineScope.launch {
                            val reportLatitude = latitude
                            val reportLongitude = longitude
                            if (!locationCaptured || reportLatitude == null || reportLongitude == null || landmarkOrAddress.isBlank()) {
                                submissionError = "Capture a valid location and landmark before submitting."
                                isSubmitting = false
                                return@launch
                            }
                            val request = CreateIncidentRequest(
                                category = selectedCategory,
                                reporterSeverity = selectedSeverity,
                                description = description.ifBlank { null },
                                vehicleCount = vehicleCount,
                                injuredPersonCount = injuredCount,
                                fireSuspected = fireSuspected,
                                trappedPersonsSuspected = trappedSuspected,
                                roadBlockageSuspected = roadBlockageSuspected,
                                occurredAtDevice = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                                    .apply { timeZone = TimeZone.getTimeZone("UTC") }
                                    .format(Date()),
                                location = IncidentLocationDto(
                                    latitude = reportLatitude,
                                    longitude = reportLongitude,
                                    accuracyMetres = accuracyMetres,
                                    source = locationSource,
                                    landmarkOrAddress = landmarkOrAddress
                                )
                            )

                            try {
                                val response = ApiClient.service.submitIncident(idempotencyKey, request)
                                if (response.isSuccessful && response.body() != null) {
                                    val data = response.body()!!.data
                                    // Save submitted report locally
                                    storage.saveSubmittedReport(
                                        SubmittedReportRecord(
                                            id = data.id,
                                            referenceCode = data.referenceCode,
                                            guestAccessToken = data.guestAccessToken,
                                            category = selectedCategory.name,
                                            receivedAt = data.receivedAt
                                        )
                                    )
                                    onSubmissionSuccess(data.referenceCode, data.status.name, data.receivedAt)
                                    idempotencyKey = UUID.randomUUID().toString()
                                } else {
                                    submissionError = "Server error ${response.code()}: Unable to submit report. Please retry."
                                }
                            } catch (e: Exception) {
                                submissionError = "Network error: Unable to reach server. Please check your data connection."
                            } finally {
                                isSubmitting = false
                            }
                        }
                    },
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = EmergencyRed),
                    modifier = Modifier.fillMaxWidth().height(60.dp)
                ) {
                    Text(
                        text = if (isSubmitting) stringResource(R.string.submitting_in_progress) else stringResource(R.string.action_submit_report),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}
