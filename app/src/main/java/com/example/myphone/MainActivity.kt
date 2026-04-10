package com.example.myphone

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import com.example.myphone.ui.theme.MyPhoneTheme

class MainActivity : ComponentActivity() {

    private val viewModel: SmsViewModel by viewModels()

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                // Permission granted - UI will handle data state
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        checkPermissionAndLoadSms()
        setContent {
            MyPhoneTheme {
                SmsScreen(viewModel = viewModel)
            }
        }
    }

    private fun checkPermissionAndLoadSms() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_SMS
            ) == PackageManager.PERMISSION_GRANTED -> {
                // Already granted
            }

            else -> {
                permissionLauncher.launch(Manifest.permission.READ_SMS)
            }
        }
    }
}
