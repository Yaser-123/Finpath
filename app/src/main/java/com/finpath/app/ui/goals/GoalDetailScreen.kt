package com.finpath.app.ui.goals

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.data.remote.ApiClient
import com.finpath.app.data.remote.GoalResponse
import com.finpath.app.data.remote.GoalStep
import com.finpath.app.ui.theme.*
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalDetailScreen(navController: NavController, goalId: String) {
    var goal by remember { mutableStateOf<GoalResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(goalId) {
        scope.launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    val goals = ApiClient.api.getGoals("Bearer ${session.accessToken}")
                    goal = goals.find { it.id == goalId }
                }
            } catch (e: Exception) {
                // handle error
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(goal?.title ?: "Goal Detail") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else if (goal != null) {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Feasibility Banner
                item {
                    val isFeasible = goal?.isFeasible == true
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = if (isFeasible) Emerald500.copy(alpha = 0.1f) else Rose500.copy(alpha = 0.1f))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(
                                if (isFeasible) "Goal is Feasible 👍" else "Adjustment Required ⚠️",
                                fontWeight = FontWeight.Bold,
                                color = if (isFeasible) Emerald500 else Rose500
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(goal?.feasibilityNote ?: "", style = MaterialTheme.typography.bodyMedium, color = OnSurface)
                        }
                    }
                }

                // Progress Card
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                        Column(Modifier.padding(16.dp).fillMaxWidth()) {
                            Text("Progress", style = MaterialTheme.typography.labelLarge, color = OnSurfaceMut)
                            Spacer(Modifier.height(8.dp))
                            Text("₹${goal?.currentAmount?.toInt() ?: 0} / ₹${goal?.targetAmount?.toInt() ?: 0}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = White)
                            Spacer(Modifier.height(12.dp))
                            val progress = if ((goal?.targetAmount ?: 0.0) > 0) ((goal?.currentAmount ?: 0.0) / (goal?.targetAmount ?: 1.0)).toFloat() else 0f
                            LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                                color = Indigo500,
                                trackColor = Surface600
                            )
                        }
                    }
                }

                // Steps
                item {
                    Text("Action Plan", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = White, modifier = Modifier.padding(vertical = 8.dp))
                }

                val steps = goal?.steps ?: emptyList()
                if (steps.isEmpty()) {
                    item { Text("No specific steps generated.", color = OnSurfaceMut) }
                } else {
                    items(steps) { step ->
                        StepItem(step)
                    }
                }
                
                item { Spacer(Modifier.height(40.dp)) }
            }
        } else {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Goal not found.", color = OnSurfaceMut) }
        }
    }
}

@Composable
fun StepItem(step: GoalStep) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Surface800)
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(Indigo500))
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(step.title, fontWeight = FontWeight.SemiBold, color = White)
                Spacer(Modifier.height(4.dp))
                Text(step.action, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
            }
            if (step.monthlyAmount != null && step.monthlyAmount > 0) {
                Text("₹${step.monthlyAmount.toInt()}/mo", fontWeight = FontWeight.Bold, color = Emerald500)
            }
        }
    }
}
