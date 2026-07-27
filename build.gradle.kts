// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
  id("com.android.application") version "8.7.3" apply false
  id("org.jetbrains.kotlin.android") version "2.0.21" apply false
  id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
  id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21" apply false
  id("org.jetbrains.kotlin.plugin.dagger") version "2.0.21" apply false
  id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
  id("io.github.takahirom.roborazzi") version "1.23.1" apply false
  id("com.google.android.libraries.mapsplatform.secrets-gradle-plugin") version "2.0.1" apply false
}

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath("com.android.tools.build:gradle:8.7.3")
  }
}
