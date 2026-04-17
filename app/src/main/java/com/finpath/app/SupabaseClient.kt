package com.finpath.app

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

/**
 * Singleton Supabase client.
 * URL and anon key are read from BuildConfig (sourced from local.properties, NOT committed to git).
 */
object SupabaseClient {
    val client by lazy {
        createSupabaseClient(
            supabaseUrl    = BuildConfig.SUPABASE_URL,
            supabaseKey    = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth)
            install(Postgrest)
            install(Realtime)
        }
    }
}
