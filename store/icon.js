const sharp = require('sharp');
const opentype = require('opentype.js');

// Migraine Log icon, in the app's "dark room" palette: dim charcoal, soft
// warm ink, one muted amber. Three options are drawn for
// docs/design/icon-options.png (`node icon.js options`); the chosen one is
// written to ../assets and the website (`node icon.js`).
//   wave    - the app's own glyph: one soft amber swell that settles back
//             to a quiet line, over a faint baseline. An attack, logged.
//   days    - a 3 by 3 block of rounded day cells in the calendar's pain
//             shades, one headache-free ring, one amber cell (today)
//   dimmer  - a low amber light half covered by the room's shadow, like a
//             lamp turned down. Calm, but says nothing about logging
// No lightning bolt, no brain, no head in profile.
// Chosen: wave (see docs/design/NOTES.md).
const CHOSEN = 'wave';

// Words on the website image are drawn as outlines from the app's own font
// (Nunito SemiBold, OFL, ../assets/fonts), so they look the same anywhere.
const NUNITO = opentype.loadSync(__dirname + '/../assets/fonts/Nunito_600SemiBold.ttf');

function textPath(font, text, size, x, y) {
  return font.getPath(text, x, y, size).toPathData(2);
}

const ROOM = '#1A191C';
const ROOM_TOP = '#222126';
const INK = '#D6D1C9';
const SOFT = '#7D7973';
const AMBER = '#C49465';
const AMBER_DEEP = '#A9784B';
const PAIN = ['#34313A', '#433B47', '#5A4655', '#74505F'];

// A soft vertical light in the room, so the tile is not flat black.
const roomFill = `
  <defs>
    <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ROOM_TOP}"/>
      <stop offset="1" stop-color="${ROOM}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#room)"/>`;

const art = {
  wave: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${roomFill}
    <path d="M150 640 C 268 640, 320 592, 372 496 C 420 404, 446 330, 512 330 C 578 330, 604 404, 652 496 C 704 592, 756 640, 874 640"
      fill="none" stroke="${AMBER}" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M214 774 Q 512 758, 810 774" fill="none" stroke="${SOFT}" stroke-width="30" stroke-linecap="round" opacity="0.7"/>
  </svg>`,

  days: () => {
    const cells = [
      [PAIN[1], 'ring', PAIN[0]],
      [PAIN[3], PAIN[2], 'ring'],
      ['ring', PAIN[1], 'amber'],
    ];
    const size = 196;
    const gap = 40;
    const x0 = (1024 - (size * 3 + gap * 2)) / 2;
    let out = '';
    cells.forEach((row, r) =>
      row.forEach((c, i) => {
        const x = x0 + i * (size + gap);
        const y = x0 + r * (size + gap);
        if (c === 'ring') out += `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size * 0.3}" fill="none" stroke="${SOFT}" stroke-width="26"/>`;
        else out += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="48" fill="${c === 'amber' ? AMBER : c}"/>`;
      })
    );
    return `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${roomFill}${out}</svg>`;
  },

  dimmer: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${roomFill}
    <defs><clipPath id="c"><circle cx="512" cy="512" r="290"/></clipPath></defs>
    <circle cx="512" cy="512" r="290" fill="${AMBER}"/>
    <circle cx="640" cy="420" r="290" fill="${ROOM_TOP}" clip-path="url(#c)"/>
    <circle cx="512" cy="512" r="290" fill="none" stroke="${AMBER_DEEP}" stroke-width="10" opacity="0.6"/>
  </svg>`,
};

