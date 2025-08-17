// src/ui/DialogUI.js - 移除createDialogBox，因为现在由DialogScene直接处理
export function createReturnButton(scene) {
  const isMobile = scene.isMobile;
  const returnText =
    scene.playerData.language === "zh" ? "← 返回地图" : "← Back to Map";

  const buttonX = isMobile ? 20 : 40;
  const buttonY = isMobile ? 20 : 40;
  const fontSize = isMobile ? "14px" : "18px";
  const padding = isMobile ? { x: 8, y: 6 } : { x: 12, y: 8 };

  scene.returnButton = scene.add.text(buttonX, buttonY, returnText, {
    fontSize,
    fontFamily: "monospace",
    fill: "#667eea",
    backgroundColor: "#2a2a2a",
    padding,
  });
  scene.returnButton
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", () => scene.returnToMainScene())
    .on("pointerover", () => scene.returnButton.setTint(0x818cf8))
    .on("pointerout", () => scene.returnButton.clearTint());
}

export function showChoiceButtons(scene, options = {}) {
  const centerX = scene.cameras.main.centerX;
  let offsetY = scene.cameras.main.centerY - 50;

  if (!scene.dynamicButtons) {
    scene.dynamicButtons = [];
  }

  const spacing = 60; // 增加按钮间距
  const fontStyle = {
    fontSize: scene.isMobile ? "16px" : "18px", // 调整字体大小
    fontFamily: "monospace",
    fill: "#e2e8f0",
    backgroundColor: "#4a5568",
    padding: { x: 15, y: 12 }, // 增加内边距
  };

  // 清理现有按钮
  scene.dynamicButtons.forEach(button => {
    if (button && button.destroy) {
      button.destroy();
    }
  });
  scene.dynamicButtons = [];

  for (const key in options) {
    const option = options[key];

    const button = scene.add
      .text(centerX, offsetY, option.text, fontStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(25) // 确保按钮在最上层
      .on("pointerdown", () => {
        // 清理按钮
        scene.dynamicButtons.forEach(btn => {
          if (btn && btn.destroy) {
            btn.destroy();
          }
        });
        scene.dynamicButtons = [];
        
        // 执行回调
        option.onClick();
      })
      .on("pointerover", () => {
        button.setTint(0x667eea);
        button.setScale(1.05);
      })
      .on("pointerout", () => {
        button.clearTint();
        button.setScale(1);
      });

    scene.dynamicButtons.push(button);
    offsetY += spacing;
  }
}