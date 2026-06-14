#!/usr/bin/env node
/**
 * Generates Android launcher icons and splash PNGs from public/icon.svg.
 * Requires: npm install (sharp is a devDependency)
 *
 * Usage: node scripts/generate-android-assets.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconSvg = path.join(root, "public", "icon.svg");
const androidRes = path.join(root, "android", "app", "src", "main", "res");

const LAUNCHER_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const SPLASH_SIZES = {
  "drawable-mdpi": 320,
  "drawable-hdpi": 480,
  "drawable-xhdpi": 640,
  "drawable-xxhdpi": 960,
  "drawable-xxxhdpi": 1280,
};

const PUBLIC_ICON_SIZES = {
  "public/icons/icon-192.png": 192,
  "public/icons/icon-512.png": 512,
  "public/icons/apple-touch-icon.png": 180,
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function renderIcon(size, outPath) {
  const svg = await fs.readFile(iconSvg);
  await sharp(svg).resize(size, size).png().toFile(outPath);
}

async function renderSplash(canvasSize, outPath) {
  const logoSize = Math.round(canvasSize * 0.38);
  const svg = await fs.readFile(iconSvg);
  const logo = await sharp(svg).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 14, g: 14, b: 15, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function main() {
  try {
    await fs.access(iconSvg);
  } catch {
    console.error("Missing public/icon.svg");
    process.exit(1);
  }

  for (const [folder, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = path.join(androidRes, folder);
    await ensureDir(dir);
    await renderIcon(size, path.join(dir, "ic_launcher.png"));
    await renderIcon(size, path.join(dir, "ic_launcher_round.png"));
    await renderIcon(size, path.join(dir, "ic_launcher_foreground.png"));
    console.log(`✓ ${folder}/ic_launcher.png (${size}px)`);
  }

  const drawableDir = path.join(androidRes, "drawable");
  await ensureDir(drawableDir);
  await renderSplash(1080, path.join(drawableDir, "splash.png"));
  console.log("✓ drawable/splash.png");

  for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
    const dir = path.join(androidRes, folder);
    await ensureDir(dir);
    await renderSplash(size, path.join(dir, "splash.png"));
    console.log(`✓ ${folder}/splash.png (${size}px)`);
  }

  for (const [rel, size] of Object.entries(PUBLIC_ICON_SIZES)) {
    const out = path.join(root, rel);
    await ensureDir(path.dirname(out));
    await renderIcon(size, out);
    console.log(`✓ ${rel}`);
  }

  console.log("\nAndroid assets generated.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
