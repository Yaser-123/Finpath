package com.finpath.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Using system default fonts; replace with Outfit/Inter from assets if desired
val FinPathTypography = Typography(
    displayLarge  = TextStyle(fontSize = 57.sp, fontWeight = FontWeight.Bold,   letterSpacing = (-0.25).sp),
    displayMedium = TextStyle(fontSize = 45.sp, fontWeight = FontWeight.Bold),
    displaySmall  = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.SemiBold),
    headlineLarge = TextStyle(fontSize = 32.sp, fontWeight = FontWeight.SemiBold),
    headlineMedium= TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold),
    headlineSmall = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Medium),
    titleLarge    = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold),
    titleMedium   = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Medium,  letterSpacing = 0.15.sp),
    titleSmall    = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium,  letterSpacing = 0.1.sp),
    bodyLarge     = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal,  letterSpacing = 0.5.sp),
    bodyMedium    = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal,  letterSpacing = 0.25.sp),
    bodySmall     = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Normal,  letterSpacing = 0.4.sp),
    labelLarge    = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium,  letterSpacing = 0.1.sp),
    labelMedium   = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium,  letterSpacing = 0.5.sp),
    labelSmall    = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium,  letterSpacing = 0.5.sp),
)
