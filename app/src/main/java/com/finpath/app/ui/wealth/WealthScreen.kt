package com.finpath.app.ui.wealth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoGraph
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.WealthAllocationResponse
import com.finpath.app.data.remote.WealthConfigRequest
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*
import com.finpath.app.ui.components.WealthBarChart
import android.widget.Toast
import androidx.compose.ui.platform.LocalContext
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WealthScreen(navController: NavController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var allocation by remember { mutableStateOf<WealthAllocationResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var fdInput by remember { mutableStateOf("") }
    var savingFd by remember { mutableStateOf(false) }

    fun loadWealth() {
        scope.launch {
            loading = true
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    val res = ApiClient.api.getWealthSummary("Bearer ${session.accessToken}")
                    allocation = res
                    fdInput = res.fdSavings?.let { "%.0f".format(it) } ?: ""
                }
            } catch (_: Exception) {
            } finally {
                loading = false
            }
        }
    }

    fun saveFd() {
        scope.launch {
            try {
                savingFd = true
                val session = SupabaseClient.client.auth.currentSessionOrNull() ?: return@launch
                val amount = fdInput.toDoubleOrNull() ?: 0.0
                ApiClient.api.configureWealth(
                    "Bearer ${session.accessToken}",
                    WealthConfigRequest(fdAmount = amount)
                )
                Toast.makeText(context, "Wealth allocation updated!", Toast.LENGTH_SHORT).show()
                loadWealth()
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to update: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                savingFd = false
            }
        }
    }

    LaunchedEffect(Unit) { loadWealth() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Generational Wealth") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    IconButton(onClick = { loadWealth() }) {
                        Icon(Icons.Default.AutoGraph, contentDescription = "Refresh wealth")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface950, titleContentColor = White)
            )
        },
        containerColor = Surface950
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize().verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface900)
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text("Asset Allocation", fontWeight = FontWeight.Bold, color = White)
                    Spacer(Modifier.height(16.dp))
                    WealthBarChart(
                        emergency = allocation?.emergencyFund ?: 0.0,
                        fd = allocation?.fdSavings ?: 0.0,
                        dynamic = allocation?.dynamicSaving ?: 0.0
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface900)
            ) {
                Box(
                    modifier = Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Indigo700, Surface900))).padding(20.dp)
                ) {
                    Column {
                        Text("Emergency Fund (5%)", style = MaterialTheme.typography.labelLarge, color = OnSurfaceMut)
                        Spacer(Modifier.height(8.dp))
                        Text("₹${"%.2f".format(allocation?.emergencyFund ?: 0.0)}", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = White)
                        Spacer(Modifier.height(4.dp))
                        Text("Recommended liquid cache for emergencies.", style = MaterialTheme.typography.bodySmall, color = Emerald300)
                    }
                }
            }

            // FD Savings (Manual)
            Card(colors = CardDefaults.cardColors(containerColor = Surface900)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("FD Savings (Manual)", fontWeight = FontWeight.SemiBold, color = White)
                    
                    OutlinedTextField(
                        value = fdInput,
                        onValueChange = { fdInput = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        label = { Text("FD Amount (₹)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = White,
                            unfocusedTextColor = White,
                            cursorColor = Indigo500
                        )
                    )

                    Button(
                        onClick = { saveFd() },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !savingFd,
                        colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
                    ) {
                        Text(if (savingFd) "Saving..." else "Update FD Savings")
                    }
                }
            }

            // Dynamic Investments
            Card(colors = CardDefaults.cardColors(containerColor = Surface900)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Dynamic Investments", fontWeight = FontWeight.SemiBold, color = White)
                    Text("₹${"%.2f".format(allocation?.dynamicSaving ?: 0.0)}", style = MaterialTheme.typography.titleLarge, color = Emerald500)
                    Spacer(Modifier.height(8.dp))
                    Text("Investing in markets for long-term growth.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { navController.navigate(Screen.Investments.route) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Surface700)) {
                        Text("Get AI Suggestions")
                    }
                }
            }

            if (loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Indigo500, trackColor = Surface700)
            }
        }
    }
}
