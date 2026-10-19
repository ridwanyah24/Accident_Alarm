import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun normalizeApiBaseUrl(raw: String?, fallback: String = "https://accident-alarm-api.onrender.com/api/v1/"): String {
    if (raw.isNullOrBlank()) return fallback
    var url = raw.trim()
    if (!url.endsWith("/")) url = "$url/"
    if (!url.contains("/api/v1/")) {
        url = "${url.removeSuffix("/")}/api/v1/"
    }
    return url
}

val rawApiBaseUrl = providers.gradleProperty("API_BASE_URL")
    .orElse(providers.environmentVariable("API_BASE_URL"))
    .orNull

val effectiveApiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl)

fun asBuildConfigString(value: String): String = "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

android {
    namespace = "com.accidentalarm.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.accidentalarm.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
        manifestPlaceholders["usesCleartextTraffic"] = "false"
    }

    signingConfigs {
        create("release") {
            val keystoreFile = providers.gradleProperty("KEYSTORE_FILE").orNull
            val keystorePassword = providers.gradleProperty("KEYSTORE_PASSWORD").orNull
            val keyAlias = providers.gradleProperty("KEY_ALIAS").orNull
            val keyPassword = providers.gradleProperty("KEY_PASSWORD").orNull

            if (keystoreFile != null && file(keystoreFile).exists()) {
                storeFile = file(keystoreFile)
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            } else {
                // Fallback to debug keystore for installable signed release builds
                initWith(getByName("debug"))
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            buildConfigField("String", "API_BASE_URL", asBuildConfigString(effectiveApiBaseUrl))
            manifestPlaceholders["usesCleartextTraffic"] = if (effectiveApiBaseUrl.startsWith("https://")) "false" else "true"
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            buildConfigField("String", "API_BASE_URL", asBuildConfigString(effectiveApiBaseUrl))
            manifestPlaceholders["usesCleartextTraffic"] = if (effectiveApiBaseUrl.startsWith("https://")) "false" else "true"
            isMinifyEnabled = false
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.11"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    doFirst {
        val endpoint = runCatching { URI(effectiveApiBaseUrl) }.getOrNull()
        if (endpoint?.scheme != "https" || endpoint.host.isNullOrBlank() || !endpoint.path.endsWith("/api/v1/")) {
            throw GradleException("API_BASE_URL must be a valid HTTPS URL ending with /api/v1/. Current value: $effectiveApiBaseUrl")
        }
    }
}

tasks.register("copyApkToDist") {
    description = "Copies the built APKs to dist/ directory as installable APKs"
    val releaseApk = layout.buildDirectory.file("outputs/apk/release/app-release.apk")
    val debugApk = layout.buildDirectory.file("outputs/apk/debug/app-debug.apk")
    val distDir = rootProject.layout.projectDirectory.dir("dist")

    doLast {
        val rFile = releaseApk.get().asFile
        val dFile = debugApk.get().asFile
        val targetDist = distDir.asFile
        if (!targetDist.exists()) {
            targetDist.mkdirs()
        }

        if (rFile.exists()) {
            val destRelease = File(targetDist, "AccidentAlarm-release.apk")
            rFile.copyTo(destRelease, overwrite = true)
            rFile.copyTo(File(targetDist, "AccidentAlarm.apk"), overwrite = true)
            println("Copied signed release APK to ${destRelease.absolutePath} and AccidentAlarm.apk")
        }
        if (dFile.exists()) {
            val destDebug = File(targetDist, "AccidentAlarm-debug.apk")
            dFile.copyTo(destDebug, overwrite = true)
            if (!rFile.exists()) {
                dFile.copyTo(File(targetDist, "AccidentAlarm.apk"), overwrite = true)
            }
            println("Copied debug APK to ${destDebug.absolutePath}")
        }
    }
}

dependencies {
    // Core Android & Compose
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation(platform("androidx.compose:compose-bom:2024.05.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.2.1")
    implementation("androidx.compose.material:material-icons-extended:1.6.7")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Location & Play Services (One-time location capture)
    implementation("com.google.android.gms:play-services-location:21.2.0")

    // Networking (Retrofit & OkHttp)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.1")

    // Local Storage & Security
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Unit Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.05.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
