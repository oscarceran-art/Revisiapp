import confetti from "canvas-confetti";

// Tasteful confetti — black & warm-cream palette, not loud rainbow.
const CONFETTI_COLORS = ["#1a1a1a", "#FAF8F5", "#E8D8C4", "#D9C9B0", "#A38560"];

function honourReducedMotion() {
  try {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}

export function celebrateSmall() {
  if (honourReducedMotion()) return;
  confetti({
    particleCount: 60,
    spread: 65,
    startVelocity: 35,
    origin: { y: 0.65 },
    colors: CONFETTI_COLORS,
    scalar: 0.9,
    ticks: 180,
  });
}

export function celebrateBig() {
  if (honourReducedMotion()) return;
  const end = Date.now() + 900;
  const fire = (particleRatio, opts) => {
    confetti({
      ...opts,
      origin: { y: 0.6 },
      colors: CONFETTI_COLORS,
      particleCount: Math.floor(180 * particleRatio),
    });
  };
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });

  // Side blasts for the "big" celebration
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function celebrateForScore(percentage) {
  if (percentage >= 90) celebrateBig();
  else if (percentage >= 70) celebrateSmall();
}
