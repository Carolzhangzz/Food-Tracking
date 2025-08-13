# Food Tracking Game - 开发者指南 (Developer SOP)

## 1. 环境准备

### 1.1 安装 Node.js & NVM
本项目要求 Node.js 版本 **15.14.0**（推荐使用 NVM 管理版本）  

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# 加载 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 安装指定 Node 版本
nvm install 15.14.0
nvm use 15.14.0
nvm alias default 15.14.0
```

查看版本：
```bash
node -v
npm -v
```
> **注意**：虽然本地运行用 `15.14.0`，但 Heroku 会根据 `package.json` 中的 `"node": "18.20.8"` 来构建。

---

## 2. 安装依赖
```bash
npm install
```

---

## 3. `.env` 配置

项目依赖 `.env` 文件来读取 API Key、数据库地址、功能开关等配置：

```env
CONVAI_API_KEY=xxxxx
REACT_APP_API_URL=https://foodtracking-t1-xxxx.herokuapp.com/api
GEMINI_API_KEY=xxxxx
COMPLETE_POLICY=DINNER_OK
PORT=3001
NODE_ENV=development

# 开发调试开关
ALLOW_DEV_SKIP=false
REACT_APP_ALLOW_DEV_SKIP=false
ENABLE_CROSS_DAY_DELAY=false
REACT_APP_ENABLE_CROSS_DAY_DELAY=false
```

### 配置说明：
- **CONVAI_API_KEY**：ConvAI 对话 API 的密钥
- **GEMINI_API_KEY**：Google Gemini 生成彩蛋的 API Key
- **COMPLETE_POLICY**：完成一天的策略，`DINNER_OK` 表示晚餐记录后即可结束当天
- **ALLOW_DEV_SKIP**：是否允许开发模式直接跳关 2-6天（后端）
- **REACT_APP_ALLOW_DEV_SKIP**：同上，前端控制
- **ENABLE_CROSS_DAY_DELAY**：是否开启跨天延迟 晚饭记录后8h（后端）
- **REACT_APP_ENABLE_CROSS_DAY_DELAY**：同上，前端控制

---

## 4. Heroku 操作

### 4.1 安装 Heroku CLI
```bash
npm install -g heroku
heroku --version
```

### 4.2 登录 Heroku
```bash
heroku login
```

### 4.3 连接已有项目
```bash
heroku git:remote -a foodtracking-t1
```

### 4.4 设置环境变量
```bash
# 格式：heroku config:set KEY=VALUE --app APP_NAME 

heroku config:set CONVAI_API_KEY=xxxxx --app foodtracking-t1
heroku config:set GEMINI_API_KEY=xxxxx --app foodtracking-t1
```
> **说明**：`config:set` 会在 Heroku 服务器环境中添加/修改环境变量，供运行时读取。（.env中的所有都要配置）

### 4.5 查看环境变量
```bash
heroku config --app foodtracking-t1
```

---

## 5. 数据库操作

### 5.1 登录数据库
```bash
heroku pg:psql --app foodtracking-t1
```

### 5.2 添加新的 Player ID
```sql
INSERT INTO "allowed_ids" ("playerId", "used", "createdAt", "updatedAt")
VALUES ('130', false, NOW(), NOW());
```

### 5.3 查看表数据
```sql
SELECT * FROM "allowed_ids";
```

---

## 6. 本地运行

### 启动后端
```bash
node server/app.js
```

访问：
- 健康检查: `http://localhost:3001/health`
- API 入口: `http://localhost:3001/api`

**关闭进程：**
```bash
ps aux | grep node
kill <PID>
```

---

## 7. 部署到 Heroku

### 7.1 推送代码
```bash
git add .
git commit -m "update"
git push heroku main
```
或指定分支：
```bash
git push heroku your_branch:main
```

### 7.2 部署完成后
Heroku 会返回部署成功信息和访问 URL，例如：
```
https://foodtracking-t1-4d8572bed4a3.herokuapp.com/
```

---

## 8. 数据库可视化工具 (可选)

可以安装 [Postgres.app](https://postgresapp.com/) 方便本地连接：
```bash
echo 'export PATH=$PATH:/Applications/Postgres.app/Contents/Versions/latest/bin' >> ~/.zprofile
source ~/.zprofile
psql --version
```

使用 Heroku 提供的连接信息（Host、User、Password、Database、Port）即可在 GUI 工具连接。

---

## 9. 常用命令速查

| 操作 | 命令 |
|------|------|
| 登录 Heroku | `heroku login` |
| 绑定远程仓库 | `heroku git:remote -a APP_NAME` |
| 部署代码 | `git push heroku main` |
| 查看日志 | `heroku logs --tail --app APP_NAME` |
| 查看 config | `heroku config --app APP_NAME` |
| 设置 config | `heroku config:set KEY=VALUE --app APP_NAME` |
| 数据库登录 | `heroku pg:psql --app APP_NAME` |
| 启动本地服务 | `node server/app.js` |
| 关闭进程 | `kill <PID>` |
