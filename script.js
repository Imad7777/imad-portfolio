/**
 * try.html：Lenis 平滑滚动、首屏视差、逐行入场、作品集与弹窗。
 */
let currentProjectIndex = 0;
let filteredProjects = [];
let projects = [];
let modalCloseTimer = null;
/** @type {import("lenis").default | null} */
let lenis = null;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getProjects() {
  const el = document.getElementById("portfolio-projects");
  if (!el) return [];
  try {
    const data = JSON.parse(el.textContent);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("portfolio-projects JSON:", e);
    return [];
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function remapProjectDescription(html) {
  return String(html || "")
    .replace(/text-\[#0EA5E9\]/g, "ln-accent-text")
    .replace(/#0EA5E9/g, "#d4ff00");
}

function updateHeroParallax() {
  if (prefersReducedMotion()) return;
  const img = document.getElementById("hero-parallax-img");
  const inner = document.getElementById("hero-parallax-text-inner");
  if (!img || !inner) return;
  const y = lenis ? lenis.scroll : window.scrollY;
  img.style.transform = `translate3d(0, ${-0.5 * y}px, 0)`;
  inner.style.transform = `translate3d(0, ${0.3 * y}px, 0)`;
}

function handleNavbarScroll() {
  const y = lenis ? lenis.scroll : window.scrollY;
  const nav = document.getElementById("navbar");
  if (nav) nav.classList.toggle("nav-scrolled", y > 40);
}

function initLenis() {
  if (prefersReducedMotion() || typeof window.Lenis === "undefined") {
    window.addEventListener("scroll", () => {
      handleNavbarScroll();
      updateHeroParallax();
    });
    updateHeroParallax();
    return;
  }
  lenis = new window.Lenis({
    duration: 1.2,
    easing: easeOutCubic,
    wheelMultiplier: 1.2,
    touchMultiplier: 1.15,
    smoothWheel: true,
  });
  document.documentElement.classList.add("lenis", "lenis-smooth");
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on("scroll", () => {
    handleNavbarScroll();
    updateHeroParallax();
  });
  updateHeroParallax();
}

function renderProjects(projectList) {
  const container = document.getElementById("project-grid");
  if (!container) return;
  container.innerHTML = "";
  projectList.forEach((project, i) => {
    const n = String(i + 1).padStart(2, "0");
    const tags = (project.tags || [])
      .map(
        (t) =>
          `<span class="text-[10px] uppercase tracking-wider px-3 py-1 bg-white/5 text-[#d4ff00] rounded-full border border-white/10">${escapeHtml(t)}</span>`
      )
      .join("");
    container.innerHTML += `
            <div onclick="openProjectModal(${project.id})" class="ln-card project-card group shrink-0 w-[min(100%,340px)] md:w-auto md:shrink snap-center cursor-pointer border border-white/15 bg-[#0c0c0c] overflow-hidden">
                <div class="h-52 bg-zinc-900 relative overflow-hidden">
                    <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.title)}" class="ln-card-img w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                    <span class="ln-display absolute bottom-3 left-3 text-5xl text-white/20 group-hover:text-[#d4ff00]/40 transition-colors duration-[400ms]">${n}</span>
                    <div class="absolute top-3 right-3 px-3 py-1 bg-black/60 text-[10px] uppercase tracking-widest rounded-full border border-white/10">${escapeHtml(project.period)}</div>
                </div>
                <div class="p-6">
                    <div class="flex flex-wrap gap-2 mb-3">${tags}</div>
                    <h3 class="text-xl font-semibold tracking-tight group-hover:text-[#d4ff00] transition-colors duration-[400ms]">${escapeHtml(project.title)}</h3>
                    <p class="text-gray-500 text-sm mt-2 line-clamp-2">${escapeHtml(project.subtitle)}</p>
                    <div class="mt-5 text-[11px] uppercase tracking-widest text-gray-600"><span class="px-3 py-1 border border-white/15 rounded-full">${escapeHtml(project.role)}</span></div>
                </div>
            </div>`;
  });
}

function openProjectModal(id) {
  const list = getProjects();
  const project = list.find((p) => p.id === id);
  if (!project) return;
  if (lenis) lenis.stop();
  projects = list;
  currentProjectIndex = projects.findIndex((p) => p.id === id);
  filteredProjects = [...projects];
  document.getElementById("modal-project-title").textContent = project.title;
  const tagSpans = (project.tags || [])
    .map(
      (t) =>
        `<span class="text-[10px] uppercase tracking-wider px-4 py-2 bg-white/10 rounded-full border border-white/10">${escapeHtml(t)}</span>`
    )
    .join("");
  document.getElementById("modal-content").innerHTML = `
        <div class="mb-8">
            <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.title)}" class="w-full rounded-xl mb-8 shadow-2xl border border-white/10">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div class="text-sm text-gray-500 uppercase tracking-widest">${escapeHtml(project.period)} \u00b7 ${escapeHtml(project.role)}</div>
                <div class="flex flex-wrap gap-2">${tagSpans}</div>
            </div>
        </div>
        ${remapProjectDescription(project.description)}`;
  const modal = document.getElementById("project-modal");
  const panel = document.getElementById("modal-panel");
  const wasHidden = modal.classList.contains("hidden");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (wasHidden) {
    panel.classList.remove("modal-panel-open");
    modal.classList.remove("modal-open");
    void panel.offsetWidth;
    const runEnter = () => {
      modal.classList.add("modal-open");
      panel.classList.add("modal-panel-open");
    };
    if (prefersReducedMotion()) runEnter();
    else requestAnimationFrame(runEnter);
  }
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("project-modal");
  const panel = document.getElementById("modal-panel");
  if (modal.classList.contains("hidden")) return;
  modal.classList.remove("modal-open");
  panel.classList.remove("modal-panel-open");
  clearTimeout(modalCloseTimer);
  const delay = prefersReducedMotion() ? 0 : 280;
  modalCloseTimer = setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
    modalCloseTimer = null;
  }, delay);
}

function prevProject() {
  if (!filteredProjects.length) return;
  currentProjectIndex = (currentProjectIndex - 1 + filteredProjects.length) % filteredProjects.length;
  openProjectModal(filteredProjects[currentProjectIndex].id);
}

function nextProject() {
  if (!filteredProjects.length) return;
  currentProjectIndex = (currentProjectIndex + 1) % filteredProjects.length;
  openProjectModal(filteredProjects[currentProjectIndex].id);
}

function showAllProjects() {
  projects = getProjects();
  filteredProjects = [...projects];
  renderProjects(projects);
  const el = document.getElementById("portfolio");
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: -72, duration: 1.2, easing: easeOutCubic });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function smoothScrollTo(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: -72, duration: 1.2, easing: easeOutCubic });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const icon = document.getElementById("mobile-menu-button").querySelector("i");
  if (menu.classList.contains("hidden")) {
    menu.classList.remove("hidden");
    icon.classList.replace("fa-bars", "fa-times");
  } else {
    menu.classList.add("hidden");
    icon.classList.replace("fa-times", "fa-bars");
  }
}

