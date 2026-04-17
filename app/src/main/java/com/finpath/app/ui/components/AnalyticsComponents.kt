package com.finpath.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.finpath.app.data.remote.DailySpend
import com.finpath.app.data.remote.CategorySpend
import com.finpath.app.ui.theme.*
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberLineCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.common.shader.toDynamicShader
import com.patrykandpatrick.vico.core.cartesian.axis.HorizontalAxis
import com.patrykandpatrick.vico.core.cartesian.axis.VerticalAxis
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.lineSeries
import com.patrykandpatrick.vico.core.common.shader.DynamicShader

@Composable
fun SpendingTrendChart(data: List<DailySpend>, modifier: Modifier = Modifier) {
    val modelProducer = remember { CartesianChartModelProducer() }
    
    val xLabels = data.map { it.date.split("-").last() }
    val yValues = data.map { it.amount }

    LaunchedEffect(data) {
        modelProducer.runTransaction {
            lineSeries {
                series(yValues)
            }
        }
    }

    CartesianChartHost(
        chart = rememberCartesianChart(
            rememberLineCartesianLayer(),
            startAxis = VerticalAxis.rememberStart(),
            bottomAxis = HorizontalAxis.rememberBottom()
        ),
        modelProducer = modelProducer,
        modifier = modifier.height(120.dp)
    )
}

@Composable
fun CategoryDonutChart(data: List<CategorySpend>, modifier: Modifier = Modifier) {
    if (data.isEmpty()) return

    val total = data.sumOf { it.amount }
    val colors = listOf(Indigo500, Emerald500, Amber500, Rose500, Indigo300, Emerald300)

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(100.dp)) {
            Canvas(modifier = Modifier.size(100.dp)) {
                var startAngle = -90f
                data.take(colors.size).forEachIndexed { index, item ->
                    val sweep = (item.amount / total * 360f).toFloat()
                    drawArc(
                        color = colors[index % colors.size],
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        style = Stroke(width = 24f)
                    )
                    startAngle += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Total", style = MaterialTheme.typography.labelSmall, color = OnSurfaceMut)
                Text("₹${if (total > 1000) "%.1fk".format(total/1000) else total.toInt()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = White)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            data.take(3).forEachIndexed { index, item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(colors[index % colors.size]))
                    Spacer(Modifier.width(8.dp))
                    Text(item.category.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, color = White)
                    Spacer(Modifier.weight(1f))
                    Text("₹${item.amount.toInt()}", style = MaterialTheme.typography.bodySmall, color = OnSurfaceMut)
                }
            }
        }
    }
}

@Composable
fun WealthBarChart(emergency: Double, fd: Double, dynamic: Double, modifier: Modifier = Modifier) {
    val total = emergency + fd + dynamic
    if (total == 0.0) return

    val items = listOf(
        "Emergency" to (emergency to Emerald500),
        "FD" to (fd to Indigo500),
        "Dynamic" to (dynamic to Amber500)
    )

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(6.dp)).background(Surface700)
        ) {
            items.forEach { (_, pair) ->
                val (amt, color) = pair
                if (amt > 0) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight((amt / total).toFloat())
                            .background(color)
                    )
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            items.forEach { (label, pair) ->
                val (amt, color) = pair
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(6.dp).clip(RoundedCornerShape(3.dp)).background(color))
                        Spacer(Modifier.width(4.dp))
                        Text(label, fontSize = 10.sp, color = OnSurfaceMut)
                    }
                    Text("₹${if (amt > 1000) "%.1fk".format(amt/1000) else amt.toInt()}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = White)
                }
            }
        }
    }
}
