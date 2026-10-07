// Archetypes shown on the picker. To add one: create routes/<id>/route.js (and needs.js if it has a
// stockpile), list its files in `files`, and set status to 'ready'. The Warrior, Rogue and Brute routes
// also load routes/shared.js (V Blood locations, materials and reference cards).
window.BR.ARCHETYPES = [
  {
    id: 'spellcaster', name: 'Spellcaster', status: 'ready', patch: '1.1.13',
    tagline: 'Chaos Volley and Lightning Tendrils between crossbow shots, on Scholar then Draculin blood. Every loadout was picked by the damage simulator.',
    icons: ['Chaos Volley', 'Lightning Tendrils', 'Blood Storm'], blood: 'Scholar', color: '#b46bff',
    files: ['routes/spellcaster/needs.js', 'routes/spellcaster/route.js'],
  },
  {
    id: 'warrior', name: 'Warrior', status: 'ready', patch: '1.1.13',
    tagline: 'Sword, then Reaper: weapon skills, Physical Power and Warrior blood, with Blood spells that keep Leech on the boss.',
    icons: ['Sanguine Reaper', 'Blood Rage', "Dracula's Dread Chestguard"], blood: 'Warrior', color: '#ff8a3d',
    files: ['routes/shared.js', 'routes/warrior/needs.js', 'routes/warrior/route.js'],
  },
  {
    id: 'rogue', name: 'Rogue', status: 'ready', patch: '1.1.13',
    tagline: 'Axes, then Pistols: stack physical crit, Veil often and fire your weapon skills right after, while the post-Veil crit bonuses last.',
    icons: ['Sanguine Pistols', 'Veil of Chaos', "Dracula's Shadow Chestguard"], blood: 'Rogue', color: '#35d0e0',
    files: ['routes/shared.js', 'routes/rogue/needs.js', 'routes/rogue/route.js'],
  },
  {
    id: 'brute', name: 'Brute', status: 'ready', patch: '1.1.13',
    tagline: 'Spear, then Twinblades: fast primary attacks that leech, with Blood Rage and Veil of Storm to keep the hits coming.',
    icons: ['Sanguine Twinblade', 'Veil of Storm', "Dracula's Grim Chestguard"], blood: 'Brute', color: '#55c46a',
    files: ['routes/shared.js', 'routes/brute/needs.js', 'routes/brute/route.js'],
  },
];
