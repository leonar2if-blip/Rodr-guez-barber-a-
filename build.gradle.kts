// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
  alias(libs.plugins.android.application) apply false
  alias(libs.plugins.kotlin.compose) apply false
  alias(libs.plugins.kotlin.serialization) apply false
  alias(libs.plugins.google.devtools.ksp) apply false
  // ❌ REMOVIDO: alias(libs.plugins.roborazzi) - plugin no disponible en repositorios
  alias(libs.plugins.secrets) apply false
}
