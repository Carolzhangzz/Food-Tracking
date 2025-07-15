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
      // alert("Please log in first!");
      navigate("/");
    } else if (!playerData.first) {
      navigate("/game");
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
    } else {
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
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
  ] :
    [
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
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      const buttonTimer = setTimeout(() => {
        setShowStartButton(true);
      }, 1000);
      return () => clearTimeout(buttonTimer);
    }
  }, [currentLine, storyLines.length]);

  const handleStartGame = (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    // Add your start game logic here
    console.log("Starting game...");
    navigate("/game");
  };

  return (<>
    {playerData === null ? (<></>) :
      (
        <>
          <Control />
          <div className="cutscene-player" style={{
            background: '#000',
            color: '#d4d4d4ff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '60px 20px'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', marginBottom: '-20px' }}>
              <p style={{
                fontSize: '1.5rem',
                color: '#d4d4d4ff',
                marginTop: '0px',
                textAlign: 'center'
              }}>
                {playerData.language === 'zh' ? `欢迎回来，玩家 ${playerData.firstName}` :
                  `Welcome back, Player ${playerData.firstName}`}
              </p>
              {storyLines.slice(0, currentLine).map((line, index) => (
                <p
                  key={index}
                  style={{
                    fontSize: '1rem',
                    margin: '15px 0',
                    opacity: 0,
                    animation: `fadeIn 0.5s ease-in-out ${index * 1}s forwards`
                  }}
                >
                  {line}
                </p>
              ))}
            </div>

            {showStartButton && currentLine >= storyLines.length && (
              <Button
                onClick={(e) => handleStartGame(e)}
                animation="fadeIn 0.5s ease-in-out forwards"
              >
                {playerData.language === "zh" ? "开始游戏" : "Start Game"}
              </Button>
            )}

            <style jsx>{`
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
          </div>
        </>
      )}
  </>)
}


export default CutScenePlayer; 