// src/components/LoginPage.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';

function LoginPage() {
  const [playerIdInput, setPlayerIdInput] = useState('');
  const { setPlayerId } = useContext(PlayerContext);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!playerIdInput.trim()) {
      alert('Please enter your Player ID!');
      return;
    }

    try {
      // TODO: Call real backend API here to validate playerId
      console.log('Logging in with ID:', playerIdInput);
      
      // Example: simulate validation
      // await api.login(playerIdInput);

      setPlayerId(playerIdInput);
      navigate('/menu');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Invalid Player ID. Please try again.');
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
