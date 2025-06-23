import mapJson from "./assets/GPTRPGMap.json"
import tileset from "./assets/v2.png"
import characters from "./assets/characters.png"
import npc from "./assets/npc.png"

export default function preload() {
  this.load.image("tiles", tileset, {
    frameWidth: 16,
    frameHeight: 16,
  });

  this.load.tilemapTiledJSON("field-map", mapJson);
  this.load.spritesheet("player", characters, {
    frameWidth: 26,
    frameHeight: 36,
  });
  
  // npc不是精灵图
  this.load.image("npc", npc, {
    frameWidth: 16,
    frameHeight: 16,
  });

  this.load.spritesheet("plant", tileset, {
    frameWidth: 16,
    frameHeight: 16,
  });
}
