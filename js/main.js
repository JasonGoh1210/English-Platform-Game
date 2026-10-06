import { startGame } from "./game.js";

startGame().catch((error) => {
  console.error(error);
  const status = document.getElementById("statusMessage");
  if (status) status.textContent = "Unable to start the game. Check the console for details.";
});