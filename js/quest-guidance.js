// Navigation describes the existing world. It never awards XP or advances chapters.
export const storyTargets = [
  { id: "elder", realm: "maple", x: 880, nameKey: "npc.elder.name" },
  { id: "mira", realm: "forest", x: 790, nameKey: "npc.mira.name" },
  { id: "tala", realm: "camp", x: 900, nameKey: "npc.tala.name" },
  { id: "kai", realm: "ruins", x: 870, nameKey: "npc.kai.name" },
  { id: "typing", realm: "ruins", x: 1940, nameKey: "guide.typing.name" }
];

export const echoRooms = [
  { id: "cave-wraith-01", x: 810, nameKey: "guide.echo.wraith", roomKey: "guide.echo.room1" },
  { id: "echo-slime-01", x: 1350, nameKey: "guide.echo.slime", roomKey: "guide.echo.room2" },
  { id: "echo-dragon-01", x: 1870, nameKey: "guide.echo.dragon", roomKey: "guide.echo.room3" }
];

export function echoProgress(defeatedIds = []) {
  const defeated = new Set(defeatedIds);
  return { cleared: echoRooms.filter(room => defeated.has(room.id)).length,
    next: echoRooms.find(room => !defeated.has(room.id)) || null };
}

export function echoEnemyAvailable(id, defeatedIds = []) {
  const index = echoRooms.findIndex(room => room.id === id);
  return index <= 0 || echoRooms.slice(0, index).every(room => defeatedIds.includes(room.id));
}

export function questGuidance({ chapter = 0, realm = "maple", x = 440, insideCave = false,
  tutorial = null, slimeX = 1140, defeatedIds = [] } = {}) {
  const step = Number.isFinite(chapter) ? Math.max(0, Math.min(5, Math.floor(chapter))) : 0;
  let target = storyTargets[Math.min(step, 4)];
  if (step >= 5) target = storyTargets[3]; // Kai has the existing post-ending dialogue.
  if (tutorial?.stage === "RETURN") target = storyTargets[0];
  if (["SLIME", "BATTLE"].includes(tutorial?.stage)) {
    target = { id: "slime-01", realm: "maple", x: slimeX, nameKey: "guide.slime" };
  }
  const mainTarget = target;
  const echo = echoProgress(defeatedIds);
  if (insideCave) target = echo.next
    ? { ...echo.next, realm: "ruins" }
    : { id: "exit", realm: "ruins", x: 260, nameKey: "guide.echo.exit" };
  const viaPortal = !insideCave && target.realm !== realm;
  const routeX = viaPortal ? (realm === "ruins" ? 1510 : 220) : target.x;
  const radius = viaPortal ? 112 : target.id === "typing" ? 118 : target.id === "exit" ? 112
    : target.id.endsWith("-01") ? 72 : 95;
  const direction = Math.abs(routeX - x) < radius ? "near" : routeX < x ? "left" : "right";
  return { target, mainTarget, routeX, viaPortal, direction, echo,
    routeKey: viaPortal ? "guide.route.portal." + direction
      : target.id.endsWith("-01") ? "guide.route.battle." + direction : "guide.route." + direction };
}
