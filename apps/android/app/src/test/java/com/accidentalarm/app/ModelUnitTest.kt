package com.accidentalarm.app

import com.accidentalarm.app.data.model.*
import com.accidentalarm.app.location.AccidentLocationManager
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for [AccidentLocationManager] coordinate validation.
 * These tests run on the JVM without requiring an Android emulator.
 */
class LocationManagerValidationTest {

    private val validations: List<Triple<Double, Double, Boolean>> = listOf(
        // Valid coordinates
        Triple(10.5105, 7.4165, true),
        Triple(0.0, 0.0, true),
        Triple(90.0, 180.0, true),
        Triple(-90.0, -180.0, true),
        Triple(51.5074, -0.1278, true),   // London
        Triple(-33.8688, 151.2093, true), // Sydney

        // Invalid coordinates
        Triple(91.0, 0.0, false),          // lat > 90
        Triple(-91.0, 0.0, false),         // lat < -90
        Triple(0.0, 181.0, false),         // lng > 180
        Triple(0.0, -181.0, false),        // lng < -180
        Triple(Double.NaN, 0.0, false),    // NaN lat
        Triple(0.0, Double.NaN, false)     // NaN lng
    )

    @Test
    fun `coordinate validation returns correct results`() {
        // We cannot instantiate AccidentLocationManager without a Context in
        // a plain unit test, so we test the pure logic inline here.
        validations.forEach { (lat, lng, expected) ->
            val result = AccidentLocationManager.isValidCoordinatesValue(lat, lng)
            assertEquals(
                "Expected $expected for ($lat, $lng)",
                expected,
                result
            )
        }
    }
}

/**
 * Unit tests for [CreateIncidentRequest] model construction.
 */
class CreateIncidentRequestModelTest {

    @Test
    fun `CreateIncidentRequest builds correctly with required fields`() {
        val location = IncidentLocationDto(
            latitude  = 10.5105,
            longitude = 7.4165,
            source    = LocationSource.GPS
        )
        val request = CreateIncidentRequest(
            category         = IncidentCategory.COLLISION,
            reporterSeverity = ReporterSeverity.CRITICAL,
            vehicleCount     = 3,
            injuredPersonCount = 2,
            fireSuspected    = true,
            location         = location
        )

        assertEquals(IncidentCategory.COLLISION, request.category)
        assertEquals(ReporterSeverity.CRITICAL, request.reporterSeverity)
        assertEquals(3, request.vehicleCount)
        assertEquals(2, request.injuredPersonCount)
        assertTrue(request.fireSuspected!!)
        assertEquals(LocationSource.GPS, request.location.source)
    }

    @Test
    fun `IncidentLocationDto defaults to GPS source`() {
        val dto = IncidentLocationDto(latitude = 0.0, longitude = 0.0)
        assertEquals(LocationSource.GPS, dto.source)
        assertNull(dto.accuracyMetres)
        assertNull(dto.landmarkOrAddress)
    }

    @Test
    fun `IncidentCreationResult parses referenceCode`() {
        val result = IncidentCreationResult(
            id            = "abc-123",
            referenceCode = "ACC-20261016-001",
            status        = IncidentStatus.SUBMITTED,
            receivedAt    = "2026-10-16T10:00:00Z",
            message       = "Report received"
        )
        assertEquals("ACC-20261016-001", result.referenceCode)
        assertEquals(IncidentStatus.SUBMITTED, result.status)
        assertNull(result.guestAccessToken)
    }

    @Test
    fun `all IncidentCategory values are distinct`() {
        val values = IncidentCategory.values()
        assertEquals(values.size, values.toSet().size)
    }

    @Test
    fun `all ReporterSeverity values are distinct`() {
        val values = ReporterSeverity.values()
        assertEquals(values.size, values.toSet().size)
    }
}
