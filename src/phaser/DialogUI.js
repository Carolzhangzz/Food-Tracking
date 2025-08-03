// src/ui/DialogUI.js
export function createDialogBox(scene) {
  const { width, height } = scene.scale;
  const isMobile = scene.isMobile;

  const boxHeight = isMobile ? height * 0.4 : height * 0.35;
  const boxY = height - boxHeight;
  const padding = isMobile ? 15 : 20;
  const borderRadius = isMobile ? 8 : 12;
  const fontSize = isMobile ? "14px" : "16px";
  const textPadding = isMobile ? 25 : 40;
  const lineSpacing = isMobile ? 4 : 6;

  scene.dialogBg = scene.add.graphics();
  scene.dialogBg.fillStyle(0x1a1a2e, 0.55);
  scene.dialogBg.fillRoundedRect(
    padding,
    boxY,
    width - padding * 2,
    boxHeight - 15,
    borderRadius
  );
  scene.dialogBg.lineStyle(2, 0x4a5568);
  scene.dialogBg.strokeRoundedRect(
    padding,
    boxY,
    width - padding * 2,
    boxHeight - 15,
    borderRadius
  );
  scene.dialogBg.setDepth(5);

  scene.dialogText = scene.add.text(textPadding, boxY + 20, "", {
    fontSize,
    fontFamily: "monospace",
    fill: "#e2e8f0",
    wordWrap: { width: width - textPadding * 2 },
    lineSpacing,
  });
  scene.dialogText.setDepth(10);

  const hintX = isMobile ? width - 40 : width - 60;
  const hintY = isMobile ? height - 40 : height - 50;
  scene.continueHint = scene.add.text(hintX, hintY, "▼", {
    fontSize,
    fontFamily: "monospace",
    fill: "#ffd700",
  });
  scene.continueHint.setOrigin(0.5).setVisible(false).setDepth(15);

  scene.tweens.add({
    targets: scene.continueHint,
    alpha: { from: 1, to: 0.3 },
    duration: 1000,
    yoyo: true,
    repeat: -1,
  });

  scene.dialogBoxInfo = {
    x: textPadding,
    y: boxY + 20,
    width: width - textPadding * 2,
    height: boxHeight - 40,
    maxHeight: boxHeight - 40,
  };
}

export function createReturnButton(scene) {
  const isMobile = scene.isMobile;
  const returnText =
    scene.playerData.language === "zh" ? "← 返回地图" : "← Back to Map";

  const buttonX = isMobile ? 30 : 40;
  const buttonY = isMobile ? 60 : 40;
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
  let offsetY = scene.cameras.main.centerY-50;

  if (!scene.dynamicButtons) {
    scene.dynamicButtons = [];
  }

  const spacing = 50;
  const fontStyle = {
    fontSize: "20px",
    fontFamily: "monospace",
    fill: "#e2e8f0",
    backgroundColor: "#4a5568",
    padding: { x: 10, y: 10 },
  };

  for (const key in options) {
    const option = options[key];

    const button = scene.add
      .text(centerX, offsetY, option.text, fontStyle)
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", option.onClick);

    scene.dynamicButtons.push(button);
    offsetY += spacing;
  }
}

// export function hideChoiceButtons(scene) {
//   if (!scene || !scene.choiceButtons || !Array.isArray(scene.choiceButtons)) {
//     // 隐藏之前的按钮
//     return;
//   }

//   scene.choiceButtons.forEach((btn) => btn.destroy());
//   scene.choiceButtons = [];
// }
