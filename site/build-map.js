// Downloads the Vardoran map (V Rising Wiki, "File:Vardoran (1 1 Update).jpg", 6080 px) at the widths js/map.js uses
// into site/map/vardoran-<width>.webp. Run: node site/build-map.js [--force]
// (the Pages workflow runs it at deploy time; site/map/ is git-ignored; existing files are kept unless --force).
// The wiki image has the gaming.tools map's framing, so site/gamedata.js coordinates project straight onto it:
// px = (x + 2885) / 3040 * width, py = (640 - z) / 3040 * width.
const fs = require('fs');
const path = require('path');

const FILE = 'File:Vardoran (1 1 Update).jpg';
const WIDTHS = [760, 1520, 3040];
const DIR = path.join(__dirname, 'map');
const UA = { 'User-Agent': 'bloodroute map builder (+https://github.com/ChristianPresley/bloodroute)', Accept: 'image/webp,image/*;q=0.8,*/*;q=0.5' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Retries transient failures (wiki hiccups on CI runners) before giving up.
async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r;
    } catch (e) {
      if (i >= tries || /^404 /.test(e.message)) throw e;
      await sleep(1000 * i);
    }
  }
}

async function main() {
  const force = process.argv.includes('--force');
  fs.mkdirSync(DIR, { recursive: true });
  for (const w of WIDTHS) {
    const out = path.join(DIR, `vardoran-${w}.webp`);
    if (!force && fs.existsSync(out) && fs.statSync(out).size > 0) { console.log(`map: ${path.basename(out)} already there`); continue; }
    const api = `https://vrising.fandom.com/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=${w}&titles=${encodeURIComponent(FILE)}`;
    const page = Object.values((await (await get(api)).json()).query.pages)[0];
    const info = (page.imageinfo || [])[0];
    if (!info || !info.thumburl) throw new Error(`no ${w} px thumbnail for ${FILE}`);
    const r = await get(info.thumburl);
    const type = (r.headers.get('content-type') || '').split(';')[0];
    if (type !== 'image/webp') console.warn(`map: ${w} px came as ${type || 'unknown type'}, not WebP`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(out, buf);
    console.log(`map: ${path.basename(out)} ${(buf.length / 1024).toFixed(0)} KB`);
  }
}

module.exports = { FILE, WIDTHS, DIR };
if (require.main === module) main().catch(e => { console.error(`map: ${e.message}`); process.exit(1); });
