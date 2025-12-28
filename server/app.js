// server/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

// -------- 中间件 --------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -------- 数据库 & 模型 --------
const { sequelize } = require("./models");

const Player = require("./models/Player");
const PlayerProgress = require("./models/PlayerProgress");
const MealRecord = require("./models/MealRecord");
const GameSession = require("./models/GameSession");
const AllowedId = require("./models/AllowedId");

// 关联关系
Player.hasMany(PlayerProgress, { foreignKey: "playerId", sourceKey: "playerId", as: "progresses" });
PlayerProgress.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

Player.hasMany(MealRecord, { foreignKey: "playerId", sourceKey: "playerId", as: "mealRecords" });
MealRecord.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

Player.hasMany(GameSession, { foreignKey: "playerId", sourceKey: "playerId", as: "sessions" });
GameSession.belongsTo(Player, { foreignKey: "playerId", targetKey: "playerId", as: "player" });

// -------- 路由导入 --------
const gameRoutes   = require("./routes/gameRoutes");
const geminiRoutes = require("./routes/geminiRoutes");
const convaiRoutes = require("./routes/convaiRoutes");
const reportRoute = require("./routes/reportRoute"); // 🔧 独立报告路由

// 🔧 全局请求日志 - 帮助定位 404
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`📡 [Incoming] ${req.method} ${req.url}`);
  }
  next();
});

// -------- API 路由注册 --------
// API 都挂在 /api 前缀
app.post("/api/ping", (req, res) => res.json({ status: "pong", body: req.body }));
app.use("/api", reportRoute); // 🔧 报告路由放在第一位，确保优先级
app.use("/api", gameRoutes);
app.use("/api", geminiRoutes);
app.use("/api", convaiRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    version: "FIX_V3", // 🔧 唯一标识
    timestamp: new Date().toISOString(), 
    database: "connected" 
  });
});

// DB 连接测试
app.get("/api/test-db", async (_req, res) => {
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

// -------- 静态资源 & SPA 兜底 --------
const buildPath = path.join(__dirname, "..", "build");
app.use(express.static(buildPath, {
  maxAge: "1y",
  etag: true,
  lastModified: true,
}));

// SPA 兜底：非 /api 的请求一律返回 index.html
app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      console.error("无法加载 build/index.html：", err);
      res.status(500).send("页面加载失败");
    }
  });
});

// -------- 启动 --------
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database models synchronized successfully.");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health:   http://localhost:${PORT}/health`);
      console.log(`🎮 API:      http://localhost:${PORT}/api/player-status`);
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
