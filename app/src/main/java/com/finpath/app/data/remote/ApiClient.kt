package com.finpath.app.data.remote

import com.finpath.app.BuildConfig
import com.google.gson.annotations.SerializedName
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

// ─── Data Transfer Objects ───────────────────────────────────────────────────

data class SmsParseRequest(
    @SerializedName("sms_text") val smsText: String,
    @SerializedName("sender")   val sender: String
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
    @SerializedName("tier")                       val tier: String,
    @SerializedName("coins")                      val coins: Int
)

data class GoalSummary(
    @SerializedName("id")           val id: String,
    @SerializedName("title")        val title: String,
    @SerializedName("progress_pct") val progressPct: Int,
    @SerializedName("is_feasible")  val isFeasible: Boolean?
)

data class WealthSummary(
    @SerializedName("ring_fenced") val ringFenced: Double,
    @SerializedName("static")      val static: Double,
    @SerializedName("dynamic")     val dynamic: Double
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
}

// ─── Singleton Retrofit Instance ─────────────────────────────────────────────

object ApiClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
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
