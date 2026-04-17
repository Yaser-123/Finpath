package com.finpath.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.finpath.app.ui.auth.EmailVerifyScreen
import com.finpath.app.ui.auth.SignInScreen
import com.finpath.app.ui.auth.SignUpScreen
import com.finpath.app.ui.auth.SplashScreen
import com.finpath.app.ui.chat.ChatScreen
import com.finpath.app.ui.game.QuizScreen
import com.finpath.app.ui.game.TierScreen
import com.finpath.app.ui.goals.CreateGoalScreen
import com.finpath.app.ui.goals.GoalDetailScreen
import com.finpath.app.ui.goals.GoalsScreen
import com.finpath.app.ui.home.HomeScreen
import com.finpath.app.ui.settings.SettingsScreen
import com.finpath.app.ui.transactions.AddTransactionScreen
import com.finpath.app.ui.transactions.TransactionListScreen
import com.finpath.app.ui.wealth.WealthScreen

@Composable
fun FinPathNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route)         { SplashScreen(navController) }
        composable(Screen.SignIn.route)         { SignInScreen(navController) }
        composable(Screen.SignUp.route)         { SignUpScreen(navController) }
        composable(Screen.EmailVerify.route)    { EmailVerifyScreen(navController) }
        composable(Screen.Home.route)           { HomeScreen(navController) }
        composable(Screen.Transactions.route)   { TransactionListScreen(navController) }
        composable(Screen.AddTransaction.route) { AddTransactionScreen(navController) }
        composable(Screen.Goals.route)          { GoalsScreen(navController) }
        composable(Screen.CreateGoal.route)     { CreateGoalScreen(navController) }
        composable(Screen.GoalDetail.route)     { backStack ->
            GoalDetailScreen(navController, backStack.arguments?.getString("goalId") ?: "")
        }
        composable(Screen.Chat.route)           { ChatScreen(navController) }
        composable(Screen.Wealth.route)         { WealthScreen(navController) }
        composable(Screen.Quiz.route)           { QuizScreen(navController) }
        composable(Screen.Tier.route)           { TierScreen(navController) }
        composable(Screen.Settings.route)       { SettingsScreen(navController) }
    }
}
