const LANGUAGE_KEY = "englishPowerQuest.language.v1";

const messages = {
  en: {
    "settings.button": "⚙ SETTINGS",
    "settings.title": "SETTINGS",
    "settings.subtitle": "Make the game comfortable for you.",
    "settings.language": "LANGUAGE / 语言",
    "settings.english": "English",
    "settings.chinese": "简体中文",
    "settings.close": "CLOSE",
    "settings.saved": "Your language choice is saved automatically.",
    "common.back": "BACK",
    "player.name": "Rookie",
    "player.level": "Lv.",
    "quest.main": "MAIN QUEST",
    "dialogue.continue": "Continue ▸",
    "controls.left": "Move left",
    "controls.right": "Move right",
    "controls.interact": "Interact",
    "controls.hint": "A / D or ← / → to move  •  E / SPACE to interact",
    "location.maple": "MAPLE TOWN",
    "location.forest": "WHISPERING FOREST",
    "location.camp": "OLD CAMP ROAD",
    "location.ruins": "ANCIENT RUINS",
    "quest.first.title": "The First Words",
    "quest.first.text": "Find the village elder.",
    "quest.forest.title": "Into Whispering Forest",
    "quest.forest.text": "Walk east and find the old camp.",
    "quest.road.title": "The Silent Road",
    "quest.road.text": "Reach the ancient gate.",
    "npc.elder.name": "Elder Rowan",
    "npc.elder.title": "Village Elder",
    "npc.mira.name": "Mira",
    "npc.mira.title": "Wandering Merchant",
    "npc.kai.name": "Kai",
    "npc.kai.title": "System Keeper",
    "npc.sign.name": "Road Sign",
    "npc.elder.1": "Welcome to Maple Town, traveller.",
    "npc.elder.2": "The old road beyond the forest has gone silent.",
    "npc.elder.3": "If you want to help, follow the lanterns and learn the words of the road.",
    "npc.mira.1": "You are heading into Whispering Forest, aren't you?",
    "npc.mira.2": "Remember: understanding a message can be more useful than a sharp sword.",
    "npc.mira.3": "I will wait here until you return.",
    "npc.kai.1": "These ruins belonged to the old network builders.",
    "npc.kai.2": "Their signs are written in technical English.",
    "npc.kai.3": "Bring me the right words and I can reopen the gate.",
    "npc.sign.text": "The sign reads: “The forest path is quiet, but the old words still remain.”",
    "destination.top": "WORLD GATE · 01",
    "destination.kicker": "THE ANCIENT PORTAL",
    "destination.title": "REALM GATE",
    "destination.choose": "CHOOSE YOUR DESTINATION",
    "destination.safe": "SAFE HAVEN",
    "destination.vocab": "VOCABULARY TRAIL",
    "destination.survival": "SURVIVAL ROUTE",
    "destination.challenge": "ANCIENT CHALLENGE",
    "destination.maple.name": "Maple Town",
    "destination.maple.description": "A peaceful village where your adventure and first words begin.",
    "destination.forest.name": "Whispering Forest",
    "destination.forest.description": "Follow the lantern-lit path and uncover the language hidden in the woods.",
    "destination.camp.name": "Old Camp Road",
    "destination.camp.description": "Rest by the old camp before travelling deeper into the forgotten road.",
    "destination.ruins.name": "Ancient Ruins",
    "destination.ruins.description": "Explore the silent stone ruins and the secrets of the old network builders.",
    "destination.previous": "Previous destination",
    "destination.next": "Next destination",
    "destination.select": "Choose a destination",
    "destination.select.maple": "Select Maple Town",
    "destination.select.forest": "Select Whispering Forest",
    "destination.select.camp": "Select Old Camp Road",
    "destination.select.ruins": "Select Ancient Ruins",
    "destination.back": "↩ BACK TO MAP",
    "destination.travel": "TRAVEL HERE",
    "destination.help": "← / → CHANGE LOCATION  ·  ENTER TRAVEL  ·  ESC CLOSE",
    "portal.name": "REALM GATE",
    "portal.interact": "E / INTERACT TO TRAVEL",
    "battle.kicker": "WILD ENCOUNTER",
    "battle.back": "RUN TO MAP",
    "battle.scene": "Battle scene",
    "battle.wordCreature": "WORD CREATURE",
    "battle.forestEnemy": "FOREST ENEMY",
    "battle.ancientGuardian": "ANCIENT GUARDIAN",
    "battle.you": "YOU",
    "battle.adventurer": "LANGUAGE ADVENTURER",
    "battle.initialMessage": "A wild opponent appeared!",
    "battle.whatDo": "What will you do?",
    "battle.chooseAction": "Choose an action.",
    "battle.fight": "FIGHT",
    "battle.skill": "SKILL",
    "battle.item": "ITEM",
    "battle.run": "RUN",
    "battle.trueFalse": "TRUE / FALSE",
    "battle.oddOneOut": "ODD WORD OUT",
    "battle.sentenceBuilder": "SENTENCE BUILDER",
    "battle.easy": "EASY",
    "battle.medium": "MEDIUM",
    "battle.hard": "HARD",
    "battle.loadingQuestion": "Loading question...",
    "battle.answerPrompt": "Answer correctly to attack.",
    "battle.buildAttack": "BUILD & ATTACK",
    "battle.true": "TRUE · 正确",
    "battle.false": "FALSE · 错误",
    "battle.actions": "Battle actions",
    "battle.questionTranslation": "中文提示",
    "battle.victory": "VICTORY",
    "battle.defeat": "DEFEAT",
    "battle.enemyDefeated": "Enemy Defeated!",
    "battle.stronger": "You got stronger.",
    "battle.returnMap": "Return to Map",
    "battle.retry": "Retry Battle",
    "battle.focusActive": "Knowledge Focus activated! Your next correct answer deals +50% damage.",
    "battle.focusAlready": "Knowledge Focus is already active for your next correct answer.",
    "battle.focusHit": "Knowledge Focus! Direct hit for {damage} damage.",
    "battle.directHit": "Direct hit! English Power deals {damage} damage.",
    "battle.timeUp": "Time's up! The enemy attacks.",
    "battle.wrong": "Wrong answer! The enemy attacks.",
    "battle.enemyAttack": "{enemy} attacks for {damage} damage.",
    "battle.hpFull": "ITEM unavailable — your HP is already full.",
    "battle.notEnoughCoins": "Not enough Coins for a Healing Herb (cost: 5).",
    "battle.healed": "Healing Herb restored up to 20 HP for 5 Coins.",
    "battle.menuFight": "FIGHT selected! Keep answering to defeat the enemy.",
    "battle.loading": "Loading battle...",
    "battle.battleError": "Battle setup error: {error}",
    "battle.genericError": "Battle error: {error}",
    "battle.enemyAppeared": "A wild {enemy} appeared!",
    "battle.victoryTitle": "{enemy} defeated!",
    "battle.victoryText": "The road is safe again. Your knowledge made you stronger.",
    "battle.tryAgain": "Try Again",
    "battle.defeatText": "Your journey is not over. Your learning progress is safe.",
    "battle.rewardXp": "XP",
    "battle.rewardCoins": "Coins",
    "battle.rewardStatus": "STATUS",
    "battle.rewardRetry": "RETRY",
    "battle.rewardPower": "POWER",
    "battle.rewardHp": "HP"
  },
  zh: {
    "settings.button": "⚙ 设置",
    "settings.title": "游戏设置",
    "settings.subtitle": "选择你习惯的游戏语言。",
    "settings.language": "游戏语言",
    "settings.english": "English（英文）",
    "settings.chinese": "简体中文",
    "settings.close": "关闭",
    "settings.saved": "语言选择会自动保存。",
    "common.back": "返回",
    "player.name": "冒险者",
    "player.level": "等级",
    "quest.main": "主线任务",
    "dialogue.continue": "继续 ▸",
    "controls.left": "向左移动",
    "controls.right": "向右移动",
    "controls.interact": "互动",
    "controls.hint": "A / D 或 ← / → 移动  •  按 E / 空格互动",
    "location.maple": "枫叶镇",
    "location.forest": "低语森林",
    "location.camp": "旧营地道路",
    "location.ruins": "古代遗迹",
    "quest.first.title": "最初的话语",
    "quest.first.text": "寻找村庄长老。",
    "quest.forest.title": "进入低语森林",
    "quest.forest.text": "向东走，寻找旧营地。",
    "quest.road.title": "寂静之路",
    "quest.road.text": "前往古老的大门。",
    "npc.elder.name": "罗文长老",
    "npc.elder.title": "村庄长老",
    "npc.mira.name": "米拉",
    "npc.mira.title": "旅行商人",
    "npc.kai.name": "凯",
    "npc.kai.title": "系统守护者",
    "npc.sign.name": "路牌",
    "npc.elder.1": "欢迎来到枫叶镇，旅行者。",
    "npc.elder.2": "森林另一边的旧路，已经没有了往日的声音。",
    "npc.elder.3": "如果你想帮忙，就跟着灯笼走，学习道路上的词语吧。",
    "npc.mira.1": "你正准备前往低语森林，对吗？",
    "npc.mira.2": "记住：理解一句话，有时比拥有一把锋利的剑更有用。",
    "npc.mira.3": "我会留在这里等你回来。",
    "npc.kai.1": "这些遗迹曾属于古老的网络建造者。",
    "npc.kai.2": "这里的标志都使用专业英语书写。",
    "npc.kai.3": "带来正确的词语，我就能重新打开大门。",
    "npc.sign.text": "路牌上写着：“森林小路很安静，但古老的词语依然留存。”",
    "destination.top": "世界传送门 · 01",
    "destination.kicker": "古老传送门",
    "destination.title": "领域传送门",
    "destination.choose": "选择你要前往的地点",
    "destination.safe": "安全区域",
    "destination.vocab": "词汇探索",
    "destination.survival": "冒险路线",
    "destination.challenge": "古代挑战",
    "destination.maple.name": "枫叶镇",
    "destination.maple.description": "宁静的村庄，你的冒险与英语学习从这里开始。",
    "destination.forest.name": "低语森林",
    "destination.forest.description": "沿着灯笼照亮的小路，探索森林中隐藏的语言知识。",
    "destination.camp.name": "旧营地道路",
    "destination.camp.description": "在旧营地稍作休息，再深入探索被遗忘的道路。",
    "destination.ruins.name": "古代遗迹",
    "destination.ruins.description": "探索寂静的石制遗迹，揭开古老网络建造者留下的秘密。",
    "destination.previous": "上一个地点",
    "destination.next": "下一个地点",
    "destination.select": "选择地点",
    "destination.select.maple": "选择枫叶镇",
    "destination.select.forest": "选择低语森林",
    "destination.select.camp": "选择旧营地道路",
    "destination.select.ruins": "选择古代遗迹",
    "destination.back": "↩ 返回地图",
    "destination.travel": "传送到这里",
    "destination.help": "← / → 切换地点  ·  ENTER 传送  ·  ESC 关闭",
    "portal.name": "领域传送门",
    "portal.interact": "按 E / 互动传送",
    "battle.kicker": "野外遭遇",
    "battle.back": "返回地图",
    "battle.scene": "战斗场景",
    "battle.wordCreature": "单词怪物",
    "battle.forestEnemy": "森林敌人",
    "battle.ancientGuardian": "古代守卫",
    "battle.you": "你",
    "battle.adventurer": "英语冒险者",
    "battle.initialMessage": "一只野生敌人出现了！",
    "battle.whatDo": "你要怎么做？",
    "battle.chooseAction": "请选择一个行动。",
    "battle.fight": "战斗",
    "battle.skill": "技能",
    "battle.item": "道具",
    "battle.run": "逃跑",
    "battle.trueFalse": "判断题",
    "battle.oddOneOut": "找出不同类的词",
    "battle.sentenceBuilder": "句子排序",
    "battle.easy": "简单",
    "battle.medium": "中等",
    "battle.hard": "困难",
    "battle.loadingQuestion": "正在加载题目……",
    "battle.answerPrompt": "答对题目即可攻击敌人。",
    "battle.buildAttack": "组合句子并攻击",
    "battle.true": "正确（TRUE）",
    "battle.false": "错误（FALSE）",
    "battle.actions": "战斗操作",
    "battle.questionTranslation": "中文翻译",
    "battle.victory": "胜利",
    "battle.defeat": "失败",
    "battle.enemyDefeated": "敌人被击败了！",
    "battle.stronger": "你变得更强了。",
    "battle.returnMap": "返回地图",
    "battle.retry": "重新挑战",
    "battle.focusActive": "专注技能已启动！下一次答对可造成额外 50% 伤害。",
    "battle.focusAlready": "专注技能已经启动，等待下一次答对时生效。",
    "battle.focusHit": "专注一击！造成 {damage} 点伤害。",
    "battle.directHit": "攻击成功！英语力量造成 {damage} 点伤害。",
    "battle.timeUp": "时间到！敌人发动攻击。",
    "battle.wrong": "回答错误！敌人发动攻击。",
    "battle.enemyAttack": "{enemy} 发动攻击，造成 {damage} 点伤害。",
    "battle.hpFull": "目前生命值已满，无法使用道具。",
    "battle.notEnoughCoins": "金币不足，无法购买治疗草药（需要 5 枚金币）。",
    "battle.healed": "治疗草药恢复最多 20 点生命值，消耗 5 枚金币。",
    "battle.menuFight": "选择了战斗！持续答题，击败敌人吧。",
    "battle.loading": "正在加载战斗……",
    "battle.battleError": "战斗初始化失败：{error}",
    "battle.genericError": "战斗发生错误：{error}",
    "battle.enemyAppeared": "一只野生的{enemy}出现了！",
    "battle.victoryTitle": "击败了{enemy}！",
    "battle.victoryText": "道路再次恢复安全。你的知识让你变得更强。",
    "battle.tryAgain": "再试一次",
    "battle.defeatText": "你的旅程还没有结束，学习进度已安全保存。",
    "battle.rewardXp": "经验值",
    "battle.rewardCoins": "金币",
    "battle.rewardStatus": "状态",
    "battle.rewardRetry": "重试",
    "battle.rewardPower": "力量",
    "battle.rewardHp": "生命值"
  }
};

