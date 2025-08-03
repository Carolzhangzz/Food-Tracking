// server/app.js - 支持前端页面的版本
const express = require("express");
const cors = require("cors");
const path = require("path"); // 新增：用于路径处理模块
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 数据库连接
const { sequelize } = require("./models");

// 导入核心模型
const Player = require("./models/Player");
const PlayerProgress = require("./models/PlayerProgress");
const MealRecord = require("./models/MealRecord");
const GameSession = require("./models/GameSession");
const AllowedId = require("./models/AllowedId");

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

// 导入路由
const gameRoutes = require("./routes/gameRoutes");
const geminiRoutes = require("./routes/geminiRoutes");
const convaiRoutes = require("./routes/convaiRoutes");

// 注册API路由
app.use("/api", gameRoutes);
app.use("/api", geminiRoutes);
app.use("/api", convaiRoutes);

// 新增：前端静态资源路由配置
// 假设前端构建产物在项目根目录的 "client/build" 文件夹
const frontendBuildPath = path.join(__dirname, "../client/build");

// 提供前端静态文件（CSS、JS、图片等）
app.use(express.static(frontendBuildPath));

// 修复后的通配符路由
app.get("/*path", (req, res) => {  // 这里将 "*" 改为 "/*path"，补充参数名 "path"
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  } else {
    res.status(404).json({ message: "API endpoint not found" });
  }
});

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
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    await sequelize.sync({
      alter: false,
      force: false,
    });
    console.log("✅ Database models synchronized successfully.");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎮 Game API: http://localhost:${PORT}/api/player-status`);
      console.log(`🖥️ Frontend: http://localhost:${PORT}`); // 新增：前端访问地址
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