const LABELS = { wave: 'wave', days: 'days', dimmer: 'dimmer' };

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** The sheet Brian picks from: each option big, then at 60 px on a light and a dark wallpaper. */
async function options() {
  const names = Object.keys(art);
  const W = 1800;
  const H = 900;
  const col = W / names.length;
  const parts = [];
  for (const [i, n] of names.entries()) {
    const cx = i * col + col / 2;
    const big = await png(art[n](), 380);
    const small = await png(art[n](), 60);
    // iOS rounds the corners: show it the way the home screen will.
    const mask = Buffer.from(`<svg width="380" height="380"><rect width="380" height="380" rx="85" fill="#fff"/></svg>`);
    const bigRounded = await sharp(big).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const smallMask = Buffer.from(`<svg width="60" height="60"><rect width="60" height="60" rx="13.5" fill="#fff"/></svg>`);
    const smallRounded = await sharp(small).composite([{ input: smallMask, blend: 'dest-in' }]).png().toBuffer();
    parts.push({ input: bigRounded, left: Math.round(cx - 190), top: 90 });
    parts.push({ input: smallRounded, left: Math.round(cx - 100), top: 620 });
    parts.push({ input: smallRounded, left: Math.round(cx + 40), top: 620 });
  }
  const labels = names
    .map((n, i) => {
      const cx = i * col + col / 2;
      const label = `${i + 1}. ${LABELS[n]}${n === CHOSEN ? ' (picked)' : ''}`;
      const w = NUNITO.getPath(label, 0, 0, 40).getBoundingBox();
      return `<path d="${textPath(NUNITO, label, 40, cx - (w.x2 - w.x1) / 2, 540)}" fill="${n === CHOSEN ? AMBER : INK}"/>`;
    })
    .join('');
  const wallpapers = names
    .map((_, i) => {
      const cx = i * col + col / 2;
      return `<rect x="${cx - 130}" y="590" width="120" height="120" rx="20" fill="#E9E4DC"/><rect x="${cx + 10}" y="590" width="120" height="120" rx="20" fill="#0E0D10"/>`;
    })
    .join('');
  const note = 'Each at 60 px, on a light and a dark wallpaper';
  const nw = NUNITO.getPath(note, 0, 0, 28).getBoundingBox();
  const base = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#2B2A2F"/>${labels}${wallpapers}
    <path d="${textPath(NUNITO, note, 28, (W - (nw.x2 - nw.x1)) / 2, 820)}" fill="${SOFT}"/></svg>`;
  await sharp(Buffer.from(base)).composite(parts).png().toFile(__dirname + '/../docs/design/icon-options.png');
}

/** The chosen icon into the app and the website. */
async function write() {
  const svg = art[CHOSEN]();
  const out = (p) => __dirname + '/../' + p;
  // iOS wants a square, opaque 1024 px icon; it rounds the corners itself.
  await sharp(Buffer.from(svg)).resize(1024, 1024).flatten({ background: ROOM }).png().toFile(out('assets/icon.png'));
  await sharp(Buffer.from(svg)).resize(48, 48).png().toFile(out('assets/favicon.png'));
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(out('docs/icon-512.png'));
  await sharp(Buffer.from(svg)).resize(180, 180).flatten({ background: ROOM }).png().toFile(out('docs/apple-touch-icon.png'));

  // Android: the room as the background, the wave alone as the foreground and monochrome.
  const fg = svg.replace(/<rect width="1024" height="1024" fill="url\(#room\)"\/>/, '');
  await sharp(Buffer.from(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${ROOM}"/></svg>`)).png().toFile(out('assets/android-icon-background.png'));
  await sharp(Buffer.from(fg)).resize(1024, 1024).png().toFile(out('assets/android-icon-foreground.png'));
  await sharp(Buffer.from(fg.replace(new RegExp(AMBER, 'g'), '#FFFFFF').replace(new RegExp(SOFT, 'g'), '#FFFFFF'))).resize(1024, 1024).png().toFile(out('assets/android-icon-monochrome.png'));

  // Splash: the wave alone on the room's color (app.json sets the background).
  await sharp(Buffer.from(fg)).resize(512, 512).png().toFile(out('assets/splash-icon.png'));

  // Website and link previews: the icon and the name on the room.
  const icon = await sharp(Buffer.from(svg)).resize(300, 300).png().toBuffer();
  const mask = Buffer.from(`<svg width="300" height="300"><rect width="300" height="300" rx="67" fill="#fff"/></svg>`);
  const rounded = await sharp(icon).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const og = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="${ROOM}"/>
    <path d="${textPath(NUNITO, 'Migraine Log', 84, 470, 290)}" fill="${INK}"/>
    <path d="${textPath(NUNITO, 'Headache tracker and doctor report', 38, 474, 360)}" fill="${SOFT}"/>
    <path d="${textPath(NUNITO, 'for iPhone', 38, 474, 410)}" fill="${SOFT}"/>
  </svg>`;
  await sharp(Buffer.from(og)).composite([{ input: rounded, left: 120, top: 165 }]).png().toFile(out('docs/og-image.png'));
}

(process.argv[2] === 'options' ? options() : write()).catch((e) => {
  console.error(e);
  process.exit(1);
});
