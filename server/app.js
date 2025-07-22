// // File: server/app.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log("环境变量:", process.env.CONVAI_API_KEY);

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

const sequelize = require("./db");
sequelize.sync({ alter: true });
sequelize.authenticate()
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("❌ DB connection error", err));

const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' })); // 与前端端口一致

const playerRoutes = require('./routes/playerRoutes'); 
app.use('/api', playerRoutes); 

const mealRoutes = require("./routes/mealRoutes"); 
app.use("/api", mealRoutes);

const convaiRouter = require('./routes/conversationRoutes');
app.use('/api', convaiRouter); // 调用路径为 /api/convai-chat

app.listen(3001, () => {
  console.log('服务器运行在 http://localhost:3001');
});


