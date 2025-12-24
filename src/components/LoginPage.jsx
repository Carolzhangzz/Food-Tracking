// LoginPage.jsx - PC 端适配版本
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";

const API_URL = process.env.REACT_APP_API_URL;

function LoginPage() {
  const [playerIdInput, setPlayerIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  
  const { setPlayerId, setPlayerData } = useContext(PlayerContext);
  const navigate = useNavigate();

  const [tempUserData, setTempUserData] = useState(null);
  const [selectedLang, setSelectedLang] = useState("en");

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async () => {
    if (!playerIdInput.trim()) {
      alert("Please enter your Player ID!");
      return;
    }
    setIsLoading(true);

    try {
      const now = new Date();
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          playerId: playerIdInput,
          // 🔧 发送本地日期的年、月、日，确保时区同步
          clientDate: {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate()
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed");
        setIsLoading(false);
        return;
      }

      console.log("Logged in:", data);
      setPlayerId(playerIdInput);
      setPlayerData(data);
      setTempUserData(data);
      setShowLangModal(true);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Network error or server not responding");
      setIsLoading(false);
    }
  };

  const confirmLanguage = async () => {
    try {
      setPlayerData((prev) => ({ ...prev, language: selectedLang }));
      await updateUserContext(playerIdInput, {
        ...tempUserData,
        language: selectedLang,
      });
    } catch (error) {
      console.error("Error updating language:", error);
    }
    
    setShowLangModal(false);
    setIsLoading(false);

    const cutsceneSeen = localStorage.getItem(`cutsceneSeen_v1_${playerIdInput}`);
    
    if (cutsceneSeen === "1") {
      navigate("/loading");
    } else {
      navigate("/intro");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // 响应式样式
  const styles = {
    container: {
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#1a1a2e",
      padding: "20px",
    },
    loginBox: {
      background: "#2a2a2a",
      borderRadius: isDesktop ? "16px" : "12px",
      padding: isDesktop ? "50px" : "30px",
      boxShadow: isDesktop 
        ? "0 20px 60px rgba(0,0,0,0.5), 8px 8px 0px #000"
        : "8px 8px 0px #000",
      textAlign: "center",
      maxWidth: isDesktop ? "550px" : "400px",
      width: "100%",
      border: isDesktop ? "4px solid #667eea" : "4px solid #4a5568",
      transition: "all 0.3s ease",
    },
    title: {
      fontSize: isDesktop ? "3rem" : "2rem",
      color: "#ffd700",
      marginBottom: "0.5rem",
      textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
    },
    subtitle: {
      fontSize: isDesktop ? "1.6rem" : "1.2rem",
      color: "#e2e8f0",
      marginBottom: "0.5rem",
      fontWeight: "500",
    },
    description: {
      color: "#94a3b8",
      marginBottom: isDesktop ? "40px" : "30px",
      fontSize: isDesktop ? "1.1rem" : "0.95rem",
      lineHeight: 1.6,
    },
    inputContainer: { 
      display: "flex", 
      flexDirection: "column", 
      gap: isDesktop ? "25px" : "15px",
    },
    input: {
      padding: isDesktop ? "18px 20px" : "12px 16px",
      fontSize: isDesktop ? "1.2rem" : "1rem",
      border: "2px solid #4a5568",
      background: "#1a1a2e",
      color: "#e2e8f0",
      borderRadius: isDesktop ? "10px" : "8px",
      transition: "all 0.3s ease",
      outline: "none",
      fontFamily: "'Courier New', monospace",
    },
    button: {
      padding: isDesktop ? "18px" : "12px",
      fontSize: isDesktop ? "1.2rem" : "1rem",
      background: "#4a5568",
      color: "#ffd700",
      border: "3px solid #2F1B14",
      cursor: isLoading ? "not-allowed" : "pointer",
      borderRadius: isDesktop ? "10px" : "8px",
      transition: "all 0.3s ease",
      fontWeight: "bold",
      fontFamily: "'Courier New', monospace",
    },
    hint: { 
      marginTop: isDesktop ? "30px" : "20px", 
      color: "#94a3b8",
      fontSize: isDesktop ? "1rem" : "0.9rem",
      lineHeight: 1.5,
    },
  };

  const modalStyles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.9)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
      backdropFilter: "blur(8px)",
    },
    box: {
      background: "white",
      padding: isDesktop ? "50px" : "30px",
      borderRadius: isDesktop ? "20px" : "16px",
      width: isDesktop ? "480px" : "90%",
      maxWidth: "480px",
      textAlign: "center",
      boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
    },
    title: {
      marginBottom: isDesktop ? "30px" : "20px",
      fontSize: isDesktop ? "1.6rem" : "1.3rem",
      fontWeight: "bold",
      color: "#1a1a2e",
    },
    optionContainer: {
      display: "flex",
      flexDirection: "column",
      gap: isDesktop ? "18px" : "12px",
    },
    option: {
      padding: isDesktop ? "20px" : "14px",
      border: "3px solid #ccc",
      borderRadius: isDesktop ? "14px" : "10px",
      cursor: "pointer",
      fontSize: isDesktop ? "1.2rem" : "1.05rem",
      transition: "all 0.3s ease",
      fontWeight: "500",
      background: "white",
    },
    optionSelected: {
      borderColor: "#667eea",
      background: "#f0f4ff",
      transform: isDesktop ? "scale(1.02)" : "scale(1.01)",
    },
    confirm: {
      marginTop: isDesktop ? "35px" : "25px",
      padding: isDesktop ? "18px" : "14px",
      background: "#667eea",
      color: "white",
      border: "none",
      borderRadius: isDesktop ? "14px" : "10px",
      cursor: "pointer",
      width: "100%",
      fontSize: isDesktop ? "1.2rem" : "1.05rem",
      fontWeight: "bold",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>🍳 FEASTORY</h1>
        <h2 style={styles.subtitle}>Welcome Back!</h2>
        <p style={styles.description}>
          Please enter your Player ID to continue your journey
        </p>

        <div style={styles.inputContainer}>
          <input
            type="text"
            value={playerIdInput}
            onChange={(e) => setPlayerIdInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              ...styles.input,
              borderColor: playerIdInput ? "#667eea" : "#4a5568",
            }}
            placeholder="Your Player ID"
            disabled={isLoading}
          />
          <button
            onClick={handleLogin}
            style={{
              ...styles.button,
              opacity: isLoading ? 0.6 : 1,
              transform: isLoading ? "none" : "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && isDesktop) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>

        <div style={styles.hint}>
          <p>💡 First time? Enter the given player id to start your journey!</p>
        </div>
      </div>

      {showLangModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.box}>
            <h3 style={modalStyles.title}>
              SELECT LANGUAGE / 选择语言
            </h3>
            <div style={modalStyles.optionContainer}>
              <button
                style={{
                  ...modalStyles.option,
                  ...(selectedLang === "en" ? modalStyles.optionSelected : {}),
                }}
                onClick={() => setSelectedLang("en")}
                onMouseEnter={(e) => {
                  if (isDesktop) {
                    e.target.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedLang !== "en") {
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                🇺🇸 English
              </button>
              <button
                style={{
                  ...modalStyles.option,
                  ...(selectedLang === "zh" ? modalStyles.optionSelected : {}),
                }}
                onClick={() => setSelectedLang("zh")}
                onMouseEnter={(e) => {
                  if (isDesktop) {
                    e.target.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedLang !== "zh") {
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                🇨🇳 中文
              </button>
            </div>
            <button 
              style={modalStyles.confirm} 
              onClick={confirmLanguage}
              onMouseEnter={(e) => {
                if (isDesktop) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }}
            >
              {selectedLang === "zh" ? "好的" : "Got it!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;