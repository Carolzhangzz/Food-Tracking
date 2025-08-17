// server/app.js - 支持前端页面的版本
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接（你 models/index.js 需导出 { sequelize }）
const { sequelize } = require("./models");

// 导入核心模型
const Player = require("./models/Player");
const PlayerProgress = require("./models/PlayerProgress");
const MealRecord = require("./models/MealRecord");
const GameSession = require("./models/GameSession");
const AllowedId = require("./models/AllowedId");

// 模型关联
Player.hasMany(PlayerProgress, { foreignKey: "playerId", sourceKey: "playerId", as: "progresses" });
PlayerProgress.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

Player.hasMany(MealRecord, { foreignKey: "playerId", sourceKey: "playerId", as: "mealRecords" });
MealRecord.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

Player.hasMany(GameSession, { foreignKey: "playerId", sourceKey: "playerId", as: "sessions" });
GameSession.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

// 路由
const gameRoutes = require("./routes/gameRoutes");
const geminiRoutes = require("./routes/geminiRoutes");
const convaiRoutes = require("./routes/convaiRoutes");

// 静态资源目录（React build）
const buildPath = path.join(__dirname, "..", "build");
app.use(express.static(buildPath));

// API 路由固定挂在 /api（不要用完整 URL 或 REACT_APP_API_URL）
app.use("/api", gameRoutes);
app.use("/api", geminiRoutes);
app.use("/api", convaiRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), database: "connected" });
});

// DB 测试
app.get("/api/test-db", async (req, res) => {
  try {
    await sequelize.authenticate();
    const [playerCount, progressCount, mealCount] = await Promise.all([
      Player.count(),
      PlayerProgress.count(),
      MealRecord.count(),
    ]);
    res.json({
      success: true,
      message: "Database connection successful",
      stats: { players: playerCount, progresses: progressCount, meals: mealCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Database connection failed", error: error.message });
  }
});

// SPA 兜底：所有非 /api 的路由都返回前端 index.html
// 方式 A：正则（严谨）
app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("无法加载 build/index.html：", err);
      res.status(500).send("页面加载失败");
    }
  });
});

// 如果你更喜欢通配符：
// app.get("*", (req, res) => {
//   if (req.path.startsWith("/api")) return res.status(404).json({ message: "API endpoint not found" });
//   res.sendFile(path.join(buildPath, "index.html"));
// });

// 启动
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database models synchronized successfully.");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎮 Game API: http://localhost:${PORT}/api/player-status`);
      console.log(`🖥️ Frontend: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Unable to start server:", error);
    process.exit(1);
  }
}

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("\n🔄 Gracefully shutting down...");
  try {
    await sequelize.close();
    console.log("✅ Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

startServer();
