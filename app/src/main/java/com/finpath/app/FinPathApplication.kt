package com.finpath.app

import android.app.Application
import com.finpath.app.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

/**
 * Application class — initialises the Supabase client once.
 * URL and anon key are injected from local.properties via BuildConfig.
 */
class FinPathApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Supabase client initialised as a global singleton in SupabaseClient.kt
    }
}
