package com.accidentalarm.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary          = EmergencyRed,
    onPrimary        = Color.White,
    primaryContainer = Color(0xFF7F1D1D),
    secondary        = EmergencyCyan,
    onSecondary      = Color(0xFF0D1117),
    background       = BgPrimary,
    onBackground     = TextPrimary,
    surface          = BgSecondary,
    onSurface        = TextPrimary,
    surfaceVariant   = BgTertiary,
    onSurfaceVariant = TextSecondary,
    error            = EmergencyRed,
    onError          = Color.White
)

// The app currently ships dark-only (emergency responder context).
// A light scheme is provided for future expansion / system default support.
private val LightColorScheme = lightColorScheme(
    primary          = EmergencyRed,
    onPrimary        = Color.White,
    background       = Color(0xFFF8FAFC),
    onBackground     = Color(0xFF0F172A),
    surface          = Color.White,
    onSurface        = Color(0xFF0F172A)
)

@Composable
fun AccidentAlarmTheme(
    darkTheme: Boolean = true, // Lock to dark per PRD design spec
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = AppTypography,
        content     = content
    )
}
