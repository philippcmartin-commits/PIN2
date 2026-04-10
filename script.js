const video = document.getElementById("bg-video");
const fxVideo = document.getElementById("fx-video");
const audioState = document.getElementById("audio-state");
const audioGate = document.getElementById("audio-gate");
const audioUnlock = document.getElementById("audio-unlock");
const soundButton = document.getElementById("sound-button");
const chaosButton = document.getElementById("chaos-button");
const videoFallback = document.getElementById("video-fallback");
const wordPop = document.getElementById("word-pop");
const impactFlash = document.getElementById("impact-flash");
const memeLayer = document.getElementById("meme-layer");
const rootStyle = document.documentElement.style;

const impactCues = [
  { label: "PIN", time: 0.34 },
  { label: "BUP", time: 3.32 },
  { label: "PIN", time: 5.02 },
  { label: "BUP", time: 8.18 },
];

const memeImages = [
  "59cb7ef94a591663eec998de76973499.jpg",
  "DS5kbTfU8AALe_p.jpg",
  "Horse-3d-model-6.jpg",
  "badly-drawn-flat-dog-doodles-jay-cartner-fb19-png__700.jpg",
  "bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.jpg",
  "images.jpeg",
  "reverse_horse_drawing_meme_by_beckykidus_dfzzsfm-pre.jpg",
];

let chaosBooted = false;
let audioContext;
let soundLoopTimer;
let memeTimer;
let cueLoopFrame = 0;
let lastVideoTime = 0;
let nextCueIndex = 0;
let hitResetTimer = 0;
let wordPopTimer = 0;
let fxSourceNode;
let fxGainNode;

function setAudioLabel(text, tone = "status-hot") {
  audioState.textContent = text;
  audioState.className = tone;
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioCtx ? new AudioCtx() : null;
  }
  return audioContext;
}

function playTone({
  type = "sawtooth",
  start = 220,
  end = 220,
  duration = 0.25,
  attack = 0.01,
  gain = 0.12,
  pan = 0,
}) {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const stereo = ctx.createStereoPanner();

  osc.type = type;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), now + duration);

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  stereo.pan.value = pan;
  osc.connect(amp);
  amp.connect(stereo);
  stereo.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playAirhorn() {
  playTone({ type: "square", start: 415, end: 392, duration: 0.75, gain: 0.08, pan: -0.18 });
  playTone({ type: "square", start: 622, end: 587, duration: 0.75, gain: 0.06, pan: 0.18 });
}

function playLaser() {
  playTone({ type: "sawtooth", start: 1600, end: 120, duration: 0.26, gain: 0.09, pan: 0.24 });
}

function playBassDrop() {
  playTone({ type: "triangle", start: 180, end: 32, duration: 0.9, gain: 0.12, pan: -0.1 });
}

function playCoin() {
  playTone({ type: "triangle", start: 880, end: 1240, duration: 0.14, gain: 0.08, pan: 0.12 });
  playTone({ type: "triangle", start: 1240, end: 1660, duration: 0.1, gain: 0.06, pan: -0.08 });
}

function playImpactStab(label) {
  if (label === "PIN") {
    playLaser();
    playCoin();
    return;
  }

  playBassDrop();
  playTone({ type: "square", start: 96, end: 76, duration: 0.22, gain: 0.09, pan: -0.18 });
}

function playRandomEffect() {
  const picks = [playAirhorn, playLaser, playBassDrop, playCoin];
  const pick = picks[Math.floor(Math.random() * picks.length)];
  pick();
}

function setVideoPose(scale, x, y) {
  rootStyle.setProperty("--video-scale", scale.toFixed(3));
  rootStyle.setProperty("--video-x", `${x.toFixed(1)}px`);
  rootStyle.setProperty("--video-y", `${y.toFixed(1)}px`);
}

function ensureFxAudioBoost() {
  const ctx = getAudioContext();
  if (!ctx || fxSourceNode || !fxVideo) return;

  fxSourceNode = ctx.createMediaElementSource(fxVideo);
  fxGainNode = ctx.createGain();
  fxGainNode.gain.value = 1.85;
  fxSourceNode.connect(fxGainNode);
  fxGainNode.connect(ctx.destination);
}

async function playFxVideo() {
  if (!fxVideo) return true;

  try {
    ensureFxAudioBoost();
  } catch (error) {
    // Ignore duplicate media source graph errors and fall back to element volume.
  }

  fxVideo.muted = false;
  fxVideo.volume = 1;

  try {
    await fxVideo.play();
    return true;
  } catch (error) {
    return false;
  }
}

async function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx) {
    await ctx.resume();
  }

  video.muted = false;
  video.volume = 1;

  try {
    await video.play();
    await playFxVideo();
    setAudioLabel("LIVE", "status-hot");
    audioGate.classList.add("hidden");
    if (!chaosBooted) bootChaos();
    if (ctx && ctx.state === "running") {
      playAirhorn();
    }
    return true;
  } catch (error) {
    audioGate.classList.remove("hidden");
    setAudioLabel("CLICK TO ARM", "status-hot");
    return false;
  }
}

async function attemptAutoplay() {
  video.muted = false;
  video.volume = 1;

  try {
    await video.play();
    await playFxVideo();
    setAudioLabel("HOT MIC", "status-hot");
    audioGate.classList.add("hidden");
    bootChaos();
    return;
  } catch (error) {
    video.muted = true;
    try {
      await video.play();
      if (fxVideo) {
        fxVideo.muted = true;
        await fxVideo.play();
      }
    } catch (ignored) {
      // Leave the gate visible if even muted autoplay fails.
    }
    setAudioLabel("BLOCKED", "status-hot");
    audioGate.classList.remove("hidden");
    bootChaos();
  }
}

