package com.example.myphone

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmsScreen(viewModel: SmsViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Business Credit Profile", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { viewModel.syncBusinessData() },
                icon = { Icon(Icons.Default.Refresh, contentDescription = null) },
                text = { Text("Sync Business Data") },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF8F9FA))
        ) {
            when (val state = uiState) {
                is UiState.Loading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Analyzing Business Activity...", style = MaterialTheme.typography.bodyLarge)
                    }
                }
                is UiState.Success -> {
                    CreditProfileContent(state.profile, state.history, viewModel.getCurrentTimestamp())
                }
                is UiState.Error -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(state.message, textAlign = TextAlign.Center, color = Color.Gray)
                        Button(onClick = { viewModel.syncBusinessData() }, modifier = Modifier.padding(top = 16.dp)) {
                            Text("Retry")
                        }
                    }
                }
                is UiState.Idle -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Welcome to SMS Credit Profile",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Sync your business messages to generate a real-time credit score and unlock micro-loan eligibility.",
                            textAlign = TextAlign.Center,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CreditProfileContent(
    profile: CreditProfileResponse,
    history: List<HistoryItem>,
    lastUpdated: String
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Hero Section
        item {
            CreditScoreCard(profile)
        }

        // 2. Business Metrics Grid
        item {
            BusinessMetricsSection(profile.features)
        }

        // 3. Insights
        if (profile.insights != null) {
            item {
                InsightsSection(profile.insights)
            }
        }

        // 4. Frequent Transactions
        if (profile.topMerchants.isNotEmpty()) {
            item {
                TopMerchantsSection(profile.topMerchants)
            }
        }

        // 5. Recent Activity
        item {
            Text("Recent Activity (Synced)", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
        }

        items(history.take(5)) { item ->
            TransactionItem(item)
        }

        item {
            Text(
                "Last Updated: $lastUpdated",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                color = Color.Gray,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(80.dp)) // Padding for FAB
        }
    }
}

@Composable
fun CreditScoreCard(profile: CreditProfileResponse) {
    val riskColor = when (profile.risk) {
        "LOW" -> Color(0xFF4CAF50)
        "MEDIUM" -> Color(0xFFFFC107)
        else -> Color(0xFFF44336)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A237E))
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Business Credit Score", color = Color.White.copy(alpha = 0.7f))
            Text(
                "${profile.score}",
                fontSize = 64.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Surface(
                color = riskColor,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "${profile.risk} RISK",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    color = if (profile.risk == "MEDIUM") Color.Black else Color.White,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            HorizontalDivider(color = Color.White.copy(alpha = 0.2f))
            
            Spacer(modifier = Modifier.height(16.dp))

            val eligibilityText = if (profile.score > 650) "✅ Eligible for Micro Loan" else "⚠️ Improve activity to qualify"
            Text(eligibilityText, color = Color.White, fontWeight = FontWeight.Bold)
            
            Text(
                profile.summary,
                textAlign = TextAlign.Center,
                color = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.padding(top = 8.dp),
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun BusinessMetricsSection(features: BusinessFeatures?) {
    if (features == null) return

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Business Metrics", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
        
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetricCard("Monthly Inflow", "₹${features.totalCredit}", Modifier.weight(1f), Color(0xFFE8F5E9), Color(0xFF2E7D32))
            MetricCard("Business Outflow", "₹${features.totalDebit}", Modifier.weight(1f), Color(0xFFFFEBEE), Color(0xFFC62828))
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetricCard("Net Cash Flow", "₹${features.netBalance}", Modifier.weight(1f), Color(0xFFE3F2FD), Color(0xFF1565C0))
            MetricCard("Business Activity", "${features.transactionCount} txns", Modifier.weight(1f), Color(0xFFFFF3E0), Color(0xFFEF6C00))
        }
    }
}

@Composable
fun RowScope.MetricCard(label: String, value: String, modifier: Modifier, bgColor: Color, textColor: Color) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, fontSize = 12.sp, color = textColor.copy(alpha = 0.7f))
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = textColor)
        }
    }
}

@Composable
fun InsightsSection(insights: CreditInsights) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Evaluation Insights", fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            InsightRow("Income", insights.incomeStrength)
            InsightRow("Spending", insights.spendingBehavior)
            InsightRow("Activity", insights.activityLevel)
        }
    }
}

@Composable
fun InsightRow(label: String, detail: String) {
    Row(modifier = Modifier.padding(bottom = 8.dp)) {
        Text("• ", fontWeight = FontWeight.Bold)
        Column {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(detail, fontSize = 14.sp, color = Color.DarkGray)
        }
    }
}

@Composable
fun TopMerchantsSection(merchants: List<String>) {
    Column {
        Text("Frequent Transactions", fontWeight = FontWeight.Bold)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                merchants.forEachIndexed { _, name ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Favorite, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFF1A237E))
                        Text(name, modifier = Modifier.padding(start = 8.dp, vertical = 4.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun TransactionItem(item: HistoryItem) {
    val color = if (item.type == "credit") Color(0xFF2E7D32) else Color(0xFFC62828)
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.merchant, fontWeight = FontWeight.Bold, maxLines = 1)
                Text(item.date, fontSize = 12.sp, color = Color.Gray)
            }
            Text(
                "${if (item.type == "credit") "+" else "-"} ₹${item.amount}",
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}