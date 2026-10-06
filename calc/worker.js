// Runs the optimizer off the page's main thread (used by index.html when served over http).
importScripts('engine.js');
onmessage = e => {
  const { stage } = e.data;
  const pre = stage === 'late-pre';
  const res = VRCalc.optimize(pre ? 'late' : stage, m => postMessage({ log: m }), pre ? { amulets: VRCalc.PRE_DRACULA } : {});
  postMessage({ done: { stage: res.stage, final: res.final.map(r => ({ ...r, st: undefined })) } });
};
