import React from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";
import { playBGM, stopBGM } from "../utils/audioManager"; // 如果你已经抽离音乐逻辑

function Control() {
  const { playerId, playerData, setPlayerData, gameRef } =
    useContext(PlayerContext);
  const [showClueModal, setShowClueModal] = React.useState(false);

  const getGameClues = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene("MainScene");
      if (mainScene && mainScene.uiManager) {
        return mainScene.uiManager.getAllClues();
      }
    }
    return [];
  };

  const showClueJournal = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene("MainScene");
      if (mainScene && mainScene.uiManager) {
        mainScene.uiManager.showClueJournal();
        return;
      }
    }
    setShowClueModal(true);
  };

  const toggleMusic = () => {
    const newMusicState = !playerData.music;

    setPlayerData((prevData) => ({
      ...prevData,
      music: newMusicState,
    }));

    updateUserContext(playerId, {
      ...playerData,
      music: newMusicState,
    });

    if (newMusicState) {
      playBGM(); // 安全播放
    } else {
      stopBGM(); // 停止播放
    }

    if (gameRef.current) {
      try {
        const mainScene = gameRef.current.scene.getScene("MainScene");
        if (mainScene && typeof mainScene.setPlayerData === "function") {
          mainScene.setPlayerData({
            ...playerData,
            music: newMusicState,
          });
        }
      } catch (error) {
        console.error("Error controlling game audio:", error);
        alert("音频控制出现问题，请刷新页面重试 / Audio control error, please refresh the page");
      }
    }
  };

  const toggleLanguage = () => {
    const selectedLang = playerData.language === "en" ? "zh" : "en";
    updateUserContext(playerId, {
      ...playerData,
      language: selectedLang,
    });
    setPlayerData((prevData) => ({
      ...prevData,
      language: selectedLang,
    }));

    if (gameRef.current) {
      try {
        const mainScene = gameRef.current.scene.getScene("MainScene");
        if (mainScene && typeof mainScene.setPlayerData === "function") {
          mainScene.setPlayerData({
            ...playerData,
            language: selectedLang,
          });
        }
      } catch (error) {
        console.error("Error updating game language:", error);
      }
    }
  };

  return (
    <>
      {/* 顶部右侧控制栏 */}
      <div style={styles.topRightBar}>
        <button style={styles.button} onClick={toggleLanguage}>
          EN/中
        </button>

        <button
          style={{
            ...styles.button,
            backgroundColor: playerData.music
              ? "rgba(34, 197, 94, 0.8)"
              : "rgba(239, 68, 68, 0.8)",
            borderColor: playerData.music ? "#22c55e" : "#ef4444",
          }}
          onClick={toggleMusic}
          title={
            playerData.music
              ? "点击关闭音乐 / Click to mute"
              : "点击开启音乐 / Click to unmute"
          }
        >
          {playerData.music ? "🎵" : "🔇"}
        </button>
      </div>

      {/* 左上角线索按钮 */}
      <div style={styles.topLeft}>
        <button
          style={styles.clueButton}
          onClick={showClueJournal}
        >
          📝 {playerData.language === "zh" ? "线索本" : "Clues"}
        </button>
      </div>

      {/* 线索模态框 */}
      {showClueModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>
              {playerData.language === "zh" ? "线索记录本" : "Clue Notebook"}
            </h2>
            {(() => {
              const clues = getGameClues();
              if (clues.length === 0) {
                return (
                  <p style={styles.noClueText}>
                    {playerData.language === "zh" ? "暂无线索" : "No clues yet"}
                  </p>
                );
              }
              return clues.map((clue, index) => (
                <div key={index} style={styles.clueCard}>
                  <strong style={styles.clueName}>{clue.npcName}:</strong>
                  <p style={styles.clueText}>{clue.clue}</p>
                </div>
              ));
            })()}

            <div style={{ textAlign: "center", marginTop: "clamp(15px, 4vw, 25px)" }}>
              <button
                style={styles.closeButton}
                onClick={() => setShowClueModal(false)}
              >
                {playerData.language === "zh" ? "关闭" : "Close"}
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
    padding: "clamp(4px, 2vw, 12px)",
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
    justifyContent: "center",
  },
  topRightBar: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    gap: "10px",
    zIndex: 1000,
  },
  topLeft: {
    position: "fixed",
    top: "5px",
    left: "5px",
    zIndex: 1000,
  },
  clueButton: {
    padding: "clamp(8px, 3vw, 16px)",
    fontSize: "clamp(12px, 3vw, 18px)",
    backgroundColor: "rgba(74, 85, 104, 0.9)",
    border: "2px solid #718096",
    borderRadius: "clamp(6px, 2vw, 10px)",
    backdropFilter: "blur(10px)",
    color: "white",
    fontFamily: "'Courier New', monospace",
  },
  modalBackdrop: {
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
    backdropFilter: "blur(10px)",
  },
  modalContent: {
    background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a2e 100%)",
    border: "4px solid #4a5568",
    borderRadius: "clamp(8px, 2vw, 15px)",
    padding: "clamp(20px, 2vw, 20px)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
    color: "#e2e8f0",
    fontFamily: "'Courier New', monospace",
    maxWidth: "min(90vw, 600px)",
    maxHeight: "80vh",
    overflowY: "auto",
    minWidth: "300px",
  },
  modalTitle: {
    margin: "0 0 clamp(15px, 4vw, 25px) 0",
    textAlign: "center",
    fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
    color: "#ffd700",
  },
  noClueText: {
    textAlign: "center",
    color: "#718096",
    fontSize: "clamp(0.9rem, 3vw, 1.1rem)",
  },
  clueCard: {
    marginBottom: "clamp(10px, 3vw, 20px)",
    padding: "clamp(8px, 2vw, 15px)",
    backgroundColor: "rgba(26, 26, 46, 0.8)",
    borderRadius: "clamp(4px, 1vw, 8px)",
    border: "1px solid rgba(74, 85, 104, 0.5)",
  },
  clueName: {
    color: "#ffd700",
    fontSize: "clamp(0.9rem, 3vw, 1.1rem)",
  },
  clueText: {
    margin: "clamp(4px, 1vw, 8px) 0 0 0",
    lineHeight: "1.5",
    fontSize: "clamp(0.8rem, 2.5vw, 1rem)",
  },
  closeButton: {
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
    transition: "all 0.3s ease",
  },
};

export default Control;
