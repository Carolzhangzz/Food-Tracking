// CutScenePlayer.jsx - PC 端响应式优化版本
import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { PlayerContext } from "../context/PlayerContext";
import Button from "./Button";
import { useNavigate } from "react-router-dom";
import Control from "./Control";

function CutScenePlayer() {
  const { playerId, playerData } = useContext(PlayerContext);
  const [currentLine, setCurrentLine] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();
  const animationTimerRef = useRef(null);

  const SEEN_KEY = useMemo(
    () => (playerId ? `cutsceneSeen_v1_${playerId}` : "cutsceneSeen_v1"),
    [playerId]
  );

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 快速检查是否已看过
  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    console.log("🔍 CutScenePlayer check:", {
      SEEN_KEY,
      seen,
      playerId
    });
    if (seen === "1") {
      console.log("⚠️ CutScenePlayer: 已看过 cutscene，跳转到 LoadingPage");
      navigate("/loading");
      return;
    }
    console.log("✅ CutScenePlayer: 首次观看，开始播放");
    setIsReady(true);
  }, [SEEN_KEY, navigate, playerId]);

  // 故事文本
  const storyLines = useMemo(() =>
    playerData?.language === "zh"
      ? [
        "你已经离开村庄多年。",
        "在城市中，你靠一道道菜慢慢打响了名号。",
        "不久前你写信给老师，希望能回村继续深造。",
        "却迟迟没有回信，反而传来了噩耗：老师失踪了。",
        "他带走了那本传说中的秘方手册。",
        "现在，你回来了。",
        "没人知道究竟发生了什么。",
        "不过村民们都还记得你的老师。",
        "他们热爱谈论美食——每一种味道、每一段回忆。",
        "若想揭开真相，就必须追随他的脚步。每一个细节都至关重要。",
      ]
      : [
        "You left this village years ago.",
        "In the city, you've been building your name—one dish at a time.",
        "Recently, you wrote to your old master, hoping to return and learn more.",
        "But instead of a reply, you heard troubling news: your master has vanished.",
        "And with him, the legendary recipe book.",
        "Now you're back.",
        "No one knows what happened.",
        "But the people here remember your master well.",
        "They love talking about food—every flavor, every moment.",
        "If you want to find the truth, follow in his footsteps. Every detail matters.",
      ],
    [playerData?.language]
  );

  // 逐行淡入
  useEffect(() => {
    if (!isReady) return;

    if (currentLine < storyLines.length) {
      animationTimerRef.current = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
      }, 800);
    } else if (currentLine === storyLines.length) {
      setShowStartButton(true);
    }

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [currentLine, storyLines.length, isReady]);

  useEffect(() => {
    if (!playerId) {
      navigate("/");
    }
  }, [playerId, navigate]);

  const handleStartGame = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
      console.log("✅ CutScenePlayer: 已设置 cutscene 标记，跳转到 LoadingPage");
    } catch (e) {
      console.error("Failed to save cutscene state:", e);
    }
    navigate("/loading", { state: { fromCutscene: true } });
  }, [SEEN_KEY, navigate]);

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
      console.log("✅ CutScenePlayer: 跳过 cutscene，已设置标记，跳转到 LoadingPage");
    } catch (e) {
      console.error("Failed to save cutscene state:", e);
    }
    navigate("/loading", { state: { fromCutscene: true } });
  }, [SEEN_KEY, navigate]);

  if (!isReady || !playerData) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.content}>
          <div style={loadingStyles.icon}>🍳</div>
          <p>Loading your story...</p>
        </div>
      </div>
    );
  }

  // 响应式样式
  const styles = {
    skipButton: {
      position: "fixed",
      top: isDesktop ? 24 : 16,
      left: isDesktop ? 24 : 16,
      zIndex: 2100,
      padding: isDesktop ? "14px 24px" : "10px 14px",
      fontSize: isDesktop ? "18px" : "14px",
      fontWeight: 700,
      borderRadius: isDesktop ? 12 : 8,
      border: "2px solid #334155",
      color: "#e2e8f0",
      background: "rgba(15,23,42,0.85)",
      cursor: "pointer",
      backdropFilter: "blur(8px)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      transition: "all 0.3s ease",
      boxShadow: isDesktop ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
    },
    container: {
      background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
      color: "#e2e8f0",
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: isDesktop ? "40px" : "20px",
      boxSizing: "border-box",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
    title: {
      fontSize: isDesktop ? "2.8rem" : "clamp(1.5rem, 5vw, 2.2rem)", // 🔧 手机版标题放大
      color: "#ffd700",
      marginBottom: isDesktop ? "2.5rem" : "1.5rem",
      marginTop: isDesktop ? "3.5rem" : "2rem",
      textAlign: "center",
      textShadow: "2px 2px 6px rgba(0,0,0,0.8)",
      fontWeight: "700",
    },
    content: {
      flex: 1,
      maxHeight: "80vh",
      width: "100%",
      maxWidth: isDesktop ? "1100px" : "800px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: isDesktop ? "0 60px" : "0 20px",
    },
    textBlock: {
      paddingBottom: isDesktop ? "3rem" : "2rem",
    },
    buttonContainer: {
      width: "100%",
      textAlign: "center",
      marginBottom: isDesktop ? "10rem" : "8rem",
    },
  };

  return (
    <>
      <Control />

      {/* 跳过按钮 */}
      <button 
        onClick={handleSkip} 
        style={styles.skipButton}
        onMouseEnter={(e) => {
          if (isDesktop) {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = isDesktop ? "0 4px 12px rgba(0,0,0,0.3)" : "none";
        }}
      >
        {playerData.language === "zh" ? "跳过" : "Skip"}
      </button>

      <div style={styles.container}>
        <p style={styles.title}>
          {playerData.language === "zh"
            ? `欢迎回来，${playerData.firstName || "玩家"}`
            : `Welcome back, ${playerData.firstName || "Player"}`}
        </p>

        <div style={styles.content}>
          <div style={styles.textBlock}>
            {storyLines.slice(0, currentLine).map((line, index) => (
              <p 
                key={index} 
                style={{
                  fontSize: isDesktop ? "1.6rem" : "clamp(1.1rem, 3.5vw, 1.4rem)", // 🔧 手机版内容放大
                  lineHeight: isDesktop ? 2.2 : 1.8,
                  margin: isDesktop ? "2rem 0" : "1.2rem 0",
                  opacity: 0,
                  animation: `fadeIn 0.8s ease-in-out ${index * 0.25}s forwards`,
                  textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
                  textAlign: "center",
                  fontWeight: isDesktop ? "400" : "400",
                }}
              >
                {line}
              </p>
            ))}
          </div>

          {showStartButton && currentLine >= storyLines.length && (
            <div style={styles.buttonContainer}>
              <Button onClick={handleStartGame} animation="fadeIn 0.8s forwards">
                {playerData.language === "zh" ? "了解了" : "Got it"}
              </Button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}

const loadingStyles = {
  container: {
    width: "100vw",
    height: "100vh",
    background: "#000",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontSize: "1.2rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  content: {
    textAlign: "center",
  },
  icon: {
    fontSize: "2rem",
    marginBottom: "1rem",
  },
};

export default CutScenePlayer;