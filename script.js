const video = document.getElementById("bg-video");
const audioGate = document.getElementById("audio-gate");
const audioUnlock = document.getElementById("audio-unlock");
const videoFallback = document.getElementById("video-fallback");
const floatToggle = document.getElementById("float-toggle");
const rootStyle = document.documentElement.style;

let floatTimer = 0;
let floatModeOn = false;

function setFloatPose(x, y, scale) {
  rootStyle.setProperty("--float-x", `${x}px`);
  rootStyle.setProperty("--float-y", `${y}px`);
  rootStyle.setProperty("--float-scale", String(scale));
}

function queueNextFloatPose() {
  if (!floatModeOn) return;

  const x = (Math.random() - 0.5) * window.innerWidth * 0.09;
  const y = (Math.random() - 0.5) * window.innerHeight * 0.08;
  const scale = 1.08 + Math.random() * 0.08;
  setFloatPose(x, y, scale);

  const delay = 1600 + Math.random() * 1800;
  floatTimer = window.setTimeout(queueNextFloatPose, delay);
}

function setFloatMode(enabled) {
  floatModeOn = enabled;
  window.clearTimeout(floatTimer);

  if (enabled) {
    floatToggle.textContent = "FLOAT MODE: ON";
    floatToggle.classList.add("is-on");
    queueNextFloatPose();
    return;
  }

  floatToggle.textContent = "FLOAT MODE: OFF";
  floatToggle.classList.remove("is-on");
  setFloatPose(0, 0, 1);
}

async function startVideoWithSound() {
  video.muted = false;
  video.volume = 1;

  try {
    await video.play();
    audioGate.classList.add("hidden");
    return true;
  } catch (error) {
    return false;
  }
}

async function attemptAutoplay() {
  const startedWithSound = await startVideoWithSound();
  if (startedWithSound) return;

  video.muted = true;

  try {
    await video.play();
  } catch (error) {
    videoFallback.classList.remove("hidden");
  }

  audioGate.classList.remove("hidden");
}

audioUnlock.addEventListener("click", async () => {
  await startVideoWithSound();
});

floatToggle.addEventListener("click", () => {
  setFloatMode(!floatModeOn);
});

video.addEventListener("play", () => {
  videoFallback.classList.add("hidden");
});

video.addEventListener("error", () => {
  videoFallback.classList.remove("hidden");
});

window.addEventListener("resize", () => {
  if (!floatModeOn) return;
  queueNextFloatPose();
});

setFloatPose(0, 0, 1);
attemptAutoplay();
