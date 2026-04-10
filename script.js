const video = document.getElementById("bg-video");
const audioGate = document.getElementById("audio-gate");
const audioUnlock = document.getElementById("audio-unlock");
const videoFallback = document.getElementById("video-fallback");

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

video.addEventListener("play", () => {
  videoFallback.classList.add("hidden");
});

video.addEventListener("error", () => {
  videoFallback.classList.remove("hidden");
});

attemptAutoplay();
