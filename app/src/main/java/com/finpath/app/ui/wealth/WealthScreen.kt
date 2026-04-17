package com.finpath.app.ui.wealth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoGraph
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.WealthAllocationResponse
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WealthScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    var allocation by remember { mutableStateOf<WealthAllocationResponse?>(null) }
    var loading by remember { mutableStateOf(true) }

    fun loadWealth() {
        scope.launch {
            loading = true
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    allocation = ApiClient.api.getWealthSummary("Bearer ${session.accessToken}")
                }
            } catch (_: Exception) {
            } finally {
                loading = false
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface800)
            ) {
                Box(
                    modifier = Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Indigo700, Surface800))).padding(20.dp)
                ) {
                    Column {
                        Text("Ring-Fenced Amount", style = MaterialTheme.typography.labelLarge, color = OnSurfaceMut)
                        Spacer(Modifier.height(8.dp))
                        Text("₹${"%.2f".format(allocation?.ringFencedAmount ?: 0.0)}", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = White)
                        Spacer(Modifier.height(4.dp))
                        Text("This money is locked for your future.", style = MaterialTheme.typography.bodySmall, color = Emerald300)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Static Savings warning
            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Static Savings", fontWeight = FontWeight.SemiBold, color = White)
                    Text("₹${"%.2f".format(allocation?.staticSaving ?: 0.0)}", style = MaterialTheme.typography.titleLarge, color = Amber500)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        allocation?.notes ?: "Cash savings lose value to inflation. Consider liquid funds or short-term debt funds.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Rose500
                    )
                }
            }

            // Dynamic Investments
            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Dynamic Investments", fontWeight = FontWeight.SemiBold, color = White)
                    Text("₹${"%.2f".format(allocation?.dynamicSaving ?: 0.0)}", style = MaterialTheme.typography.titleLarge, color = Emerald500)
                    Spacer(Modifier.height(8.dp))
                    Text("Growing with the market.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { navController.navigate(Screen.Investments.route) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) {
                        Text("Get Investment Suggestions")
                    }
                }
            }

            if (loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Indigo500, trackColor = Surface700)
            }
        }
    }
}

