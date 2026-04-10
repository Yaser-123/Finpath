package com.example.myphone

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface SmsApi {
    /**
     * Syncs SMS messages to backend and receives full Credit Profile
     */
    @POST("api/sms")
    suspend fun syncSms(@Body request: SmsSyncRequest): Response<CreditProfileResponse>

    /**
     * Fetches historical transactions and the latest score from the backend
     */
    @GET("api/history")
    suspend fun getHistory(): Response<HistoryResponse>
}

data class SmsSyncRequest(
    val messages: List<Sms>
)
