# 🎮 Village Secrets - Food Tracking RPG Game

[中文说明](#-village-secrets---食物日志记录rpg游戏-chinese) | [English Version](#-village-secrets---food-tracking-rpg-game-english)

---

## 🎮 Village Secrets - 食物日志记录RPG游戏 (Chinese)

一款结合了生活记录与解谜探索的互动式RPG游戏。玩家通过与村庄里的村民交流，记录每日饮食，在看似平常的对话中寻找失踪厨师的蛛丝马迹。

### 📋 目录
- [技术栈](#🛠️-技术栈)
- [功能特性](#✨-功能特性)
- [安装与配置](#🚀-安装与配置)
- [本地开发](#💻-本地开发)
- [游戏说明](#🎮-游戏逻辑说明)
- [数据库管理](#🗄️-数据库管理)

### 🛠️ 技术栈
- **前端**: React 18, Phaser 3, React Router DOM
- **后端**: Node.js + Express, Sequelize, PostgreSQL
- **AI**: ConvAI (NPC互动), Google Gemini (饮食对话与智能点评)

### ✨ 功能特性
- **沉浸式剧情**: 随着在村庄停留的时间增加，更多村民将向你敞开心扉。
- **智能饮食日志**: 与NPC进行自然对话来记录三餐，获得角色化的反馈与点评。
- **记忆碎片**: 在日常交流中收集线索，拼凑出隐藏在村庄背后的故事。
- **现代 UI**: 全屏横向地图，优雅的对话界面，适配移动端与PC。
- **多语言**: 中英文一键切换。

### 🚀 安装与配置
```bash
# 安装项目依赖
npm install
cd server && npm install && cd ..
```

**环境变量 (.env):**
- 后端 (`server/.env`): `DATABASE_URL`, `CONVAI_API_KEY`, `GEMINI_API_KEY`
- 前端 (`.env`): `REACT_APP_API_URL=http://localhost:5000/api`

### 💻 本地开发
- **后端服务器**: `cd server && npm start`
- **前端应用**: `npm start`

### 🎮 游戏逻辑说明
- **村民解锁**: 诚实地记录生活并与村民建立信任，是解锁新区域和新角色的关键。
- **线索获取**: 留意对话中的细节，并非每一次交流都会有直接的发现，耐心是解谜的关键。

### 🗄️ 数据库管理
连接命令: `heroku pg:psql -a foodtracking-t1`
- `Players`: 玩家进度与基础信息
- `MealRecords`: 饮食数据与对话档案
- `Clues`: 收集到的记忆碎片
- `allowed_ids`: 登录白名单

---

## 🎮 Village Secrets - Food Tracking RPG Game (English)

An interactive RPG that merges lifestyle journaling with investigative exploration. Interact with villagers, record your daily meals, and find traces of the missing chef hidden within everyday conversations.

### 📋 Table of Contents
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Installation](#-installation)
- [Local Development](#-local-development)
- [Game Logic](#-game-logic)
- [Database Management](#-database-management)

### 🛠️ Tech Stack
- **Frontend**: React 18, Phaser 3, React Router DOM
- **Backend**: Node.js + Express, Sequelize, PostgreSQL
- **AI**: ConvAI (NPC Interaction), Google Gemini (Meal Dialogue & Smart Feedback)

### ✨ Features
- **Immersive Narrative**: As time passes in the village, more residents will open up to you.
- **Smart Food Journaling**: Log your meals through natural dialogue; receive character-driven insights.
- **Memory Fragments**: Collect clues during daily interactions to piece together the village's secrets.
- **Modern UI**: Full-screen horizontal map with an elegant dialogue interface for mobile and PC.
- **Multilingual**: Seamlessly toggle between Chinese and English.

### 🚀 Installation
```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
```

**Environment Variables (.env):**
- Backend (`server/.env`): `DATABASE_URL`, `CONVAI_API_KEY`, `GEMINI_API_KEY`
- Frontend (`.env`): `REACT_APP_API_URL=http://localhost:5000/api`

### 💻 Local Development
- **Backend Server**: `cd server && npm start`
- **Frontend App**: `npm start`

### 🎮 Game Logic
- **NPC Unlocking**: Honestly recording your life and building trust with villagers are key to meeting new people.
- **Clue Acquisition**: Pay attention to details; not every conversation leads to a breakthrough. Patience is the key to solving the mystery.

### 🗄️ Database Management
Connection: `heroku pg:psql -a foodtracking-t1`
- `Players`: Player profiles and progress.
- `MealRecords`: Diet data and conversation archives.
- `Clues`: Collected memory fragments.
- `allowed_ids`: Access whitelist.

---

**🎮 Happy Gaming!**
