package com.accidentalarm.app.data.api

import com.accidentalarm.app.data.model.*
import com.accidentalarm.app.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface AccidentApiService {

    @GET("config/public")
    suspend fun getPublicConfig(): Response<ApiResponse<PublicEmergencyConfig>>

    @POST("incidents")
    suspend fun submitIncident(
        @Header("Idempotency-Key") idempotencyKey: String,
        @Body request: CreateIncidentRequest
    ): Response<ApiResponse<IncidentCreationResult>>

    @GET("incidents/mine")
    suspend fun getMyReports(): Response<ApiResponse<List<IncidentPublicResponse>>>

    @GET("incidents/{id}/status")
    suspend fun getIncidentStatus(
        @Path("id") id: String,
        @Header("X-Guest-Token") guestToken: String?
    ): Response<ApiResponse<IncidentPublicResponse>>
}

object ApiClient {
    private var baseUrl: String = BuildConfig.API_BASE_URL

    fun setCustomBaseUrl(url: String) {
        baseUrl = if (url.endsWith("/")) url else "$url/"
        retrofitInstance = null
    }

    private var retrofitInstance: Retrofit? = null

    val service: AccidentApiService
        get() {
            if (retrofitInstance == null) {
                val logging = HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
                }

                val okHttpClient = OkHttpClient.Builder()
                    .addInterceptor(logging)
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .writeTimeout(15, TimeUnit.SECONDS)
                    .build()

                require(baseUrl.isNotBlank()) { "API endpoint is not configured for this APK." }
                retrofitInstance = Retrofit.Builder()
                    .baseUrl(if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/")
                    .client(okHttpClient)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()
            }
            return retrofitInstance!!.create(AccidentApiService::class.java)
        }
}
