// TestGameScreen.jsx - 专门用于测试的版本
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";

// 导入测试场景（你需要创建这个文件）
// import TestScene from "../phaser/TestScene";

// 在这里直接定义测试场景，避免导入问题
class TestScene extends Phaser.Scene {
    constructor() {
        super({ key: "TestScene" });
        console.log("TestScene constructor called");
    }

    init(data) {
        console.log("TestScene init called with:", data);
    }

    preload() {
        console.log("TestScene preload started");
        // 不加载任何外部资源
    }

    create() {
        console.log("TestScene create started");
        
        // 设置明显的背景色
        this.cameras.main.setBackgroundColor('#00ff00'); // 绿色
        
        // 获取屏幕尺寸
        const { width, height } = this.scale;
        console.log(`Screen size: ${width} x ${height}`);
        
        // 添加大号文本
        const text = this.add.text(width / 2, height / 2, 'PHASER WORKS!', {
            fontSize: '64px',
            fill: '#000000',
            fontFamily: 'Arial',
            stroke: '#ffffff',
            strokeThickness: 6
        });
        text.setOrigin(0.5);
        
        // 添加说明文字
        const instruction = this.add.text(width / 2, height / 2 + 100, 'Click anywhere to test interaction', {
            fontSize: '24px',
            fill: '#333333',
            fontFamily: 'Arial'
        });
        instruction.setOrigin(0.5);
        
        // 添加四个角的彩色矩形
        this.add.rectangle(50, 50, 80, 80, 0xff0000);
        this.add.rectangle(width - 50, 50, 80, 80, 0x0000ff);
        this.add.rectangle(50, height - 50, 80, 80, 0xffff00);
        this.add.rectangle(width - 50, height - 50, 80, 80, 0xff00ff);
        
        // 添加交互测试
        this.input.on('pointerdown', (pointer) => {
            console.log('Screen clicked at:', pointer.x, pointer.y);
            
            // 在点击位置添加圆圈
            const circle = this.add.circle(pointer.x, pointer.y, 30, 0x00ffff, 0.7);
            
            // 添加点击次数文本
            const clickText = this.add.text(pointer.x, pointer.y - 50, 'CLICK!', {
                fontSize: '20px',
                fill: '#ff0000',
                fontFamily: 'Arial'
            });
            clickText.setOrigin(0.5);
            
            // 2秒后移除
            this.time.delayedCall(2000, () => {
                if (circle) circle.destroy();
                if (clickText) clickText.destroy();
            });
        });
        
        console.log("TestScene create completed successfully");
    }
}

function TestGameScreen() {
  const { playerId, playerData } = useContext(PlayerContext);
  const navigate = useNavigate();
  const gameRef = useRef(null);

  useEffect(() => {
    if (!playerId || !playerData) {
      console.log("No player data, redirecting to login");
      navigate("/");
      return;
    }
  }, [playerId, playerData, navigate]);

  useEffect(() => {
    if (!playerData || !playerId) {
      return;
    }

    // 清理现有游戏实例
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    console.log("Creating TEST Phaser game instance");
    
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;
    
    console.log(`Creating game with size: ${gameWidth}x${gameHeight}`);
    
    try {
      const gameConfig = {
        title: "Phaser Test",
        type: Phaser.AUTO,
        width: gameWidth,
        height: gameHeight,
        parent: "test-game",
        backgroundColor: "#ff0000", // 红色背景，如果看到说明Phaser启动了但场景没加载
        render: {
          antialias: false,
          pixelArt: true
        },
        scene: [TestScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        }
      };

      console.log("Game config:", gameConfig);
      
      gameRef.current = new Phaser.Game(gameConfig);
      
      console.log("Game instance created:", gameRef.current);
      
      // 启动测试场景
      gameRef.current.scene.start("TestScene", {
        playerId,
        playerData
      });
      
      console.log("TestScene started");
      
    } catch (error) {
      console.error("Error creating Phaser game:", error);
      
      // 显示错误信息
      const gameDiv = document.getElementById('test-game');
      if (gameDiv) {
        gameDiv.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: #ff0000;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
          ">
            <h1>Phaser Error</h1>
            <p>${error.message}</p>
            <p>Check console for details</p>
          </div>
        `;
      }
    }

    // 处理窗口大小变化
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      console.log(`Resizing to: ${newWidth}x${newHeight}`);
      if (gameRef.current) {
        gameRef.current.scale.resize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        console.log("Cleaning up Phaser game instance");
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [playerId, playerData]);

  if (!playerData || !playerId) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
        fontSize: '1.2rem',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '2rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>🍳</div>
          <p>Loading test environment...</p>
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
      {/* 测试信息面板 */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '5px',
        zIndex: 1000,
        fontSize: '14px',
        fontFamily: 'monospace',
        maxWidth: '300px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <strong>🧪 Phaser Test Mode</strong>
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div>✅ Player ID: {playerId}</div>
          <div>✅ Player Data: {playerData ? 'Loaded' : 'Missing'}</div>
          <div>🎯 Expected: Green background + "PHASER WORKS!" text</div>
          <div>🖱️ Click anywhere to test interaction</div>
        </div>
      </div>
      
      {/* 返回按钮 */}
      <button 
        onClick={() => navigate('/game')}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}
      >
        ← Back to Game
      </button>
      
      <div 
        id="test-game" 
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </div>
  );
}

export default TestGameScreen;