# 🎮 Village Secrets - Food Tracking RPG Game

一款结合了食物日志记录和解谜元素的互动式RPG游戏。玩家通过与7个NPC对话，记录每日三餐，收集线索，最终解开村庄的秘密。

## 📋 目录

- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [安装与配置](#安装与配置)
- [本地开发](#本地开发)
- [部署与运行](#部署与运行)
- [数据库管理](#数据库管理)
- [游戏逻辑说明](#游戏逻辑说明)
- [常见问题](#常见问题)

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI框架
- **Phaser 3** - 游戏引擎
- **React Router DOM** - 路由管理
- **Context API** - 状态管理

### 后端
- **Node.js + Express** - 服务器框架
- **Sequelize ORM** - 数据库操作
- **PostgreSQL** - 数据库

### 第三方API
- **ConvAI API** - NPC开场白对话
- **Groq API** - 食物日志问答
- **Google Gemini AI** - 智能反馈与角色点评

---

## ✨ 功能特性

- **7天剧情系统**: 每天解锁一个新NPC，跟随剧情推进。
- **智能食物日志**: 通过对话记录三餐，AI会自动分析并给出角色化点评。
- **线索系统**: 记录晚餐可获得关键线索，记录早午餐获得模糊提示。
- **现代化 UI**: 
  - 全屏横向地图，移动优先设计。
  - 半透明毛玻璃效果的对话框，支持滚动历史记录。
  - 同步显示当日餐食记录进度。
- **多语言支持**: 中英文一键切换。
- **线索本**: 随时查看已收集的碎片化线索。

---

## 🚀 安装与配置

### 1. 克隆项目并安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 2. 环境变量配置
创建并配置以下 `.env` 文件：

**后端 (`server/.env`):**
```env
PORT=5000
DATABASE_URL=postgres://u3bj18hdqgqut2:ped5dfbc4c9b428a75c7becd00eb96d0dd78ac9bff90ed1eeb703b907f53a2962@c7itisjfjj8ril.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d37ihch0oqld7v
CONVAI_API_KEY=your_convai_key
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
```

**前端 (`.env`):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 💻 本地开发与调试

### 1. 运行项目
建议在两个独立的终端运行：

**开发模式 (推荐):**
- 终端 1 (后端): `cd server && npm start`
- 终端 2 (前端): `npm start` (支持热更新，修改代码后浏览器自动刷新)

**生产模式测试:**
- 如果你运行了 `npm run build`，则必须使用 `serve -s build` 运行。
- **注意**: 在生产模式下，修改代码后必须 **重新运行 `npm run build`**。

### 2. 调试技巧
- **强制刷新**: `Cmd + Shift + R` (Mac) 确保清除旧的缓存。
- **查看日志**: `F12` -> Console 查看前后端通信。
- **数据库查询**: `heroku pg:psql -a foodtracking-t1`

---

## 🗄️ 数据库管理 (PostgreSQL)

| 表名 | 说明 |
| :--- | :--- |
| `Players` | 玩家核心数据（天数、性别等） |
| `MealRecords` | 详细餐食记录及对话历史 |
| `Clues` | 存储获得的线索（True/Vague） |
| `PlayerProgresses` | 每日解锁状态及剩余餐食列表 |
| `allowed_ids` | 登录白名单 |

**常用 SQL 命令:**
- 清空数据: `TRUNCATE TABLE "Clues", "MealRecords", "Players" RESTART IDENTITY CASCADE;`
- 同步字段: `cd server && node scripts/migrateClues.js`

---

## 🎮 游戏逻辑说明

### NPC 解锁规则
- 解锁条件: **[游戏天数匹配] + [前一个NPC至少记录过1餐]**。
- 如果当天没记录任何餐食，第二天仍会停留在该NPC。

### 线索机制
- **晚餐 (Dinner)**: 触发真实线索 (True Clue)，包含黄色高亮关键词。
- **早/午餐 (Breakfast/Lunch)**: 触发模糊回复 (Vague Response)，提供零碎记忆。
- **保存**: 所有线索都会实时存入数据库，并同步到左下角的线索本图标（📖）。

### UI 更新同步
- 每次对话结束，系统会自动同步 `playerData` 到 React 层。
- 顶部的餐食进度圆圈（🍳/🍲/🌙）会实时变为绿色勾选状态。

---

## ❓ 常见问题

- **Q: 记录完餐食图标没变绿？**
  - A: 确保后端返回了最新的 `currentDayMealsRemaining`。请强制刷新页面。
- **Q: 线索本里是空的？**
  - A: 只有在对话中收到“获得线索”提示后，才会写入线索本。请确保已运行最新的数据库迁移。
- **Q: 对话界面打不开？**
  - A: 检查控制台是否有 `TypeError`。确保 `NPCManager` 正确加载了所有资源。

---

**🎮 Happy Gaming! 祝游戏愉快！**
