package com.finpath.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.finpath.app.SupabaseClient
import com.finpath.app.ui.navigation.Screen
import com.finpath.app.ui.theme.Indigo500
import com.finpath.app.ui.theme.Surface900
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen(navController: NavController) {
    var fullName   by remember { mutableStateOf("") }
    var email      by remember { mutableStateOf("") }
    var password   by remember { mutableStateOf("") }
    var occupation by remember { mutableStateOf("salaried") }
    var loading    by remember { mutableStateOf(false) }
    var error      by remember { mutableStateOf<String?>(null) }
    val scope      = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Surface900, Indigo500.copy(alpha = 0.15f))))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Join FinPath", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground)
            Text("Start your financial journey", style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(Modifier.height(8.dp))

            OutlinedTextField(
                value = fullName, onValueChange = { fullName = it },
                label = { Text("Full Name") },
                leadingIcon = { Icon(Icons.Default.Person, null) },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = email, onValueChange = { email = it },
                label = { Text("Email") },
                leadingIcon = { Icon(Icons.Default.Email, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = password, onValueChange = { password = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, null) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth()
            )

            // Occupation selector
            Text("I am a:", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.Start))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf("salaried", "student").forEach { occ ->
                    FilterChip(
                        selected = occupation == occ,
                        onClick  = { occupation = occ },
                        label    = { Text(occ.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            SupabaseClient.client.auth.signUpWith(Email) {
                                this.email    = email.trim()
                                this.password = password
                                data          = buildJsonObject {
                                    put("full_name", fullName)
                                    put("occupation", occupation)
                                }
                            }
                            navController.navigate(Screen.EmailVerify.route) {
                                popUpTo(Screen.SignUp.route) { inclusive = true }
                            }
                        } catch (e: Exception) {
                            error = e.message ?: "Sign-up failed"
                        } finally {
                            loading = false
                        }
                    }
                },
                enabled  = !loading && email.isNotBlank() && password.length >= 6 && fullName.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                else Text("Create Account", fontWeight = FontWeight.SemiBold)
            }

            TextButton(onClick = { navController.navigate(Screen.SignIn.route) }) {
                Text("Already have an account? Sign in")
            }
        }
    }
}
