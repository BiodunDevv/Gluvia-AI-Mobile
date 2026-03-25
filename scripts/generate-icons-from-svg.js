const sharp = require("sharp");

const input = "assets/images/logo.svg";

const ICON_FILL_RATIO = 0.88;

async function make(out, w, h, bg, flattenWhite = false) {
  const innerW = Math.max(1, Math.round(w * ICON_FILL_RATIO));
  const innerH = Math.max(1, Math.round(h * ICON_FILL_RATIO));
  const padX = w - innerW;
  const padY = h - innerH;

  const pipeline = sharp(input, { density: 1200 })
    .resize(innerW, innerH, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .extend({
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      background: bg,
    })
    .png();

  if (flattenWhite) {
    const transparentBuffer = await pipeline.toBuffer();
    await sharp({
      create: {
        width: w,
        height: h,
        channels: 3,
        background: "#ffffff",
      },
    })
      .composite([{ input: transparentBuffer }])
      .png()
      .toFile(out);
    return;
  }

  await pipeline.toFile(out);
}

async function main() {
  await sharp(input, { density: 1200 })
    .resize(72, 56, { fit: "fill" })
    .png()
    .toFile("assets/images/logo.png");

  await make(
    "assets/images/icon.png",
    1024,
    1024,
    {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    },
    true,
  );

  await make(
    "assets/images/splash-icon.png",
    1024,
    1024,
    {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    },
    true,
  );

  await make("assets/images/android-icon-foreground.png", 512, 512, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });

  await make("assets/images/android-icon-monochrome.png", 432, 432, {
    r: 0,
    g: 0,
    b: 0,
    alpha: 0,
  });

  await make(
    "assets/images/favicon.png",
    48,
    48,
    {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    },
    true,
  );

  const outputs = [
    "assets/images/logo.png",
    "assets/images/icon.png",
    "assets/images/splash-icon.png",
    "assets/images/android-icon-foreground.png",
    "assets/images/android-icon-monochrome.png",
    "assets/images/favicon.png",
  ];

  for (const file of outputs) {
    const m = await sharp(file).metadata();
    console.log(`${file}: ${m.width}x${m.height}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
