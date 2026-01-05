// GameScreen.jsx - 完整修复版
import React, { useEffect, useCallback, useContext, useState, useRef } from "react";
import Phaser from "phaser";
import MainScene from "../phaser/MainScene";
import DialogSceneRefactored from "../phaser/dialog/DialogSceneRefactored";
import { PlayerContext } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";
import { updateUserContext } from "../utils/update";
import Control from "./Control";
import FinalReport from "./FinalReport";

function GameScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("正在初始化...");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const loadingTimeoutRef = useRef(null);
  const sceneCheckIntervalRef = useRef(null);

  const { playerId, playerData, setPlayerData, gameRef } = useContext(PlayerContext);
  const navigate = useNavigate();

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 玩家数据检查
  useEffect(() => {
    if (!playerId || !playerData) {
      console.log("No player data, redirecting to login");
      navigate("/");
    }
  }, [playerId, playerData, navigate]);

  const updatePlayerdata = useCallback(
    (data) => {
      console.log("Player data updated:", data);
      setPlayerData((prevData) => ({ ...prevData, ...data }));
      updateUserContext(playerId, data);
    },
    [playerId, setPlayerData]
  );

  // 优化的加载进度模拟
  useEffect(() => {
    if (isLoading && loadingProgress < 90) {
      const timer = setTimeout(() => {
        setLoadingProgress(prev => Math.min(prev + 15, 90));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingProgress]);

  // 游戏创建逻辑
  useEffect(() => {
    if (!playerData || !playerId) return;
    if (gameRef.current !== null) return;

    console.log("🎮 Creating new Phaser game instance");
    setLoadingProgress(10);

    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    setLoadingProgress(5);
    setLoadingMessage(
      playerData.language === "zh"
        ? "正在初始化游戏引擎..."
        : "Initializing game engine..."
    );

    const gameConfig = {
      scene: [MainScene, DialogSceneRefactored], // 使用重构后的对话场景
      title: "Village Secrets",
      type: Phaser.AUTO,
      width: gameWidth,
      height: gameHeight,
      parent: "game",
      backgroundColor: "#2c3e50",
      render: {
        antialias: false,
        pixelArt: true,
        powerPreference: isMobile ? "default" : "high-performance",
        batchSize: isMobile ? 500 : 1000,
        maxTextures: isMobile ? 4 : 8,
      },
      physics: {
        default: "arcade",
        arcade: { debug: false, gravity: { x: 0, y: 0 } },
      },
      input: {
        touch: true,
        mouse: true,
        activePointers: 3
      },
      fps: {
        target: isMobile ? 30 : 60,
        forceSetTimeOut: true,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: "100%",
        height: "100%",
        // 🔧 确保PC和移动端都能正确铺满屏幕
        expandParent: true,
        parent: "game",
      },
    };

    setLoadingProgress(50);
    setLoadingMessage(
      playerData.language === "zh"
        ? "正在加载地图资源..."
        : "Loading map assets..."
    );

    try {
      gameRef.current = new Phaser.Game(gameConfig);
      setLoadingProgress(40);

      console.log("📤 Passing data to MainScene:", { 
        playerId, 
        hasPlayerData: !!playerData,
        language: playerData?.language 
      });

      // 启动主场景 - 确保传递完整数据
      gameRef.current.scene.start("MainScene", {
        playerId,
        playerData,
        updatePlayerdata
      });

      console.log("✅ Phaser game created and MainScene started");

      let checkCount = 0;
      const maxChecks = 100;

      // 轮询检查 MainScene 是否完全初始化 (fullyInitialized)
      sceneCheckIntervalRef.current = setInterval(() => {
        checkCount++;
        
        if (loadingProgress < 60) {
          setLoadingMessage(
            playerData.language === "zh" ? "正在加载地图..." : "Loading map..."
          );
        } else if (loadingProgress < 80) {
          setLoadingMessage(
            playerData.language === "zh" ? "正在初始化NPC..." : "Initializing NPCs..."
          );
        } else if (loadingProgress < 95) {
          setLoadingMessage(
            playerData.language === "zh" ? "正在准备游戏世界..." : "Preparing game world..."
          );
        }

        if (checkCount % 10 === 0) {
          console.log(`🔍 场景检查 ${checkCount}/100`);
        }

        const mainScene = gameRef.current?.scene?.getScene("MainScene");

        if (mainScene && mainScene.fullyInitialized) {
          clearInterval(sceneCheckIntervalRef.current);
          setLoadingProgress(95);
          setLoadingMessage(
            playerData.language === "zh" ? "准备就绪!" : "Ready!"
          );
          setTimeout(() => {
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoading(false);
            }, 300);
          }, 500);

          console.log("✅ Scene fully initialized");
        } else if (checkCount >= maxChecks) {
          clearInterval(sceneCheckIntervalRef.current);
          console.error("❌ MainScene 初始化超时，强制完成加载");
          
          // 🔧 即使超时也要完成加载，让玩家能进入游戏
          setLoadingProgress(100);
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }
      }, 100);

    } catch (error) {
      console.error("❌ Error creating Phaser game:", error);
      alert("Game loading failed. Please refresh the page.");
    }

    return () => {
      if (sceneCheckIntervalRef.current) {
        clearInterval(sceneCheckIntervalRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [gameRef, playerId, playerData, updatePlayerdata]);

  // 优化的 Resize 处理
  useEffect(() => {
    if (!gameRef.current) return;

    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!gameRef.current) return;

        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        console.log(`🔄 窗口大小变化: ${newWidth} x ${newHeight}`);

        try {
          // 🔧 关键修复：让 Phaser Scale Manager 自动处理
          // 不要手动调用 resize，这会导致无限递归
          
          // 只需要通知场景更新视口
          requestAnimationFrame(() => {
            const mainScene = gameRef.current?.scene?.getScene("MainScene");
            if (mainScene && mainScene.cameras?.main) {
              mainScene.cameras.main.setViewport(0, 0, newWidth, newHeight);
            }
          });
        } catch (error) {
          console.error("Error during resize:", error);
        }
      }, 500);
    };

    window.addEventListener("resize", debouncedResize);
    window.addEventListener("orientationchange", () => setTimeout(debouncedResize, 500));

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("orientationchange", debouncedResize);

      if (gameRef.current) {
        console.log("🧹 Cleaning up Phaser game instance");
        try {
          gameRef.current.destroy(true);
        } catch (error) {
          console.error("Error destroying game:", error);
        }
        gameRef.current = null;
      }
    };
  }, [gameRef]);

  if (!playerData || !playerId) {
    return (
      <div style={styles(isDesktop).loadingContainer}>
        <div style={styles(isDesktop).loadingContent}>
          <div style={styles(isDesktop).loadingIcon}>🐳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles(isDesktop).gameContainer}>
      {/* 🎮 只在游戏加载完成且不在过场动画时显示控制面板 */}
      {!isLoading && <Control />}

      {/* 🔧 最终报告展示逻辑 */}
      {playerData?.gameCompleted && (
        <FinalReport 
          onClose={() => {
            // 结束后回到登录页或重置状态
            window.location.reload(); 
          }} 
        />
      )}

      {isLoading && (
        <div style={styles(isDesktop).loadingOverlay}>
          <div style={styles(isDesktop).loadingContent}>
            <div style={styles(isDesktop).loadingIcon}>🐳</div>

            <div style={styles(isDesktop).loadingText}>{loadingMessage}</div>

            <div style={styles(isDesktop).progressBarContainer}>
              <div
                style={{
                  ...styles(isDesktop).progressBar,
                  width: `${loadingProgress}%`,
                }}
              />
            </div>

            <div style={styles(isDesktop).progressText}>{Math.round(loadingProgress)}%</div>

            <div style={styles(isDesktop).loadingHint}>
              {playerData.language === "zh"
                ? "正在为您准备游戏世界,请稍候..."
                : "Preparing your game world, please wait..."}
            </div>
          </div>
        </div>
      )}

      <div id="game" style={styles(isDesktop).gameCanvas} />
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

// 响应式样式函数
const styles = (isDesktop) => ({
  gameContainer: {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    background: "#000",
  },
  gameCanvas: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    display: "block",
    touchAction: "none",
  },
  loadingContainer: {
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontFamily: "monospace",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    color: "#e2e8f0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  loadingContent: {
    textAlign: "center",
    padding: isDesktop ? "40px" : "20px",
    maxWidth: isDesktop ? "600px" : "400px",
    width: "90%",
  },
  loadingIcon: {
    fontSize: isDesktop ? "5rem" : "clamp(2rem, 8vw, 4rem)",
    marginBottom: isDesktop ? "2.5rem" : "1.5rem",
    animation: "pulse 2s infinite",
  },
  loadingText: {
    fontSize: isDesktop ? "1.6rem" : "clamp(1rem, 4vw, 1.2rem)",
    marginBottom: isDesktop ? "2.5rem" : "1.5rem",
    fontWeight: 600,
    color: "#e2e8f0",
    minHeight: isDesktop ? "50px" : "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: isDesktop ? "14px" : "8px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: isDesktop ? "7px" : "4px",
    overflow: "hidden",
    marginBottom: isDesktop ? "2rem" : "1rem",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
    transition: "width 0.3s ease",
    borderRadius: isDesktop ? "7px" : "4px",
    boxShadow: "0 0 20px rgba(102, 126, 234, 0.6)",
  },
  progressText: {
    fontSize: isDesktop ? "1.4rem" : "clamp(0.9rem, 2.5vw, 1.1rem)",
    opacity: 0.9,
    marginBottom: isDesktop ? "2rem" : "1rem",
    color: "#94a3b8",
    fontWeight: "bold",
    letterSpacing: "0.05em",
  },
  loadingHint: {
    fontSize: isDesktop ? "1.15rem" : "0.9rem",
    opacity: 0.8,
    lineHeight: isDesktop ? 1.8 : 1.6,
    padding: isDesktop ? "24px" : "12px",
    marginTop: isDesktop ? "24px" : "12px",
    color: "#94a3b8",
    maxWidth: "500px",
    margin: "0 auto",
  },
});

export default GameScreen;