# Bloodroute

Bloodroute: a V Rising progression planner. Step-by-step paths from fresh spawn to Dracula for every archetype — V Blood boss order with map links, gear to craft, a stockpile tracker that tells you what to gather early, and endgame builds backed by a damage simulator.

**Live site: https://christianpresley.github.io/bloodroute/**

Pick an archetype, then follow its route. The **PvE Spellcaster** route is ready; Warrior, Rogue and Brute are coming. Progress and stockpile counts are saved per archetype in your browser profile, and you can export or import a backup from the archetype page.

## What's here

| Path | What it is |
|---|---|
| `site/` | The planner: an archetype picker, then each route's phases, "next step" card, boss cards with Map Genie links, phase loadouts, stockpile tracker and endgame builds. Deployed to GitHub Pages by `.github/workflows/pages.yml`. |
| `calc/` | The damage simulator and optimizer used to choose every loadout. `optimizer_results.json` holds the curated results. |
| `docs/` | The written guides: build guide, full progression schedule, V Blood rewards and research sources. |

## Running it

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
# Download the icon bundle (not committed; see below)
node site/build-icons.js

# Serve the site, then open http://localhost:8080
npx http-server site
```

The site works without the icon bundle; icons fall back to initials.

### Simulator

```bash
node calc/smoke.js                # quick sanity check
node calc/run.js late             # optimize a stage: early | mid | late-pre | late (late takes about 10 minutes)
node calc/sens.js                 # scenario tables, after running late and late-pre
```

To run it in a browser, serve `calc/` over http and open `index.html`.

### Stockpile targets

`site/routes/spellcaster/needs.js` lists the materials each phase needs. It is generated from item recipes:

```bash
node site/build-needs.js          # reads data/items.json
```

## Adding an archetype

The site has a fixed shell and one folder per route:

```
site/
  index.html             app shell
  assets/app.css         styles
  js/core.js             icon and map-link helpers, saved-data store
  js/app.js              archetype picker and route planner
  routes/registry.js     the archetypes shown on the picker
  routes/spellcaster/    route.js (phases, bosses, loadouts, endgame) + needs.js (stockpile)
```

1. Create `site/routes/<id>/route.js`. Copy the spellcaster route: it calls `BR.registerRoute({ id, phases, resources, needs, slotIcons, finish, renderEndgame, renderRef })`. Phases and `needs` are required; the Endgame and Reference tabs are hidden if their render functions are missing.
2. In `site/routes/registry.js`, set the archetype's `status` to `'ready'` and list its files in `files`.
3. Add any new icon names to `site/build-icons.js`.

Saved data lives in one localStorage entry (`bloodroute:v1`), keyed by route id, so routes never overwrite each other.

## Game data

Game data is not stored in this repository. It is fetched from [vrising.gaming.tools](https://vrising.gaming.tools) and the [V Rising Wiki](https://vrising.fandom.com) at build time, and by the upcoming MCP server for the latest game version. Downloaded data goes in `data/`, and the icon bundle in `site/icons.js`. Both are git-ignored.

## License

[MIT](LICENSE) for the code and written guides in this repository.

Bloodroute is an unofficial fan project, not affiliated with or endorsed by Stunlock Studios. V Rising and its names, icons and artwork are trademarks and copyright of Stunlock Studios. Game data comes from vrising.gaming.tools and the V Rising Wiki (text CC BY-SA). That content is not covered by this project's license.
