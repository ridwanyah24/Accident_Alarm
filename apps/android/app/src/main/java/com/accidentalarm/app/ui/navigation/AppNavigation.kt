package com.accidentalarm.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.accidentalarm.app.ui.screens.HomeScreen
import com.accidentalarm.app.ui.screens.MyReportsScreen
import com.accidentalarm.app.ui.screens.ReportFlowScreen
import com.accidentalarm.app.ui.screens.SubmissionResultScreen

/**
 * Sealed class representing all navigable destinations in the app.
 *
 * PRD UC-01 through UC-04 map to these routes.
 */
sealed class Screen(val route: String) {
    /** Home / landing screen. */
    object Home : Screen("home")

    /** Multi-step incident report wizard (UC-02). */
    object Report : Screen("report")

    /** Past reports list with live status polling (UC-04). */
    object MyReports : Screen("my_reports")

    /** Submission result / confirmation screen (UC-03). */
    object SubmissionResult : Screen(
        "submission_result/{referenceCode}/{status}/{receivedAt}"
    ) {
        fun buildRoute(referenceCode: String, status: String, receivedAt: String): String =
            "submission_result/${referenceCode.encodeForRoute()}/${status.encodeForRoute()}/${receivedAt.encodeForRoute()}"

        private fun String.encodeForRoute(): String =
            java.net.URLEncoder.encode(this, "UTF-8")
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToReport = { navController.navigate(Screen.Report.route) },
                onNavigateToHistory = { navController.navigate(Screen.MyReports.route) }
            )
        }

        composable(Screen.Report.route) {
            ReportFlowScreen(
                onNavigateBack = { navController.popBackStack() },
                onSubmissionSuccess = { refCode, status, receivedAt ->
                    navController.navigate(
                        Screen.SubmissionResult.buildRoute(refCode, status, receivedAt)
                    ) {
                        // Pop the report wizard off the back stack so Back goes to Home
                        popUpTo(Screen.Home.route)
                    }
                }
            )
        }

        composable(Screen.MyReports.route) {
            MyReportsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.SubmissionResult.route,
            arguments = listOf(
                navArgument("referenceCode") { type = NavType.StringType },
                navArgument("status") { type = NavType.StringType },
                navArgument("receivedAt") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val referenceCode = java.net.URLDecoder.decode(
                backStackEntry.arguments?.getString("referenceCode") ?: "", "UTF-8"
            )
            val status = java.net.URLDecoder.decode(
                backStackEntry.arguments?.getString("status") ?: "", "UTF-8"
            )
            val receivedAt = java.net.URLDecoder.decode(
                backStackEntry.arguments?.getString("receivedAt") ?: "", "UTF-8"
            )
            SubmissionResultScreen(
                referenceCode = referenceCode,
                status = status,
                receivedAt = receivedAt,
                onNavigateHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onNavigateToMyReports = {
                    navController.navigate(Screen.MyReports.route) {
                        popUpTo(Screen.Home.route)
                    }
                }
            )
        }
    }
}
