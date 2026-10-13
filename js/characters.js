const variants = new WeakMap();
const portraitJobs = new WeakMap();
let femaleLoading;
let femaleFrames;

export function loadCharacterAssets(profile) {
  if (profile?.gender !== "female") return Promise.resolve();
  if (femaleLoading) return femaleLoading;
  femaleLoading = new Promise(resolve => {
    const sheet = new Image();
    sheet.onload = () => {
      try {
        const cellWidth = sheet.naturalWidth / 4, cellHeight = sheet.naturalHeight / 2;
        const cells = [], bounds = [];
        for (let frame = 0; frame < 7; frame++) {
          const cell = document.createElement("canvas");cell.width = cellWidth;cell.height = cellHeight;
          const ctx = cell.getContext("2d", {willReadFrequently:true});
          ctx.drawImage(sheet,(frame % 4)*cellWidth,Math.floor(frame/4)*cellHeight,cellWidth,cellHeight,0,0,cellWidth,cellHeight);
          const rgba = ctx.getImageData(0,0,cell.width,cell.height).data;
          let left = cell.width, top = cell.height, right = -1, bottom = -1;
          for (let y=0;y<cell.height;y++) for (let x=0;x<cell.width;x++) {
            if (rgba[(y*cell.width+x)*4+3] <= 16) continue;
            left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
          }
          if (right < left) throw new Error("Empty female sprite frame");
          cells.push(cell);bounds.push({left,top,width:right-left+1,height:bottom-top+1});
        }
        // One scale for the entire cycle; trim transparent padding and anchor all boots.
        const scale = Math.min(46/Math.max(...bounds.map(b=>b.width)),68/Math.max(...bounds.map(b=>b.height)));
        const rightFrames=cells.map((cell,i)=>{
          const canvas=document.createElement("canvas");canvas.width=i===0?72:48;canvas.height=72;
          const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
          const b=bounds[i], width=Math.round(b.width*scale),height=Math.round(b.height*scale);
          ctx.drawImage(cell,b.left,b.top,b.width,b.height,Math.round((canvas.width-width)/2),72-height,width,height);
          return canvas;
        });
        const leftFrames=rightFrames.slice(1).map(frame=>{
          const canvas=document.createElement("canvas");canvas.width=frame.width;canvas.height=frame.height;
          const ctx=canvas.getContext("2d");ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(frame,0,0);return canvas;
        });
        femaleFrames={idle:rightFrames[0],right:rightFrames.slice(1),left:leftFrames};
      } catch(error) {console.warn("[English Power Quest] Female sprite unavailable; using original player art.",error);}
      resolve();
    };
    sheet.onerror=()=>{console.warn("[English Power Quest] Female sprite failed to load; using original player art.");resolve();};
    sheet.src="/FYP/assets/player/female/female_adventurer_sheet.png?v=20261013-female1";
  });
  return femaleLoading;
}

export function recolorPixels(pixels, width, height, palette) {
  if (!Array.isArray(palette) || palette.length !== 3) return pixels;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      if (!pixels[at + 3]) continue;
      const r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
      const light = (r + g + b) / 3;
      // Tint cool cloak/armor shades; preserve warm skin, black outlines and alpha.
      const cool = b > g * 1.05 && b >= r * 0.95 && light < 150;
      const neutral = y > height * 0.35 && Math.max(r,g,b) - Math.min(r,g,b) < 10 && light < 100;
      if (light < 8 || !(cool || neutral)) continue;
      const shade = Math.min(1.6, 0.35 + light / 120);
      for (let channel = 0; channel < 3; channel++) pixels[at + channel] = Math.min(255, Math.round(palette[channel] * shade));
    }
  }
  return pixels;
}

export function characterSprite(image, profile, pose = {}) {
  if (profile?.gender === "female") {
    loadCharacterAssets(profile);
    if (femaleFrames) image = pose.moving
      ? femaleFrames[pose.direction === "left" ? "left" : "right"][((pose.frame||0)%6+6)%6]
      : femaleFrames.idle;
  }
  const width=image.naturalWidth||image.width, height=image.naturalHeight||image.height;
  if (!profile?.palette || profile.appearance === "shadow" || image.complete === false || !width) return image;
  const key = (image.src||"canvas") + ":" + profile.appearance;
  let cached = variants.get(image);
  if (!cached || cached.src !== image.src) cached = {src:image.src, looks:new Map()};
  if (cached.looks.has(key)) return cached.looks.get(key);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", {willReadFrequently:true});
    ctx.drawImage(image,0,0);
    const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
    recolorPixels(pixels.data,canvas.width,canvas.height,profile.palette);
    ctx.putImageData(pixels,0,0);
    cached.looks.set(key,canvas);
    variants.set(image,cached);
    return canvas;
  } catch { return image; }
}

export function paintCharacterImage(image, profile) {
  const job = {};
  portraitJobs.set(image,job);
  if (!profile?.palette && profile?.gender !== "female") return;
  return loadCharacterAssets(profile).then(() => {
    if (portraitJobs.get(image) !== job) return;
    const paint = () => {
      if (portraitJobs.get(image) !== job) return;
      const sprite = characterSprite(image,profile);
      if (sprite === image) return;
      const replacement = sprite.toDataURL("image/png");
      image.onload = null; image.src = replacement;
    };
    if (image.complete && image.naturalWidth) paint(); else image.addEventListener("load",paint,{once:true});
  });
}

export function paintCharacterImages(profile) {
  document.querySelectorAll("[data-character-sprite]").forEach(image => paintCharacterImage(image,profile));
}

export function randomCharacterName(names, current, randomIndex = length => {
  const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] % length;
}) {
  const choices = names.filter(name => name !== current);
  return choices.length ? choices[randomIndex(choices.length)] : names[0] || "Arin Vale";
}

export function heroStoryText(text, profile) {
  if (profile?.gender !== "female") return text;
  const pronouns={he:"she",him:"her",his:"her",himself:"herself"};
  return text.replace(/(?<!其)他/g,"她").replace(/\b(he|him|his|himself)\b/gi,word=>{
    const replacement=pronouns[word.toLowerCase()];
    return word[0]===word[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement;
  });
}
