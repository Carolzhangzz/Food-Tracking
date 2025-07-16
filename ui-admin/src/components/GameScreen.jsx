// src/components/GameScreen.jsx
import React, { useEffect } from "react";
import Phaser from "phaser";
import GridEngine from "grid-engine";
import MainScene from "../phaser/MainScene";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { useNavigate } from "react-router-dom";
import { updateUserContext } from "../utils/update";
import Control from "./Control";

function GameScreen() {
  const { playerId, playerData, setPlayerData, gameRef } =
    useContext(PlayerContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerId) {
      // alert("Please log in first!");
      navigate("/");
    } else if (!playerData.first) {
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
    } else {
      console.log("Player ID:", playerId);
      console.log("Player Data:", playerData);
    }
  }, [playerId, playerData, navigate]);

  const updatePlayerdata = React.useCallback(
    (data) => {
      // Do something in React, e.g., update state, show modal, etc.
      console.log("Player data updated:", data);
      setPlayerData((prevData) => ({ ...prevData, ...data }));
      updateUserContext(playerId, data);
    },
    [playerId, setPlayerData]
  );

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
        scene: [MainScene],
        scale: {
          width: parseInt(
            window.innerWidth ||
              document.documentElement.clientWidth ||
              document.body.clientWidth
          ),
          height: parseInt(
            window.innerHeight ||
              document.documentElement.clientHeight ||
              document.body.clientHeight
          ),
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        parent: "game",
        backgroundColor: "#48C4F8",
      });

      // Start the scene with data to pass to init(data)
      gameRef.current.scene.start("MainScene", {
        playerId,
        playerData,
        updatePlayerdata,
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameRef]);

  return (
    <>
      {playerData === null ? (
        <></>
      ) : (
        <>
          <Control />
          <div id="game"></div>
        </>
      )}{" "}
    </>
  );
}

export default GameScreen;
