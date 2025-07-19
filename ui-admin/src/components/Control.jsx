import React from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";

function Control() {
  const { playerId, playerData, setPlayerData, gameRef } =
    useContext(PlayerContext);
  const [showClueModal, setShowClueModal] = React.useState(false);

  // 获取游戏中的线索
  const getGameClues = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene');
      if (mainScene && mainScene.uiManager) {
        return mainScene.uiManager.getAllClues();
      }
    }
    return [];
  };

  const showClueJournal = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene');
      if (mainScene && mainScene.uiManager) {
        mainScene.uiManager.showClueJournal();
        return;
      }
    }
    // 降级到模态框显示
    setShowClueModal(true);
  };

  // 安全的音频控制函数
  const toggleMusic = () => {
    const newMusicState = !playerData.music;
    
    // 立即更新UI状态
    setPlayerData((prevData) => ({
      ...prevData,
      music: newMusicState,
    }));

    // 更新服务器数据
    updateUserContext(playerId, {
      ...playerData,
      music: newMusicState,
    });

    console.log("Music toggled to:", newMusicState);

    // 安全地控制游戏音频
    if (gameRef.current) {
      try {
        const mainScene = gameRef.current.scene.getScene('MainScene');
        if (mainScene) {
          // 检查场景是否有音频控制方法
          if (typeof mainScene.setPlayerData === 'function') {
            mainScene.setPlayerData({
              ...playerData,
              music: newMusicState,
            });
          } else if (typeof mainScene.playBackgroundMusic === 'function' && typeof mainScene.stopBackgroundMusic === 'function') {
            // 使用新的安全音频方法
            if (newMusicState) {
              const success = mainScene.playBackgroundMusic();
              if (!success) {
                console.warn("Failed to start background music");
                // 可选：显示通知给用户
                if (mainScene.showNotification) {
                  mainScene.showNotification("音频播放失败 / Audio playback failed");
                }
              }
            } else {
              mainScene.stopBackgroundMusic();
            }
          } else {
            console.warn("MainScene does not have audio control methods");
          }
        } else {
          console.warn("MainScene not found");
        }
      } catch (error) {
        console.error("Error controlling game audio:", error);
        // 显示用户友好的错误信息
        alert("音频控制出现问题，请刷新页面重试 / Audio control error, please refresh the page");
      }
    } else {
      console.warn("Game reference not available");
    }
  };

  return (
    <>
      {/* Top right controls */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "10px",
          zIndex: 1000,
        }}
      >
        {/* Language toggle */}
        <button
          style={styles.button}
          onClick={() => {
            const selectedLang = playerData.language === "en" ? "zh" : "en";
            updateUserContext(playerId, {
              ...playerData,
              language: selectedLang,
            });
            setPlayerData((prevData) => ({
              ...prevData,
              language: selectedLang,
            }));
            console.log("Language updated to:", selectedLang);
            
            // 安全地更新游戏场景语言
            if (gameRef.current) {
              try {
                const mainScene = gameRef.current.scene.getScene('MainScene');
                if (mainScene && typeof mainScene.setPlayerData === 'function') {
                  mainScene.setPlayerData({
                    ...playerData,
                    language: selectedLang,
                  });
                }
              } catch (error) {
                console.error("Error updating game language:", error);
              }
            }
          }}
        >
          EN/中
        </button>

        {/* Music toggle with improved error handling */}
        <button
          style={{
            ...styles.button,
            backgroundColor: playerData.music ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)",
            borderColor: playerData.music ? "#22c55e" : "#ef4444"
          }}
          onClick={toggleMusic}
          title={playerData.music ? "点击关闭音乐 / Click to mute" : "点击开启音乐 / Click to unmute"}
        >
          {playerData.music ? "🎵" : "🔇"}
        </button>

        {/* Voice toggle
        <button
          style={styles.button}
          onClick={() => {
            const originalVoice = playerData.voice;
            updateUserContext(playerId, {
              ...playerData,
              voice: !originalVoice,
            });
            setPlayerData((prevData) => ({
              ...prevData,
              voice: !originalVoice,
            }));
            
            // 安全地更新游戏场景语音设置
            if (gameRef.current) {
              try {
                const mainScene = gameRef.current.scene.getScene('MainScene');
                if (mainScene && typeof mainScene.setPlayerData === 'function') {
                  mainScene.setPlayerData({
                    ...playerData,
                    voice: !originalVoice,
                  });
                }
              } catch (error) {
                console.error("Error updating game voice settings:", error);
              }
            }
          }}
        >
          {playerData.voice ? "🔊" : "🔇"}
        </button> */}

        {/* Audio debug info (只在开发环境显示)
        {process.env.NODE_ENV === 'development' && (
          <button
            style={{
              ...styles.button,
              fontSize: "10px",
              padding: "4px 6px",
              opacity: 0.7
            }}
            onClick={() => {
              if (gameRef.current) {
                const mainScene = gameRef.current.scene.getScene('MainScene');
                if (mainScene) {
                  const audioAvailable = mainScene.isAudioAvailable ? mainScene.isAudioAvailable() : 'Unknown';
                  const bgmPlayed = mainScene.bgmPlayed || false;
                  alert(`Audio Debug:\nAvailable: ${audioAvailable}\nPlaying: ${bgmPlayed}\nMusic Setting: ${playerData.music}`);
                }
              }
            }}
            title="Audio Debug Info"
          >
            🔧
          </button> */}
        {/* )} */}
      </div>

      {/* Bottom left clue button */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          zIndex: 1000,
        }}
      >
        <button
          style={{
            ...styles.button,
            padding: "clamp(8px, 3vw, 16px)",
            fontSize: "clamp(12px, 3vw, 18px)",
            backgroundColor: "rgba(74, 85, 104, 0.9)",
            border: "2px solid #718096",
            borderRadius: "clamp(6px, 2vw, 10px)",
            backdropFilter: "blur(10px)"
          }}
          onClick={showClueJournal}
        >
          📝 {playerData.language === 'zh' ? '线索本' : 'Clues'}
        </button>
      </div>

      {/* Fallback modal for clues */}
      {showClueModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            backdropFilter: "blur(10px)"
          }}
        >
          <div
            className="clue-modal"
            style={{
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a2e 100%)",
              border: "4px solid #4a5568",
              borderRadius: "clamp(8px, 2vw, 15px)",
              padding: "clamp(20px, 5vw, 40px)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              color: "#e2e8f0",
              fontFamily: "'Courier New', monospace",
              maxWidth: "min(90vw, 600px)",
              maxHeight: "80vh",
              overflowY: "auto",
              minWidth: "300px",
            }}
          >
            <h2 style={{ 
              margin: "0 0 clamp(15px, 4vw, 25px) 0", 
              textAlign: "center",
              fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
              color: "#ffd700"
            }}>
              {playerData.language === 'zh' ? '线索记录本' : 'Clue Notebook'}
            </h2>
            
            {(() => {
              const clues = getGameClues();
              if (clues.length === 0) {
                return (
                  <p style={{ 
                    textAlign: "center", 
                    color: "#718096",
                    fontSize: "clamp(0.9rem, 3vw, 1.1rem)"
                  }}>
                    {playerData.language === 'zh' ? '暂无线索' : 'No clues yet'}
                  </p>
                );
              }
              return clues.map((clue, index) => (
                <div key={index} style={{ 
                  marginBottom: "clamp(10px, 3vw, 20px)", 
                  padding: "clamp(8px, 2vw, 15px)", 
                  backgroundColor: "rgba(26, 26, 46, 0.8)", 
                  borderRadius: "clamp(4px, 1vw, 8px)",
                  border: "1px solid rgba(74, 85, 104, 0.5)"
                }}>
                  <strong style={{ 
                    color: "#ffd700",
                    fontSize: "clamp(0.9rem, 3vw, 1.1rem)"
                  }}>{clue.npcName}:</strong>
                  <p style={{ 
                    margin: "clamp(4px, 1vw, 8px) 0 0 0", 
                    lineHeight: "1.5",
                    fontSize: "clamp(0.8rem, 2.5vw, 1rem)"
                  }}>{clue.clue}</p>
                </div>
              ));
            })()}
            
            <div style={{ textAlign: "center", marginTop: "clamp(15px, 4vw, 25px)" }}>
              <button 
                style={{
                  padding: "clamp(8px, 2vw, 15px) clamp(15px, 4vw, 25px)",
                  backgroundColor: "#667eea",
                  color: "#ffffff",
                  border: "2px solid #818cf8",
                  borderRadius: "clamp(4px, 1vw, 8px)",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "clamp(0.8rem, 2.5vw, 1rem)",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseDown={(e) => {
                  e.target.style.transform = "translateY(2px)";
                  e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
                }}
                onMouseUp={(e) => {
                  e.target.style.transform = "translateY(0px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#818cf8";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#667eea";
                }}
                onClick={() => setShowClueModal(false)}
              >
                {playerData.language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  button: {
    padding: "clamp(6px, 2vw, 12px)",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "clamp(4px, 1vw, 8px)",
    cursor: "pointer",
    fontSize: "clamp(11px, 2.5vw, 16px)",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    minWidth: "clamp(35px, 8vw, 50px)",
    minHeight: "clamp(35px, 8vw, 50px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
};

export default Control;