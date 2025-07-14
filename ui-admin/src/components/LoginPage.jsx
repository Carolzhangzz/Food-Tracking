// src/components/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';

const baseUrl = process.env.REACT_APP_API_URL;

function LoginPage() {
  const [playerIdInput, setPlayerIdInput] = useState('');
  const { setPlayerId } = useContext(PlayerContext);
  const navigate = useNavigate();

  // 登录处理函数
  const handleLogin = async () => {
    if (!playerIdInput.trim()) {
      alert('Please enter your Player ID!');
      return;
    }

  try {
    // 为了便于生产环境
    // 修改一下这里的 URL 
    // 这里后端服务运行在本地3001端口
    // 如果部署在其他地方，请修改为实际的后端地址
    // 例如：'https://your-backend-domain.com/api/login'
    // 修改这个url为可替换的字段
    // 例如：process.env.REACT_APP_API_URL || 'http://localhost:3000/api/login'
    
    // 怎么打印 login 的标记
  
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: playerIdInput })
    });

    const data = await response.json();

    if (!response.ok) {
      // 这里统一处理后端的错误信息
      alert(data.message || 'Login failed');
      return;
    }

    // 成功
    console.log('Logged in:', data);
    setPlayerId(playerIdInput);
    navigate('/menu');
  } catch (error) {
    console.error('Login failed:', error);
    alert('Network error or server not responding');
  }
};


  return (
    <div style={styles.container}>
      <h2>Welcome Back!</h2>
      <p>Please enter your Player ID to continue</p>
      <input
        type="text"
        value={playerIdInput}
        onChange={(e) => setPlayerIdInput(e.target.value)}
        style={styles.input}
        placeholder="Your Player ID"
      />
      <button onClick={handleLogin} style={styles.button}>
        Login
      </button>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#222',
    color: '#fff',
    padding: '20px',
  },
  input: {
    padding: '10px',
    margin: '10px 0',
    width: '200px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 20px',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default LoginPage;
