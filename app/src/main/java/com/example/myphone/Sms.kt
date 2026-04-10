package com.example.myphone


import com.google.gson.annotations.SerializedName

data class Sms(
    @SerializedName("body") val body: String,
    @SerializedName("date") val date: String,
    @SerializedName("sender") val sender: String
)