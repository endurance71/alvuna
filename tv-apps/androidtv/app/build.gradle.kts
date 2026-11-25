import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The search and "Home Assistant not found" screens are the LG app's own shell (tv-apps/webos/app), copied in at
// build time so both TV apps stay one page. Only the files the page loads.
val shellSrc = rootProject.file("../webos/app")
val shellOut = layout.projectDirectory.dir("src/main/assets/shell")
val copyShell by tasks.registering(Sync::class) {
    from(shellSrc) { include("index.html", "shell.js", "style.css", "largeIcon.png") }
    into(shellOut)
}
tasks.named("preBuild") { dependsOn(copyShell) }

// Release signing: keystore.properties (storeFile, storePassword, keyAlias, keyPassword) next to this file, never in git.
val keystoreProps = rootProject.file("keystore.properties").takeIf { it.exists() }?.let { f ->
    Properties().apply { f.inputStream().use { load(it) } }
}

android {
    namespace = "app.alvuna.tv"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.alvuna.tv"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (keystoreProps != null) create("release") {
            storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
            storePassword = keystoreProps.getProperty("storePassword")
            keyAlias = keystoreProps.getProperty("keyAlias")
            keyPassword = keystoreProps.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystoreProps != null) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin { jvmToolchain(17) }
    buildFeatures { buildConfig = true }
}
