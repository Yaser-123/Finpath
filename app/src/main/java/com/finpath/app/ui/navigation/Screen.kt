package com.finpath.app.ui.navigation

/**
 * All navigation routes for FinPath.
 */
sealed class Screen(val route: String) {
    object Splash          : Screen("splash")
    object SignIn          : Screen("sign_in")
    object SignUp          : Screen("sign_up")
    object EmailVerify     : Screen("email_verify")
    object Home            : Screen("home")
    object Transactions    : Screen("transactions")
    object AddTransaction  : Screen("add_transaction")
    object Goals           : Screen("goals")
    object CreateGoal      : Screen("create_goal")
    object GoalDetail      : Screen("goal_detail/{goalId}") {
        fun withId(id: String) = "goal_detail/$id"
    }
    object Chat            : Screen("chat")
    object Wealth          : Screen("wealth")
    object Investments     : Screen("investments")
    object Quiz            : Screen("quiz")
    object Tier            : Screen("tier")
    object Settings        : Screen("settings")
}
