package com.finpath.app.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.ProfileUpdateRequest
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.OnSurfaceMut
import com.finpath.app.ui.theme.Rose500
import com.finpath.app.ui.theme.Surface800
import com.finpath.app.ui.theme.Surface900
import com.finpath.app.ui.theme.White
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var incomeInput by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    fun loadProfile() {
        scope.launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull() ?: return@launch
                val profile = ApiClient.api.getProfile("Bearer ${session.accessToken}")
                incomeInput = profile.monthlyIncome?.let { "%.0f".format(it) } ?: ""
            } catch (_: Exception) {
            }
        }
    }

    LaunchedEffect(Unit) { loadProfile() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = { navController.popBackStack() }) {
                        androidx.compose.material3.Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Monthly Income", color = White)
                    OutlinedTextField(
                        value = incomeInput,
                        onValueChange = { incomeInput = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        label = { Text("INR") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            scope.launch {
                                try {
                                    loading = true
                                    val session = SupabaseClient.client.auth.currentSessionOrNull() ?: return@launch
                                    val income = incomeInput.toDoubleOrNull() ?: 0.0
                                    ApiClient.api.updateProfile(
                                        "Bearer ${session.accessToken}",
                                        ProfileUpdateRequest(monthlyIncome = income)
                                    )
                                    message = "Monthly income saved"
                                } catch (e: Exception) {
                                    message = e.message ?: "Failed to save income"
                                } finally {
                                    loading = false
                                }
                            }
                        },
                        enabled = !loading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (loading) "Saving..." else "Save Income")
                    }
                }
            }

            message?.let { Text(it, color = OnSurfaceMut) }

            Button(
                onClick = {
                    scope.launch {
                        try {
                            SupabaseClient.client.auth.signOut()
                            navController.navigate(Screen.SignIn.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        } catch (_: Exception) {
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Rose500),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Sign Out")
            }
        }
    }
}
