/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, "..", "..", "..", ".env"),
    path.join(__dirname, "..", "..", ".env")
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
      break;
    }
  }
}

loadDotEnv();
module.exports = { loadDotEnv };
