package com.finpath.app.ui.game

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuizScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Knowledge Quiz") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") } },
                actions = {
                    TextButton(onClick = { navController.navigate(Screen.Tier.route) }) {
                        Text("My Tier", color = Amber500)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Quiz coming soon!", style = MaterialTheme.typography.headlineMedium, color = White)
            Spacer(Modifier.height(16.dp))
            Text("Answer questions to earn coins and upgrade your tier.", color = OnSurfaceMut)
            Spacer(Modifier.height(32.dp))
            Button(onClick = { navController.navigate(Screen.Tier.route) }, colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) {
                Text("View Tiers")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TierScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Tier") },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface900, titleContentColor = White)
            )
        },
        containerColor = Surface900
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Current Tier: BRONZE", style = MaterialTheme.typography.headlineMedium, color = White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("🪙 0 Coins", style = MaterialTheme.typography.titleLarge, color = Amber500)
            Spacer(Modifier.height(32.dp))
            LinearProgressIndicator(progress = { 0f }, modifier = Modifier.fillMaxWidth().height(8.dp), color = Indigo500, trackColor = Surface700)
            Spacer(Modifier.height(8.dp))
            Text("100 coins needed for SILVER", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
        }
    }
}
