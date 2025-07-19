// // File: server/app.js

const express = require('express');
const app = express();
app.use(express.json());

const sequelize = require("./db");
sequelize.sync({ alter: true });
sequelize.authenticate()
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB connection error", err));

const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' })); // 与前端端口一致

const playerRoutes = require('./routes/playerRoutes'); 
app.use('/api', playerRoutes); 

const mealRoutes = require("./routes/mealRoutes"); 
app.use("/api", mealRoutes);

app.listen(3001, () => {
  console.log('✅ 服务器运行在 http://localhost:3001');
});


