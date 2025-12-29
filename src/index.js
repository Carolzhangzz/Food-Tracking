import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔧 版本控制：强制清除旧版本缓存
const APP_VERSION = '2.0.1'; // 每次部署更新这个版本号
const VERSION_KEY = 'app_version';

try {
  const currentVersion = localStorage.getItem(VERSION_KEY);
  if (currentVersion !== APP_VERSION) {
    console.log(`🔄 检测到版本更新: ${currentVersion} → ${APP_VERSION}, 清除缓存...`);
    
    // 清除所有 localStorage（除了重要数据）
    const keysToKeep = ['playerId', 'playerName']; // 保留玩家ID和名字
    const storage = {};
    keysToKeep.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) storage[key] = value;
    });
    
    localStorage.clear();
    
    // 恢复重要数据
    Object.keys(storage).forEach(key => {
      localStorage.setItem(key, storage[key]);
    });
    
    // 设置新版本号
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    console.log('✅ 缓存已清除，应用已更新到最新版本');
    
    // 刷新页面确保加载最新资源
    window.location.reload(true);
  }
} catch (error) {
  console.error('版本检查失败:', error);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
