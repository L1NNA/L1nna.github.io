const root = document.documentElement;
const inner = document.querySelector(".hero-inner");
const title = document.querySelector("h1");
const lines = [...title.children];
const since = document.querySelector(".since");
const cue = document.querySelector(".cue");
const logo = document.querySelector(".piece");
const mark = document.querySelector(".mark");
const wipe = document.querySelector(".wipe");
const traceL = document.querySelector(".trace-l");
const traceA = document.querySelector(".trace-a");
const navy = document.querySelector(".sweep-navy");
const red = document.querySelector(".sweep-red");
const strip = document.querySelector(".sweep-strip");
const soft = document.querySelector(".sweep-soft");
const progressBar = document.querySelector(".progress");
const numbers = document.querySelector(".numbers");

// Scroll-following delay in ms: larger feels heavier and glides for longer.
const GLIDE = 120;
const RATIO = 116 / 132;
const SLANT = Math.tan(Math.PI / 6);

const clamp = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
// The page's full height, which stays steady when mobile browser bars hide or show.
const tall = document.createElement("div");
tall.className = "fullheight";
document.body.append(tall);
const fullHeight = () => tall.getBoundingClientRect().height || innerHeight;

// How far t has moved through the part of the scroll between from and to.
const span = (t, from, to) => clamp((t - from) / (to - from));

let pin, big, shrink, bigX, bigY, homeX, homeY, rise, range, vh, vw;
let drifters = [];

// Everything that moves with the page, with its position measured once per layout.
function measure() {
  vh = fullHeight();
  vw = innerWidth;
  range = Math.max(1, root.scrollHeight - vh);
  const place = (el) => {
    const box = el.getBoundingClientRect();
    return { el, top: box.top + scrollY, height: box.height };
  };
  const reset = (el) => { el.style.transform = "none"; return el; };
  drifters = [
    // Publications stays put so it never crosses its list; the closing heading too,
    // because the page ends before a slide could finish.
    ...[...document.querySelectorAll("main h2")].filter((el) => !el.closest(".split, .closing")).map((el) => ({ kind: "heading", ...place(reset(el)) })),
    // Neighbouring photos travel in opposite directions on larger screens.
    ...(vw < 896 ? [] : [...document.querySelectorAll(".mosaic figure")].map((el, i) => ({ kind: "frame", rate: i % 3 === 1 || i === 2 ? -1 : 1, ...place(reset(el)) }))),
    ...[...document.querySelectorAll(".mosaic img")].map((el) => ({ kind: "photo", ...place(reset(el)) })),
    ...[...document.querySelectorAll(".closing-red, .closing-strip")].map((el) => ({ kind: "slant", rate: Number(el.dataset.rate), ...place(reset(el)) })),
    ...[...document.querySelectorAll(".shard")].map((el) => ({ kind: "shard", rate: Number(el.dataset.rate), ...place(reset(el)) })),
  ];
}

function drift(position) {
  for (const d of drifters) {
    // -1 as the element enters at the bottom of the screen, 1 as it leaves at the top.
    const at = clamp((position + vh / 2 - (d.top + d.height / 2)) / (vh / 2 + d.height / 2) * 0.5 + 0.5) * 2 - 1;
    if (d.kind === "heading") {
      d.el.style.transform = `translate3d(${Math.min(0, at) * -0.22 * vw}px, 0, 0)`;
      d.el.style.opacity = 1 - clamp(-at - 0.45) * 1.8;
    } else if (d.kind === "photo") {
      d.el.style.transform = `translate3d(0, ${at * 9}%, 0) scale(1.2)`;
    } else if (d.kind === "frame") {
      d.el.style.transform = `translate3d(0, ${at * d.rate * 20}px, 0)`;
    } else if (d.kind === "slant") {
      // The panel sits at the page's end, so measure from the bottom of the scroll.
      d.el.style.transform = `translate3d(${(range - position) * d.rate}px, 0, 0) skewX(-30deg)`;
    } else if (d.kind === "shard") {
      d.el.style.transform = `translate3d(0, ${(position + vh / 2 - d.top - d.height / 2) * d.rate}px, 0)`;
    }
  }
  progressBar.style.transform = `scaleX(${clamp(position / range)})`;
}

