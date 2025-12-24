# 🎮 Village Secrets - Food Tracking RPG Game

[中文说明](#-village-secrets---食物日志记录rpg游戏-chinese) | [English Version](#-village-secrets---food-tracking-rpg-game-english)

---

## 🎮 Village Secrets - 食物日志记录RPG游戏 (Chinese)

一款结合了食物日志记录和解谜元素的互动式RPG游戏。玩家通过与7个NPC对话，记录每日三餐，收集线索，最终解开村庄的秘密。

### 📋 目录
- [技术栈](#🛠️-技术栈)
- [功能特性](#✨-功能特性)
- [安装与配置](#🚀-安装与配置)
- [本地开发](#💻-本地开发)
- [游戏逻辑](#🎮-游戏逻辑说明)
- [数据库管理](#🗄️-数据库管理)

### 🛠️ 技术栈
- **前端**: React 18, Phaser 3, React Router DOM, Context API
- **后端**: Node.js + Express, Sequelize ORM, PostgreSQL
- **AI**: ConvAI (开场白), Groq (食物记录), Gemini (智能点评)

### ✨ 功能特性
- **7天剧情系统**: 每天解锁一个新NPC，跟随剧情推进。
- **智能食物日志**: 通过对话记录三餐，AI分析并给出角色化点评。
- **线索系统**: 晚餐触发真实线索 (True Clue)，早午餐获得模糊提示 (Vague)。
- **现代化 UI**: 全屏横向地图，毛玻璃对话框，同步进度显示。
- **多语言**: 中英文一键切换。

### 🚀 安装与配置
```bash
# 安装项目依赖
npm install
cd server && npm install && cd ..
```

**环境变量 (.env):**
- 后端 (`server/.env`): `DATABASE_URL`, `CONVAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`
- 前端 (`.env`): `REACT_APP_API_URL=http://localhost:5000/api`

### 💻 本地开发
- **后端服务器**: `cd server && npm start`
- **前端应用**: `npm start`

### 🎮 游戏逻辑说明
- **NPC 解锁**: [游戏天数达到] + [前一个NPC至少记录过1餐]。
- **线索获取**: 只有记录**晚餐**时才会获得存入线索本的“真实线索”。早午餐仅提供“模糊回复”。

### 🗄️ 数据库管理
连接命令: `heroku pg:psql -a foodtracking-t1`
- `Players`: 玩家基础信息
- `MealRecords`: 餐食记录与对话历史
- `Clues`: 已收集的线索
- `allowed_ids`: 登录白名单

---

## 🎮 Village Secrets - Food Tracking RPG Game (English)

An interactive RPG that combines food journaling with mystery-solving. Players interact with 7 NPCs to record daily meals, collect clues, and uncover the village's secrets.

### 📋 Table of Contents
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Installation](#-installation)
- [Local Development](#-local-development)
- [Game Logic](#-game-logic)
- [Database Management](#-database-management)

### 🛠️ Tech Stack
- **Frontend**: React 18, Phaser 3, React Router DOM, Context API
- **Backend**: Node.js + Express, Sequelize ORM, PostgreSQL
- **AI**: ConvAI (Intro), Groq (Meal Recording), Gemini (Smart Feedback)

### ✨ Features
- **7-Day Storyline**: Unlock a new NPC each day as the mystery unfolds.
- **Smart Food Journaling**: Record meals through dialogue; AI provides character-driven feedback.
- **Clue System**: Dinner awards "True Clues" (stored in journal); Breakfast/Lunch give "Vague Hints".
- **Modern UI**: Full-screen horizontal map, frosted glass dialogue box, real-time progress syncing.
- **Multilingual**: One-click toggle between Chinese and English.

### 🚀 Installation
```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
```

**Environment Variables (.env):**
- Backend (`server/.env`): `DATABASE_URL`, `CONVAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`
- Frontend (`.env`): `REACT_APP_API_URL=http://localhost:5000/api`

### 💻 Local Development
- **Backend Server**: `cd server && npm start`
- **Frontend App**: `npm start`

### 🎮 Game Logic
- **NPC Unlocking**: [Required Game Day reached] AND [At least 1 meal recorded with the previous NPC].
- **Clue Acquisition**: Only **Dinner** records provide "True Clues" that are saved to the Clue Journal. Breakfast and Lunch provide "Vague Responses" only.

### 🗄️ Database Management
Connection: `heroku pg:psql -a foodtracking-t1`
- `Players`: Basic player profile and progress.
- `MealRecords`: Meal data and conversation history.
- `Clues`: Collected True/Vague clues.
- `allowed_ids`: Whitelisted IDs for login.

---

**🎮 Happy Gaming!**
