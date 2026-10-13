const variants = new WeakMap();

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

export function characterSprite(image, profile) {
  if (!profile?.palette || profile.appearance === "shadow" || !image.complete || !image.naturalWidth) return image;
  const key = image.src + ":" + profile.appearance;
  let cached = variants.get(image);
  if (!cached || cached.src !== image.src) cached = {src:image.src, looks:new Map()};
  if (cached.looks.has(key)) return cached.looks.get(key);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
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

export function paintCharacterImages(profile) {
  if (!profile?.palette) return;
  document.querySelectorAll("[data-character-sprite]").forEach(image => {
    const paint = () => {
      const sprite = characterSprite(image,profile);
      if (sprite === image) return;
      const replacement = sprite.toDataURL("image/png");
      image.onload = null; image.src = replacement;
    };
    if (image.complete && image.naturalWidth) paint(); else image.addEventListener("load",paint,{once:true});
  });
}

export function randomCharacterName(names, current, randomIndex = length => {
  const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] % length;
}) {
  const choices = names.filter(name => name !== current);
  return choices.length ? choices[randomIndex(choices.length)] : names[0] || "Arin Vale";
}
