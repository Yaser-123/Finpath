package com.finpath.app.ui.goals

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
import com.finpath.app.data.remote.GoalRequest
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.Surface900
import com.finpath.app.ui.theme.White
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGoalScreen(navController: NavController) {
    var title by remember { mutableStateOf("") }
    var targetAmount by remember { mutableStateOf("") }
    var timeframeMonths by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Goal") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = title, onValueChange = { title = it },
                label = { Text("Goal Title (e.g. Emergency Fund)") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = targetAmount, onValueChange = { targetAmount = it },
                label = { Text("Target Amount (₹)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = timeframeMonths, onValueChange = { timeframeMonths = it },
                label = { Text("Timeframe (Months)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

            Text("We will analyze your cash flow and automatically check if this goal is realistic.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(Modifier.weight(1f))

            Button(
                onClick = {
                    scope.launch {
                        loading = true; error = null
                        try {
                            val session = SupabaseClient.client.auth.currentSessionOrNull()
                            if (session != null) {
                                val req = GoalRequest(
                                    title = title,
                                    targetAmount = targetAmount.toDoubleOrNull() ?: 0.0,
                                    timeframeMonths = timeframeMonths.toIntOrNull() ?: 1
                                )
                                val res = ApiClient.api.createGoal("Bearer ${session.accessToken}", req)
                                navController.navigate(Screen.GoalDetail.withId(res.id)) {
                                    popUpTo(Screen.CreateGoal.route) { inclusive = true }
                                }
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to create goal"
                        } finally { loading = false }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !loading && title.isNotBlank() && targetAmount.isNotBlank() && timeframeMonths.isNotBlank()
            ) {
                if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                else Text("Create Goal", fontWeight = FontWeight.Bold)
            }
        }
    }
}
