package com.finpath.app.ui.wealth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WealthScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Generational Wealth") },
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
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface800)
            ) {
                Box(
                    modifier = Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Indigo700, Surface800))).padding(20.dp)
                ) {
                    Column {
                        Text("Ring-Fenced Amount", style = MaterialTheme.typography.labelLarge, color = OnSurfaceMut)
                        Spacer(Modifier.height(8.dp))
                        Text("₹0", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = White)
                        Spacer(Modifier.height(4.dp))
                        Text("This money is locked for your future.", style = MaterialTheme.typography.bodySmall, color = Emerald300)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Static Savings warning
            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Static Savings", fontWeight = FontWeight.SemiBold, color = White)
                    Text("₹0", style = MaterialTheme.typography.titleLarge, color = Amber500)
                    Spacer(Modifier.height(8.dp))
                    Text("⚠️ Cash savings lose value to inflation (~6% per year in India). Consider moving this to liquid funds.", style = MaterialTheme.typography.bodySmall, color = Rose500)
                }
            }

            // Dynamic Investments
            Card(colors = CardDefaults.cardColors(containerColor = Surface800)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Dynamic Investments", fontWeight = FontWeight.SemiBold, color = White)
                    Text("₹0", style = MaterialTheme.typography.titleLarge, color = Emerald500)
                    Spacer(Modifier.height(8.dp))
                    Text("Growing with the market.", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { /* TODO navigate to AI suggestions */ }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Indigo500)) {
                        Text("Get Investment Suggestions")
                    }
                }
            }
        }
    }
}
