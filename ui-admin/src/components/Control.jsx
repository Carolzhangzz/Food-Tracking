import React from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";

function Control() {
  const { playerId, playerData, setPlayerData, gameRef } =
    useContext(PlayerContext);
  const [showClueModal, setShowClueModal] = React.useState(false);

  return (
    <>
      <div
        className="game-container"
        style={{ position: "absolute", width: "100vw", height: "100vh" }}
      >
        <div id="game" style={{ width: "100%", height: "100%" }}></div>

        {/* Top right controls */}
        <div
          style={{
            position: "absolute",
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
              if (gameRef.current) {
                // After game is created
                const mainScene = gameRef.current.scene.keys.MainScene;
                if (mainScene.setPlayerData) {
                  mainScene.setPlayerData({
                    ...playerData,
                    language: selectedLang,
                  });
                }
              }
            }}
          >
            EN/中
          </button>

          {/* Music toggle */}
          <button
            style={styles.button}
            onClick={() => {
              // Toggle music setting
              let originalMusic = playerData.music;
              updateUserContext(playerId, {
                ...playerData,
                music: !originalMusic,
              });
              setPlayerData((prevData) => ({
                ...prevData,
                music: !originalMusic,
              }));
              if (gameRef.current) {
                // After game is created
                const mainScene = gameRef.current.scene.keys.MainScene;
                if (mainScene.setPlayerData) {
                  mainScene.setPlayerData({
                    ...playerData,
                    music: !originalMusic,
                  });
                }
              }
            }}
          >
            {playerData.music ? "🎵" : "🔇"}
          </button>

          {/* Voice toggle */}
          <button
            style={styles.button}
            onClick={() => {
              // Toggle voice setting
              let originalVoice = playerData.voice;
              playerData.voice = !originalVoice;
              updateUserContext(playerId, {
                ...playerData,
                voice: !originalVoice,
              });
              setPlayerData((prevData) => ({
                ...prevData,
                voice: !originalVoice,
              }));
              if (gameRef.current) {
                // After game is created
                const mainScene = gameRef.current.scene.keys.MainScene;
                if (mainScene.setPlayerData) {
                  mainScene.setPlayerData({
                    ...playerData,
                    voice: !originalVoice,
                  });
                }
              }
            }}
          >
            {playerData.voice ? "🔊" : "🔇"}
          </button>

          {/* Clue notebook */}
          <button
            style={styles.button}
            onClick={() => {
              setShowClueModal(!showClueModal);
            }}
          >
            📝
          </button>
        </div>
      </div>
      {showClueModal && (
        <div
          className="clue-modal"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
            background: "#2a2a2a",
            border: "4px solid #d4d4d4",
            borderRadius: "0",
            padding: "20px",
            boxShadow: "8px 8px 0px #000",
            color: "#d4d4d4",
            fontFamily: "'Courier New', monospace",
            imageRendering: "pixelated",
            width: "400px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <h2>Clue Notebook</h2>
          {playerData.cues.map((clue, index) => (
            <div key={index} style={{ marginBottom: "5px" }}>
              <p>{clue}</p>
            </div>
          ))}
          <button 
          style={{
            padding: "8px 16px",
            backgroundColor: "#4a4a4a",
            color: "#d4d4d4",
            border: "2px solid #6a6a6a",
            borderRadius: "0",
            cursor: "pointer",
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            fontWeight: "bold",
            textTransform: "uppercase",
            imageRendering: "pixelated",
            boxShadow: "2px 2px 0px #000",
            transition: "none"
          }}
          onMouseDown={(e) => {
            e.target.style.boxShadow = "1px 1px 0px #000";
            e.target.style.transform = "translate(1px, 1px)";
          }}
          onMouseUp={(e) => {
            e.target.style.boxShadow = "2px 2px 0px #000";
            e.target.style.transform = "translate(0px, 0px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = "2px 2px 0px #000";
            e.target.style.transform = "translate(0px, 0px)";
          }}
          onClick={(e) => setShowClueModal(false)}>close</button>
        </div>
      )}
    </>
  );
}

const styles = {
  button: {
    padding: "8px 12px",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Control;
