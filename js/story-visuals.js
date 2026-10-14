import { pixelArtPaths } from "./pixel-world.js?v=20261014-inputfix";

// A single source of portraits for map dialogue, chapters and the opening story.
export function storyPortraitSource(characterId) {
  const npcId=characterId==="rowan"?"elder":characterId;
  const src=characterId==="alex" ? "/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1"
    : pixelArtPaths.portraits[npcId] || pixelArtPaths.npcs[npcId] || (characterId==="sign"?pixelArtPaths.sign
    : characterId==="shadow" || characterId==="caveEntry" || characterId==="caveExit"
      ? pixelArtPaths.monsters["cave-wraith-01"] : pixelArtPaths.book);
  return {src,kind:"pixel"};
}
