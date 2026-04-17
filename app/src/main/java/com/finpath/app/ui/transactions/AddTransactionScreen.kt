package com.finpath.app.ui.transactions

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.ManualTransactionRequest
import com.finpath.app.ui.theme.Surface900
import com.finpath.app.ui.theme.White
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionScreen(navController: NavController) {
    var amount by remember { mutableStateOf("") }
    var merchant by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("debit") }
    var category by remember { mutableStateOf("other") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Transaction") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") }
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
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = type == "debit", onClick = { type = "debit" }, label = { Text("Expense") })
                FilterChip(selected = type == "credit", onClick = { type = "credit" }, label = { Text("Income") })
            }

            OutlinedTextField(
                value = amount, onValueChange = { amount = it },
                label = { Text("Amount (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = merchant, onValueChange = { merchant = it },
                label = { Text("Merchant / Title") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = category, onValueChange = { category = it },
                label = { Text("Category (e.g. food, transport, salary)") },
                modifier = Modifier.fillMaxWidth()
            )

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = {
                    scope.launch {
                        loading = true; error = null
                        try {
                            val session = SupabaseClient.client.auth.currentSessionOrNull()
                            if (session != null && amount.toDoubleOrNull() != null) {
                                val req = ManualTransactionRequest(
                                    amount = amount.toDouble(),
                                    type = type,
                                    merchantName = merchant.takeIf { it.isNotBlank() },
                                    category = category.takeIf { it.isNotBlank() },
                                    transactionDate = null
                                )
                                ApiClient.api.addManualTransaction("Bearer ${session.accessToken}", req)
                                navController.popBackStack()
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to add transaction"
                        } finally { loading = false }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !loading && amount.isNotBlank()
            ) {
                if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                else Text("Save Transaction", fontWeight = FontWeight.Bold)
            }
        }
    }
}
