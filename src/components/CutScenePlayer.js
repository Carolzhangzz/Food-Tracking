import React, { useState, useContext, useEffect, useMemo } from "react";
import { PlayerContext } from "../context/PlayerContext";
import Button from "./Button";
import { useNavigate } from "react-router-dom";
import Control from "./Control";
import { playBGM, stopBGM } from "../utils/audioManager";

function CutScenePlayer() {
  const { playerId, playerData } = useContext(PlayerContext);
  const [currentLine, setCurrentLine] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);
  const navigate = useNavigate();

  // 以“玩家ID”为粒度记忆是否看过过场
  const SEEN_KEY = useMemo(
    () => (playerId ? `cutsceneSeen_v1_${playerId}` : "cutsceneSeen_v1"),
    [playerId]
  );

  // ① 若该玩家之前看过（或点击跳过过），直接进游戏
  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    if (seen === "1") {
      navigate("/game");
    }
  }, [SEEN_KEY, navigate]);

  // 播放背景音乐（你原来的逻辑，保留）
  useEffect(() => {
    if (playerData?.music) {
      playBGM();
    }
    return () => stopBGM(); // 页面卸载时关闭背景音乐
  }, [playerData?.music]);

  // 如果没有 playerId，重定向回首页（保留你原逻辑）
  useEffect(() => {
    if (!playerId) {
      navigate("/");
    }
  }, [playerId, navigate]);

  // 故事文本（保留你原来的中英两套内容）
  const storyLines =
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
        ];

  // 逐行淡入（保留你的节奏，稍微拉长到 1200ms 可读性更好）
  useEffect(() => {
    if (currentLine < storyLines.length) {
      const timer = setTimeout(() => {
        setCurrentLine((n) => n + 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      const buttonTimer = setTimeout(() => {
        setShowStartButton(true);
      }, 600);
      return () => clearTimeout(buttonTimer);
    }
  }, [currentLine, storyLines.length]);

  const goToGame = () => navigate("/game");

  // 点击“开始/了解了”：同时记为“已看过”
  const handleStartGame = (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    goToGame();
  };

  // ② 右上角“跳过/Skip”按钮：随时可跳过，也会记为“已看过”
  const handleSkip = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    goToGame();
  };

  if (!playerData) {
    // 你的 loading 占位（保留，但我们把字体从 monospace 换成更清晰的 UI 字体）
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontSize: "1.2rem",
          fontFamily:
            "Noto Sans TC, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "2rem",
              marginBottom: "1rem",
              animation: "pulse 2s infinite",
            }}
          >
            🍳
          </div>
          <p>Loading your story...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Control />
      {/* 跳过按钮（右上角，随时可点） */}
      <button
        onClick={handleSkip}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 2100,
          padding: "10px 14px",
          fontSize: "14px",
          fontWeight: 700,
          borderRadius: 8,
          border: "2px solid #334155",
          color: "#e2e8f0",
          background: "rgba(15,23,42,0.75)",
          cursor: "pointer",
          backdropFilter: "blur(4px)",
          fontFamily:
            "Noto Sans TC, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
        title={playerData.language === "zh" ? "跳过" : "Skip"}
      >
        {playerData.language === "zh" ? "跳过" : "Skip"}
      </button>

      <div
        className="cutscene-player"
        style={{
          background:
            "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
          color: "#e2e8f0",
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "20px",
          boxSizing: "border-box",
          // 字体从 monospace 改为高清晰 UI 字体
          fontFamily:
            "Noto Sans TC, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        }}
      >
        <p
          style={{
            fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
            color: "#ffd700",
            marginBottom: "1rem",
            marginTop: "2rem",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          {playerData.language === "zh"
            ? `欢迎回来，${playerData.firstName || "玩家"}`
            : `Welcome back, ${playerData.firstName || "Player"}`}
        </p>

        {/* 内容+按钮区域 */}
        <div
          style={{
            flex: 1,
            maxHeight: "80vh",
            width: "100%",
            maxWidth: "800px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div className="text-block" style={{ paddingBottom: "2rem" }}>
            {storyLines.slice(0, currentLine).map((line, index) => (
              <p
                key={index}
                style={{
                  fontSize: "clamp(0.95rem, 2.5vw, 1.2rem)",
                  lineHeight: 1.7,
                  margin: "1rem 0",
                  opacity: 0,
                  animation: `fadeIn 0.9s ease-in-out ${index * 0.5}s forwards`,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                  textAlign: "center",
                }}
              >
                {line}
              </p>
            ))}
          </div>

          {showStartButton && currentLine >= storyLines.length && (
            <div
              style={{
                width: "100%",
                textAlign: "center",
                marginBottom: "10rem",
              }}
            >
              <Button onClick={handleStartGame} animation="fadeIn 1s forwards">
                {playerData.language === "zh" ? "了解了" : "Got it"}
              </Button>
            </div>
          )}
        </div>

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
        `}</style>
      </div>
    </>
  );
}

export default CutScenePlayer;
