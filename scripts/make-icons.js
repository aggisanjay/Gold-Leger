const sharp = require("sharp");

async function makeIcon(size, filename) {
  const goldSize = Math.round(size * 0.55);
  const offset = Math.round((size - goldSize) / 2);
  const cornerRadius = Math.round(size * 0.08);

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      <rect x="${offset}" y="${offset}" width="${goldSize}" height="${goldSize}" rx="${cornerRadius}" fill="#c9a227"/>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(filename);
  console.log("Created " + filename);
}

Promise.all([
  makeIcon(192, "public/icon-192.png"),
  makeIcon(512, "public/icon-512.png"),
]).then(() => {
  console.log("Icons generated successfully!");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

