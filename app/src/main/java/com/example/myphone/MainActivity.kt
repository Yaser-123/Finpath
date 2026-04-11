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
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            val smsGranted = permissions[Manifest.permission.READ_SMS] ?: false
            val notificationGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                permissions[Manifest.permission.POST_NOTIFICATIONS] ?: false
            } else true

            if (smsGranted) {
                // Permission granted - UI will handle data state
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        NotificationHelper.createChannel(this)
        checkPermissionsAndLoadSms()

        // Handle navigation from notification intent
        intent.getIntExtra("OPEN_TAB", -1).let { tabIndex ->
            if (tabIndex != -1) viewModel.selectedTab.value = tabIndex
        }

        setContent {
            MyPhoneTheme {
                SmsScreen(viewModel = viewModel)
            }
        }
    }

    private fun checkPermissionsAndLoadSms() {
        val permissions = mutableListOf(Manifest.permission.READ_SMS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }

        if (allGranted) {
            // All good
        } else {
            permissionLauncher.launch(permissions.toTypedArray())
        }
    }
}
