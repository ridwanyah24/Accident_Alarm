package com.accidentalarm.app

import com.accidentalarm.app.data.api.AccidentApiService
import com.accidentalarm.app.data.model.*
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Integration tests for [AccidentApiService] using [MockWebServer].
 *
 * Validates the Retrofit client correctly serialises requests and
 * deserialises API responses – including the [ApiResponse] wrapper.
 */
class ApiServiceMockServerTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var service: AccidentApiService

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        service = Retrofit.Builder()
            .baseUrl(mockWebServer.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AccidentApiService::class.java)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    // ── Submit Incident ───────────────────────────────────────────────────────

    @Test
    fun `submitIncident sends POST to correct path with idempotency key`() = runBlocking {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(201)
                .addHeader("Content-Type", "application/json")
                .setBody(
                    """
                    {
                      "data": {
                        "id": "incident-001",
                        "referenceCode": "ACC-20261016-001",
                        "status": "SUBMITTED",
                        "receivedAt": "2026-10-16T10:00:00Z",
                        "guestAccessToken": "tok-abc123",
                        "message": "Report received"
                      }
                    }
                    """.trimIndent()
                )
        )

        val location = IncidentLocationDto(latitude = 10.5105, longitude = 7.4165)
        val request = CreateIncidentRequest(
            category         = IncidentCategory.COLLISION,
            reporterSeverity = ReporterSeverity.SERIOUS,
            location         = location
        )

        val idempotencyKey = "test-key-${System.currentTimeMillis()}"
        val response = service.submitIncident(idempotencyKey, request)

        assertTrue(response.isSuccessful)
        assertNotNull(response.body())

        val result = response.body()!!.data
        assertEquals("ACC-20261016-001", result.referenceCode)
        assertEquals(IncidentStatus.SUBMITTED, result.status)
        assertEquals("tok-abc123", result.guestAccessToken)

        // Verify request properties
        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("POST", recordedRequest.method)
        assertEquals("/incidents", recordedRequest.path)
        assertEquals(idempotencyKey, recordedRequest.getHeader("Idempotency-Key"))
    }

    // ── Incident Status ───────────────────────────────────────────────────────

    @Test
    fun `getIncidentStatus sends GET with guest token header`() = runBlocking {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(200)
                .addHeader("Content-Type", "application/json")
                .setBody(
                    """
                    {
                      "data": {
                        "id": "incident-001",
                        "referenceCode": "ACC-20261016-001",
                        "category": "COLLISION",
                        "reporterSeverity": "SERIOUS",
                        "status": "ACKNOWLEDGED",
                        "statusDisplay": "Acknowledged",
                        "receivedAt": "2026-10-16T10:00:00Z",
                        "location": {
                          "source": "GPS",
                          "landmarkOrAddress": null,
                          "approximateLatitude": 10.51,
                          "approximateLongitude": 7.42
                        },
                        "hasMedia": false
                      }
                    }
                    """.trimIndent()
                )
        )

        val guestToken = "tok-abc123"
        val response = service.getIncidentStatus("incident-001", guestToken)

        assertTrue(response.isSuccessful)
        val data = response.body()!!.data
        assertEquals(IncidentStatus.ACKNOWLEDGED, data.status)
        assertEquals("Acknowledged", data.statusDisplay)
        assertFalse(data.hasMedia)

        val recordedRequest = mockWebServer.takeRequest()
        assertEquals("GET", recordedRequest.method)
        assertTrue(recordedRequest.path!!.contains("incident-001"))
        assertEquals(guestToken, recordedRequest.getHeader("X-Guest-Token"))
    }

    // ── Error Handling ────────────────────────────────────────────────────────

    @Test
    fun `submitIncident on 429 returns error response without throwing`() = runBlocking {
        mockWebServer.enqueue(
            MockResponse()
                .setResponseCode(429)
                .addHeader("Content-Type", "application/json")
                .setBody("""{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}}""")
        )

        val location = IncidentLocationDto(latitude = 10.5105, longitude = 7.4165)
        val request = CreateIncidentRequest(
            category         = IncidentCategory.COLLISION,
            reporterSeverity = ReporterSeverity.MINOR,
            location         = location
        )

        val response = service.submitIncident("key-001", request)

        assertFalse(response.isSuccessful)
        assertEquals(429, response.code())
    }
}
