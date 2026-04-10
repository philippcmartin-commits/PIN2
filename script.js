const video = document.getElementById("bg-video");
const audioState = document.getElementById("audio-state");
const audioGate = document.getElementById("audio-gate");
const audioUnlock = document.getElementById("audio-unlock");
const soundButton = document.getElementById("sound-button");
const chaosButton = document.getElementById("chaos-button");
const killfeed = document.getElementById("killfeed");
const burstLayer = document.getElementById("burst-layer");

const burstPhrases = [
  "MLG!",
  "HEADSHOT",
  "PINNED",
  "ULTRA COMBO",
  "AIRHORN",
  "CRITICAL HIT",
  "GG",
  "SHEEEEEESH",
  "DROPPED",
  "ABSOLUTE CINEMA",
];

const feedEntries = [
  "PIN hit a <strong>420-degree no-scope</strong> on boredom.",
  "Soundboard.exe activated <strong>bass drop mode</strong>.",
  "Video loop gained <strong>+999 aura</strong>.",
  "Browser tab equipped <strong>elite clown energy</strong>.",
  "Chaos engine landed a <strong>clean montage wipe</strong>.",
  "Aura multiplier increased to <strong>x64</strong>.",
  "Pinball wizard unlocked <strong>airhorn overdrive</strong>.",
  "Random nonsense reached <strong>ranked-play intensity</strong>.",
];

let chaosBooted = false;
let audioContext;
let soundLoopTimer;
let visualsTimer;
let titleTimer;

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

function playRandomEffect() {
  const picks = [playAirhorn, playLaser, playBassDrop, playCoin];
  const pick = picks[Math.floor(Math.random() * picks.length)];
  pick();
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
    setAudioLabel("HOT MIC", "status-hot");
    audioGate.classList.add("hidden");
    bootChaos();
    return;
  } catch (error) {
    video.muted = true;
    try {
      await video.play();
    } catch (ignored) {
      // Leave the gate visible if even muted autoplay fails.
    }
    setAudioLabel("BLOCKED", "status-hot");
    audioGate.classList.remove("hidden");
    bootChaos();
  }
}

function spawnBurst(x = Math.random() * window.innerWidth, y = Math.random() * window.innerHeight) {
  const burst = document.createElement("div");
  burst.className = "burst";
  burst.textContent = burstPhrases[Math.floor(Math.random() * burstPhrases.length)];
  burst.style.setProperty("--x", `${x}px`);
  burst.style.setProperty("--y", `${y}px`);
  burst.style.setProperty("--rotate", `${-18 + Math.random() * 36}deg`);
  burst.style.setProperty(
    "--burst-color",
    ["#d8ff2a", "#23f4ff", "#ff2bc2", "#ff8b2b", "#ffffff"][Math.floor(Math.random() * 5)],
  );
  burstLayer.appendChild(burst);
  window.setTimeout(() => burst.remove(), 1200);
}

function pushKillfeedEntry() {
  const entry = document.createElement("div");
  entry.className = "killfeed-entry";
  entry.innerHTML = feedEntries[Math.floor(Math.random() * feedEntries.length)];
  killfeed.prepend(entry);

  while (killfeed.children.length > 6) {
    killfeed.lastElementChild.remove();
  }
}

function startVisualLoop() {
  pushKillfeedEntry();

  visualsTimer = window.setInterval(() => {
    pushKillfeedEntry();
    spawnBurst();
  }, 1700);

  titleTimer = window.setInterval(() => {
    const titles = [
      "PIN.exe // MAXIMUM MLG",
      "PIN.exe // AIRHORN MODE",
      "PIN.exe // 420 FPS",
      "PIN.exe // ULTRA CHAOS",
    ];
    document.title = titles[Math.floor(Math.random() * titles.length)];
  }, 2400);
}

function startSoundLoop() {
  if (soundLoopTimer) return;

  const fire = () => {
    if (audioContext && audioContext.state === "running") {
      playRandomEffect();
    }
    const delay = 1400 + Math.random() * 2600;
    soundLoopTimer = window.setTimeout(fire, delay);
  };

  fire();
}

function bootChaos() {
  if (chaosBooted) return;
  chaosBooted = true;

  document.body.classList.add("chaos-live");
  startVisualLoop();
  startSoundLoop();

  for (let index = 0; index < 3; index += 1) {
    window.setTimeout(() => {
      spawnBurst(window.innerWidth * (0.3 + Math.random() * 0.4), window.innerHeight * (0.2 + Math.random() * 0.5));
    }, index * 180);
  }
}

document.body.addEventListener("pointerdown", (event) => {
  spawnBurst(event.clientX, event.clientY);
});

chaosButton.addEventListener("click", async () => {
  bootChaos();
  await unlockAudio();
  playBassDrop();
  playLaser();
});

soundButton.addEventListener("click", async () => {
  await unlockAudio();
});

audioUnlock.addEventListener("click", async () => {
  await unlockAudio();
});

video.addEventListener("play", () => {
  if (!chaosBooted) {
    bootChaos();
  }
});

attemptAutoplay();
