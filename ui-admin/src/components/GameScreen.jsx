// src/components/GameScreen.jsx
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import GridEngine from "grid-engine";
import DialogScene from "../phaser/DialogScene";
import preload from "../phaser/preload";
import create from "../phaser/create";
import update from "../phaser/update";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";

function GameScreen() {
  const { playerId, playerData } = useContext(PlayerContext);
  const navigate = useNavigate();
  const gameRef = useRef(null);

  useEffect(() => {
    if (!playerId) {
      alert("Please log in first!");
      navigate("/");
    } else if (!playerData.first) {
      navigate("/intro");
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
    } else {
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
    }
  }, [playerId, playerData, navigate]);

  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = new Phaser.Game({
        title: "Food Tracking",
        render: {
          antialias: false,
        },
        type: Phaser.AUTO,
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
        scene: [
          DialogScene,
          {
            key: "MainScene",
            preload,
            create,
            update,
          },
        ],
        scale: {
          width: window.innerWidth,
          height: window.innerHeight,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        parent: "game",
        backgroundColor: "#48C4F8",
      });
    }
  }, []);

  return (
    <div className="game-container" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div id="game" style={{ width: '100%', height: '100%' }}></div>
      
      {/* Top right controls */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        display: 'flex', 
        gap: '10px',
        zIndex: 1000 
      }}>
        {/* Language toggle */}
        <button style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          EN/中
        </button>
        
        {/* Music toggle */}
        <button style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          🎵
        </button>
        
        {/* Voice toggle */}
        <button style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          🔊
        </button>
        
        {/* Clue notebook */}
        <button style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          📝
        </button>
      </div>
    </div>
  );
}

export default GameScreen;
