// offscreen.js — MediaRecorder lives here (MV3 service workers have no DOM).
// background.js sends voice:start / voice:stop; we answer with voice:result
// carrying a base64 webm/opus dataUrl.

let recorder = null;
let chunks = [];

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'voice:start') start();
  if (msg?.type === 'voice:stop') stop();
});

async function start() {
  if (recorder) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({ type: 'voice:result', dataUrl: reader.result }).catch(() => {});
        recorder.stream.getTracks().forEach((t) => t.stop());
        recorder = null;
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();
  } catch (e) {
    recorder = null;
    chrome.runtime.sendMessage({ type: 'voice:result', dataUrl: null, error: String(e?.message || e) }).catch(() => {});
  }
}

function stop() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}
