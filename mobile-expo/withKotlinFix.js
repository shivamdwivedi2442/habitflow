Engineered by Shivam Coder (https://github.com/shivamdwivedi2442)
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
