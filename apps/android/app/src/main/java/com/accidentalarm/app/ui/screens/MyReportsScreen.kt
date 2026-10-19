package com.accidentalarm.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.accidentalarm.app.R
import com.accidentalarm.app.data.api.ApiClient
import com.accidentalarm.app.data.local.LocalReportStorage
import com.accidentalarm.app.data.local.SubmittedReportRecord
import com.accidentalarm.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyReportsScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val storage = remember { LocalReportStorage(context) }
    val coroutineScope = rememberCoroutineScope()
    var reports by remember { mutableStateOf(storage.getSubmittedReports()) }
    var statuses by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isRefreshing by remember { mutableStateOf(false) }

    val refreshStatuses = {
        isRefreshing = true
        coroutineScope.launch {
            val statusMap = mutableMapOf<String, String>()
            reports.forEach { report ->
                try {
                    val res = ApiClient.service.getIncidentStatus(report.id, report.guestAccessToken)
                    if (res.isSuccessful && res.body() != null) {
                        statusMap[report.id] = res.body()!!.data.statusDisplay
                    }
                } catch (e: Exception) {
                    // Fallback to initial status
                }
            }
            statuses = statusMap
            isRefreshing = false
        }
    }

    LaunchedEffect(Unit) {
        refreshStatuses()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.action_view_my_reports), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.cd_back))
                    }
                },
                actions = {
                    IconButton(onClick = { refreshStatuses() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh status")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgPrimary)
            )
        },
        containerColor = BgPrimary
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
        ) {
            if (reports.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "You have not submitted any accident reports yet.",
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    items(reports) { report ->
                        val liveStatus = statuses[report.id] ?: "Report Received"

                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = BgTertiary),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = report.referenceCode,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 16.sp,
                                        color = EmergencyCyan
                                    )
                                    Text(
                                        text = report.category.replace("_", " "),
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Current Status:",
                                        fontSize = 13.sp,
                                        color = TextMuted
                                    )
                                    SuggestionChip(
                                        onClick = {},
                                        label = { Text(liveStatus, fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                                        colors = SuggestionChipDefaults.suggestionChipColors(
                                            containerColor = EmergencyEmerald.copy(alpha = 0.15f),
                                            labelColor = EmergencyEmerald
                                        ),
                                        border = null
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Submitted: ${report.receivedAt.take(19).replace("T", " ")} UTC",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
