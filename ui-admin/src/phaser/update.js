import Phaser from "phaser";


export default function update(time, delta) {

  // 如果是玩家视角
  if (this.playerView) {
    const playerPos = this.gridEngine.getPosition("player");
    const npcPos = this.gridEngine.getPosition("npc1");

    // 判断是否邻近 NPC
    const isNextToNPC =
      Math.abs(playerPos.x - npcPos.x) + Math.abs(playerPos.y - npcPos.y) === 1;

    // 玩家按下空格键（对话键）
    if (isNextToNPC && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.showDialog("你好，我是NPC，有什么我可以帮忙的吗？");
      this.gridEngine.turnTowards("npc1", "player");
    }

    // 玩家移动
    if (this.cursors.left.isDown) {
      this.agent.moveAndCheckCollision("left", this.fieldMapTileMap);
    } else if (this.cursors.right.isDown) {
      this.agent.moveAndCheckCollision("right", this.fieldMapTileMap);
    } else if (this.cursors.up.isDown) {
      this.agent.moveAndCheckCollision("up", this.fieldMapTileMap);
    } else if (this.cursors.down.isDown) {
      this.agent.moveAndCheckCollision("down", this.fieldMapTileMap);
    }
  } 
  // 如果是 overview 模式
  else {
    this.controls.update(delta);
  }
}
