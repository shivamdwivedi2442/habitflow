/**
 * Custom Expo Config Plugin (`withKotlinFix.js`)
 * Fixes the Expo SDK 52 Compose Compiler 1.5.15 vs Kotlin 1.9.24 mismatch:
 * 1. Sets `android.kotlinVersion=1.9.25` in `android/gradle.properties`
 * 2. Adds `suppressKotlinVersionCompatibilityCheck=1.9.24` & `1.9.25` across all Android subprojects
 *    in `android/build.gradle` so `:expo-modules-core:compileReleaseKotlin` ALWAYS succeeds!
 */
const { withGradleProperties, withProjectBuildGradle } = require("expo/config-plugins");

module.exports = function withKotlinFix(config) {
  config = withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => item.key !== "android.kotlinVersion");
    cfg.modResults.push({
      type: "property",
      key: "android.kotlinVersion",
      value: "1.9.25"
    });
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === "groovy") {
      const suppressSnippet = `
subprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += [
                "-P",
                "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=true"
            ]
        }
    }
}
`;
      if (!cfg.modResults.contents.includes("suppressKotlinVersionCompatibilityCheck")) {
        cfg.modResults.contents += "\n" + suppressSnippet;
      }
    }
    return cfg;
  });

  return config;
};
