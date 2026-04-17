package com.finpath.app.data.remote

import com.finpath.app.BuildConfig
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

// ─── Data Transfer Objects ───────────────────────────────────────────────────

data class SmsParseRequest(
    @SerializedName("sms_text") val smsText: String,
    @SerializedName("sender")   val sender: String,
    @SerializedName("timestamp") val timestamp: Long? = null
)

data class ParsedTransaction(
    @SerializedName("transaction_id")  val transactionId: String?,
    @SerializedName("merchant_name")   val merchantName: String?,
    @SerializedName("amount")          val amount: Double?,
    @SerializedName("type")            val type: String?,
    @SerializedName("category")        val category: String?,
    @SerializedName("skipped")         val skipped: Boolean?,
    @SerializedName("reason")          val reason: String?
)

data class ManualTransactionRequest(
    @SerializedName("amount")           val amount: Double,
    @SerializedName("type")             val type: String,
    @SerializedName("merchant_name")    val merchantName: String?,
    @SerializedName("category")         val category: String?,
    @SerializedName("transaction_date") val transactionDate: String?
)

data class GoalRequest(
    @SerializedName("title")             val title: String,
    @SerializedName("target_amount")     val targetAmount: Double,
    @SerializedName("timeframe_months")  val timeframeMonths: Int
)

data class GoalResponse(
    @SerializedName("id")                          val id: String,
    @SerializedName("title")                       val title: String,
    @SerializedName("target_amount")               val targetAmount: Double,
    @SerializedName("current_amount")              val currentAmount: Double,
    @SerializedName("timeframe_months")            val timeframeMonths: Int,
    @SerializedName("type")                        val type: String?,
    @SerializedName("is_feasible")                 val isFeasible: Boolean?,
    @SerializedName("feasibility_note")            val feasibilityNote: String?,
    @SerializedName("suggested_timeframe_months")  val suggestedTimeframeMonths: Int?,
    @SerializedName("steps")                       val steps: List<GoalStep>?,
    @SerializedName("status")                      val status: String?
)

data class GoalStep(
    @SerializedName("title")          val title: String,
    @SerializedName("action")         val action: String,
    @SerializedName("monthly_amount") val monthlyAmount: Double?
)

data class DashboardResponse(
    @SerializedName("net_cash_flow_this_month")   val netCashFlow: Double,
    @SerializedName("total_income_this_month")    val totalIncome: Double,
    @SerializedName("total_expenses_this_month")  val totalExpenses: Double,
    @SerializedName("goals_summary")              val goalsSummary: List<GoalSummary>,
    @SerializedName("wealth_this_month")          val wealth: WealthSummary,
    @SerializedName("spending_by_category")       val spendingByCategory: List<CategorySpend>,
    @SerializedName("spending_trend")             val spendingTrend: List<DailySpend>,
    @SerializedName("tier")                       val tier: String,
    @SerializedName("coins")                      val coins: Int
)

data class DailySpend(
    @SerializedName("date")   val date: String,
    @SerializedName("amount") val amount: Double
)

data class GoalSummary(
    @SerializedName("id")           val id: String,
    @SerializedName("title")        val title: String,
    @SerializedName("progress_pct") val progressPct: Int,
    @SerializedName("is_feasible")  val isFeasible: Boolean?
)

data class WealthSummary(
    @SerializedName("ring_fenced") val emergencyFund: Double,
    @SerializedName("static")      val fdSavings: Double,
    @SerializedName("dynamic")     val dynamicSaving: Double
)

data class CategorySpend(
    @SerializedName("category") val category: String,
    @SerializedName("amount")   val amount: Double
)

data class ChatRequest(
    @SerializedName("message")              val message: String,
    @SerializedName("conversation_history") val conversationHistory: List<ChatMessage>
)

data class ChatMessage(
    @SerializedName("role")    val role: String,
    @SerializedName("content") val content: String
)

data class ChatResponse(
    @SerializedName("reply")         val reply: String,
    @SerializedName("action_taken")  val actionTaken: String?,
    @SerializedName("action_result") val actionResult: Map<String, Any>?
)

data class HealthResponse(
    @SerializedName("status") val status: String?,
    @SerializedName("service") val service: String?,
    @SerializedName("version") val version: String?,
    @SerializedName("timestamp") val timestamp: String?
)

data class SpendingInsight(
    @SerializedName("category") val category: String?,
    @SerializedName("current_spend") val currentSpend: Double?,
    @SerializedName("suggested_cap") val suggestedCap: Double?,
    @SerializedName("saving_tip") val savingTip: String?,
    @SerializedName("priority") val priority: String?
)

data class SpendingAnalysisResponse(
    @SerializedName("insights") val insights: List<SpendingInsight> = emptyList(),
    @SerializedName("summary") val summary: String? = null
)

data class InvestmentSuggestionRequest(
    @SerializedName("monthly_investable_amount") val monthlyInvestableAmount: Double
)

data class InvestmentSuggestion(
    @SerializedName("ticker") val ticker: String?,
    @SerializedName("asset_type") val assetType: String?,
    @SerializedName("signal") val signal: String?,
    @SerializedName("sentiment") val sentiment: String?,
    @SerializedName("summary") val summary: String?,
    @SerializedName("allocation_pct") val allocationPct: Double?,
    @SerializedName("risk") val risk: String?
)

data class MarketHeadline(
    @SerializedName("title") val title: String?,
    @SerializedName("link") val link: String?,
    @SerializedName("snippet") val snippet: String?
)

