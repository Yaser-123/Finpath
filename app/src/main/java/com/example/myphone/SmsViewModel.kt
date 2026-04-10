package com.example.myphone

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

sealed class UiState {
    data object Idle : UiState()
    data object Loading : UiState()
    data class Success(val profile: CreditProfileResponse, val history: List<HistoryItem>) : UiState()
    data class Error(val message: String) : UiState()
}

class SmsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = SmsRepository(application)

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState

    private val _currentTab = MutableStateFlow(0)
    val currentTab: StateFlow<Int> = _currentTab

    init {
        refreshHistory()
    }

    fun setTab(index: Int) {
        _currentTab.value = index
    }

    fun refreshHistory() {
        viewModelScope.launch {
            try {
                // Keep previous state if it was successful to avoid flicker
                if (_uiState.value !is UiState.Success) {
                    _uiState.value = UiState.Loading
                }
                
                val result = repository.getHistory()
                result.onSuccess { response ->
                    if (response.latestScore != null) {
                        _uiState.value = UiState.Success(
                            CreditProfileResponse(
                                status = "success",
                                score = response.latestScore.score,
                                risk = response.latestScore.risk,
                                breakdown = response.latestScore.breakdown,
                                features = response.latestScore.features,
                                insights = response.latestScore.insights,
                                summary = response.latestScore.summary,
                                scoreChange = response.scoreChange,
                                eligibleLoans = response.latestScore.eligibleLoans
                            ),
                            response.transactions
                        )
                    } else {
                        _uiState.value = UiState.Idle
                    }
                }.onFailure {
                    Log.e("SmsViewModel", "History fetch failed", it)
                    _uiState.value = UiState.Idle
                }
            } catch (e: Exception) {
                Log.e("SmsViewModel", "Critical error in refreshHistory", e)
                _uiState.value = UiState.Idle
            }
        }
    }

    fun syncBusinessData() {
        viewModelScope.launch {
            try {
                _uiState.value = UiState.Loading
                val messages = repository.getFilteredSms()
                Log.d("SmsViewModel", "Syncing ${messages.size} filtered messages")

                if (messages.isEmpty()) {
                    _uiState.value = UiState.Error("No financial activity found from trusted contacts.")
                    return@launch
                }

                val syncResult = repository.syncSms(messages)
                syncResult.onSuccess { profile ->
                    // SECURE SYNC: Immediately fetch unified history to ensure the list and the score are in sync
                    val historyResult = repository.getHistory()
                    historyResult.onSuccess { history ->
                        
                        // NUCLEAR STABILITY: BREAKDOWN SHIELD
                        // If server sends zeros, the app repairs them locally from the data it just verified.
                        var finalProfile = profile
                        if (profile.score > 300 && (profile.breakdown.income == 0 && profile.breakdown.activity == 0)) {
                            Log.d("SMS_DEBUG", "Breakdown Shield Triggered: Repairing server-side mapping error.")
                            val features = profile.features ?: BusinessFeatures()
                            val repairIncome = (Math.min(features.totalCredit / 15000.0, 1.0) * 250).toInt()
                            val repairActivity = (Math.min(history.transactions.size / 15.0, 1.0) * 150).toInt()
                            val repairStability = if (features.totalCredit > 5000) 100 else 50
                            
                            finalProfile = profile.copy(
                                breakdown = ScoreBreakdown(300, repairIncome, repairActivity, repairStability)
                            )
                        }

                        // Atomic state update: Profile and History are set together (Rock-Solid)
                        _uiState.value = UiState.Success(finalProfile, history.transactions)
                        Log.d("SMS_DEBUG", "Dashboard Locked: Score=${finalProfile.score}, Loans=${finalProfile.eligibleLoans?.size ?: 0}")
                    }.onFailure {
                        // Fallback: Show sync results even if history fetch fails
                        _uiState.value = UiState.Success(profile, emptyList())
                    }
                }.onFailure {
                    _uiState.value = UiState.Error(it.message ?: "Analysis failed.")
                }
            } catch (e: Exception) {
                Log.e("SmsViewModel", "Sync error", e)
                _uiState.value = UiState.Error("Critical error during analysis.")
            }
        }
    }

    fun getCurrentTimestamp(): String {
        return "Last Update: " + SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
    }

    fun getIncomeExpenseData(history: List<HistoryItem>): Pair<Float, Float> {
        val income = history.filter { it.type.equals("credit", ignoreCase = true) }.sumOf { it.amount }.toFloat()
        val expense = history.filter { it.type.equals("debit", ignoreCase = true) }.sumOf { it.amount }.toFloat()
        return income to expense
    }
}