package com.finpath.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ─── FinPath Brand Palette ──────────────────────────────────────────────────
val Indigo700    = Color(0xFF3730A3)
val Indigo500    = Color(0xFF6366F1)
val Indigo300    = Color(0xFFA5B4FC)
val Emerald500   = Color(0xFF10B981)
val Emerald300   = Color(0xFF6EE7B7)
val Amber500     = Color(0xFFF59E0B)
val Rose500      = Color(0xFFF43F5E)
val Surface900   = Color(0xFF0F0F1A)
val Surface800   = Color(0xFF1A1A2E)
val Surface700   = Color(0xFF16213E)
val Surface600   = Color(0xFF1F2A48)
val OnSurface    = Color(0xFFF1F5F9)
val OnSurfaceMut = Color(0xFF94A3B8)
val White        = Color(0xFFFFFFFF)

private val DarkColors = darkColorScheme(
    primary          = Indigo500,
    onPrimary        = White,
    primaryContainer = Indigo700,
    secondary        = Emerald500,
    onSecondary      = White,
    tertiary         = Amber500,
    background       = Surface900,
    surface          = Surface800,
    surfaceVariant   = Surface600,
    onBackground     = OnSurface,
    onSurface        = OnSurface,
    onSurfaceVariant = OnSurfaceMut,
    error            = Rose500,
)

@Composable
fun FinPathTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography  = FinPathTypography,
        content     = content
    )
}