function resetCueTracking() {
  lastVideoTime = video.currentTime;
  nextCueIndex = impactCues.findIndex((cue) => cue.time > video.currentTime);
  if (nextCueIndex === -1) {
    nextCueIndex = impactCues.length;
  }
}

function showWordPop(label) {
  wordPop.textContent = label;
  wordPop.classList.remove("hidden", "word-pop-live");
  void wordPop.offsetWidth;
  wordPop.classList.add("word-pop-live");

  window.clearTimeout(wordPopTimer);
  wordPopTimer = window.setTimeout(() => {
    wordPop.classList.add("hidden");
    wordPop.classList.remove("word-pop-live");
  }, 600);
}

function flashImpact() {
  impactFlash.classList.remove("impact-flash-live");
  void impactFlash.offsetWidth;
  impactFlash.classList.add("impact-flash-live");
}

function triggerImpactCue(cue) {
  const scale = 1.2 + Math.random() * 0.23;
  const x = (Math.random() - 0.5) * window.innerWidth * 0.12;
  const y = (Math.random() - 0.5) * window.innerHeight * 0.1;

  setVideoPose(scale, x, y);
  video.classList.add("video-hit");
  flashImpact();
  showWordPop(cue.label);

  if (audioContext && audioContext.state === "running") {
    playImpactStab(cue.label);
  }

  window.clearTimeout(hitResetTimer);
  hitResetTimer = window.setTimeout(() => {
    setVideoPose(1.08, 0, 0);
    video.classList.remove("video-hit");
  }, 180);
}

function spawnMemeShot(forceLarge = false) {
  if (!memeLayer || memeImages.length === 0) return;

  const shot = document.createElement("img");
  const fileName = memeImages[Math.floor(Math.random() * memeImages.length)];
  const life = 480 + Math.random() * 700;
  const size = forceLarge
    ? 42 + Math.random() * 24
    : 18 + Math.random() * 18;

  shot.className = "meme-shot";
  if (forceLarge || Math.random() > 0.7) {
    shot.classList.add("meme-shot-xl");
  }

  shot.src = fileName;
  shot.alt = "";
  shot.loading = "eager";
  shot.decoding = "async";
  shot.style.setProperty("--meme-x", `${10 + Math.random() * 80}%`);
  shot.style.setProperty("--meme-y", `${12 + Math.random() * 76}%`);
  shot.style.setProperty("--meme-size", `${size}vw`);
  shot.style.setProperty("--meme-rotate", `${-22 + Math.random() * 44}deg`);
  shot.style.setProperty("--meme-life", `${life.toFixed(0)}ms`);

  memeLayer.appendChild(shot);
  window.setTimeout(() => shot.remove(), life);
}

function runCueLoop() {
  const currentTime = video.currentTime;

  if (currentTime + 0.12 < lastVideoTime) {
    nextCueIndex = 0;
  }

  while (nextCueIndex < impactCues.length && currentTime >= impactCues[nextCueIndex].time) {
    triggerImpactCue(impactCues[nextCueIndex]);
    nextCueIndex += 1;
  }

  lastVideoTime = currentTime;
  cueLoopFrame = window.requestAnimationFrame(runCueLoop);
}

function startCueLoop() {
  if (cueLoopFrame) return;
  resetCueTracking();
  cueLoopFrame = window.requestAnimationFrame(runCueLoop);
}

function stopCueLoop() {
  if (!cueLoopFrame) return;
  window.cancelAnimationFrame(cueLoopFrame);
  cueLoopFrame = 0;
}

function startSoundLoop() {
  if (soundLoopTimer) return;

  const fire = () => {
    if (audioContext && audioContext.state === "running") {
      playRandomEffect();
    }
    const delay = 2600 + Math.random() * 2600;
    soundLoopTimer = window.setTimeout(fire, delay);
  };

  fire();
}

function startMemeLoop() {
  if (memeTimer) return;

  const fire = () => {
    spawnMemeShot(Math.random() > 0.78);
    const delay = 240 + Math.random() * 820;
    memeTimer = window.setTimeout(fire, delay);
  };

  fire();
}

function bootChaos() {
  if (chaosBooted) return;
  chaosBooted = true;

  document.body.classList.add("chaos-live");
  startSoundLoop();
  startMemeLoop();
  triggerImpactCue({ label: "PIN" });
  spawnMemeShot(true);
}

chaosButton.addEventListener("click", async () => {
  bootChaos();
  await unlockAudio();
  triggerImpactCue({ label: Math.random() > 0.5 ? "PIN" : "BUP" });
  spawnMemeShot(true);
});

soundButton.addEventListener("click", async () => {
  await unlockAudio();
});

audioUnlock.addEventListener("click", async () => {
  await unlockAudio();
});

video.addEventListener("play", () => {
  videoFallback.classList.add("hidden");
  startCueLoop();
  if (!chaosBooted) {
    bootChaos();
  }
});

video.addEventListener("pause", () => {
  stopCueLoop();
});

video.addEventListener("seeking", () => {
  resetCueTracking();
});

video.addEventListener("error", () => {
  videoFallback.classList.remove("hidden");
  setAudioLabel("NO VIDEO", "status-hot");
});

if (fxVideo) {
  fxVideo.addEventListener("error", () => {
    setAudioLabel("FX MISSING", "status-hot");
  });
}

setVideoPose(1.08, 0, 0);
attemptAutoplay();
