package com.finpath.app.ui.transactions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.TransactionItem
import com.finpath.app.ui.theme.*
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionListScreen(navController: NavController) {
    var transactions by remember { mutableStateOf<List<TransactionItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    val auth = "Bearer ${session.accessToken}"
                    val response = ApiClient.api.getTransactions(auth)
                    transactions = response.data
                }
            } catch (e: Exception) {
                // handle
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Transactions") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (transactions.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No transactions yet.", color = OnSurfaceMut)
            }
        } else {
            LazyColumn(modifier = Modifier.padding(padding).fillMaxSize()) {
                items(transactions) { tx ->
                    TransactionRow(tx)
                    Divider(color = Surface800)
                }
            }
        }
    }
}

@Composable
fun TransactionRow(tx: TransactionItem) {
    val isCredit = tx.type == "credit"
    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(tx.merchantName ?: "Unknown", fontWeight = FontWeight.SemiBold, color = White)
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(color = Surface700, shape = MaterialTheme.shapes.small) {
                    Text(tx.category?.uppercase() ?: "OTHER", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
                }
                Text(
                    text = tx.transactionDate?.let { dateStr ->
                        try {
                            val inFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                            val outFmt = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
                            inFmt.parse(dateStr)?.let { outFmt.format(it) } ?: dateStr.take(10)
                        } catch(e: Exception) { dateStr.take(10) }
                    } ?: "",
                    style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut
                )
            }
        }
        Text(
            text = "${if(isCredit) "+" else "-"}₹${tx.amount}",
            fontWeight = FontWeight.Bold,
            color = if (isCredit) Emerald500 else Rose500
        )
    }
}