/** 逐行入场：.ln-line-group 内 .ln-line */
function initLnLineGroups() {
  const groups = document.querySelectorAll(".ln-line-group");
  if (!groups.length) return;
  if (prefersReducedMotion()) {
    groups.forEach((g) => {
      g.querySelectorAll(".ln-line").forEach((l) => l.classList.add("ln-line-visible"));
    });
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll(".ln-line").forEach((line) => line.classList.add("ln-line-visible"));
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  groups.forEach((g) => obs.observe(g));
}

function initLnReveal() {
  if (prefersReducedMotion()) {
    document.querySelectorAll(".ln-reveal").forEach((el) => {
      el.classList.add("ln-reveal-on");
    });
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("ln-reveal-on");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
  );
  document.querySelectorAll(".ln-reveal").forEach((el) => obs.observe(el));
}

function initSkillBars() {
  document.querySelectorAll(".skill-bar-wrap").forEach((wrap) => {
    const fill = wrap.querySelector(".skill-bar-fill");
    if (!fill) return;
    const raw = parseInt(wrap.getAttribute("data-skill-pct") || "0", 10);
    const pct = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0));
    const applyWidth = () => {
      fill.style.width = `${pct}%`;
    };
    if (prefersReducedMotion()) {
      applyWidth();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            applyWidth();
            io.unobserve(wrap);
          }
        });
      },
      { threshold: 0.2 }
    );
    io.observe(wrap);
  });
}

function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const m = document.getElementById("project-modal");
    if (m.classList.contains("hidden")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") nextProject();
    if (e.key === "ArrowLeft") prevProject();
  });
}

function initHeroTapHint() {
  const layer = document.getElementById("hero-tap-layer");
  if (!layer) return;
  const dismiss = () => {
    layer.classList.add("opacity-0", "pointer-events-none");
    setTimeout(() => layer.remove(), 600);
  };
  layer.addEventListener("click", dismiss, { once: true });
  layer.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dismiss();
    }
  });
}

function initialize() {
  initLenis();
  initLnLineGroups();
  initLnReveal();
  projects = getProjects();
  filteredProjects = [...projects];
  renderProjects(projects);
  document.getElementById("mobile-menu-button").addEventListener("click", toggleMobileMenu);
  initSkillBars();
  initKeyboardShortcuts();
  initHeroTapHint();
  document.getElementById("project-modal").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

window.addEventListener("load", initialize);
window.smoothScrollTo = smoothScrollTo;
window.openProjectModal = openProjectModal;
window.closeModal = closeModal;
window.prevProject = prevProject;
window.nextProject = nextProject;
window.showAllProjects = showAllProjects;
window.toggleMobileMenu = toggleMobileMenu;
