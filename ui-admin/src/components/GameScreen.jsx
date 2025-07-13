// src/components/GameScreen.jsx
import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import GridEngine from "grid-engine";
import DialogScene from "../phaser/DialogScene";
import preload from "../phaser/preload";
import create from "../phaser/create";
import update from "../phaser/update";

function GameScreen() {
  const gameRef = useRef(null);

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

  return <div id="game"></div>;
}

export default GameScreen;
