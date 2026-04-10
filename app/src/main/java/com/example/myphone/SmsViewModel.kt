package com.example.myphone


import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class SmsUiState(
    val smsList: List<Sms> = emptyList(),
    val syncStatus: String = "", // "", "Syncing...", "Success", "Failed"
    val isSyncing: Boolean = false
)

class SmsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = SmsRepository(application.applicationContext)

    private val _uiState = MutableStateFlow(SmsUiState())
    val uiState: StateFlow<SmsUiState> = _uiState

    fun loadSms() {
        viewModelScope.launch(Dispatchers.IO) {
            val messages = repository.getFilteredSms()
            _uiState.value = _uiState.value.copy(smsList = messages)
        }
    }

    fun syncMessages() {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.value = _uiState.value.copy(syncStatus = "Syncing...", isSyncing = true)
            val result = repository.syncSms(_uiState.value.smsList)
            
            result.onSuccess {
                _uiState.value = _uiState.value.copy(
                    syncStatus = "Success! Received ${it.count} messages.",
                    isSyncing = false
                )
            }.onFailure {
                _uiState.value = _uiState.value.copy(
                    syncStatus = "Failed: ${it.message}",
                    isSyncing = false
                )
            }
        }
    }
}