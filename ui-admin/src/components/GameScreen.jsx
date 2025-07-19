// src/components/GameScreen.jsx - 响应式版本
import React, { useEffect } from "react";
import Phaser from "phaser";
import GridEngine from "grid-engine";
import MainScene from "../phaser/MainScene";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";
import { updateUserContext } from "../utils/update";
import Control from "./Control";

function GameScreen() {
  const { playerId, playerData, setPlayerData, gameRef } =
    useContext(PlayerContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerId || !playerData) {
      console.log("No player data, redirecting to login");
      navigate("/");
    } else {
      console.log("GameScreen - Player ID:", playerId);
      console.log("GameScreen - Player Data:", playerData);
    }
  }, [playerId, playerData, navigate]);

  const updatePlayerdata = React.useCallback(
    (data) => {
      console.log("Player data updated:", data);
      setPlayerData((prevData) => ({ ...prevData, ...data }));
      updateUserContext(playerId, data);
    },
    [playerId, setPlayerData]
  );

  useEffect(() => {
    if (!playerData || !playerId) {
      return;
    }

    if (gameRef.current === null) {
      console.log("Creating new Phaser game instance");
      
      // 获取当前屏幕尺寸
      const gameWidth = window.innerWidth;
      const gameHeight = window.innerHeight;
      
      console.log(`Creating game with size: ${gameWidth}x${gameHeight}`);
      
      try {
        gameRef.current = new Phaser.Game({
          title: "Village Secrets",
          type: Phaser.AUTO,
          width: gameWidth,
          height: gameHeight,
          parent: "game",
          backgroundColor: "#2c3e50",
          render: {
            antialias: false,
            pixelArt: true,
            powerPreference: "default" // 提高兼容性
          },
          physics: {
            default: "arcade",
          },
          plugins: {
            scene: [
              {
                key: "gridEngine",
                plugin: GridEngine,
                mapping: "gridEngine",
              },
            ],
          },
          scene: [MainScene],
          scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: gameWidth,
            height: gameHeight
          },
          // 移动端优化
          input: {
            touch: true,
            mouse: true,
            activePointers: 3
          },
          // 性能优化
          fps: {
            target: 60,
            forceSetTimeOut: true
          }
        });

        // 启动主场景
        gameRef.current.scene.start("MainScene", {
          playerId,
          playerData,
          updatePlayerdata,
        });

        console.log("Phaser game created and MainScene started");
        
      } catch (error) {
        console.error("Error creating Phaser game:", error);
        
        // 显示错误界面
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
          gameDiv.innerHTML = `
            <div style="
              width: 100vw;
              height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              color: white;
              font-family: 'Courier New', monospace;
              text-align: center;
              padding: 20px;
              box-sizing: border-box;
            ">
              <h1 style="font-size: clamp(1.5rem, 5vw, 3rem); margin-bottom: 1rem;">🚫 游戏加载失败</h1>
              <p style="font-size: clamp(1rem, 3vw, 1.5rem); margin-bottom: 2rem;">Game Failed to Load</p>
              <p style="font-size: clamp(0.8rem, 2vw, 1rem); margin-bottom: 1rem; opacity: 0.8;">错误信息: ${error.message}</p>
              <button onclick="window.location.reload()" style="
                padding: 15px 30px;
                font-size: clamp(0.9rem, 2.5vw, 1.2rem);
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid white;
                border-radius: 10px;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.3s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                🔄 重新加载游戏
              </button>
            </div>
          `;
        }
        return;
      }

      // 响应式处理函数
      const handleResize = () => {
        if (!gameRef.current) return;
        
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        console.log(`Resizing game to: ${newWidth}x${newHeight}`);
        
        try {
          gameRef.current.scale.resize(newWidth, newHeight);
          
          // 强制刷新场景缩放
          const mainScene = gameRef.current.scene.getScene('MainScene');
          if (mainScene && mainScene.handleResize) {
            mainScene.handleResize({ width: newWidth, height: newHeight });
          }
        } catch (error) {
          console.error("Error during resize:", error);
        }
      };

      // 防抖的resize处理
      let resizeTimeout;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 100);
      };

      // 添加事件监听器
      window.addEventListener('resize', debouncedResize);
      window.addEventListener('orientationchange', () => {
        // 延迟处理方向改变，确保新尺寸已生效
        setTimeout(debouncedResize, 300);
      });

      // 处理浏览器缩放
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      }, { passive: false });

      // 清理函数
      return () => {
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', debouncedResize);
        window.removeEventListener('orientationchange', debouncedResize);
      };
    }

  //   return () => {
  //     if (gameRef.current) {
  //       console.log("Cleaning up Phaser game instance");
  //       try {
  //         gameRef.current.destroy(true);
  //       } catch (error) {
  //         console.error("Error destroying game:", error);
  //       }
  //       gameRef.current = null;
  //     }
  //   };
  // }, [gameRef, playerId, playerData, updatePlayerdata]);
  

  return () => {
      if (gameRef.current) {
        console.log("Cleaning up Phaser game instance");
        try {
          gameRef.current.destroy(true);
        } catch (error) {
          console.error("Error destroying game:", error);
        }
        gameRef.current =  null;
      }
    };
  }, [gameRef]);
   

  if (!playerData || !playerId) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'cent er',
        color: '#fff',
        fontFamily: 'monospace',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>🍳</div>
          <p style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
            Loading your village adventure...
          </p>
          <p style={{ 
            fontSize: 'clamp(0.8rem, 3vw, 1rem)', 
            opacity: 0.8, 
            marginTop: '1rem' 
          }}>
            正在加载您的村庄冒险...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{  
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      background: '#000'
    }}>
      <Control />
      
      {/*   */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          opacity: 0.7
        }}>
          {window.innerWidth}x{window.innerHeight}
        </div>
      )}
      
      <div 
        id="game" 
        style={{ 
          width: '100%',  
          height: '100%',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      />
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.5; 
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

export default GameScreen;