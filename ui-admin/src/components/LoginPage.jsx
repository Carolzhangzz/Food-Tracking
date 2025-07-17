// LoginPage.jsx - 响应式版本
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";

function LoginPage() {
  const [playerIdInput, setPlayerIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setPlayerId, playerData, setPlayerData } = useContext(PlayerContext);
  const navigate = useNavigate();

  // 登录处理函数
  const handleLogin = async () => {
    if (!playerIdInput.trim()) {
      alert("Please enter your Player ID!");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://twilight-king-cf43.1442334619.workers.dev/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerIdInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      // 成功
      console.log("Logged in:", data);
      setPlayerId(playerIdInput);
      setPlayerData(data);

      // Show responsive language selection
      showLanguageSelection(data);

    } catch (error) {
      console.error("Login failed:", error);
      alert("Network error or server not responding");
      setIsLoading(false);
    }
  };

  const showLanguageSelection = (userData) => {
    const languageOptions = [
      { code: "en", name: "English", flag: "🇺🇸" },
      { code: "zh", name: "中文", flag: "🇨🇳" },
    ];

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      backdrop-filter: blur(10px);
    `;

    const languageBox = document.createElement("div");
    languageBox.style.cssText = `
      background: linear-gradient(135deg, #2a2a2a 0%, #1a1a2e 100%);
      border: 4px solid #4a5568;
      border-radius: 15px;
      padding: clamp(20px, 5vw, 40px);
      font-family: 'Courier New', monospace;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      max-width: min(400px, 90vw);
      width: 100%;
      animation: slideIn 0.3s ease-out;
    `;

    languageBox.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .lang-option {
          color: #e2e8f0;
          padding: clamp(10px, 3vw, 16px);
          margin: clamp(6px, 2vw, 10px) 0;
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: clamp(8px, 2vw, 15px);
          transition: all 0.3s ease;
          font-size: clamp(14px, 3vw, 18px);
          background: rgba(74, 85, 104, 0.3);
        }
        .lang-option:hover {
          background: rgba(102, 126, 234, 0.4);
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }
        .lang-flag {
          font-size: clamp(20px, 5vw, 28px);
        }
      </style>
      <h3 style="
        color: #ffd700; 
        margin-top: 0; 
        text-align: center; 
        font-size: clamp(16px, 4vw, 24px); 
        margin-bottom: clamp(15px, 4vw, 25px);
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      ">SELECT LANGUAGE / 选择语言</h3>
      ${languageOptions
        .map(
          (lang) => `
        <div class="lang-option" data-lang="${lang.code}">
          <span class="lang-flag">${lang.flag}</span>
          <span>${lang.name}</span>
        </div>
      `
        )
        .join("")}
    `;

    overlay.appendChild(languageBox);
    document.body.appendChild(overlay);

    // Add click handlers
    languageBox.querySelectorAll(".lang-option").forEach((option) => {
      option.addEventListener("click", async () => {
        const selectedLang = option.dataset.lang;
        console.log(`Language selected: ${selectedLang}`);
        
        // Store language preference
        setPlayerData((prevData) => ({
          ...prevData,
          language: selectedLang,
        }));

        try {
          let result = await updateUserContext(playerIdInput, {
            ...userData,
            language: selectedLang,
          }); 
          console.log("Language updated:", result);
        } catch (error) {
          console.error("Error updating language:", error);
        }

        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        
        setIsLoading(false);
        navigate("/intro");
      });
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>🍳 Village Secrets</h1>
        <h2 style={styles.subtitle}>Welcome Back!</h2>
        <p style={styles.description}>Please enter your Player ID to continue your journey</p>
        
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={playerIdInput}
            onChange={(e) => setPlayerIdInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={styles.input}
            placeholder="Your Player ID"
            disabled={isLoading}
          />
          <button 
            onClick={handleLogin} 
            style={{
              ...styles.button,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>
        
        <div style={styles.hint}>
          <p>💡 First time? Just enter any username to create your account!</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
    padding: "clamp(15px, 5vw, 30px)",
    boxSizing: "border-box",
    position: "fixed",
    top: 0,
    left: 0,
    overflow: "auto"
  },
  loginBox: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "clamp(10px, 3vw, 20px)",
    padding: "clamp(20px, 6vw, 50px)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    maxWidth: "min(450px, 90vw)",
    width: "100%",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  },
  title: {
    fontSize: "clamp(1.8rem, 6vw, 3rem)",
    margin: "0 0 clamp(5px, 2vw, 15px) 0",
    background: "linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontWeight: "bold",
    textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
  },
  subtitle: {
    fontSize: "clamp(1.2rem, 4vw, 2rem)",
    margin: "0 0 clamp(5px, 2vw, 15px) 0",
    color: "#2c3e50",
    fontWeight: "600",
  },
  description: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
    color: "#7f8c8d",
    marginBottom: "clamp(20px, 5vw, 35px)",
    lineHeight: "1.5",
  },
  inputContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(10px, 3vw, 20px)",
    marginBottom: "clamp(15px, 4vw, 25px)",
  },
  input: {
    padding: "clamp(12px, 3vw, 18px) clamp(15px, 4vw, 25px)",
    fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
    border: "2px solid #e1e8ed",
    borderRadius: "clamp(8px, 2vw, 12px)",
    outline: "none",
    transition: "all 0.3s ease",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box"
  },
  button: {
    padding: "clamp(12px, 3vw, 18px) clamp(20px, 5vw, 30px)",
    fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
    background: "linear-gradient(45deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: "clamp(8px, 2vw, 12px)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "600",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box"
  },
  hint: {
    background: "rgba(52, 152, 219, 0.1)",
    border: "1px solid #3498db",
    borderRadius: "clamp(6px, 2vw, 10px)",
    padding: "clamp(10px, 3vw, 20px)",
    fontSize: "clamp(0.8rem, 2vw, 1rem)",
    color: "#2980b9",
    marginTop: "clamp(15px, 4vw, 25px)",
    lineHeight: "1.4"
  },
};

// Enhanced CSS for better responsiveness
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    input:focus {
      border-color: #667eea !important;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
    }
    button:hover:not(:disabled) {
      transform: translateY(-2px) !important;
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3) !important;
    }
    button:active:not(:disabled) {
      transform: translateY(0px) !important;
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      input {
        font-size: 16px !important; /* Prevent zoom on iOS */
      }
    }
    
    @media (max-height: 600px) {
      .login-box {
        padding: 20px !important;
        margin: 10px !important;
      }
    }
    
    /* Landscape mobile */
    @media (orientation: landscape) and (max-height: 500px) {
      .container {
        padding: 10px !important;
      }
      .login-box {
        padding: 15px !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
      }
    }
  `;
  if (document.head) {
    document.head.appendChild(styleSheet);
  }
}

export default LoginPage;