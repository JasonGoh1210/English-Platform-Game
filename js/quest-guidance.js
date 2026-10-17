// Navigation describes the existing world. It never awards XP or advances chapters.
export const storyTargets = [
  { id: "elder", realm: "maple", x: 880, nameKey: "npc.elder.name" },
  { id: "mira", realm: "forest", x: 790, nameKey: "npc.mira.name" },
  { id: "tala", realm: "camp", x: 900, nameKey: "npc.tala.name" },
  { id: "kai", realm: "ruins", x: 870, nameKey: "npc.kai.name" },
  { id: "typing", realm: "ruins", x: globalThis.window?.EPQ_AUTH?.worldLayout?.finalCastleX || 4480, nameKey: "guide.typing.name" }
];

export const echoRooms = [
  { id: "cave-wraith-01", x: 810, nameKey: "guide.echo.wraith", roomKey: "guide.echo.room1" },
  { id: "echo-slime-01", x: 1350, nameKey: "guide.echo.slime", roomKey: "guide.echo.room2" },
  { id: "echo-dragon-01", x: 1870, nameKey: "guide.echo.dragon", roomKey: "guide.echo.room3" }
];

export function echoProgress(defeatedIds = [], rooms = echoRooms) {
  const defeated = new Set(defeatedIds);
  return { cleared: rooms.filter(room => defeated.has(room.id)).length,
    next: rooms.find(room => !defeated.has(room.id)) || null };
}

export function echoEnemyAvailable(id, defeatedIds = [], rooms = echoRooms) {
  const index = rooms.findIndex(room => room.id === id);
  return index >= 0 && (index === 0 || rooms.slice(0, index).every(room => defeatedIds.includes(room.id)));
}

export function questGuidance({ chapter = 0, realm = "maple", x = 440, insideCave = false,
  tutorial = null, slimeX = 1140, defeatedIds = [], rooms = echoRooms, dungeonAccess = null, castle = null } = {}) {
  const step = Number.isFinite(chapter) ? Math.max(0, Math.min(5, Math.floor(chapter))) : 0;
  let target = storyTargets[Math.min(step, 4)];
  if (step >= 5) target = storyTargets[3]; // Kai has the existing post-ending dialogue.
  if (tutorial?.stage === "RETURN") target = storyTargets[0];
  if (["SLIME", "BATTLE"].includes(tutorial?.stage)) {
    target = { id: "slime-01", realm: "maple", x: slimeX, nameKey: "guide.slime" };
  }
  const mainTarget = target;
  if (target.id === "typing" && dungeonAccess?.ruins === false) {
    target={id:"guardian-01",realm:"ruins",x:1150,nameKey:"dungeon.gate.guardian-01"};
  } else if(target.id==='typing'&&castle&&!castle.gateOpen) {
    const layout=globalThis.window?.EPQ_AUTH?.worldLayout;
    target=!castle.treeCleared?{id:'hollow-treant-01',realm:'ruins',x:layout?.treantX||2700,nameKey:'castle.treant'}
      :!castle.hasKey?{id:'castle-warden-01',realm:'ruins',x:layout?.castleWardenX||3580,nameKey:'castle.warden'}
      :{id:'castle-gate',realm:'ruins',x:layout?.castleGateX||3820,nameKey:'castle.unlock'};
  }
  const echo = echoProgress(defeatedIds,rooms);
  if (insideCave) target = echo.next
    ? { ...echo.next, realm }
    : { id: "exit", realm, x: 260, nameKey: "dungeon.exit" };
  const viaPortal = !insideCave && target.realm !== realm;
  const routeX = viaPortal ? 220 : target.x;
  const radius = viaPortal ? 112 : target.id==='castle-gate'?180 : target.id === "typing" ? 118 : target.id === "exit" ? 112
    : target.id.endsWith("-01") ? 72 : 95;
  const direction = Math.abs(routeX - x) < radius ? "near" : routeX < x ? "left" : "right";
  return { target, mainTarget, routeX, viaPortal, direction, echo,
    routeKey: viaPortal ? "guide.route.portal." + direction
      : target.id.endsWith("-01") ? "guide.route.battle." + direction : "guide.route." + direction };
}
