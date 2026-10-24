plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release credentials are supplied by the build owner, never by tracked files.
val approvedApplicationId = providers.environmentVariable("HOMEZONE_APPLICATION_ID").orNull
val packageApproved = providers.environmentVariable("HOMEZONE_PACKAGE_ID_APPROVED").orNull == "true"
val signingPath = providers.environmentVariable("HOMEZONE_SIGNING_STORE_FILE").orNull
val signingStorePassword = providers.environmentVariable("HOMEZONE_SIGNING_STORE_PASSWORD").orNull
val signingAlias = providers.environmentVariable("HOMEZONE_SIGNING_KEY_ALIAS").orNull
val signingKeyPassword = providers.environmentVariable("HOMEZONE_SIGNING_KEY_PASSWORD").orNull
val signingComplete = listOf(signingPath, signingStorePassword, signingAlias, signingKeyPassword).all { !it.isNullOrBlank() }

android {
    namespace = "com.example.homezone_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = approvedApplicationId ?: "com.example.homezone_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (signingComplete) create("homezoneRelease") {
            storeFile = file(signingPath!!)
            storePassword = signingStorePassword
            keyAlias = signingAlias
            keyPassword = signingKeyPassword
        }
    }
    buildTypes {
        release {
            if (signingComplete) signingConfig = signingConfigs.getByName("homezoneRelease")
        }
    }
}

gradle.taskGraph.whenReady {
    if (allTasks.any { it.project == project && it.name.contains("Release", ignoreCase = true) }) {
        require(packageApproved && approvedApplicationId != null &&
            approvedApplicationId.matches(Regex("[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+")) &&
            !approvedApplicationId.startsWith("com.example.")) {
            "Release blocked: supply an owner-approved HOMEZONE application identity."
        }
        require(signingComplete && file(signingPath!!).isFile) {
            "Release blocked: externally supplied signing credentials are required."
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
