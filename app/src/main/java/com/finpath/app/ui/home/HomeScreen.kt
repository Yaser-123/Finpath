package com.finpath.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import android.widget.Toast
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.DashboardResponse
import com.finpath.app.data.remote.SmsParseRequest
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import android.provider.Telephony
import android.util.Log
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController) {
    val context = LocalContext.current
    val pullToRefreshState = rememberPullToRefreshState()
    var dashboardData by remember { mutableStateOf<DashboardResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    fun fetchData() {
        scope.launch {
            loading = true
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    val authHeader = "Bearer ${session.accessToken}"
                    dashboardData = ApiClient.api.getDashboard(authHeader)
                }
            } catch (e: Exception) {
                Log.e("FinPath", "Failed to fetch dashboard", e)
            } finally {
                loading = false
            }
        }
    }

    suspend fun syncSmsHistory() {
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Scanning last 500 messages...", Toast.LENGTH_SHORT).show()
        }
        
        var foundCount = 0
        withContext(Dispatchers.IO) {
            val session = SupabaseClient.client.auth.currentSessionOrNull() ?: return@withContext
            val authHeader = "Bearer ${session.accessToken}"
            
            val knownSenders = listOf(
                "HDFC", "HDFCBK", "SBIINB", "SBI", "ICICI", "ICICIB", "AXISBK", "AXIS",
                "KOTAKB", "KOTAK", "PAYTM", "GPAY", "PHONEPE", "YESBNK", "IDBIBK",
                "PNBSMS", "BOBIBD", "CANBNK", "UNIONB", "CENTBK", "INDBNK", "FEDBNK",
                "RBLBNK", "AUBANK", "UJJIVN", "BANDHN", "BOIIND"
            )

            val cursor = context.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                null, null, Telephony.Sms.DATE + " DESC"
            )

            cursor?.use {
                var scannedCount = 0
                val addrIdx = it.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyIdx = it.getColumnIndex(Telephony.Sms.BODY)
                
                // Scan up to 500 total messages deeply
                while (it.moveToNext() && scannedCount < 500) {
                    scannedCount++
                    val sender = it.getString(addrIdx) ?: continue
                    val normalizedSender = sender.uppercase().replace(Regex("[^A-Z0-9]"), "")
                    
                    if (knownSenders.any { s -> normalizedSender.contains(s) }) {
                        val body = it.getString(bodyIdx) ?: continue
                        try {
                            val result = ApiClient.api.parseSms(authHeader, SmsParseRequest(smsText = body, sender = sender))
                            if (result.skipped != true) {
                                foundCount++
                            }
                        } catch (e: Exception) {
                            Log.e("FinPath", "Failed to parse historical SMS from $sender", e)
                        }
                    }
                }
            }
        }
        
        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Sync complete! Found $foundCount bank records.", Toast.LENGTH_LONG).show()
            fetchData()
        }
    }

    LaunchedEffect(Unit) {
        fetchData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("FinPath", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Surface900,
                    titleContentColor = White
                ),
                actions = {
                    IconButton(onClick = { scope.launch { syncSmsHistory() } }) {
                        Icon(Icons.Default.Refresh, "Sync History")
                    }
                    IconButton(onClick = { navController.navigate(Screen.Settings.route) }) {
                        Text(dashboardData?.tier?.take(1)?.uppercase() ?: "B")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Screen.Chat.route) },
                containerColor = Indigo500
            ) {
                Icon(Icons.AutoMirrored.Filled.Chat, "Chat")
            }
        },
        containerColor = Surface900
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = loading,
            onRefresh = { fetchData() },
            state = pullToRefreshState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Net Cash Flow Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Surface800)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text("Net Cash Flow (This Month)", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMut)
                        Spacer(Modifier.height(8.dp))
                        val net = dashboardData?.netCashFlow ?: 0.0
                        Text(
                            "₹${"%.2f".format(net)}",
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (net >= 0) Emerald500 else Rose500
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("INCOME", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
                                Text("₹${"%.2f".format(dashboardData?.totalIncome ?: 0.0)}", fontWeight = FontWeight.SemiBold, color = Emerald500)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("EXPENSES", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
                                Text("₹${"%.2f".format(dashboardData?.totalExpenses ?: 0.0)}", fontWeight = FontWeight.SemiBold, color = Rose500)
                            }
                        }
                    }
                }

                // Quick Actions
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Button(
                        onClick = { navController.navigate(Screen.AddTransaction.route) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Surface700)
                    ) {
                        Icon(Icons.Default.Add, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Add Txn")
                    }
                    Button(
                        onClick = { navController.navigate(Screen.Transactions.route) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Surface700)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.List, null)
                        Spacer(Modifier.width(8.dp))
                        Text("History")
                    }
                }

                // Wealth Ring-Fence
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate(Screen.Wealth.route) },
                    colors = CardDefaults.cardColors(containerColor = Surface800)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Brush.horizontalGradient(listOf(Indigo700, Surface800)))
                            .padding(16.dp)
                    ) {
                        Column {
                            Text("Generational Wealth", fontWeight = FontWeight.Bold, color = White)
                            Spacer(Modifier.height(4.dp))
                            Text("₹${"%.2f".format(dashboardData?.wealth?.ringFenced ?: 0.0)} ring-fenced this month", color = OnSurfaceMut, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                // Goals
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Active Goals", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = White)
                    TextButton(onClick = { navController.navigate(Screen.Goals.route) }) {
                        Text("View All")
                    }
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    val goals = dashboardData?.goalsSummary ?: emptyList()
                    if (goals.isEmpty()) {
                        item {
                            Text("No active goals. Create one!", color = OnSurfaceMut, modifier = Modifier.padding(8.dp))
                        }
                    } else {
                        items(goals) { goal ->
                            Card(
                                modifier = Modifier
                                    .width(160.dp)
                                    .clickable { navController.navigate(Screen.GoalDetail.withId(goal.id)) },
                                colors = CardDefaults.cardColors(containerColor = Surface800)
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(goal.title, fontWeight = FontWeight.SemiBold, maxLines = 1, color = White)
                                    Spacer(Modifier.height(8.dp))
                                    LinearProgressIndicator(
                                        progress = { goal.progressPct / 100f },
                                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                                        color = if (goal.isFeasible == true) Emerald500 else Rose500,
                                        trackColor = Surface600,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text("${goal.progressPct}%", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                                }
                            }
                        }
                    }
                }

                // Game / Tier Section
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate(Screen.Quiz.route) },
                    colors = CardDefaults.cardColors(containerColor = Surface800)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Knowledge Quiz", fontWeight = FontWeight.SemiBold, color = White)
                            Text("Earn coins & upgrade tier", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                        }
                        Text("🪙 ${dashboardData?.coins ?: 0}", fontWeight = FontWeight.Bold, color = Amber500)
                    }
                }
            }
        }
    }
}

