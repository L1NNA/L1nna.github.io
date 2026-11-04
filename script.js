const root = document.documentElement;
const strip = document.querySelector(".strip");
const side = document.querySelector(".side");
const slot = document.querySelector(".slot");
const title = document.querySelector("h1");
const lines = [...title.children];
const column = document.querySelector(".column");
const cue = document.querySelector(".cue");
const team = document.querySelector(".team");
const logo = document.querySelector(".piece");
const wipe = document.querySelector(".wipe");
const traceL = document.querySelector(".trace-l");
const traceA = document.querySelector(".trace-a");

// Scroll-following delay in ms: larger feels heavier and glides for longer.
const GLIDE = 120;

const clamp = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
// How far t has moved through the part of the scroll between from and to.
const span = (t, from, to) => clamp((t - from) / (to - from));

let narrow;
let pin;
let range;
let big;
let shrink;
let bigX;
let bigY;
let homeX;
let homeY;

// The logo is sized at its largest and scaled down, so it stays sharp throughout.
function layout() {
  const w = innerWidth;
  const h = innerHeight;
  narrow = w < 896;
  pin = h * 1.7;
  root.style.setProperty("--pin", `${pin}px`);

  // The logo is positioned relative to the side panel it lives in.
  const panel = side.getBoundingClientRect();
  const top = panel.top;
  const home = slot.getBoundingClientRect();
  const head = title.getBoundingClientRect();
  const room = column.getBoundingClientRect();
  const height = 116 / 132;
  if (narrow) {
    big = Math.min(w * 0.82, (head.top - top - 170) / height);
    bigX = w / 2 - panel.left;
    bigY = head.top - top - 16 - (big * height) / 2;
  } else {
    big = Math.min(room.width * 0.8, (h * 0.66) / height);
    bigX = room.left + room.width / 2 - panel.left;
    bigY = h / 2;
  }
  shrink = home.width / big;
  homeX = home.left - panel.left + home.width / 2;
  homeY = home.top - top + home.height / 2;

  logo.style.width = `${big}px`;
  logo.style.marginLeft = `${-big / 2}px`;
  logo.style.marginTop = `${(-big * height) / 2}px`;
  range = Math.max(1, root.scrollHeight - h);
}

function render(position) {
  const z = clamp(position / pin);

  // The L, then the A, each filling one line of the headline from left to right.
  const first = span(z, 0.02, 0.3);
  const second = span(z, 0.3, 0.58);
  traceL.style.strokeDashoffset = 1 - first;
  traceA.style.strokeDashoffset = 1 - second;
  lines[0].style.setProperty("--fill", `${first * 100}%`);
  lines[1].style.setProperty("--fill", `${second * 100}%`);

  // The logo fills from left to right too.
  wipe.setAttribute("width", 132 * span(z, 0.58, 0.72));

  // Then it shrinks and rises, then slides across, so it passes above the headline.
  const small = ease(span(z, 0.72, 0.88));
  const across = ease(span(z, 0.76, 1));
  logo.style.transform =
    `translate3d(${lerp(bigX, homeX, across)}px, ${lerp(bigY, homeY, small)}px, 0) scale(${lerp(1, shrink, small)})`;

  // The team counts arrive once the headline is filled and the logo is on its way.
  const counts = ease(span(z, 0.76, 0.92));
  team.style.opacity = counts;
  team.style.transform = `translate3d(0, ${(1 - counts) * 16}px, 0)`;

  cue.style.opacity = 1 - span(z, 0, 0.05);
  strip.style.setProperty("--split", `${72 - clamp(position / range) * 48}%`);
}

let current = scrollY;
let previous = 0;
let running = false;

function frame(now) {
  const elapsed = previous ? Math.min(now - previous, 64) : 16;
  previous = now;
  current += (scrollY - current) * (1 - Math.exp(-elapsed / GLIDE));
  if (Math.abs(scrollY - current) < 0.1) current = scrollY;
  render(current);
  if (current !== scrollY) {
    requestAnimationFrame(frame);
  } else {
    running = false;
    previous = 0;
  }
}

function wake() {
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
}

function relayout() {
  layout();
  render(current);
}

// Without motion the page simply shows the logo in the side panel.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  root.classList.add("moving");
  relayout();

  addEventListener("resize", relayout);
  addEventListener("scroll", wake, { passive: true });
  // The web font changes the page's height, which the animation is measured against.
  document.fonts.ready.then(relayout);

  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("seen");
        reveal.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".row h2, .areas > div, .pubs li").forEach((el) => reveal.observe(el));
}
