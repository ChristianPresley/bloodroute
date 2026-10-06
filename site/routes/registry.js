// Archetypes shown on the picker. To add one: create routes/<id>/route.js (and needs.js if it has a
// stockpile), list its files in `files`, and set status to 'ready'.
window.BR.ARCHETYPES = [
  {
    id: 'spellcaster', name: 'Spellcaster', status: 'ready', patch: '1.1.13',
    tagline: 'Chaos, Storm and Blood spells with a Scholar-blood core. Every loadout was picked by the damage simulator.',
    icons: ['Chaos Volley', 'Lightning Tendrils', 'Blood Storm'], blood: 'Scholar', color: '#b46bff',
    files: ['routes/spellcaster/needs.js', 'routes/spellcaster/route.js'],
  },
  {
    id: 'warrior', name: 'Warrior', status: 'soon',
    tagline: 'Weapon-skill melee that leans on Physical Power and Warrior blood.',
    icons: ['Warrior'], blood: 'Warrior', color: '#ff8a3d',
  },
  {
    id: 'rogue', name: 'Rogue', status: 'soon',
    tagline: 'Critical-strike burst with high mobility and Rogue blood.',
    icons: ['Rogue'], blood: 'Rogue', color: '#35d0e0',
  },
  {
    id: 'brute', name: 'Brute', status: 'soon',
    tagline: 'A sustain bruiser that trades hits and heals through them with Brute blood.',
    icons: ['Brute'], blood: 'Brute', color: '#55c46a',
  },
];