data class InvestmentSuggestionResponse(
    @SerializedName("suggestions") val suggestions: List<InvestmentSuggestion> = emptyList(),
    @SerializedName("market_note") val marketNote: String? = null,
    @SerializedName("headlines") val headlines: List<MarketHeadline> = emptyList()
)

data class WealthAllocationResponse(
    @SerializedName("month") val month: String? = null,
    @SerializedName("total_income") val totalIncome: Double? = null,
    @SerializedName("emergency_fund") val emergencyFund: Double? = null,
    @SerializedName("fd_savings") val fdSavings: Double? = null,
    @SerializedName("dynamic_saving") val dynamicSaving: Double? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("message") val message: String? = null
)

data class WealthConfigRequest(
    @SerializedName("fd_amount") val fdAmount: Double,
    @SerializedName("total_income") val totalIncome: Double? = null
)

data class ProfileResponse(
    @SerializedName("id") val id: String? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("monthly_income") val monthlyIncome: Double? = null,
    @SerializedName("occupation") val occupation: String? = null,
    @SerializedName("wealth_ring_fence_pct") val wealthRingFencePct: Double? = null,
    @SerializedName("tier") val tier: String? = null,
    @SerializedName("coins") val coins: Int? = null
)

data class ProfileUpdateRequest(
    @SerializedName("monthly_income") val monthlyIncome: Double? = null,
    @SerializedName("occupation") val occupation: String? = null,
    @SerializedName("wealth_ring_fence_pct") val wealthRingFencePct: Double? = null
)

data class TransactionItem(
    @SerializedName("id")               val id: String,
    @SerializedName("type")             val type: String,
    @SerializedName("amount")           val amount: Double,
    @SerializedName("merchant_name")    val merchantName: String?,
    @SerializedName("category")         val category: String?,
    @SerializedName("source")           val source: String?,
    @SerializedName("transaction_date") val transactionDate: String?
)

data class TransactionListResponse(
    @SerializedName("data")       val data: List<TransactionItem>,
    @SerializedName("pagination") val pagination: Map<String, Int>
)

// ─── Retrofit API Interface ──────────────────────────────────────────────────

interface FinPathApi {

    @GET("health")
    suspend fun getHealth(): HealthResponse

    @POST("api/v1/sms/parse")
    suspend fun parseSms(
        @Header("Authorization") auth: String,
        @Body request: SmsParseRequest
    ): ParsedTransaction

    @GET("api/v1/transactions")
    suspend fun getTransactions(
        @Header("Authorization") auth: String,
        @Query("page")       page: Int = 1,
        @Query("limit")      limit: Int = 20,
        @Query("type")       type: String? = null,
        @Query("category")   category: String? = null
    ): TransactionListResponse

    @POST("api/v1/transactions/manual")
    suspend fun addManualTransaction(
        @Header("Authorization") auth: String,
        @Body request: ManualTransactionRequest
    ): TransactionItem

    @GET("api/v1/goals")
    suspend fun getGoals(@Header("Authorization") auth: String): List<GoalResponse>

    @POST("api/v1/goals")
    suspend fun createGoal(
        @Header("Authorization") auth: String,
        @Body request: GoalRequest
    ): GoalResponse

    @GET("api/v1/dashboard")
    suspend fun getDashboard(@Header("Authorization") auth: String): DashboardResponse

    @POST("api/v1/chat")
    suspend fun sendMessage(
        @Header("Authorization") auth: String,
        @Body request: ChatRequest
    ): ChatResponse

    @POST("api/v1/agent/spending-analysis")
    suspend fun getSpendingAnalysis(
        @Header("Authorization") auth: String,
        @Body request: Map<String, String> = emptyMap()
    ): SpendingAnalysisResponse

    @POST("api/v1/agent/investment-suggestions")
    suspend fun getInvestmentSuggestions(
        @Header("Authorization") auth: String,
        @Body request: InvestmentSuggestionRequest
    ): InvestmentSuggestionResponse

    @GET("api/v1/wealth/summary")
    suspend fun getWealthSummary(
        @Header("Authorization") auth: String
    ): WealthAllocationResponse

    @POST("api/v1/wealth/configure")
    suspend fun configureWealth(
        @Header("Authorization") auth: String,
        @Body request: WealthConfigRequest
    ): WealthAllocationResponse

    @GET("api/v1/profile")
    suspend fun getProfile(
        @Header("Authorization") auth: String
    ): ProfileResponse

    @PUT("api/v1/profile")
    suspend fun updateProfile(
        @Header("Authorization") auth: String,
        @Body request: ProfileUpdateRequest
    ): ProfileResponse
}

// ─── Singleton Retrofit Instance ─────────────────────────────────────────────

object ApiClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val ngrokBypassInterceptor = okhttp3.Interceptor { chain ->
        val original = chain.request()
        val host = original.url.host

        val requestBuilder: Request.Builder = original.newBuilder()
        if (host.contains("ngrok", ignoreCase = true)) {
            requestBuilder.header("ngrok-skip-browser-warning", "true")
        }

        chain.proceed(requestBuilder.build())
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(ngrokBypassInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    val api: FinPathApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.BACKEND_URL.trimEnd('/') + "/")
            .addConverterFactory(GsonConverterFactory.create())
            .client(httpClient)
            .build()
            .create(FinPathApi::class.java)
    }
}
