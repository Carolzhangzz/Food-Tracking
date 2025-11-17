// utils/audioManager.js

import bgm from '../assets/audio/bgm.mp3';

let bgmAudio = null;
let isInitialized = false;
let pendingPlay = false;

// 预加载音频
function initializeAudio() {
  if (isInitialized) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    try {
      bgmAudio = new Audio(bgm);
      bgmAudio.loop = true;
      bgmAudio.preload = 'auto';
      
      // 监听加载完成
      bgmAudio.addEventListener('canplaythrough', () => {
        isInitialized = true;
        console.log("BGM audio initialized");
        resolve();
      });
      
      bgmAudio.addEventListener('error', (err) => {
        console.warn("BGM audio failed to load:", err);
        isInitialized = true; // 即使失败也标记为已初始化
        resolve();
      });
      
      // 开始加载
      bgmAudio.load();
      
    } catch (error) {
      console.error("Audio initialization error:", error);
      isInitialized = true;
      resolve();
    }
  });
}

export async function playBGM() {
  try {
    // 确保音频已初始化
    await initializeAudio();
    
    if (!bgmAudio) {
      console.warn("BGM audio not available");
      return;
    }

    const playPromise = bgmAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("BGM started");
          pendingPlay = false;
        })
        .catch((err) => {
          console.warn("Autoplay blocked or failed:", err);
          pendingPlay = true; // 标记为待播放
        });
    }
  } catch (error) {
    console.error("playBGM error:", error);
  }
}

export function stopBGM() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    pendingPlay = false;
  }
}

export function isBGMPlaying() {
  return !!bgmAudio && !bgmAudio.paused;
}

// 用户交互后尝试播放
export function tryPlayAfterUserInteraction() {
  if (pendingPlay && bgmAudio) {
    playBGM();
  }
}