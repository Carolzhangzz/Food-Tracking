// server/app.js - 清理后的版本
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接
// const sequelize = require("./db");

const { sequelize } = require("./models");

// 导入核心模型
const Player = require("./models/Player");
const PlayerProgress = require("./models/PlayerProgress");
const MealRecord = require("./models/MealRecord");
const GameSession = require("./models/GameSession");
const AllowedId = require("./models/AllowedId"); // 登录验证需要

// 设置模型关联


Player.hasMany(PlayerProgress, {
  foreignKey: "playerId",
  sourceKey: "playerId",
  as: "progresses",
});
PlayerProgress.belongsTo(Player, {
  foreignKey: "playerId",
  targetKey: "playerId",
  as: "player",
});

Player.hasMany(MealRecord, {
  foreignKey: "playerId",
  sourceKey: "playerId",
  as: "mealRecords",
});
MealRecord.belongsTo(Player, {
  foreignKey: "playerId",
  targetKey: "playerId",
  as: "player",
});

Player.hasMany(GameSession, {
  foreignKey: "playerId",
  sourceKey: "playerId",
  as: "sessions",
});
GameSession.belongsTo(Player, {
  foreignKey: "playerId",
  targetKey: "playerId",
  as: "player",
});

// 导入路由（只保留必要的）
const gameRoutes = require("./routes/gameRoutes"); // 核心游戏API
const geminiRoutes = require("./routes/geminiRoutes"); // AI对话
const convaiRoutes = require("./routes/convaiRoutes"); // 使用convAI

// 注册路由
app.use("/api", gameRoutes);
app.use("/api", geminiRoutes);
app.use("/api", convaiRoutes);

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

// 测试数据库连接的端点
app.get("/api/test-db", async (req, res) => {
  try {
    await sequelize.authenticate();
    const playerCount = await Player.count();
    const progressCount = await PlayerProgress.count();
    const mealCount = await MealRecord.count();

    res.json({
      success: true,
      message: "Database connection successful",
      stats: {
        players: playerCount,
        progresses: progressCount,
        meals: mealCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// 数据库同步和服务器启动
async function startServer() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // 同步数据库模型（不强制重建）
    await sequelize.sync({
      alter: false,
      force: false,
    });
    console.log("✅ Database models synchronized successfully.");

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎮 Game API: http://localhost:${PORT}/api/player-status`);
      console.log(`🧪 Test DB: http://localhost:${PORT}/api/test-db`);
      console.log(`🤖 Gemini Chat: http://localhost:${PORT}/api/gemini-chat`);
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

// 处理未捕获的错误
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// 启动服务器
startServer();
