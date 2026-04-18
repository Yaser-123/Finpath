package com.finpath.app.ui.wealth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.InvestmentSuggestion
import com.finpath.app.data.remote.InvestmentSuggestionRequest
import com.finpath.app.data.remote.MarketHeadline
import com.finpath.app.data.remote.SpendingInsight
import com.finpath.app.ui.theme.Emerald500
import com.finpath.app.ui.theme.Indigo500
import com.finpath.app.ui.theme.OnSurfaceMut
import com.finpath.app.ui.theme.Rose500
import com.finpath.app.ui.theme.Surface700
import com.finpath.app.ui.theme.Surface800
import com.finpath.app.ui.theme.Surface900
import com.finpath.app.ui.theme.White
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch
import retrofit2.HttpException

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvestmentsScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun openWebsite(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    }

    var investableInput by remember { mutableStateOf("5000") }
    var suggestions by remember { mutableStateOf<List<InvestmentSuggestion>>(emptyList()) }
    var headlines by remember { mutableStateOf<List<MarketHeadline>>(emptyList()) }
    var spendingInsights by remember { mutableStateOf<List<SpendingInsight>>(emptyList()) }
    var marketNote by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun loadIntelligence() {
        val investable = investableInput.toDoubleOrNull() ?: 5000.0
        scope.launch {
            loading = true
            error = null
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session == null) {
                    error = "Please sign in again."
                    return@launch
                }

                val authHeader = "Bearer ${session.accessToken}"
                try {
                    val spending = ApiClient.api.getSpendingAnalysis(authHeader)
                    spendingInsights = spending.insights
                    if (spending.summary != null && spending.insights.isEmpty()) {
                        marketNote = spending.summary
                    }
                } catch (_: Exception) {
                }

                try {
                    val invest = ApiClient.api.getInvestmentSuggestions(
                        authHeader,
                        InvestmentSuggestionRequest(investable)
                    )
                    suggestions = invest.suggestions
                    headlines = invest.headlines
                    marketNote = invest.marketNote ?: marketNote
                } catch (e: HttpException) {
                    error = "Failed to load investment suggestions (${e.code()})"
                }
            } catch (e: Exception) {
                error = e.message ?: "Failed to load investment intelligence"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadIntelligence() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Investment Agent") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { loadIntelligence() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Surface900,
                    titleContentColor = White
                )
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Manual/Suggested Website Links
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { openWebsite("https://predictastock.streamlit.app/") },
                    colors = CardDefaults.cardColors(containerColor = Surface800)
                ) {
                    Column(
                        Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("📈", style = MaterialTheme.typography.headlineSmall)
                        Spacer(Modifier.height(4.dp))
                        Text("Stock Predict", color = White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                    }
                }

                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { openWebsite("https://cryptohive.streamlit.app/") },
                    colors = CardDefaults.cardColors(containerColor = Surface800)
                ) {
                    Column(
                        Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text("🪙", style = MaterialTheme.typography.headlineSmall)
                        Spacer(Modifier.height(4.dp))
                        Text("Crypto Hive", color = White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Monthly Investable Amount", color = White, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(
                        value = investableInput,
                        onValueChange = { investableInput = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        label = { Text("INR") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(onClick = { loadIntelligence() }, modifier = Modifier.fillMaxWidth()) {
                        Text("Refresh Suggestions")
                    }
                }
            }

            marketNote?.let {
                Card(colors = CardDefaults.cardColors(containerColor = Surface700)) {
                    Text(it, color = OnSurfaceMut, modifier = Modifier.padding(14.dp))
                }
            }

            Text("Investment Suggestions", color = White, style = MaterialTheme.typography.titleMedium)
            if (suggestions.isEmpty() && !loading) {
                Text("No suggestions yet.", color = OnSurfaceMut)
            } else {
                suggestions.forEach { s ->
                    Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(s.ticker ?: "-", color = White, fontWeight = FontWeight.Bold)
                                Text(
                                    "${s.allocationPct?.toInt() ?: 0}%",
                                    color = Emerald500,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text("${s.assetType ?: "asset"} | ${s.signal ?: "hold"} | risk ${s.risk ?: "medium"}", color = OnSurfaceMut)
                            Text(s.summary ?: "", color = White)
                        }
                    }
                }
            }

            Text("Spending Agent", color = White, style = MaterialTheme.typography.titleMedium)
            if (spendingInsights.isEmpty() && !loading) {
                Text("Not enough transactions for spending insights yet.", color = OnSurfaceMut)
            } else {
                spendingInsights.forEach { insight ->
                    Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(insight.category?.uppercase() ?: "CATEGORY", color = White, fontWeight = FontWeight.Bold)
                            Text(
                                "Spend: INR ${"%.0f".format(insight.currentSpend ?: 0.0)} | Cap: INR ${"%.0f".format(insight.suggestedCap ?: 0.0)}",
                                color = Rose500
                            )
                            Text(insight.savingTip ?: "", color = OnSurfaceMut)
                        }
                    }
                }
            }

            if (headlines.isNotEmpty()) {
                Text("Market Headlines", color = White, style = MaterialTheme.typography.titleMedium)
                headlines.take(6).forEach { h ->
                    Surface(color = Surface800, shape = MaterialTheme.shapes.medium) {
                        Column(Modifier.padding(12.dp)) {
                            Text(h.title ?: "", color = White, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(4.dp))
                            Text(h.snippet ?: "", color = OnSurfaceMut, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            if (loading) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Indigo500)
                }
            }

            error?.let { Text(it, color = Rose500) }
        }
    }
}
