# 🎮 Village Secrets - Food Tracking RPG Game

一款结合了食物日志记录和解谜元素的互动式RPG游戏。玩家通过与7个NPC对话，记录每日三餐，收集线索，最终解开村庄的秘密。

## 📋 目录

- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [前置要求](#前置要求)
- [安装与配置](#安装与配置)
- [本地开发](#本地开发)
- [数据库配置](#数据库配置)
- [部署方式](#部署方式)
- [项目结构](#项目结构)
- [API文档](#api文档)
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
- **Google Gemini AI** - 最终报告生成

---

## ✨ 功能特性

### 🎭 游戏机制
- **7天解谜系统**: 每天解锁一个新NPC
- **食物日志记录**: 早中晚三餐，每餐6个问题
- **线索收集**: 只有晚餐记录会给予线索
- **Vague回复**: 非晚餐记录给予模糊提示
- **性别选择**: 玩家可选择男孩/女孩角色
- **线索日志**: 查看已收集的所有线索

### 🎨 UI/UX
- **移动优先设计**: 支持手机和PC
- **全屏地图**: 横向地图，点击移动
- **动态UI**: 自适应字体和按钮大小
- **多语言支持**: 中文/英文切换
- **音乐控制**: 背景音乐开关

### 💬 对话系统
- **ConvAI开场**: 每个NPC独特的开场白
- **预定义选项**: 6个问题，每个有4-6个选项
- **自由输入**: "其他"选项允许自定义输入
- **对话历史**: 所有对话记录到数据库

---

## 📦 前置要求

### 必需环境
- **Node.js**: v16+ (推荐 v18+)
- **npm**: v8+
- **PostgreSQL**: v13+ (或使用Heroku PostgreSQL)
- **Heroku CLI**: 用于数据库管理（如使用Heroku）

### API密钥（需自行申请）
- `CONVAI_API_KEY` - ConvAI API
- `GROQ_API_KEY` - Groq API  
- `GEMINI_API_KEY` - Google Gemini API

---

## 🚀 安装与配置

### 1. 克隆项目
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
```

### 2. 安装前端依赖
```bash
npm install
```

### 3. 安装后端依赖
```bash
cd server
npm install
cd ..
```

### 4. 配置环境变量

在 `server/.env` 文件中配置（已存在，需根据实际情况修改）：

```env
# 数据库配置
DATABASE_URL=your_postgresql_connection_string

# API密钥
CONVAI_API_KEY=your_convai_api_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

# 服务器端口
PORT=3001
```

在 `Food-Tracking/.env` 文件中配置（前端）：

```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## 💻 本地开发

### 方法1：使用快捷命令（推荐）

如果已配置zsh快捷命令：

```bash
# 终端1 - 启动后端
rpgserver

# 终端2 - 启动前端
rpgfront
```

### 方法2：传统方式

#### 启动后端服务器
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking/server
npm start
```

后端将运行在 `http://localhost:3001`

#### 启动前端开发服务器
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
npm start
```

前端将运行在 `http://localhost:3000`，浏览器会自动打开。

### 开发调试

- **清除浏览器缓存**: `Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows)
- **查看控制台日志**: 按 `F12` 打开开发者工具 → Console
- **手机模式测试**: 开发者工具 → Toggle device toolbar → 选择设备

---

## 🗄️ 数据库配置

### 使用Heroku PostgreSQL（当前配置）

#### 查看数据库连接
```bash
heroku config:get DATABASE_URL -a foodtracking-t1
```

#### 连接数据库
```bash
heroku pg:psql -a foodtracking-t1
```

#### 查看表结构
```sql
\dt
```

#### 查看表数据
```sql
SELECT * FROM "Players";
SELECT * FROM "MealRecords";
SELECT * FROM "Clues";
```

#### 清空所有数据表
```sql
TRUNCATE TABLE 
  "Clues",
  "ConversationHistories",
  "GameSessions",
  "MealRecords",
  "PlayerProgresses",
  "Players",
  "allowed_ids"
RESTART IDENTITY CASCADE;
```

#### 创建测试玩家ID
```sql
INSERT INTO "allowed_ids" ("playerId", "createdAt", "updatedAt") 
VALUES 
  ('001', NOW(), NOW()),
  ('002', NOW(), NOW()),
  ('003', NOW(), NOW());
```

### 使用本地PostgreSQL

#### 1. 安装PostgreSQL
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### 2. 创建数据库
```bash
createdb food_tracking_db
```

#### 3. 修改 `.env`
```env
DATABASE_URL=postgresql://localhost:5432/food_tracking_db
```

#### 4. 运行迁移（如果有）
```bash
cd server
npx sequelize-cli db:migrate
```

---

## 🌐 部署方式

### 前端部署（构建生产版本）

#### 1. 构建前端
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
npm run build
```

这将在 `build/` 目录生成优化后的静态文件。

#### 2. 测试生产版本（本地）
```bash
# 安装serve（如未安装）
npm install -g serve

# 运行生产版本
serve -s build -p 3000
```

#### 3. 部署到静态托管服务

**选项A: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**选项B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

**选项C: GitHub Pages**
1. 修改 `package.json`：
```json
{
  "homepage": "https://yourusername.github.io/food-tracking"
}
```

2. 部署：
```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d build
```

### 后端部署

#### 使用Heroku

1. **登录Heroku**
```bash
heroku login
```

2. **创建应用**
```bash
cd server
heroku create foodtracking-backend
```

3. **配置环境变量**
```bash
heroku config:set CONVAI_API_KEY=your_key
heroku config:set GROQ_API_KEY=your_key
heroku config:set GEMINI_API_KEY=your_key
```

4. **部署**
```bash
git push heroku main
```

5. **查看日志**
```bash
heroku logs --tail -a foodtracking-backend
```

#### 使用Railway/Render

1. 连接GitHub仓库
2. 设置环境变量
3. 配置启动命令: `npm start`
4. 部署

---

## 📁 项目结构

```
Food-Tracking/
├── public/                      # 静态资源
│   ├── assets/
│   │   ├── map.JPG             # 主地图
│   │   ├── npc/                # NPC图片
│   │   │   ├── boynew.png      # 男孩角色
│   │   │   ├── girlnew.png     # 女孩角色
│   │   │   ├── npc1.png - npc7.png  # NPC角色
│   │   │   └── npc1bg.png - npc7bg.png  # 对话背景
│   │   └── elements/
│   │       └── cluebook.png    # 线索本图标
│   └── index.html
│
├── src/
│   ├── components/             # React组件
│   │   ├── GameScreen.jsx      # 主游戏屏幕
│   │   ├── LoginPage.jsx       # 登录页
│   │   ├── CutScenePlayer.js   # 开场动画
│   │   └── Control.jsx         # 音量/语言控制
│   │
│   ├── pages/
│   │   ├── LoadingPage.jsx     # 加载页
│   │   └── GenderSelectionPage.jsx  # 性别选择
│   │
│   ├── phaser/                 # Phaser游戏逻辑
│   │   ├── MainScene.js        # 主场景（地图）
│   │   ├── NPCManager.js       # NPC管理器
│   │   ├── UIManager.js        # UI管理器（线索本、进度条）
│   │   └── dialog/             # 对话系统模块
│   │       ├── DialogSceneRefactored.js  # 对话主场景
│   │       ├── DialogStateManager.js     # 状态管理
│   │       ├── DialogUIManager.js        # UI管理
│   │       ├── ConvAIHandler.js          # ConvAI处理
│   │       ├── MealRecordingHandler.js   # 餐食记录
│   │       └── ClueManager.js            # 线索管理
│   │
│   ├── context/
│   │   └── PlayerContext.js    # 玩家状态上下文
│   │
│   └── App.js                  # 主应用入口
│
├── server/                     # 后端服务器
│   ├── app.js                  # Express应用
│   ├── routes/
│   │   ├── gameRoutes.js       # 游戏API路由
│   │   ├── convaiRoutes.js     # ConvAI路由
│   │   └── geminiRoutes.js     # Gemini路由
│   │
│   ├── models/                 # Sequelize模型
│   │   ├── Player.js
│   │   ├── MealRecord.js
│   │   ├── Clue.js
│   │   ├── ConversationHistory.js
│   │   └── PlayerProgress.js
│   │
│   └── .env                    # 环境变量
│
├── package.json                # 前端依赖
├── server/package.json         # 后端依赖
├── README.md                   # 本文件
├── RECENT_FIXES.md             # 最近修复记录
└── REFACTORING_SUMMARY.md      # 重构总结
```

---

## 📡 API文档

### 游戏相关API (`/api`)

#### POST `/login`
- **功能**: 玩家登录
- **请求**: `{ playerId: "001", language: "zh" }`
- **响应**: `{ success: true, player: {...}, availableNPCs: [...] }`

#### GET `/player-status/:playerId`
- **功能**: 获取玩家状态
- **响应**: 当前天数、可用NPC、餐食记录等

#### POST `/record-meal`
- **功能**: 记录餐食
- **请求**: `{ playerId, npcId, mealType, mealContent, answers, day }`
- **响应**: `{ success: true, shouldGiveClue: true/false, clueText }`

#### POST `/save-clue`
- **功能**: 保存线索
- **请求**: `{ playerId, npcId, clueText, day }`

#### GET `/clues/:playerId`
- **功能**: 获取所有线索
- **响应**: `{ success: true, clues: [...] }`

#### POST `/save-conversation`
- **功能**: 保存对话历史
- **请求**: `{ playerId, npcId, conversationData }`

### ConvAI API (`/api/convai`)

#### POST `/chat`
- **功能**: 与NPC对话（开场白）
- **请求**: `{ npcId, message, sessionId }`
- **响应**: `{ text: "...", sessionId: "..." }`

---

## 🎮 游戏逻辑说明

### NPC解锁规则
- **Day 1**: 村长（NPC1）自动解锁
- **Day 2-7**: 前一天至少记录1餐后解锁下一个NPC
- **检查时机**: 每次登录时根据`firstLoginDate`和餐食记录计算

### 餐食记录流程
1. **ConvAI开场**: NPC说开场白
2. **选择餐食**: 早餐/午餐/晚餐
3. **回答6个问题**: 每个问题4-6个选项 + "其他"
4. **提交记录**: 发送到后端保存
5. **获得反馈**:
   - **晚餐**: 给予线索（存入线索本）
   - **早中餐**: 给予vague回复

### 线索机制
- **只有晚餐给线索**: 后端`shouldGiveClue`逻辑
- **存储位置**: `Clues`表，关联`playerId + npcId + day`
- **显示**: 点击地图左下角📖图标查看

### Vague回复
- **第1次**: 长回复（关于华师傅和食材）
- **第2次及以后**: 短回复（关于青木籽）

---

## ❓ 常见问题

### Q: 前端无法连接后端？
**A**: 检查：
1. 后端是否运行在 `http://localhost:3001`
2. `.env` 中 `REACT_APP_API_URL` 是否正确
3. CORS配置是否允许 `http://localhost:3000`

### Q: 线索本不显示？
**A**: 
1. 确保已调用 `uiManager.init()` 在 `MainScene.create()`
2. 检查 `cluebook.png` 是否存在于 `public/assets/elements/`
3. 按 `F12` 查看控制台是否有错误

### Q: 对话界面字体太小？
**A**: 已在最新版本修复，字体大小：
- 手机：24-28px
- PC：26-32px

### Q: NPC对话后返回性别选择页？
**A**: 已修复，确保使用最新代码并清除缓存。

### Q: 数据库连接失败？
**A**: 
1. Heroku数据库：`heroku pg:psql -a foodtracking-t1`
2. 本地数据库：检查PostgreSQL是否运行
3. 检查 `DATABASE_URL` 格式

### Q: "其他"选项输入框不显示？
**A**: 已修复，确保使用最新的 `DialogUIManager.js`。

### Q: 如何重置游戏数据？
**A**: 
```sql
-- 连接数据库
heroku pg:psql -a foodtracking-t1

-- 清空所有表
TRUNCATE TABLE "Clues", "MealRecords", "Players" RESTART IDENTITY CASCADE;
```

---

## 🔧 快捷命令（可选）

在 `~/.zshrc` 添加：

```bash
# 快速进入项目目录
alias rpg='cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking'

# 快速启动后端
alias rpgserver='cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking/server && npm start'

# 快速启动前端
alias rpgfront='cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking && npm start'
```

使用：
```bash
source ~/.zshrc
rpg          # 进入项目
rpgserver    # 启动后端
rpgfront     # 启动前端
```

---

## 📝 开发笔记

### 最近更新 (2025-12-24)
- ✅ 增大对话字体（手机24-28px，PC 26-32px）
- ✅ 为每个问题添加"其他"选项 + 自由输入框
- ✅ 修复线索保存逻辑（只有晚餐给线索）
- ✅ 修复vague回复逻辑（非晚餐给vague）
- ✅ 移除旧的`DialogScene.js`，使用重构版本

详见 `RECENT_FIXES.md`

### 已知限制
- 一天内同一餐只能记录一次
- 最多7天（7个NPC）
- 需要稳定的网络连接（API调用）

---

## 👥 团队

- **开发者**: Carol
- **项目路径**: `/Users/carol/Documents/2025summer/rpg_new/Food-Tracking`
- **数据库**: Heroku PostgreSQL (`foodtracking-t1`)

---

## 📄 许可证

本项目仅供学习和研究使用。

---

## 🆘 获取帮助

1. **查看控制台日志**: `F12` → Console
2. **查看后端日志**: `heroku logs --tail -a foodtracking-t1`
3. **检查文档**: `RECENT_FIXES.md`, `REFACTORING_SUMMARY.md`
4. **数据库调试**: `heroku pg:psql -a foodtracking-t1`

---

**🎮 Happy Gaming! 祝游戏愉快！**