export function getLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export function t(key, values = {}) {
  const language = getLanguage();
  let value = messages[language]?.[key] ?? messages.en[key] ?? key;
  for (const [name, replacement] of Object.entries(values)) {
    value = value.replaceAll("{" + name + "}", String(replacement));
  }
  return value;
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  root.querySelectorAll("[data-i18n-title]").forEach(element => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  document.documentElement.lang = getLanguage() === "zh" ? "zh-CN" : "en";

  const current = getLanguage();
  document.querySelectorAll("[data-set-language]").forEach(button => {
    const active = button.dataset.setLanguage === current;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  document.querySelectorAll("[data-language-current]").forEach(element => {
    element.textContent = current === "zh" ? "简体中文" : "English";
  });
}

export function setLanguage(language) {
  const next = language === "zh" ? "zh" : "en";
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    // Language still changes for the current page if storage is disabled.
  }
  applyTranslations();
  window.dispatchEvent(new CustomEvent("epq-language-change", { detail: { language: next } }));
}

export function onLanguageChange(callback) {
  window.addEventListener("epq-language-change", callback);
}

export function setupLanguageSettings() {
  const screen = document.getElementById("settingsScreen");
  const openButton = document.getElementById("settingsOpenButton");
  const closeButton = document.getElementById("settingsCloseButton");
  if (!screen || !openButton || !closeButton) return;

  const open = () => {
    screen.classList.remove("hidden");
    applyTranslations(screen);
    closeButton.focus();
  };
  const close = () => {
    screen.classList.add("hidden");
    openButton.focus();
  };

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  screen.addEventListener("click", event => {
    if (event.target === screen) close();
  });
  screen.querySelectorAll("[data-set-language]").forEach(button => {
    button.addEventListener("click", () => setLanguage(button.dataset.setLanguage));
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && !screen.classList.contains("hidden")) close();
  });
}

applyTranslations();
setupLanguageSettings();
