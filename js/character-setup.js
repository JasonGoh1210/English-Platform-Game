import { characterSprite, randomCharacterName, loadCharacterAssets } from "./characters.js?v=20261018-newbie1";

const config = window.EPQ_CHARACTER_SETUP;
const name = document.getElementById("characterName");
const dice = document.getElementById("randomName");
const previewName = document.getElementById("previewName");
const previewStyle = document.getElementById("previewStyle");
const sprite = new Image();
sprite.src = "/FYP/assets/player/png_frames/Player_Stand.png";
function selectedProfile() {
  const appearance = document.querySelector('[name="appearance"]:checked')?.value || "shadow";
  return {appearance,palette:config.catalog[appearance].palette,gender:document.querySelector('[name="gender"]:checked')?.value||"male"};
}
function render() {
  if (!sprite.complete || !sprite.naturalWidth) return;
  document.querySelectorAll("[data-character-preview]").forEach(canvas => {
    const appearance = canvas.dataset.characterPreview || selectedProfile().appearance;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled = false;
    const look = {appearance,palette:config.catalog[appearance].palette,gender:selectedProfile().gender};
    const image = characterSprite(sprite,look);
    ctx.drawImage(image,0,0,image.naturalWidth||image.width,image.naturalHeight||image.height,0,canvas.height-canvas.width,canvas.width,canvas.width);
  });
  previewName.textContent = name.value.trim() || "你的冒险者";
  previewStyle.textContent = config.catalog[selectedProfile().appearance].label;
}
sprite.onload = render;
function loadLooks(){const gender=selectedProfile().gender;return Promise.all(Object.keys(config.catalog).map(appearance=>loadCharacterAssets({gender,appearance}))).then(render);}
window.EPQLoading?.step('assets');
void Promise.all([loadLooks(), window.EPQLoading?.waitForImages([sprite])]).then(()=>window.EPQLoading?.ready()).catch(()=>window.EPQLoading?.fail());
document.querySelectorAll('[name="appearance"], [name="gender"]').forEach(input => input.addEventListener("change",()=>{render();void loadLooks();}));
name.addEventListener("input",render);
dice.addEventListener("click", () => {
  const gender = document.querySelector('[name="gender"]:checked')?.value || "male";
  name.value = randomCharacterName(config.names[gender],name.value.trim());
  render();name.focus();
});
document.getElementById("characterForm").addEventListener("submit", () => {
  const submit = document.getElementById("createCharacter");submit.disabled = true;submit.textContent = "正在保存角色……";
});
