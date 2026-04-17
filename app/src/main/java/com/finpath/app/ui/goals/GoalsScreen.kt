package com.finpath.app.ui.goals

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalsScreen(navController: NavController) {
    var goals by remember { mutableStateOf<List<GoalResponse>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val session = SupabaseClient.client.auth.currentSessionOrNull()
                if (session != null) {
                    goals = ApiClient.api.getGoals("Bearer ${session.accessToken}")
                }
            } catch (e: Exception) {
                // Handle error
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Goals") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { navController.navigate(Screen.CreateGoal.route) }, containerColor = Indigo500) {
                Icon(Icons.Default.Add, "Create Goal")
            }
        },
        containerColor = Surface900
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else if (goals.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No goals yet.", color = OnSurfaceMut) }
        } else {
            LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item { Spacer(Modifier.height(8.dp)) }
                items(goals) { goal ->
                    GoalCard(goal) { navController.navigate(Screen.GoalDetail.withId(goal.id)) }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun GoalCard(goal: GoalResponse, onClick: () -> Unit) {
    val progress = if (goal.targetAmount > 0) (goal.currentAmount / goal.targetAmount).toFloat() else 0f
    val pct = (progress * 100).toInt().coerceAtMost(100)

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Surface800)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(goal.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = White)
                Text(if (goal.isFeasible == true) "👍 Feasible" else "⚠️ Review", color = if (goal.isFeasible == true) Emerald500 else Amber500, style = MaterialTheme.typography.labelSmall)
            }
            Spacer(Modifier.height(8.dp))
            Text("₹${goal.currentAmount.toInt()} / ₹${goal.targetAmount.toInt()} (${goal.timeframeMonths} mo)", style = MaterialTheme.typography.bodyMedium, color = OnSurfaceMut)
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = Indigo500,
                trackColor = Surface600
            )
            Spacer(Modifier.height(8.dp))
            Text("$pct% Achieved", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
        }
    }
}

