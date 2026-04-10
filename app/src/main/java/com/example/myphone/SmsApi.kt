package com.example.myphone

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface SmsApi {
    @POST("api/sms")
    suspend fun syncSms(@Body request: SmsSyncRequest): Response<SmsSyncResponse>
}

data class SmsSyncRequest(
    val messages: List<Sms>
)

data class SmsSyncResponse(
    val status: String,
    val count: Int,
    val sample: String? = null
)
