import { pixelArtPaths } from "./pixel-world.js?v=20261018-newbie1";

// A single source of portraits for map dialogue, chapters and the opening story.
export function storyPortraitSource(characterId) {
  const npcId=characterId==="rowan"?"elder":characterId;
  const src=characterId==='castleGate'?'/FYP/images/castle/castle-gate-128.png':characterId==="alex" ? "/FYP/assets/player/png_frames/Player_Stand.png?v=20261010-assetpaths1"
    : pixelArtPaths.portraits[npcId] || pixelArtPaths.npcs[npcId] || (characterId==="sign"?pixelArtPaths.sign
    : characterId==="shadow" || characterId==="caveEntry" || characterId==="caveExit"
      ? pixelArtPaths.monsters["cave-wraith-01"] : pixelArtPaths.book);
  return {src,kind:"pixel"};
}
