import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import "./App.css";
import GridEngine from "grid-engine";
import DialogScene from "./DialogScene";
import preload from "./preload";
import create from "./create";
import update from "./update";

function App() {
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
          DialogScene, // ⬅️ 加入对话场景
          {
            key: "MainScene", // ⬅️ 添加你的主场景
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

export default App;
