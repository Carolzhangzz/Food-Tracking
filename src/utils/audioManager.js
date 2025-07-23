// utils/audioManager.js

import bgm from '../assets/audio/bgm.mp3'; // 确保路径正确
let bgmAudio = null;

export function playBGM() {
  try {
    if (!bgmAudio) {
      bgmAudio = new Audio(bgm);
      bgmAudio.loop = true;
    }

    const playPromise = bgmAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("BGM started");
        })
        .catch((err) => {
          console.warn("Autoplay blocked or failed:", err);
        });
    }
  } catch (error) {
    console.error("playBGM error:", error);
  }
}

export function stopBGM() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
}

export function isBGMPlaying() {
  return !!bgmAudio && !bgmAudio.paused;
}