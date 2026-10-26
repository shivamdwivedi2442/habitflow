/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
require("./utils/envLoader");
const { createHttpServer } = require("./app");
const { verifyOwnershipIntegrity } = require("./security/ownership");
const { db } = require("./db/adapter");
const { seedDatabase } = require("./seed");

async function startServer() {
  const meta = verifyOwnershipIntegrity();
  const count = await db.countUsers();
  if (count === 0) {
    console.log("🌱 Empty store detected — seeding 6 months of demo data for Shivam Coder...");
    await seedDatabase(false);
  }

  const port = parseInt(process.env.PORT || "8000", 10);
  const host = process.env.HOST || "0.0.0.0";

  const server = createHttpServer();
  
  server.listen(port, host, () => {
    console.log(`🗄️  Active Database Engine: ${db.getStorageModeLabel()}`);
    console.log(
      `🚀 HabitFlow (Supabase + React Native Web) by ${meta.author} (${meta.github}) listening on http://${host}:${port}`
    );
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

module.exports = { startServer };