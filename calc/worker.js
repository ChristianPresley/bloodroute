// Runs the optimizer off the page's main thread (used by index.html when served over http).
importScripts('engine.js');
onmessage = e => {
  const res = VRCalc.optimizeRun(e.data.stage, m => postMessage({ log: m }));
  postMessage({ done: { label: res.label, final: res.final.map(r => ({ ...r, st: undefined, vals: undefined })) } });
};
