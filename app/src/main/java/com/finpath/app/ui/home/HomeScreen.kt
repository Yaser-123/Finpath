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
import android.content.Intent
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.widget.Toast
import android.app.Activity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.navigation.NavController
import com.finpath.app.BuildConfig
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.DashboardResponse
import com.finpath.app.data.remote.SmsParseRequest
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*
import com.finpath.app.ui.components.*
import com.finpath.app.util.SmsHeuristics
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
import retrofit2.HttpException

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
        val hasReadSms = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasReadSms) {
            val activity = context.findActivity()
            if (activity != null) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(android.Manifest.permission.READ_SMS, android.Manifest.permission.RECEIVE_SMS),
                    101
                )
            }

            val permanentlyDenied = activity != null &&
                !ActivityCompat.shouldShowRequestPermissionRationale(activity, android.Manifest.permission.READ_SMS)

            if (permanentlyDenied) {
                val settingsIntent = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:${context.packageName}")
                )
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(settingsIntent)
            }

            withContext(Dispatchers.Main) {
                val msg = if (permanentlyDenied) {
                    "SMS permission is blocked. Enable SMS in App Settings, then sync again."
                } else {
                    "SMS permission required. Please allow and sync again."
                }
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
            }
            return
        }

        withContext(Dispatchers.Main) {
            Toast.makeText(context, "Scanning last 500 messages...", Toast.LENGTH_SHORT).show()
        }

        var foundCount = 0
        var scannedCount = 0
        var apiErrorCount = 0
        var authErrorCount = 0
        withContext(Dispatchers.IO) {
            try {
                ApiClient.api.getHealth()
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        context,
                        "Backend unreachable at ${BuildConfig.BACKEND_URL}. Check ngrok and rebuild app.",
                        Toast.LENGTH_LONG
                    ).show()
                }
                Log.e("FinPath", "Backend health check failed", e)
                return@withContext
            }

            val session = SupabaseClient.client.auth.currentSessionOrNull()
            if (session == null) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Please sign in first, then sync SMS.", Toast.LENGTH_LONG).show()
                }
                return@withContext
            }
            val authHeader = "Bearer ${session.accessToken}"

            try {
                val cursor = context.contentResolver.query(
                    Telephony.Sms.Inbox.CONTENT_URI,
                    arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                    null,
                    null,
                    Telephony.Sms.DATE + " DESC"
                )

                cursor?.use {
                    val addrIdx = it.getColumnIndex(Telephony.Sms.ADDRESS)
                    val bodyIdx = it.getColumnIndex(Telephony.Sms.BODY)
                    val dateIdx = it.getColumnIndex(Telephony.Sms.DATE)

                    if (addrIdx == -1 || bodyIdx == -1 || dateIdx == -1) {
                        Log.e("FinPath", "SMS cursor missing expected columns")
                        return@use
                    }

                    while (it.moveToNext() && scannedCount < 500) {
                        scannedCount++
                        val sender = it.getString(addrIdx) ?: continue
                        val body = it.getString(bodyIdx) ?: continue
                        val timestamp = it.getLong(dateIdx)

                        if (!SmsHeuristics.shouldParse(sender, body)) continue

                        try {
                            val result = ApiClient.api.parseSms(
                                authHeader, 
                                SmsParseRequest(smsText = body, sender = sender, timestamp = timestamp)
                            )
                            if (result.skipped != true) foundCount++
                        } catch (e: HttpException) {
                            apiErrorCount++
                            if (e.code() == 401) authErrorCount++
                            Log.e("FinPath", "HTTP ${e.code()} parsing SMS from $sender", e)
                        } catch (e: Exception) {
                            apiErrorCount++
                            Log.e("FinPath", "Failed to parse historical SMS from $sender", e)
                        }
                    }
                }
            } catch (se: SecurityException) {
                Log.e("FinPath", "SMS permission denied while reading inbox", se)
            } catch (e: Exception) {
                Log.e("FinPath", "Failed to scan SMS inbox", e)
            }
        }

        withContext(Dispatchers.Main) {
            val toast = if (authErrorCount > 0) {
                "Sync stopped by auth errors ($authErrorCount). Check backend Supabase JWT config."
            } else {
                "Sync complete! Scanned $scannedCount, found $foundCount records, errors $apiErrorCount."
            }
            Toast.makeText(context, toast, Toast.LENGTH_LONG).show()
            fetchData()
        }
    }

    LaunchedEffect(Unit) {
        fetchData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("FinPath", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Surface950,
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
        containerColor = Surface950
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = loading,
            onRefresh = { scope.launch { syncSmsHistory() } },
            state = pullToRefreshState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Net Cash Flow + Trend Chart
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Surface900),
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(Indigo500, Indigo500.copy(0.1f))))
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("Monthly Surplus", style = MaterialTheme.typography.labelMedium, color = OnSurfaceMut)
                                val net = dashboardData?.netCashFlow ?: 0.0
                                Text(
                                    "₹${"%.2f".format(net)}",
                                    style = MaterialTheme.typography.headlineLarge,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (net >= 0) Emerald500 else Rose500
                                )
                            }
                            // Mini Mini Stat
                            Column(horizontalAlignment = Alignment.End) {
                                Text("EXPENSES", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
                                Text("₹${"%.0f".format(dashboardData?.totalExpenses ?: 0.0)}", fontWeight = FontWeight.Bold, color = Rose500)
                            }
                        }
                        
                        Spacer(Modifier.height(16.dp))
                        
                        // Trend Chart
                        SpendingTrendChart(data = dashboardData?.spendingTrend ?: emptyList())
                    }
                }

                // Spending Breakdown
                Text("Spending Insights", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = White)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Surface900)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        CategoryDonutChart(data = dashboardData?.spendingByCategory ?: emptyList())
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
                            Text("₹${"%.2f".format(dashboardData?.wealth?.emergencyFund ?: 0.0)} for emergency fund", color = OnSurfaceMut, style = MaterialTheme.typography.bodySmall)
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
                                colors = CardDefaults.cardColors(containerColor = Surface900)
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
                    colors = CardDefaults.cardColors(containerColor = Surface900)
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

private fun Context.findActivity(): Activity? {
    var current: Context? = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return null
}