// The logo is sized at its largest and scaled down, so it stays sharp throughout.
function layout() {
  const w = innerWidth;
  const h = inner.getBoundingClientRect().height || innerHeight;
  pin = fullHeight() * 2.1;
  root.style.setProperty("--pin", `${pin}px`);

  title.style.transform = "none";
  since.style.transform = "none";
  const bar = document.querySelector(".bar").getBoundingClientRect().height;
  const top = inner.getBoundingClientRect().top;
  const head = title.getBoundingClientRect();
  const end = since.getBoundingClientRect();
  const block = end.bottom - head.top;

  // Logo above the headline, together centered below the header.
  big = Math.min(w * (w < 896 ? 0.86 : 0.5), (h - bar - 104 - block) / RATIO);
  const stackTop = bar + Math.max(8, (h - bar - 64 - (big * RATIO + 24 + block)) / 2);
  bigX = w / 2;
  bigY = stackTop + (big * RATIO) / 2;
  // The headline starts below the logo and ends up centered on its own.
  rise = stackTop + big * RATIO + 24 - (head.top - top);

  const home = mark.getBoundingClientRect();
  shrink = home.width / big;
  homeX = home.left + home.width / 2;
  homeY = home.top + home.height / 2;
  logo.style.width = `${big}px`;
  logo.style.marginLeft = `${-big / 2}px`;
  logo.style.marginTop = `${(-big * RATIO) / 2}px`;
}

function render(position) {
  const z = clamp(position / pin);

  // The L, then the A, each filling one line of the headline from left to right.
  const first = span(z, 0.02, 0.26);
  const second = span(z, 0.26, 0.5);
  traceL.style.strokeDashoffset = 1 - first;
  traceA.style.strokeDashoffset = 1 - second;
  lines[0].style.setProperty("--fill", `${first * 102}%`);
  lines[1].style.setProperty("--fill", `${second * 102}%`);

  // The logo and subtitle fill from left to right too.
  const filled = span(z, 0.5, 0.62);
  wipe.setAttribute("width", 132 * filled);
  since.style.setProperty("--fill", `${filled * 102}%`);

  // Then the logo flies up into the header and the headline settles in the middle.
  const t = ease(span(z, 0.62, 0.8));
  // The solid logo covers the outline in the header once it has landed.
  mark.style.visibility = t > 0.995 ? "hidden" : "visible";
  logo.style.transform =
    `translate3d(${lerp(bigX, homeX, t)}px, ${lerp(bigY, homeY, t)}px, 0) scale(${lerp(1, shrink, t)})`;
  const lowered = `translate3d(0, ${rise * (1 - t)}px, 0)`;
  title.style.transform = lowered;
  since.style.transform = lowered;

  // A red strip crosses first and leaves on the far side, then navy fills behind it.
  const swept = ease(span(z, 0.76, 0.96));
  const start = vw + vh * 0.75 + vh * 0.7;
  red.style.transform = `translate3d(${(1 - ease(span(z, 0.68, 0.92))) * (vw * 1.1 + vh * 0.639 + 30)}px, 0, 0) skewX(-30deg)`;
  navy.style.transform = `translate3d(${(1 - swept) * start}px, 0, 0) skewX(-30deg)`;

  // A thin red strip and a soft blue one arrive last, and keep moving in opposite
  // directions as the page scrolls past the opening.
  const arrive = 1 - ease(span(z, 0.86, 1));
  const beyond = Math.max(0, position - pin);
  strip.style.transform = `translate3d(${arrive * (vw * 0.32 + vh * 0.35) - beyond * 0.55}px, 0, 0) skewX(-30deg)`;
  soft.style.transform = `translate3d(${arrive * -(vw * 0.5 + vh * 0.35) + beyond * 0.35}px, 0, 0) skewX(-30deg)`;

  // The headline turns navy before the red strip reaches it, so it reads on red.
  const toNavy = span(z, 0.64, 0.7);
  lines[1].style.setProperty("--line", `rgb(${lerp(237, 0, toNavy)} ${lerp(27, 36, toNavy)} ${lerp(47, 82, toNavy)})`);

  // Text turns white exactly where the navy panel covers it, along the panel's slanted edge.
  const edge = -0.7 * vh + (1 - swept) * start;
  for (const el of [...lines, since]) {
    const box = el.getBoundingClientRect();
    const reach = box.height * 0.4;
    const edgeAt = (y) => edge + (vh / 2 - y) * SLANT - box.left;
    el.style.setProperty("--cut", `polygon(${edgeAt(box.top - reach)}px ${-reach}px, 9999px ${-reach}px, 9999px ${box.height + reach}px, ${edgeAt(box.bottom + reach)}px ${box.height + reach}px)`);
  }

  drift(position);
  cue.style.opacity = 1 - span(z, 0, 0.05);
  cue.style.visibility = z < 0.05 ? "visible" : "hidden";
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
  measure();
  render(current);
}

