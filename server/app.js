const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log("环境变量:", process.env.CONVAI_API_KEY);

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://foodtracking-t1-4d8572bed4a3.herokuapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sequelize = require("./db");
sequelize.sync({ alter: true });
sequelize.authenticate()
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection error", err));


const groqRoutes = require('./routes/groqRoutes');
app.use('/api', groqRoutes);

const playerRoutes = require('./routes/playerRoutes');
app.use('/api', playerRoutes);

const mealRoutes = require("./routes/mealRoutes");
app.use("/api", mealRoutes);

const convaiRouter = require('./routes/conversationRoutes');
app.use('/api', convaiRouter);

// 静态资源托管（必须放在路由配置之后，接口路由优先）
app.use(express.static(path.join(__dirname, '..', 'build')));

// // 前端路由 fallback（所有未匹配接口的路径返回 index.html）
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
// });
app.get(/^(?!\/api).*/, (req, res) => {  // 只处理非 /api 开头的路径
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
