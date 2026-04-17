package com.finpath.app.ui.game

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.finpath.app.ui.theme.*

data class Question(
    val text: String,
    val options: List<String>,
    val correctIndex: Int,
    val explanation: String
)

val mockQuestions = listOf(
    Question(
        "What is an Emergency Fund?",
        listOf("3-6 months of expenses", "Money for a new smartphone", "Money borrowed from friends"),
        0,
        "A healthy emergency fund should cover at least 3-6 months of basic living expenses."
    ),
    Question(
        "What is Compound Interest?",
        listOf("Interest on principal only", "Interest on principal + accumulated interest", "A bank penalty fee"),
        1,
        "Compound interest allows you to earn interest on your interest, helping wealth grow exponentially."
    ),
    Question(
        "What is the 50/30/20 budget rule?",
        listOf("50% Savings, 30% Needs, 20% Wants", "50% Needs, 30% Wants, 20% Savings", "50% Fun, 30% Food, 20% Rent"),
        1,
        "50% for Needs, 30% for Wants, and 20% for Savings is a standard balanced budget rule."
    ),
    Question(
        "Which of these is generally a 'Need'?",
        listOf("Newest iPhone", "Monthly Netflix Subscription", "Groceries and Utilities"),
        2,
        "Needs are essential for survival and functionality, like food, shelter, and basic bills."
    ),
    Question(
        "Inflation usually means that:",
        listOf("Your money buys MORE things", "Your money buys FEWER things", "Prices stay exactly the same"),
        1,
        "Inflation reduces the purchasing power of money over time as prices usually rise."
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuizScreen(navController: NavController) {
    var currentIndex by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    var isFinished by remember { mutableStateOf(false) }
    val userAnswers = remember { mutableStateListOf<Int>() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Financial Quiz", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) { 
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") 
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface950, titleContentColor = White)
            )
        },
        containerColor = Surface950
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (!isFinished) {
                QuizContent(
                    question = mockQuestions[currentIndex],
                    currentIndex = currentIndex,
                    totalCount = mockQuestions.size,
                    onAnswerSelected = { index ->
                        userAnswers.add(index)
                        if (index == mockQuestions[currentIndex].correctIndex) {
                            score++
                        }
                        if (currentIndex < mockQuestions.size - 1) {
                            currentIndex++
                        } else {
                            isFinished = true
                        }
                    }
                )
            } else {
                ResultContent(
                    score = score,
                    total = mockQuestions.size,
                    userAnswers = userAnswers,
                    onRestart = {
                        currentIndex = 0
                        score = 0
                        isFinished = false
                        userAnswers.clear()
                    }
                )
            }
        }
    }
}

@Composable
fun QuizContent(
    question: Question,
    currentIndex: Int,
    totalCount: Int,
    onAnswerSelected: (Int) -> Unit
) {
    Column(
        modifier = Modifier.padding(24.dp).fillMaxSize(),
        verticalArrangement = Arrangement.Top
    ) {
        // Progress
        LinearProgressIndicator(
            progress = { (currentIndex + 1).toFloat() / totalCount },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
            color = Indigo500,
            trackColor = Surface800
        )
        Spacer(Modifier.height(12.dp))
        Text(
            "Question ${currentIndex + 1} of $totalCount",
            color = OnSurfaceMut,
            style = MaterialTheme.typography.labelMedium
        )
        
        Spacer(Modifier.height(48.dp))
        
        Text(
            question.text,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.ExtraBold,
            color = White,
            lineHeight = 32.sp
        )
        
        Spacer(Modifier.height(32.dp))
        
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            question.options.forEachIndexed { index, option ->
                Button(
                    onClick = { onAnswerSelected(index) },
                    modifier = Modifier.fillMaxWidth().height(64.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Surface900),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                ) {
                    Text(
                        option,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = White,
                        textAlign = TextAlign.Start,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
fun ResultContent(
    score: Int,
    total: Int,
    userAnswers: List<Int>,
    onRestart: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Text("Quiz Complete!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = White)
            Spacer(Modifier.height(32.dp))
            
            // Result Chart
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(160.dp)) {
                androidx.compose.foundation.Canvas(modifier = Modifier.size(160.dp)) {
                    val strokeWidth = 12.dp.toPx()
                    val correctAngle = 360f * (score.toFloat() / total)
                    val wrongAngle = 360f - correctAngle
                    
                    // Background
                    drawArc(
                        color = Rose500,
                        startAngle = -90f + correctAngle,
                        sweepAngle = wrongAngle,
                        useCenter = false,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                    )
                    
                    // Success
                    drawArc(
                        color = Emerald500,
                        startAngle = -90f,
                        sweepAngle = correctAngle,
                        useCenter = false,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$score / $total", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = White)
                    Text("Score", fontSize = 14.sp, color = OnSurfaceMut)
                }
            }
            
            Spacer(Modifier.height(48.dp))
            
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Your Corrections", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = White)
            }
            Spacer(Modifier.height(16.dp))
        }

        itemsIndexed(mockQuestions) { index, question ->
            val userAnswer = userAnswers[index]
            val isCorrect = userAnswer == question.correctIndex
            
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                colors = CardDefaults.cardColors(containerColor = Surface900)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isCorrect) Icons.Default.CheckCircle else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (isCorrect) Emerald500 else Rose500,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(question.text, fontWeight = FontWeight.Bold, color = White)
                    }
                    if (!isCorrect) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Your answer: ${question.options[userAnswer]}",
                            color = Rose500,
                            style = MaterialTheme.typography.bodySmall
                        )
                        Text(
                            "Correct: ${question.options[question.correctIndex]}",
                            color = Emerald500,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        question.explanation,
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMut
                    )
                }
            }
        }
        
        item {
            Spacer(Modifier.height(32.dp))
            Button(
                onClick = onRestart,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo500)
            ) {
                Text("Retake Quiz", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(48.dp))
        }
    }
}