// The publication count follows the list the weekly job maintains.
document.querySelector(".pub-count").textContent = document.querySelectorAll(".pubs li").length;

// Without motion the page simply shows the logo above the headline.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  root.classList.add("moving");
  relayout();

  addEventListener("resize", relayout);
  addEventListener("scroll", wake, { passive: true });
  // The web font changes the page's height, which the animation is measured against.
  document.fonts.ready.then(relayout);
  // Opening the full publication list or a long bio moves everything below it.
  new ResizeObserver(relayout).observe(document.querySelector("main"));

  // The numbers count up the first time they appear.
  const counters = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      counters.disconnect();
      numbers.querySelectorAll("dl > div").forEach((el) => el.classList.add("seen"));
      const start = performance.now();
      const counts = [...numbers.querySelectorAll("[data-count]")].map((el) => [el, Number(el.textContent)]);
      const tick = (now) => {
        const done = 1 - Math.pow(1 - clamp((now - start) / 1400), 3);
        for (const [el, value] of counts) el.textContent = Math.round(value * done);
        if (done < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.35 });
  counters.observe(numbers);

  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("seen");
        reveal.unobserve(entry.target);
      }
    }
  }, { rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".mosaic figure, .place, .areas > div, .members li, .pubs > li").forEach((el) => reveal.observe(el));
}

// Long bios show about three lines, with a button to read the rest.
function collapseBios() {
  for (const item of document.querySelectorAll(".members li")) {
    const bio = item.querySelector("p");
    item.querySelector("button")?.remove();
    bio.classList.add("clamped");
    if (bio.scrollHeight <= bio.clientHeight + 1) {
      bio.classList.remove("clamped");
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "More";
    button.addEventListener("click", () => {
      const open = bio.classList.toggle("clamped");
      button.textContent = open ? "More" : "Less";
    });
    bio.after(button);
  }
}

// Past this many members, the rest wait behind a button.
const SHOWN = 9;
const list = document.querySelector(".members");
if (list.children.length > SHOWN) {
  [...list.children].slice(SHOWN).forEach((item) => item.classList.add("extra"));
  const all = document.createElement("button");
  all.type = "button";
  all.className = "show-all";
  all.textContent = `All members (${list.children.length})`;
  all.addEventListener("click", () => {
    list.classList.add("open");
    all.remove();
    collapseBios();
  });
  list.after(all);
}

collapseBios();
document.fonts.ready.then(collapseBios);
addEventListener("resize", collapseBios);
