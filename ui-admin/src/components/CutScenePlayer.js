// CutScenePlayer.js - 修复开场白逻辑
import React, { useState, useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import Button from "./Button";
import { useNavigate } from "react-router-dom";
import Control from "./Control";

function CutScenePlayer() {
  const { playerId, playerData } = useContext(PlayerContext);
  const [currentLine, setCurrentLine] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!playerId) {
      navigate("/");
    } else {
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
      // 移除直接跳转到游戏的逻辑，让所有用户都能看到开场白
    }
  }, [playerId, playerData, navigate]);

  const storyLines = playerData?.language === "zh" ? [
    "你离开这个村庄已经很多年了。",
    "在城市里，你一直在努力建立自己的名声——一菜一饭。",
    "最近，你给老师写信，希望能回去学习更多的东西。",
    "但你没有收到回复，反而听到了令人不安的消息：你的老师失踪了。",
    "而他带走了传说中的食谱。",
    "现在你回来了。",
    "没有人知道发生了什么事。",
    "但这里的人们都记得你的老师。",
    "他们喜欢谈论食物——每一种味道，每一个瞬间。",
    "如果你想找到真相，就要跟随他的脚步。注意每一个细节。"
  ] : [
    "You left this village years ago.",
    "In the city, you've been building your name—one dish at a time.",
    "Recently, you wrote to your old master, hoping to return and learn more.",
    "But instead of a reply, you heard troubling news: your master has vanished.",
    "And with him, the legendary recipe book.",
    "Now you're back.",
    "No one knows what happened.",
    "But the people here remember your master well.",
    "They love talking about food—every flavor, every moment.",
    "If you want to find the truth, follow in his footsteps. Pay attention. Every detail matters."
  ];

  React.useEffect(() => {
    if (currentLine < storyLines.length) {
      const timer = setTimeout(() => {
        setCurrentLine(currentLine + 1);
      }, 200); // 稍微慢一点让用户能读完
      return () => clearTimeout(timer);
    } else {
      const buttonTimer = setTimeout(() => {
        setShowStartButton(true);
      }, 3000); 
      return () => clearTimeout(buttonTimer);
    }
  }, [currentLine, storyLines.length]);

  const handleStartGame = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    console.log("Starting game...");
    navigate("/game");
  };

  // 如果没有玩家数据，显示加载
  if (!playerData) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
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
          <p>Loading your story...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Control />
      <div 
        className="cutscene-player" 
        style={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          color: '#e2e8f0',
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          boxSizing: 'border-box',
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          textAlign: 'center', 
          maxWidth: '90vw', 
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <p style={{
            fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
            color: '#ffd700',
            marginBottom: '2rem',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>
            {playerData.language === 'zh' ? 
              `欢迎回来，${playerData.firstName || '玩家'}` :
              `Welcome back, ${playerData.firstName || 'Player'}`
            }
          </p>
          
          <div style={{ 
            minHeight: '60vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center' 
          }}>
            {storyLines.slice(0, currentLine).map((line, index) => (
              <p
                key={index}
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
                  lineHeight: '1.6',
                  margin: '1rem 0',
                  opacity: 0,
                  animation: `fadeIn 1s ease-in-out ${index * 0.5}s forwards`,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  maxWidth: '800px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {showStartButton && currentLine >= storyLines.length && (
          <div style={{ 
            position: 'fixed', 
            bottom: '10vh', 
            left: '50%', 
            transform: 'translateX(-50%)' 
          }}>
            <Button
              onClick={handleStartGame}
              animation="fadeIn 1s ease-in-out forwards"
            >
              {playerData.language === "zh" ? "开始游戏" : "Start Game"}
            </Button>
          </div>
        )}

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  );
}

export default CutScenePlayer;