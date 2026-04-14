/**
 * try.html：Lenis 平滑滚动、GSAP ScrollTrigger（与 Lenis 同步）、首屏视差、逐行入场、作品集 pin 横滑（scrub + 触控板横划/触摸横滑）、项目与实习合并区（`#career-layout` + `renderCareerSection`）、**`initLnMajorMotionBlocks`**（`.ln-major-motion` 大块仅入场：下滑 `onEnter` / 上滑回区 `onEnterBack`）、Hero 主图 scrub、弹窗、滚动进度条、磁吸按钮、自定义光标、荣誉区视差字、`.ln-stagger` 入场可重播。
 */
let currentProjectIndex = 0;
let filteredProjects = [];
let projects = [];
/** @type {"portfolio"|"experience"} */
let modalMode = "portfolio";
let experienceItems = [];
let currentExperienceIndex = 0;
let modalCloseTimer = null;
/** @type {import("lenis").default | null} */
let lenis = null;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function lenisRaf(time) {
  if (lenis) lenis.raf(time * 1000);
}

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

function getExperienceItems() {
  const el = document.getElementById("experience-projects");
  if (!el) return [];
  try {
    const data = JSON.parse(el.textContent);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("experience-projects JSON:", e);
    return [];
  }
}

/** 项目与实习合并区：`#career-layout` 定义分组与 id 引用 */
function getCareerLayout() {
  const el = document.getElementById("career-layout");
  if (!el) return null;
  try {
    const data = JSON.parse(el.textContent);
    return data && Array.isArray(data.sections) ? data : null;
  } catch (e) {
    console.error("career-layout JSON:", e);
    return null;
  }
}

function lnCareerPeriodEndKey(periodStr) {
  const s = String(periodStr || "");
  if (/课题/.test(s)) return 202412;
  if (/在校/.test(s)) return 202407;
  const years = s.match(/\d{4}/g);
  if (!years || !years.length) return 0;
  const yLast = parseInt(years[years.length - 1], 10);
  const dots = s.match(/\d{4}\.(\d{1,2})/g);
  let mo = 12;
  if (dots && dots.length) {
    const parts = dots[dots.length - 1].split(".");
    mo = parseInt(parts[1], 10) || 12;
  }
  return yLast * 100 + mo;
}

function lnCareerSectionStartKey(periodStr) {
  const s = String(periodStr || "");
  if (/课题/.test(s)) return 202401;
  if (/在校/.test(s)) return 202301;
  const m = s.match(/(\d{4})\D+(\d{1,2})/);
  if (m) return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
  const y = s.match(/\d{4}/);
  return y ? parseInt(y[0], 10) * 100 + 1 : 0;
}

function lnCareerSortByPeriodDesc(items, getPeriod) {
  return [...items].sort(
    (a, b) => lnCareerPeriodEndKey(getPeriod(b)) - lnCareerPeriodEndKey(getPeriod(a))
  );
}

function lnCareerOrderedSections(layout) {
  const sections = layout.sections || [];
  const main = sections.filter((s) => s.kind !== "portfolio_only");
  const tail = sections.filter((s) => s.kind === "portfolio_only");
  main.sort((a, b) => lnCareerSectionStartKey(b.period) - lnCareerSectionStartKey(a.period));
  return main.concat(tail);
}

/** try 页占位图：picsum 固定 id，避免随机刷新变脸 */
function lnTryPlaceholderPicsum(seed) {
  const ids = [1015, 201, 180, 48, 649, 96, 292, 326, 28, 443, 119, 237, 367, 512, 628];
  const id = ids[Math.abs(Number(seed)) % ids.length];
  return `https://picsum.photos/id/${id}/800/600`;
}

/**
 * @param {boolean} [lightPaper] try 页实习 featured 块：浅底上的浅色卡（非深灰矩形）
 */
function lnCareerHtmlExperienceCard(item, n, cardEnter, lightPaper) {
  const lp = Boolean(lightPaper);
  const tagWrap = lp
    ? "text-[10px] uppercase tracking-wider px-3 py-1 bg-orange-50/90 text-[var(--ln-lime)] rounded-full border border-orange-200/70"
    : "text-[10px] uppercase tracking-wider px-3 py-1 bg-white/5 text-[var(--ln-lime)] rounded-full border border-white/10";
  const tags = (item.tags || [])
    .map((t) => `<span class="${tagWrap}">${escapeHtml(t)}</span>`)
    .join("");
  let mediaInner;
  if (item.image) {
    mediaInner = `<img src="${escapeAttr(item.image)}" alt="" class="ln-scrub-scale-img w-full h-full object-cover opacity-95" loading="lazy">`;
  } else if (item.logo) {
    mediaInner = `<img src="${escapeAttr(item.logo)}" alt="${escapeAttr(item.org || "")}" class="ln-scrub-scale-img max-h-[85%] max-w-[85%] w-auto object-contain opacity-95" loading="lazy" width="200" height="80">`;
  } else {
    mediaInner = `<i class="fas ${escapeAttr(item.logoIcon || "fa-building")} text-5xl text-[rgba(var(--ln-accent-rgb),0.75)]" aria-hidden="true"></i>`;
  }
  const cardShell = lp
    ? `ln-exp-card ln-exp-card--light-paper ln-card group cursor-pointer border border-slate-200/90 bg-white shadow-sm overflow-hidden`
    : `ln-exp-card ln-card group cursor-pointer border border-white/15 bg-[var(--ln-bg-mid2)] overflow-hidden`;
  const mediaShell = lp ? "ln-scrub-scale h-52 bg-slate-200 relative overflow-hidden flex items-center justify-center" : "ln-scrub-scale h-52 bg-zinc-900 relative overflow-hidden flex items-center justify-center";
  const grad = lp
    ? "absolute inset-0 bg-gradient-to-t from-slate-800/30 via-transparent to-transparent pointer-events-none"
    : "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none";
  const numCls = lp
    ? "ln-display absolute bottom-3 left-3 text-5xl text-slate-300 group-hover:text-[rgba(var(--ln-accent-rgb),0.45)] transition-colors duration-[400ms]"
    : "ln-display absolute bottom-3 left-3 text-5xl text-white/15 group-hover:text-[rgba(var(--ln-accent-rgb),0.35)] transition-colors duration-[400ms]";
  const periodCls = lp
    ? "absolute top-3 right-3 px-3 py-1 bg-white/95 text-slate-600 text-[10px] uppercase tracking-widest rounded-full border border-slate-200 shadow-sm"
    : "absolute top-3 right-3 px-3 py-1 bg-black/60 text-[10px] uppercase tracking-widest rounded-full border border-white/10";
  const orgCls = lp ? "text-[10px] uppercase tracking-widest text-slate-500 mb-2" : "text-[10px] uppercase tracking-widest text-white/40 mb-2";
  const titleCls = lp
    ? "text-xl font-semibold tracking-tight text-slate-900 group-hover:text-[var(--ln-lime)] transition-colors duration-[400ms]"
    : "text-xl font-semibold tracking-tight text-white group-hover:text-[var(--ln-lime)] transition-colors duration-[400ms]";
  const subCls = lp ? "text-slate-600 text-sm mt-2 line-clamp-2" : "text-gray-500 text-sm mt-2 line-clamp-2";
  const roleCls = lp
    ? "mt-5 text-[11px] uppercase tracking-widest text-slate-600"
    : "mt-5 text-[11px] uppercase tracking-widest text-gray-600";
  const rolePill = lp ? "px-3 py-1 border border-slate-200 rounded-full bg-slate-50" : "px-3 py-1 border border-white/15 rounded-full";
  return `
            <div onclick="openExperienceModal(${item.id})" class="${cardShell}"${cardEnter}>
                <div class="${mediaShell}">
                    ${mediaInner}
                    <div class="${grad}"></div>
                    <span class="${numCls}">${n}</span>
                    <div class="${periodCls}">${escapeHtml(item.period)}</div>
                </div>
                <div class="p-6">
                    <p class="${orgCls}">${escapeHtml(item.org || "")}</p>
                    <div class="flex flex-wrap gap-2 mb-3">${tags}</div>
                    <h3 class="${titleCls}">${escapeHtml(item.title)}</h3>
                    <p class="${subCls}">${escapeHtml(item.subtitle)}</p>
                    <div class="${roleCls}"><span class="${rolePill}">${escapeHtml(item.role)}</span></div>
                </div>
            </div>`;
}

function lnCareerHtmlPortfolioCard(project, n, cardEnter) {
  const tags = (project.tags || [])
    .map(
      (t) =>
        `<span class="text-[10px] uppercase tracking-wider px-3 py-1 bg-white/5 text-[var(--ln-lime)] rounded-full border border-white/10">${escapeHtml(t)}</span>`
    )
    .join("");
  const pimg = project.image || lnTryPlaceholderPicsum(project.id);
  const mediaInner = `<img src="${escapeAttr(pimg)}" alt="${escapeAttr(project.title)}" class="ln-scrub-scale-img w-full h-full object-cover opacity-95" loading="lazy">`;
  return `
            <div onclick="openProjectModal(${project.id})" class="ln-exp-card ln-card group cursor-pointer border border-white/15 bg-[var(--ln-bg-mid2)] overflow-hidden"${cardEnter}>
                <div class="ln-scrub-scale h-52 bg-zinc-900 relative overflow-hidden flex items-center justify-center">
                    ${mediaInner}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none"></div>
                    <span class="ln-display absolute bottom-3 left-3 text-5xl text-white/15 group-hover:text-[rgba(var(--ln-accent-rgb),0.35)] transition-colors duration-[400ms]">${n}</span>
                    <div class="absolute top-3 right-3 px-3 py-1 bg-black/60 text-[10px] uppercase tracking-widest rounded-full border border-white/10">${escapeHtml(project.period)}</div>
                </div>
                <div class="p-6">
                    <p class="text-[10px] uppercase tracking-widest text-white/40 mb-2">${escapeHtml(project.category || "")}</p>
                    <div class="flex flex-wrap gap-2 mb-3">${tags}</div>
                    <h3 class="text-xl font-semibold tracking-tight text-white group-hover:text-[var(--ln-lime)] transition-colors duration-[400ms]">${escapeHtml(project.title)}</h3>
                    <p class="text-gray-500 text-sm mt-2 line-clamp-2">${escapeHtml(project.subtitle)}</p>
                    <div class="mt-5 text-[11px] uppercase tracking-widest text-gray-600"><span class="px-3 py-1 border border-white/15 rounded-full">${escapeHtml(project.role)}</span></div>
                </div>
            </div>`;
}

/** 芒果 TV（山海）实习主块：保留大标题 + 卡片网格 */
function lnCareerIsMangoShanhaiInternship(sec) {
  if (sec.kind !== "internship") return false;
  const o = String(sec.org || "");
  return o.includes("芒果") && o.includes("山海");
}

function lnCareerZRowMediaExperience(item) {
  if (item.image) {
    return `<img src="${escapeAttr(item.image)}" alt="" class="ln-career-zrow__img w-full h-full min-h-[200px] object-cover opacity-95" loading="lazy">`;
  }
  if (item.logo) {
    return `<img src="${escapeAttr(item.logo)}" alt="${escapeAttr(item.org || "")}" class="max-h-[52%] max-w-[72%] w-auto object-contain opacity-95" loading="lazy" width="200" height="80">`;
  }
  return `<i class="fas ${escapeAttr(item.logoIcon || "fa-building")} text-5xl text-[rgba(var(--ln-accent-rgb),0.5)]" aria-hidden="true"></i>`;
}

function lnCareerHtmlZRowExperience(item, rowIdx, cardEnter) {
  const reverse = rowIdx % 2 === 1;
  const mediaInner = lnCareerZRowMediaExperience(item);
  const rowDir = reverse ? " md:flex-row-reverse" : "";
  return `
            <article onclick="openExperienceModal(${item.id})" class="ln-career-zrow group cursor-pointer border border-white/12 bg-[#080808] md:border-0 md:bg-transparent p-4 md:p-0"${cardEnter}>
                <div class="ln-career-zrow__inner flex flex-col${rowDir} md:flex-row md:items-stretch gap-6 md:gap-10 lg:gap-14">
                    <div class="ln-career-zrow__media md:flex-1 min-h-[200px] md:min-h-[240px] rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center relative">
                        ${mediaInner}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none md:hidden"></div>
                    </div>
                    <div class="ln-career-zrow__body md:flex-1 flex flex-col justify-center px-0 md:px-1">
                        <span class="ln-career-zrow__num ln-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none mb-3 md:mb-4">${String(rowIdx + 1).padStart(2, "0")}</span>
                        <p class="text-[11px] uppercase tracking-widest text-white/35 mb-2">${escapeHtml(item.org || "")}<span class="text-white/20 mx-2">·</span>${escapeHtml(item.period || "")}</p>
                        <h3 class="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-[var(--ln-lime)] transition-colors duration-300">${escapeHtml(item.title)}</h3>
                        <p class="text-sm md:text-base text-white/55 mt-3 leading-relaxed max-w-xl">${escapeHtml(item.subtitle || "")}</p>
                        <div class="mt-6 flex items-center gap-2 text-white/70" aria-hidden="true">
                            <i class="fas fa-arrow-up-right-from-square text-sm"></i>
                            <span class="text-[10px] uppercase tracking-[0.2em] text-white/30">详情</span>
                        </div>
                    </div>
                </div>
            </article>`;
}

function lnCareerHtmlZRowPortfolio(project, rowIdx, cardEnter) {
  const reverse = rowIdx % 2 === 1;
  const pimg = project.image || lnTryPlaceholderPicsum(project.id);
  const mediaInner = `<img src="${escapeAttr(pimg)}" alt="${escapeAttr(project.title)}" class="ln-career-zrow__img w-full h-full min-h-[200px] object-cover opacity-95" loading="lazy">`;
  const rowDir = reverse ? " md:flex-row-reverse" : "";
  return `
            <article onclick="openProjectModal(${project.id})" class="ln-career-zrow group cursor-pointer border border-white/12 bg-[#080808] md:border-0 md:bg-transparent p-4 md:p-0"${cardEnter}>
                <div class="ln-career-zrow__inner flex flex-col${rowDir} md:flex-row md:items-stretch gap-6 md:gap-10 lg:gap-14">
                    <div class="ln-career-zrow__media md:flex-1 min-h-[200px] md:min-h-[240px] rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center relative">
                        ${mediaInner}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none md:hidden"></div>
                    </div>
                    <div class="ln-career-zrow__body md:flex-1 flex flex-col justify-center px-0 md:px-1">
                        <span class="ln-career-zrow__num ln-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none mb-3 md:mb-4">${String(rowIdx + 1).padStart(2, "0")}</span>
                        <p class="text-[11px] uppercase tracking-widest text-white/35 mb-2">${escapeHtml(project.category || "项目")}<span class="text-white/20 mx-2">·</span>${escapeHtml(project.period || "")}</p>
                        <h3 class="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-[var(--ln-lime)] transition-colors duration-300">${escapeHtml(project.title)}</h3>
                        <p class="text-sm md:text-base text-white/55 mt-3 leading-relaxed max-w-xl">${escapeHtml(project.subtitle || "")}</p>
                        <div class="mt-6 flex items-center gap-2 text-white/70" aria-hidden="true">
                            <i class="fas fa-arrow-up-right-from-square text-sm"></i>
                            <span class="text-[10px] uppercase tracking-[0.2em] text-white/30">详情</span>
                        </div>
                    </div>
                </div>
            </article>`;
}

function lnCareerHtmlFeaturedInternshipSection(sec, expMap, cardEnter) {
  const sorted = lnCareerSortByPeriodDesc(
    (sec.experienceIds || []).map((id) => expMap.get(id)).filter(Boolean),
    (x) => x.period
  );
  let html = `<section class="ln-career-group ln-career-group--featured ln-reveal">`;
  html += `<header class="ln-career-group__head mb-8 md:mb-10 border-b border-white/10 pb-8">`;
  html += `<time class="text-xs uppercase tracking-widest text-white/35 block mb-2">${escapeHtml(sec.period)}</time>`;
  html += `<h3 class="text-2xl md:text-3xl font-bold text-[var(--ln-lime)]">${escapeHtml(sec.org)}</h3>`;
  if (sec.role) html += `<p class="text-white/60 mt-1 text-sm">${escapeHtml(sec.role)}</p>`;
  if (sec.bodyHtml) html += `<div class="mt-5">${sec.bodyHtml}</div>`;
  if (sec.highlight) {
    html += `<p class="ln-timeline-glow mt-4 text-sm text-[rgba(var(--ln-accent-rgb),0.9)] leading-relaxed border-l-2 border-[rgba(var(--ln-accent-rgb),0.4)] pl-4">${escapeHtml(sec.highlight)}</p>`;
  }
  html += `</header>`;
  if (sorted.length) {
    html += `<div class="ln-career-group__grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ln-exp-grid">`;
    sorted.forEach((item, i) => {
      html += lnCareerHtmlExperienceCard(item, String(i + 1).padStart(2, "0"), cardEnter, true);
    });
    html += `</div>`;
  }
  html += `</section>`;
  return html;
}

function renderCareerSection() {
  const rootIntern = document.getElementById("career-internship-root");
  const rootProj = document.getElementById("career-projects-root");
  const secIntern = document.getElementById("career-internship-section");
  const secProj = document.getElementById("career-projects-section");
  const rootLegacy = document.getElementById("career-root");
  const useSplit = Boolean(rootIntern && rootProj);
  if (!useSplit && !rootLegacy) return;

  const expList = getExperienceItems();
  experienceItems = expList;
  const expMap = new Map(expList.map((e) => [e.id, e]));
  const projList = getProjects();
  const projMap = new Map(projList.map((p) => [p.id, p]));

  const layout = getCareerLayout();
  const cardEnter = prefersReducedMotion() ? "" : ` style="opacity:0;transform:translateY(36px)"`;

  let internHtml = "";
  /** @type {{ type: "exp"|"port", item?: object, project?: object }[]} */
  const zPieces = [];

  if (!layout || !layout.sections || !layout.sections.length) {
    const sorted = lnCareerSortByPeriodDesc(expList, (x) => x.period);
    const mangoItems = sorted.filter((x) => {
      const o = String(x.org || "");
      return o.includes("芒果") && o.includes("山海");
    });
    const otherItems = sorted.filter((x) => {
      const o = String(x.org || "");
      return !(o.includes("芒果") && o.includes("山海"));
    });
    if (mangoItems.length) {
      internHtml = lnCareerHtmlFeaturedInternshipSection(
        {
          period: mangoItems[0].period || "",
          org: "芒果 TV（山海）",
          role: "实习经历",
          bodyHtml:
            "<p class=\"text-white/70 leading-relaxed text-sm md:text-base\">实习期间主导与参与多个业务向产品，详情见下方卡片。</p>",
          highlight: "",
          experienceIds: mangoItems.map((x) => x.id),
        },
        expMap,
        cardEnter
      );
    }
    otherItems.forEach((item) => zPieces.push({ type: "exp", item }));
  } else {
    lnCareerOrderedSections(layout).forEach((sec) => {
      if (sec.kind === "internship" && lnCareerIsMangoShanhaiInternship(sec)) {
        internHtml += lnCareerHtmlFeaturedInternshipSection(sec, expMap, cardEnter);
        return;
      }
      if (sec.kind === "internship") {
        lnCareerSortByPeriodDesc(
          (sec.experienceIds || []).map((id) => expMap.get(id)).filter(Boolean),
          (x) => x.period
        ).forEach((item) => zPieces.push({ type: "exp", item }));
        return;
      }
      if (sec.kind === "org") {
        lnCareerSortByPeriodDesc(
          (sec.experienceIds || []).map((id) => expMap.get(id)).filter(Boolean),
          (x) => x.period
        ).forEach((item) => zPieces.push({ type: "exp", item }));
        return;
      }
      if (sec.kind === "portfolio_only") {
        lnCareerSortByPeriodDesc(
          (sec.portfolioIds || []).map((id) => projMap.get(id)).filter(Boolean),
          (x) => x.period
        ).forEach((project) => zPieces.push({ type: "port", project }));
      }
    });
  }

  let zHtml = "";
  zPieces.forEach((p, i) => {
    if (p.type === "exp" && p.item) zHtml += lnCareerHtmlZRowExperience(p.item, i, cardEnter);
    else if (p.type === "port" && p.project) zHtml += lnCareerHtmlZRowPortfolio(p.project, i, cardEnter);
  });

  if (useSplit) {
    if (secIntern && rootIntern) {
      if (internHtml) {
        secIntern.classList.remove("hidden");
        rootIntern.innerHTML = internHtml;
      } else {
        secIntern.classList.add("hidden");
        rootIntern.innerHTML = "";
      }
    }
    if (secProj && rootProj) {
      if (zHtml) {
        secProj.classList.remove("hidden");
        rootProj.innerHTML = `<div class="ln-career-zlist">${zHtml}</div>`;
      } else {
        secProj.classList.add("hidden");
        rootProj.innerHTML = "";
      }
    }
  } else if (rootLegacy) {
    let combined = internHtml;
    if (zHtml) {
      combined += `<section class="ln-career-group ln-career-group--projects ln-reveal"><header class="mb-6 md:mb-8 border-b border-white/10 pb-5"><p class="text-[11px] uppercase tracking-[0.35em] text-[var(--ln-lime)] mb-2">Project experience</p><h3 class="text-2xl md:text-3xl font-bold text-white tracking-tight">项目经历</h3></header><div class="ln-career-zlist">${zHtml}</div></section>`;
    }
    rootLegacy.innerHTML = combined || `<p class="text-white/40 text-sm">暂无经历数据</p>`;
  }

  const careerMount = document.getElementById("project-journey") || rootLegacy;
  requestAnimationFrame(() => {
    const cards = careerMount
      ? careerMount.querySelectorAll(".ln-exp-card, .ln-career-zrow")
      : [];
    if (
      useSplit &&
      !prefersReducedMotion() &&
      typeof window.gsap !== "undefined" &&
      window.ScrollTrigger
    ) {
      /* try 分块页：实习顺序入场、项目 Z 行逐条入场，见 initLnMajorMotionBlocks */
    } else if (!prefersReducedMotion() && typeof window.gsap !== "undefined" && cards.length) {
      window.gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.62,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "opacity,transform",
      });
    } else {
      cards.forEach((c) => {
        c.style.removeProperty("opacity");
        c.style.removeProperty("transform");
      });
    }
    if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
  });
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
    .replace(/#0EA5E9/g, "var(--ln-lime)");
}

function updateHeroParallax() {
  if (prefersReducedMotion()) return;
  const wrap = document.getElementById("hero-parallax-img-wrap");
  const inner = document.getElementById("hero-parallax-text-inner");
  if (!wrap || !inner) return;
  const y = lenis ? lenis.scroll : window.scrollY;
  wrap.style.transform = `translate3d(0, ${-0.5 * y}px, 0)`;
  inner.style.transform = `translate3d(0, ${0.3 * y}px, 0)`;
}

function updateScrollProgress() {
  const bar = document.getElementById("ln-scroll-progress");
  if (!bar) return;
  if (prefersReducedMotion()) {
    bar.style.transform = "scaleX(0)";
    return;
  }
  const scroll = lenis ? lenis.scroll : window.scrollY;
  const sh = document.documentElement.scrollHeight - window.innerHeight;
  const max = sh > 0 ? sh : 1;
  const p = Math.min(1, Math.max(0, scroll / max));
  bar.style.transform = `scaleX(${p})`;
}

function scrollShell() {
  handleNavbarScroll();
  updateHeroParallax();
  updateScrollProgress();
}

/** 作品集 pin 横滑：ScrollTrigger 实例与卸载函数 */
let lnPortPinRefreshRaf = 0;
let lnPortImgRefreshTimer = 0;

/** 大区块入场 / 离场：gsap.context 统一 revert（与 Lenis scrollerProxy 兼容） */
let lnMajorMotionCtx = null;

function teardownLnMajorMotion() {
  if (lnMajorMotionCtx) {
    lnMajorMotionCtx.revert();
    lnMajorMotionCtx = null;
  }
}

const LN_EASE_ENTER = "power3.out";
const LN_EASE_IMG = "power2.out";
const LN_EASE_MASK = "power2.inOut";

function lnResetPortfolioItem(gs, item) {
  const card = item.querySelector(".ln-card");
  const img = item.querySelector(".ln-card-img");
  gs.set(item, { opacity: 0, y: 56, force3D: true });
  if (card) gs.set(card, { transformOrigin: "50% 85%", scale: 0.93, force3D: true });
  if (img) gs.set(img, { scale: 1.12, transformOrigin: "50% 42%", force3D: true });
}

/** 单张作品集卡入场时间线（DOM 顺序即从左到右） */
function lnPortfolioItemEnterTimeline(gs, item) {
  const card = item.querySelector(".ln-card");
  const img = item.querySelector(".ln-card-img");
  const row = gs.timeline({ defaults: { overwrite: "auto" } });
  row.to(item, { opacity: 1, y: 0, duration: 0.78, ease: LN_EASE_ENTER }, 0);
  if (card) row.to(card, { scale: 1, duration: 0.84, ease: LN_EASE_ENTER }, 0.06);
  if (img) row.to(img, { scale: 1, duration: 0.92, ease: LN_EASE_IMG }, 0.1);
  return row;
}

/**
 * 作品集：按轨道 DOM 顺序从左到右依次播入场（下一张略重叠启动，总时长可控）。
 */
function lnPlayPortfolioItemsEnter(gs, portItems) {
  if (!portItems || !portItems.length) return;
  const list = gs.utils.toArray(portItems);
  list.forEach((item) => lnResetPortfolioItem(gs, item));
  const master = gs.timeline();
  list.forEach((item, i) => {
    master.add(lnPortfolioItemEnterTimeline(gs, item), i === 0 ? 0 : ">-0.34");
  });
}

function lnResetExpCard(gs, card) {
  const media = card.querySelector(".ln-scrub-scale");
  const img = card.querySelector(".ln-scrub-scale-img");
  gs.set(card, { opacity: 0, y: 44, force3D: true });
  if (media) gs.set(media, { clipPath: "inset(12% 6% 20% 6%)", force3D: true });
  if (img) gs.set(img, { scale: 1.14, opacity: 0.62, transformOrigin: "50% 50%", force3D: true });
}

function lnExpCardEnterTimeline(gs, card) {
  const media = card.querySelector(".ln-scrub-scale");
  const img = card.querySelector(".ln-scrub-scale-img");
  const sub = gs.timeline({ defaults: { overwrite: "auto" } });
  sub.to(card, { opacity: 1, y: 0, duration: 0.72, ease: LN_EASE_ENTER }, 0);
  if (media) sub.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.82, ease: LN_EASE_MASK }, 0.05);
  if (img) sub.to(img, { scale: 1, opacity: 0.95, duration: 0.88, ease: LN_EASE_IMG }, 0.08);
  return sub;
}

function lnResetCareerZRow(gs, row) {
  const media = row.querySelector(".ln-career-zrow__media");
  const img = row.querySelector(".ln-career-zrow__img");
  const body = row.querySelector(".ln-career-zrow__body");
  gs.set(row, { opacity: 0, y: 52, force3D: true });
  if (body) gs.set(body, { opacity: 0, y: 36, force3D: true });
  if (media) gs.set(media, { clipPath: "inset(0% 4% 100% 4%)", force3D: true });
  if (img) gs.set(img, { scale: 1.1, opacity: 0.68, transformOrigin: "50% 50%", force3D: true });
}

function lnCareerZRowEnterTimeline(gs, row) {
  const media = row.querySelector(".ln-career-zrow__media");
  const img = row.querySelector(".ln-career-zrow__img");
  const body = row.querySelector(".ln-career-zrow__body");
  const sub = gs.timeline({ defaults: { overwrite: "auto" } });
  sub.to(row, { opacity: 1, y: 0, duration: 0.7, ease: LN_EASE_ENTER }, 0);
  if (media) sub.to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: LN_EASE_MASK }, 0.04);
  if (img) sub.to(img, { scale: 1, opacity: 0.95, duration: 0.88, ease: LN_EASE_IMG }, 0.1);
  if (body) sub.to(body, { opacity: 1, y: 0, duration: 0.62, ease: LN_EASE_ENTER }, 0.16);
  return sub;
}

/**
 * 主视觉、作品集带、实习/项目块、荣誉、关于、技能标题与 logo 带、联系标题等：进视口淡入上移；下滑进入 `onEnter`、上滑再次进入 `onEnterBack`，无离场动画。
 */
function initLnMajorMotionBlocks() {
  if (prefersReducedMotion() || typeof window.gsap === "undefined" || !window.ScrollTrigger) {
    teardownLnMajorMotion();
    return;
  }
  teardownLnMajorMotion();
  const gs = window.gsap;
  const ST = window.ScrollTrigger;
  lnMajorMotionCtx = gs.context(() => {
    const bindBlock = (el, opts) => {
      if (!el) return;
      const y = opts.y != null ? opts.y : 52;
      const enterDur = opts.enterDur != null ? opts.enterDur : 0.72;
      const start = opts.start != null ? opts.start : "top bottom";
      const end = opts.end != null ? opts.end : "bottom top";
      const scaleFrom = opts.scaleFrom;
      const transformOrigin = opts.transformOrigin || "50% 55%";
      let playEnter;
      if (scaleFrom != null && scaleFrom < 1) {
        gs.set(el, {
          opacity: 0,
          y,
          scale: scaleFrom,
          transformOrigin,
          force3D: true,
        });
        playEnter = () =>
          gs.to(el, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: enterDur,
            ease: LN_EASE_ENTER,
            overwrite: "auto",
          });
      } else {
        gs.set(el, { opacity: 0, y, force3D: true });
        playEnter = () =>
          gs.to(el, {
            opacity: 1,
            y: 0,
            duration: enterDur,
            ease: LN_EASE_ENTER,
            overwrite: "auto",
          });
      }
      ST.create({
        trigger: el,
        start,
        end,
        onEnter: playEnter,
        onEnterBack: playEnter,
      });
    };

    const heroImg = document.getElementById("hero-parallax-img");
    const heroSec = document.getElementById("hero");
    if (heroImg && heroSec) {
      gs.fromTo(
        heroImg,
        { opacity: 1, filter: "brightness(1)" },
        {
          opacity: 0.28,
          filter: "brightness(0.8)",
          ease: "none",
          scrollTrigger: {
            trigger: heroSec,
            start: "top top",
            end: "bottom top",
            scrub: 0.85,
          },
        }
      );
    }

    bindBlock(document.querySelector(".ln-portfolio-intro"), {
      y: 36,
      enterDur: 0.72,
      scaleFrom: 0.985,
      transformOrigin: "50% 15%",
    });
    bindBlock(document.querySelector(".ln-port-pin-outer"), {
      y: 48,
      enterDur: 0.84,
      scaleFrom: 0.962,
      transformOrigin: "50% 38%",
    });

    const portOuter = document.querySelector(".ln-port-pin-outer");
    const portItems = gs.utils.toArray(".ln-port-item");
    if (portItems.length) {
      gs.set(portItems, { opacity: 0, y: 56, force3D: true });
      const playPortItemsEnter = () => lnPlayPortfolioItemsEnter(gs, portItems);
      ST.create({
        trigger: portOuter || "#portfolio",
        start: "top bottom",
        end: "bottom top",
        onEnter: playPortItemsEnter,
        onEnterBack: playPortItemsEnter,
      });
    }

    const internSec = document.getElementById("career-internship-section");
    const internRoot = document.getElementById("career-internship-root");
    bindBlock(internSec ? internSec.querySelector(".ln-line-group") : null, { y: 40, enterDur: 0.68 });

    const projSec = document.getElementById("career-projects-section");
    bindBlock(projSec ? projSec.querySelector(".ln-line-group") : null, { y: 40, enterDur: 0.68 });

    if (internSec && internRoot && !internSec.classList.contains("hidden")) {
      const playInternshipSequential = () => {
        const cards = gs.utils.toArray(internRoot.querySelectorAll(".ln-exp-card"));
        const head = internRoot.querySelector(".ln-career-group__head");
        cards.forEach((c) => lnResetExpCard(gs, c));
        const tl = gs.timeline({ defaults: { overwrite: "auto" } });
        if (head) {
          gs.set(head, { opacity: 0, y: 28, force3D: true });
          tl.to(head, { opacity: 1, y: 0, duration: 0.52, ease: LN_EASE_ENTER }, 0);
        }
        cards.forEach((card, i) => {
          const slot = i === 0 ? (head ? ">0.1" : 0) : ">";
          tl.add(lnExpCardEnterTimeline(gs, card), slot);
        });
        return tl;
      };
      ST.create({
        trigger: internSec,
        start: "top bottom",
        end: "bottom top",
        onEnter: playInternshipSequential,
        onEnterBack: playInternshipSequential,
      });
    }

    if (projSec && !projSec.classList.contains("hidden")) {
      gs.utils.toArray(document.querySelectorAll("#career-projects-root .ln-career-zrow")).forEach((row) => {
        lnResetCareerZRow(gs, row);
        ST.create({
          trigger: row,
          start: "top bottom",
          end: "bottom top",
          onEnter: () => {
            lnResetCareerZRow(gs, row);
            lnCareerZRowEnterTimeline(gs, row).play(0);
          },
          onEnterBack: () => {
            lnResetCareerZRow(gs, row);
            lnCareerZRowEnterTimeline(gs, row).play(0);
          },
        });
      });
    }

    bindBlock(document.querySelector(".ln-honors-head"), { y: 44, enterDur: 0.68 });
    bindBlock(document.querySelector(".ln-fan-hi-outer"), { y: 64, enterDur: 0.82, exitY: 44 });

    bindBlock(document.querySelector(".ln-skills-head"), { y: 46, enterDur: 0.7 });
    bindBlock(document.querySelector(".ln-skill-logos"), { y: 36, exitY: 24, enterDur: 0.75 });

    document.querySelectorAll(".ln-about-block").forEach((el, i) => {
      bindBlock(el, { y: 48 + i * 10, enterDur: 0.7 + i * 0.04 });
    });

    bindBlock(document.querySelector(".ln-contact-head"), { y: 50, enterDur: 0.7 });
  });

  ST.refresh();
}

function schedulePortfolioPinLayoutRefresh() {
  clearTimeout(lnPortImgRefreshTimer);
  lnPortImgRefreshTimer = setTimeout(() => {
    lnPortImgRefreshTimer = 0;
    if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
  }, 150);
}

function portfolioPinComputeMax() {
  const viewport = document.querySelector(".ln-port-viewport");
  const track = document.getElementById("project-grid");
  if (!viewport || !track) return 0;
  return Math.max(0, track.scrollWidth - viewport.clientWidth);
}

function queuePortfolioPinRefresh() {
  if (lnPortPinRefreshRaf) cancelAnimationFrame(lnPortPinRefreshRaf);
  lnPortPinRefreshRaf = requestAnimationFrame(() => {
    lnPortPinRefreshRaf = 0;
    initPortfolioPinScroll();
  });
}

function teardownPortfolioPin() {
  const ctx = window.__lnPortfolioPinCtx;
  if (ctx) {
    if (typeof ctx.wheelOff === "function") ctx.wheelOff();
    if (typeof ctx.touchOff === "function") ctx.touchOff();
    if (typeof ctx.refreshCleanup === "function") ctx.refreshCleanup();
    if (ctx.tl && typeof ctx.tl.revert === "function") ctx.tl.revert();
    else if (ctx.tl) ctx.tl.kill();
  }
  window.__lnPortfolioPinCtx = null;
}

/**
 * 触控板横划：在视口内且横向主导时，把 deltaX 交给 Lenis 纵向位移，与 pin 段 scrub 对齐。
 */
function attachPortfolioPinWheel(viewport) {
  const handler = (e) => {
    if (!lenis || prefersReducedMotion()) return;
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === 1) {
      dx *= 16;
      dy *= 16;
    } else if (e.deltaMode === 2) {
      dx *= window.innerWidth;
      dy *= window.innerHeight;
    }
    if (Math.abs(dx) <= Math.abs(dy)) return;

    const t = e.target;
    if (!viewport || !(t instanceof Element) || !viewport.contains(t)) return;

    const ctx = window.__lnPortfolioPinCtx;
    const stNow = ctx && ctx.st;
    const maxS = portfolioPinComputeMax();
    if (!stNow || maxS <= 2) return;

    const p = stNow.progress;
    if ((p <= 0.002 && dx < 0) || (p >= 0.998 && dx > 0)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    lenis.scrollTo(lenis.scroll + dx * 1.15);
  };
  window.addEventListener("wheel", handler, { passive: false, capture: true });
  return () => window.removeEventListener("wheel", handler, { capture: true });
}

/**
 * 移动端横滑：判定为横向主导后，用位移驱动 Lenis，与纵向滚轮逻辑一致。
 */
function attachPortfolioPinTouch(viewport) {
  let lastX = 0;
  let startX = 0;
  let startY = 0;
  let armed = false;
  let horizontal = false;

  const onStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    armed = true;
    horizontal = false;
    const tch = e.touches[0];
    startX = tch.clientX;
    startY = tch.clientY;
    lastX = tch.clientX;
  };

  const onMove = (e) => {
    if (!armed || !lenis) return;
    const tch = e.touches[0];

    if (!horizontal) {
      const totalDx = Math.abs(tch.clientX - startX);
      const totalDy = Math.abs(tch.clientY - startY);
      if (totalDx < 12 && totalDy < 12) return;
      horizontal = totalDx > totalDy;
      if (!horizontal) return;
      lastX = tch.clientX;
      return;
    }

    const dx = tch.clientX - lastX;

    const ctx = window.__lnPortfolioPinCtx;
    const stNow = ctx && ctx.st;
    const maxS = portfolioPinComputeMax();
    if (!stNow || maxS <= 2) return;

    const p = stNow.progress;
    if ((p <= 0.002 && dx < 0) || (p >= 0.998 && dx > 0)) return;

    e.preventDefault();
    lastX = tch.clientX;
    lenis.scrollTo(lenis.scroll + dx * 1.12);
  };

  const onEnd = () => {
    armed = false;
    horizontal = false;
  };

  viewport.addEventListener("touchstart", onStart, { passive: true });
  viewport.addEventListener("touchmove", onMove, { passive: false });
  viewport.addEventListener("touchend", onEnd, { passive: true });
  viewport.addEventListener("touchcancel", onEnd, { passive: true });

  return () => {
    viewport.removeEventListener("touchstart", onStart);
    viewport.removeEventListener("touchmove", onMove);
    viewport.removeEventListener("touchend", onEnd);
    viewport.removeEventListener("touchcancel", onEnd);
  };
}

/**
 * 作品集：100vh 视口 pin，纵向滚动行程映射为轨道 translateX（scrub 与 Lenis 同步）；降级为视口内原生 overflow-x。
 */
function initPortfolioPinScroll() {
  const pinOuter = document.querySelector(".ln-port-pin-outer");
  const pinEl = document.querySelector(".ln-port-pin-sticky");
  const viewport = document.querySelector(".ln-port-viewport");
  const track = document.getElementById("project-grid");
  if (!pinOuter || !pinEl || !viewport || !track) return;

  if (prefersReducedMotion() || typeof window.gsap === "undefined" || !window.ScrollTrigger) {
    teardownPortfolioPin();
    pinOuter.classList.add("ln-port--native-scroll");
    if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
    return;
  }

  pinOuter.classList.remove("ln-port--native-scroll");

  const gs = window.gsap;
  const ST = window.ScrollTrigger;

  teardownPortfolioPin();

  const maxScroll = portfolioPinComputeMax();
  if (maxScroll <= 2 || !track.querySelector(".ln-port-slot")) {
    gs.set(track, { x: 0 });
    ST.refresh();
    return;
  }

  const slots = gs.utils.toArray(".ln-port-slot", track);

  const tl = gs.timeline({
    scrollTrigger: {
      trigger: pinEl,
      start: "top top",
      end: () => "+=" + portfolioPinComputeMax(),
      pin: true,
      pinType: "transform",
      scrub: true,
      fastScrollEnd: true,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(track, { x: 0 }, { x: () => -portfolioPinComputeMax(), ease: "none" }, 0);

  slots.forEach((slot, i) => {
    const spread = ((i % 6) - 2.5) * 16;
    tl.fromTo(slot, { x: -spread * 0.5 }, { x: spread * 0.5, ease: "none" }, 0);
  });

  const st = tl.scrollTrigger;

  let refreshCleanup = null;
  if (typeof ST.addEventListener === "function") {
    const onRefresh = () => {
      const ctx = window.__lnPortfolioPinCtx;
      if (ctx) ctx.maxScroll = portfolioPinComputeMax();
    };
    ST.addEventListener("refresh", onRefresh);
    refreshCleanup = () => ST.removeEventListener("refresh", onRefresh);
  }

  const wheelOff = attachPortfolioPinWheel(viewport);
  const touchOff = attachPortfolioPinTouch(viewport);

  window.__lnPortfolioPinCtx = {
    tl,
    st,
    maxScroll,
    wheelOff,
    touchOff,
    refreshCleanup,
  };

  track.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => schedulePortfolioPinLayoutRefresh(), { once: true });
    }
  });

  ST.refresh();
}

function handleNavbarScroll() {
  const y = lenis ? lenis.scroll : window.scrollY;
  const nav = document.getElementById("navbar");
  if (nav) nav.classList.toggle("nav-scrolled", y > 40);
}

function initLenis() {
  if (prefersReducedMotion() || typeof window.Lenis === "undefined") {
    window.addEventListener("scroll", scrollShell, { passive: true });
    scrollShell();
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

  const gsapOk =
    typeof window.gsap !== "undefined" && window.ScrollTrigger && !prefersReducedMotion();

  if (gsapOk) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add(lenisRaf);
    window.gsap.ticker.lagSmoothing(0);
    window.ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && lenis) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis ? lenis.scroll : window.scrollY;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: document.documentElement.style.transform ? "transform" : "fixed",
    });
  } else {
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  }

  lenis.on("scroll", scrollShell);
  scrollShell();
}

/** 荣誉/专利/技能/联系/实习卡片：收集直接子块；ul 则按 li 拆成多段依次动效 */
function lnCollectDeepTargets(card) {
  const nodes = [];
  card.querySelectorAll(":scope > *").forEach((node) => {
    if (node.tagName === "UL") {
      node.querySelectorAll(":scope > li").forEach((li) => nodes.push(li));
    } else {
      nodes.push(node);
    }
  });
  return nodes;
}

function lnDeepLiftKillTls(container) {
  const tls = container._lnDeepLiftTls;
  if (tls && tls.length) {
    tls.forEach((tl) => tl.kill());
  }
  container._lnDeepLiftTls = [];
}

/** 入场：每次进入视区带重播；开始前强制重置 from 态，避免与上一场出场终点不一致 */
function lnDeepLiftPlayEnter(container, cards, tilt) {
  lnDeepLiftKillTls(container);
  const tls = container._lnDeepLiftTls;

  cards.forEach((card, i) => {
    const inners = lnCollectDeepTargets(card);
    window.gsap.set(card, {
      opacity: 0,
      y: 52,
      scale: 0.93,
      rotateX: tilt ? 7 : 0,
      transformOrigin: "50% 92%",
      boxShadow: "0 14px 44px -26px rgba(0,0,0,0.55)",
    });
    if (inners.length) window.gsap.set(inners, { opacity: 0, y: 22 });

    const tl = window.gsap.timeline({ delay: i * 0.1 });
    tl.to(card, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      boxShadow:
        "0 26px 60px -24px rgba(0,0,0,0.58), 0 0 42px -12px rgba(var(--ln-accent-rgb),0.09)",
      duration: 0.88,
      ease: "power4.out",
    });
    if (inners.length) {
      tl.to(
        inners,
        {
          opacity: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.06,
          ease: "power2.out",
          onComplete: () => {
            window.gsap.set(inners, { clearProps: "transform" });
          },
        },
        "-=0.55"
      );
    }
    tl.call(() => {
      window.gsap.set(card, { clearProps: "transform,boxShadow" });
    });
    tls.push(tl);
  });
}

/** 卡片：轻 3D + 内层 stagger；下滑进入与上滑再次进入均播入场，无离场动画（与 Lenis 同步） */
function initLnDeepLiftGrids() {
  if (prefersReducedMotion() || typeof window.gsap === "undefined" || !window.ScrollTrigger) return;
  const tilt =
    !window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(min-width: 1024px)").matches;

  document.querySelectorAll(".ln-deep-lift").forEach((container) => {
    const cards = window.gsap.utils.toArray(":scope .ln-surface-card", container);
    if (!cards.length) return;
    container._lnDeepLiftTls = [];

    cards.forEach((card) => {
      const inners = lnCollectDeepTargets(card);
      window.gsap.set(card, {
        opacity: 0,
        y: 52,
        scale: 0.93,
        rotateX: tilt ? 7 : 0,
        transformOrigin: "50% 92%",
        boxShadow: "0 14px 44px -26px rgba(0,0,0,0.55)",
      });
      if (inners.length) window.gsap.set(inners, { opacity: 0, y: 22 });
    });

    window.ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => lnDeepLiftPlayEnter(container, cards, tilt),
      onEnterBack: () => lnDeepLiftPlayEnter(container, cards, tilt),
    });
  });
}

function initScrollGsap() {
  if (prefersReducedMotion() || typeof window.gsap === "undefined" || !window.ScrollTrigger) return;

  const honors = document.querySelector(".ln-honors-bg");
  if (honors) {
    window.gsap.fromTo(
      honors,
      { x: -100 },
      {
        x: 100,
        ease: "none",
        scrollTrigger: {
          trigger: "#honors-ip",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.15,
        },
      }
    );
  }

  document.querySelectorAll(".ln-stagger").forEach((container) => {
    const kids = window.gsap.utils.toArray(":scope > *", container);
    if (!kids.length) return;
    window.gsap.set(kids, { opacity: 0, y: 48 });
    const tl = window.gsap.timeline({ paused: true });
    tl.to(kids, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      stagger: 0.075,
      ease: "power2.out",
    });
    window.ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => tl.timeScale(1).play(0),
      onEnterBack: () => tl.timeScale(1).play(0),
    });
  });

  document.querySelectorAll(".ln-clip-title").forEach((el) => {
    window.gsap.fromTo(
      el,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 89%",
          toggleActions: "play none none none",
        },
      }
    );
  });

  initLnDeepLiftGrids();
}

function initHeroImageEntrance() {
  const img = document.getElementById("hero-parallax-img");
  if (!img) return;
  if (prefersReducedMotion()) {
    img.classList.remove("ln-hero-img-enter");
    img.classList.add("ln-hero-img-ready");
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => img.classList.add("ln-hero-img-ready"));
  });
}

function initMagnetic() {
  if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll(".ln-magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
}

function initCustomCursor() {
  if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(max-width: 1023px)").matches) return;
  const el = document.getElementById("ln-cursor");
  if (!el) return;
  document.documentElement.classList.add("ln-cursor-on");
  let mx = 0;
  let my = 0;
  let rx = 0;
  let ry = 0;
  window.addEventListener(
    "mousemove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      const hovered = e.target.closest(
        "a, button, .ln-card, .ln-exp-card, .ln-port-item, .ln-hi-slide, .ln-hi-carousel__btn, .ln-surface-card, .ln-btn, [role='button'], input, textarea, select"
      );
      document.documentElement.classList.toggle("ln-cursor-hover", !!hovered);
    },
    { passive: true }
  );
  function tick() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    el.style.left = `${rx}px`;
    el.style.top = `${ry}px`;
    el.style.transform = "translate(-50%, -50%)";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/** 荣誉·知产轮播：与 flex gap 一致（px） */
const LN_HI_CAROUSEL_GAP = 20;
/** 自动切下一张间隔（ms），须大于轨道 transition + 余量；减少动效时略放慢 */
const LN_HI_AUTOPLAY_MS = 3400;
const LN_HI_AUTOPLAY_MS_REDUCED = 7200;
/** 与 try.html 中 #honors-ip-track 的 transform 时长一致后再 snap（ms） */
const LN_HI_SNAP_AFTER_MS = 580;

function honorsCarouselAutoplayAllowed(st) {
  if (!st || document.hidden) return false;
  if (st._hiInView === false) return false;
  return true;
}

function startHonorsCarouselAutoplay() {
  const st = window.__lnHonorsCarousel;
  if (!st || st.realCount <= 1) return;
  if (st._hiAutoIv) clearInterval(st._hiAutoIv);
  const ms = prefersReducedMotion() ? LN_HI_AUTOPLAY_MS_REDUCED : LN_HI_AUTOPLAY_MS;
  st._hiAutoIv = setInterval(() => {
    if (!honorsCarouselAutoplayAllowed(st)) return;
    stepHonorsCarousel(1);
  }, ms);
}

function restartHonorsCarouselAutoplay() {
  startHonorsCarouselAutoplay();
}

function teardownHonorsCarouselAutoplay(st) {
  if (!st) return;
  if (st._hiAutoIv) {
    clearInterval(st._hiAutoIv);
    st._hiAutoIv = null;
  }
  if (st._hiIo) {
    st._hiIo.disconnect();
    st._hiIo = null;
  }
}

/** 荣誉区块 #honors-ip 进入视口即按间隔自动切，与鼠标位置无关 */
function setupHonorsCarouselAutoplay() {
  const st = window.__lnHonorsCarousel;
  const section = document.getElementById("honors-ip");
  if (!st || st.realCount <= 1 || !section) return;

  st._hiInView = false;

  st._hiIo = new IntersectionObserver(
    (entries) => {
      st._hiInView = entries.some((en) => en.isIntersecting);
    },
    { threshold: 0, rootMargin: "0px" }
  );
  st._hiIo.observe(section);

  startHonorsCarouselAutoplay();
}

let lnHonorsCarouselGsapRevert = null;

function teardownHonorsIpCarouselGsapOnly() {
  if (typeof lnHonorsCarouselGsapRevert === "function") {
    lnHonorsCarouselGsapRevert();
    lnHonorsCarouselGsapRevert = null;
  }
}

function teardownHonorsIpCarousel() {
  teardownHonorsIpCarouselGsapOnly();
  if (window.__lnHiCarouselResize) {
    window.removeEventListener("resize", window.__lnHiCarouselResize);
    window.__lnHiCarouselResize = null;
  }
  const st = window.__lnHonorsCarousel;
  if (st?._snapTimeout) {
    clearTimeout(st._snapTimeout);
    st._snapTimeout = null;
  }
  teardownHonorsCarouselAutoplay(st);
  if (st?.track && st.originalTrackHTML != null) {
    st.track.innerHTML = st.originalTrackHTML;
  }
  if (st?.prevBtn && st._onPrev) {
    st.prevBtn.removeEventListener("click", st._onPrev);
    st.nextBtn.removeEventListener("click", st._onNext);
  }
  if (st?.track && st._onTrackClick) {
    st.track.removeEventListener("click", st._onTrackClick);
  }
  const hiDots = document.getElementById("ln-hi-dots");
  if (hiDots) {
    hiDots.innerHTML = "";
    hiDots.hidden = true;
  }
  window.__lnHonorsCarousel = null;
}

/** 三副本轨道：把 index 吸回中间段 [realCount, 2*realCount-1]，无动画 */
function snapHonorsCarousel() {
  const st = window.__lnHonorsCarousel;
  if (!st?.originalTrackHTML || !st.track) return;
  const { track, realCount } = st;
  let i = st.index;
  let changed = false;
  while (i >= 2 * realCount) {
    i -= realCount;
    changed = true;
  }
  while (i < realCount) {
    i += realCount;
    changed = true;
  }
  if (!changed) return;
  const prev = track.style.transition;
  track.style.transition = "none";
  st.index = i;
  updateHonorsCarousel();
  void track.offsetHeight;
  track.style.transition = prev || "";
}

/** 无限三轨时取真实项索引；单段模式为 st.index */
function honorsLogicalIndex(st) {
  if (!st) return 0;
  const n = st.realCount;
  if (n <= 0) return 0;
  if (st.originalTrackHTML) return ((st.index % n) + n) % n;
  return Math.max(0, Math.min(st.index, n - 1));
}

function updateHonorsDots() {
  const st = window.__lnHonorsCarousel;
  const root = document.getElementById("ln-hi-dots");
  if (!st || !root || st.realCount <= 1) return;
  const logical = honorsLogicalIndex(st);
  root.querySelectorAll(".ln-hi-dot").forEach((btn, i) => {
    const on = i === logical;
    btn.classList.toggle("is-active", on);
    if (on) btn.setAttribute("aria-current", "true");
    else btn.removeAttribute("aria-current");
  });
}

/** 跳到第 logicalIndex 张（0 … realCount-1），与中间段起点 realCount 对齐 */
function goToHonorsSlide(logicalIndex) {
  const st = window.__lnHonorsCarousel;
  if (!st) return;
  const n = st.realCount;
  if (n <= 0) return;
  const t = Math.max(0, Math.min(Number(logicalIndex) || 0, n - 1));

  if (st._snapTimeout) {
    clearTimeout(st._snapTimeout);
    st._snapTimeout = null;
  }

  if (!st.originalTrackHTML || n <= 1) {
    st.index = t;
    updateHonorsCarousel();
    return;
  }

  st.index = n + t;
  updateHonorsCarousel();
  st._snapTimeout = setTimeout(() => {
    snapHonorsCarousel();
    st._snapTimeout = null;
  }, LN_HI_SNAP_AFTER_MS);
}

function updateHonorsCarousel() {
  const st = window.__lnHonorsCarousel;
  if (!st) return;
  const { track, viewport, slides, prevBtn, nextBtn } = st;
  const total = slides.length;
  let idx = st.index;
  if (total <= 0) return;
  if (!st.originalTrackHTML) {
    idx = ((idx % total) + total) % total;
    st.index = idx;
  } else {
    idx = Math.max(0, Math.min(idx, total - 1));
    st.index = idx;
  }

  let offsetBefore = 0;
  for (let i = 0; i < idx; i++) {
    offsetBefore += slides[i].offsetWidth + LN_HI_CAROUSEL_GAP;
  }
  const activeEl = slides[idx];
  const activeW = activeEl.offsetWidth;
  const activeCenter = offsetBefore + activeW / 2;
  const tx = viewport.clientWidth / 2 - activeCenter;
  track.style.transform = `translateX(${tx}px)`;

  const reduced = prefersReducedMotion();
  slides.forEach((el, i) => {
    const d = Math.abs(i - idx);
    el.classList.toggle("is-active", i === idx);
    if (reduced) {
      el.style.opacity = d > 2 ? "0.5" : d === 2 ? "0.82" : "1";
      el.style.transform = "none";
      el.style.zIndex = i === idx ? "10" : "1";
      return;
    }
    el.style.opacity = d > 2 ? "0.42" : d === 2 ? "0.78" : "1";
    if (i === idx) {
      el.style.transform = "scale(1.06) translateY(-4px)";
      el.style.zIndex = "10";
    } else if (d === 1) {
      el.style.transform = "scale(0.91) translateY(3px)";
      el.style.zIndex = "5";
    } else {
      el.style.transform = "scale(0.85) translateY(6px)";
      el.style.zIndex = String(Math.max(1, 4 - d));
    }
  });

  if (prevBtn) prevBtn.disabled = false;
  if (nextBtn) nextBtn.disabled = false;
  updateHonorsDots();
}

function stepHonorsCarousel(delta) {
  const st = window.__lnHonorsCarousel;
  if (!st) return;
  const { track, slides, realCount, originalTrackHTML } = st;
  const total = slides.length;
  if (total <= 0) return;

  if (st._snapTimeout) {
    clearTimeout(st._snapTimeout);
    st._snapTimeout = null;
  }

  if (!originalTrackHTML || realCount <= 1) {
    st.index = (st.index + delta + realCount * 1000) % realCount;
    updateHonorsCarousel();
    return;
  }

  const n = realCount;
  const lastIdx = total - 1;
  if (delta === 1 && st.index === lastIdx) {
    const prev = track.style.transition;
    track.style.transition = "none";
    st.index = n;
    updateHonorsCarousel();
    void track.offsetHeight;
    track.style.transition = prev || "";
    return;
  }
  if (delta === -1 && st.index === 0) {
    const prev = track.style.transition;
    track.style.transition = "none";
    st.index = 2 * n - 1;
    updateHonorsCarousel();
    void track.offsetHeight;
    track.style.transition = prev || "";
    return;
  }

  st.index += delta;
  st.index = Math.max(0, Math.min(st.index, lastIdx));
  updateHonorsCarousel();

  st._snapTimeout = setTimeout(() => {
    snapHonorsCarousel();
    st._snapTimeout = null;
  }, LN_HI_SNAP_AFTER_MS);
}

/** 荣誉区：视口 + 按钮入场；外壳轻微横向 scrub（与 Lenis 同步） */
function setupHonorsIpCarouselGsap() {
  teardownHonorsIpCarouselGsapOnly();
  const parallaxEl = document.getElementById("ln-hi-parallax");
  if (!parallaxEl || typeof window.gsap === "undefined" || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);

  if (prefersReducedMotion()) {
    window.gsap.set(parallaxEl, { x: 0 });
    return;
  }

  const ctx = window.gsap.context(() => {
    const hi = window.__lnHonorsCarousel;
    const rc = hi && hi.realCount > 0 ? hi.realCount : 0;
    const trackEl = document.getElementById("honors-ip-track");
    const slideEls =
      trackEl && rc > 0
        ? window.gsap.utils.toArray(":scope > .ln-hi-slide", trackEl).slice(0, rc)
        : [];
    slideEls.forEach((slide) => {
      window.gsap.set(slide, { opacity: 0, x: 36, force3D: true });
    });
    const playHonorsSlidesEnter = () => {
      slideEls.forEach((slide) => {
        window.gsap.set(slide, { opacity: 0, x: 36, force3D: true });
      });
      window.gsap.to(slideEls, {
        opacity: 1,
        x: 0,
        duration: 0.58,
        stagger: 0.09,
        ease: LN_EASE_ENTER,
        overwrite: "auto",
      });
    };
    window.ScrollTrigger.create({
      trigger: "#honors-ip",
      start: "top bottom",
      end: "bottom top",
      onEnter: playHonorsSlidesEnter,
      onEnterBack: playHonorsSlidesEnter,
    });
    window.gsap.fromTo(
      parallaxEl,
      { x: 0 },
      {
        x: -72,
        ease: "none",
        scrollTrigger: {
          trigger: "#honors-ip",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  }, "#honors-ip");
  lnHonorsCarouselGsapRevert = () => ctx.revert();
}

function initHonorsIpFan() {
  const track = document.getElementById("honors-ip-track");
  const viewport = document.getElementById("ln-hi-carousel-viewport");
  const prevBtn = document.getElementById("ln-hi-carousel-prev");
  const nextBtn = document.getElementById("ln-hi-carousel-next");
  if (!track || !viewport || !prevBtn || !nextBtn) return;

  teardownHonorsIpCarousel();

  const originalTrackHTML = track.innerHTML;
  const realCount = track.querySelectorAll(".ln-hi-slide").length;
  if (!realCount) return;

  const useInfinite = !prefersReducedMotion() && realCount > 1;
  if (useInfinite) {
    track.innerHTML = originalTrackHTML + originalTrackHTML + originalTrackHTML;
  }

  const slides = track.querySelectorAll(".ln-hi-slide");
  const startIndex = useInfinite ? realCount : 0;

  const onPrev = () => {
    stepHonorsCarousel(-1);
    restartHonorsCarouselAutoplay();
  };
  const onNext = () => {
    stepHonorsCarousel(1);
    restartHonorsCarouselAutoplay();
  };
  prevBtn.addEventListener("click", onPrev);
  nextBtn.addEventListener("click", onNext);

  /** 点击任意可见卡片：居中对应项并重启自动轮播（无限轨会吸回中段） */
  const onTrackClick = (e) => {
    const stNow = window.__lnHonorsCarousel;
    if (!stNow || stNow.realCount <= 1) return;
    const slide = e.target.closest(".ln-hi-slide");
    if (!slide || !track.contains(slide)) return;
    let domIdx = -1;
    for (let i = 0; i < stNow.slides.length; i++) {
      if (stNow.slides[i] === slide) {
        domIdx = i;
        break;
      }
    }
    if (domIdx < 0) return;
    const logical = domIdx % stNow.realCount;
    goToHonorsSlide(logical);
    restartHonorsCarouselAutoplay();
  };
  track.addEventListener("click", onTrackClick);

  const debouncedResize = () => {
    clearTimeout(window.__lnHiCarouselResizeT);
    window.__lnHiCarouselResizeT = setTimeout(() => {
      updateHonorsCarousel();
      snapHonorsCarousel();
    }, 60);
  };
  window.__lnHiCarouselResize = debouncedResize;
  window.addEventListener("resize", debouncedResize);

  window.__lnHonorsCarousel = {
    index: startIndex,
    realCount,
    originalTrackHTML: useInfinite ? originalTrackHTML : null,
    track,
    viewport,
    slides,
    prevBtn,
    nextBtn,
    _onPrev: onPrev,
    _onNext: onNext,
    _snapTimeout: null,
    _hiAutoIv: null,
    _hiIo: null,
    _hiInView: false,
    _onTrackClick: onTrackClick,
  };

  const dotsRoot = document.getElementById("ln-hi-dots");
  if (dotsRoot) {
    dotsRoot.innerHTML = "";
    if (realCount > 1) {
      dotsRoot.hidden = false;
      for (let i = 0; i < realCount; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ln-hi-dot";
        btn.setAttribute("aria-label", `第 ${i + 1} 项`);
        btn.setAttribute("role", "tab");
        const li = i;
        btn.addEventListener("click", () => {
          goToHonorsSlide(li);
          restartHonorsCarouselAutoplay();
        });
        dotsRoot.appendChild(btn);
      }
    } else {
      dotsRoot.hidden = true;
    }
  }

  requestAnimationFrame(() => {
    updateHonorsCarousel();
    setupHonorsIpCarouselGsap();
    setupHonorsCarouselAutoplay();
    if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
  });
}

/**
 * 作品集横向带：宽度 / 图高 / translate(XY) / rotate / scale 错落；横移由 ScrollTrigger pin + scrub 与 Lenis 同步（见 initPortfolioPinScroll）
 */
const LN_PORT_SCATTER = [
  { wrap: "w-[min(420px,90vw)]", img: "min-h-[15rem] h-[25rem]", y: -148, rot: -2.15, x: -18, sc: 0.96 },
  { wrap: "w-[min(285px,74vw)]", img: "min-h-[9.5rem] h-[13.5rem]", y: 132, rot: 1.55, x: 26, sc: 1.04 },
  { wrap: "w-[min(460px,93vw)]", img: "min-h-[21rem] h-[30rem]", y: -52, rot: 0.42, x: 12, sc: 0.98 },
  { wrap: "w-[min(268px,74vw)]", img: "min-h-[8.5rem] h-44", y: 156, rot: -1.35, x: -22, sc: 1.05 },
  { wrap: "w-[min(395px,88vw)]", img: "min-h-[13rem] h-[21rem]", y: 28, rot: 1.85, x: 20, sc: 0.97 },
  { wrap: "w-[min(335px,82vw)]", img: "min-h-[11.5rem] h-[18rem]", y: -112, rot: -0.78, x: -10, sc: 1.02 },
  { wrap: "w-[min(355px,84vw)]", img: "min-h-[12.5rem] h-[19.5rem]", y: 88, rot: -1.2, x: 16, sc: 0.99 },
  { wrap: "w-[min(305px,78vw)]", img: "min-h-[10rem] h-52", y: -76, rot: 0.95, x: -24, sc: 1.03 },
];

function lnPortSlotTransform(y, rot, x, sc, reduced) {
  if (reduced) return "";
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const yy = narrow ? Math.round(y * 0.42) : y;
  const rr = narrow ? rot * 0.5 : rot;
  const xx = narrow ? Math.round((x || 0) * 0.4) : x || 0;
  const ss = narrow ? 1 + ((sc != null ? sc : 1) - 1) * 0.55 : sc != null ? sc : 1;
  return `transform:translate3d(${xx}px,${yy}px,0) rotate(${rr}deg) scale(${ss});`;
}

function renderProjects(projectList) {
  const container = document.getElementById("project-grid");
  if (!container) {
    requestAnimationFrame(() => queuePortfolioPinRefresh());
    return;
  }
  teardownPortfolioPin();
  container.innerHTML = "";
  container.classList.remove("ln-fan-port-track");
  container.classList.add("ln-port-track");

  const reduced = prefersReducedMotion();
  const colEnter = reduced ? "" : ` style="opacity:0;transform:translate3d(52px,0,0)"`;
  projectList.forEach((project, i) => {
    const L = LN_PORT_SCATTER[i % LN_PORT_SCATTER.length];
    const num = String(i + 1).padStart(2, "0");
    const slotStyle = lnPortSlotTransform(L.y, L.rot, L.x, L.sc, reduced);
    const tags = (project.tags || [])
      .map(
        (t) =>
          `<span class="text-[10px] uppercase tracking-wider px-3 py-1 bg-white/5 text-[var(--ln-lime)] rounded-full border border-white/10">${escapeHtml(t)}</span>`
      )
      .join("");
    container.innerHTML += `
            <div class="ln-port-slot"${slotStyle ? ` style="${escapeAttr(slotStyle.trim())}"` : ""}>
                <div class="ln-port-item ${L.wrap}"${colEnter}>
                    <p class="ln-port-caption text-[10px] uppercase text-white/45 mb-2">${escapeHtml(project.period)}</p>
                    <div onclick="openProjectModal(${project.id})" class="ln-card project-card group cursor-pointer border border-white/15 bg-[var(--ln-bg-mid2)] overflow-hidden flex flex-col">
                        <div class="${L.img} bg-zinc-900 relative overflow-hidden shrink-0">
                            <img src="${escapeAttr(project.image || lnTryPlaceholderPicsum(project.id))}" alt="${escapeAttr(project.title)}" class="ln-card-img w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                            <span class="ln-display absolute bottom-3 left-3 text-5xl text-white/20 group-hover:text-[rgba(var(--ln-accent-rgb),0.4)] transition-colors duration-[400ms]">${num}</span>
                </div>
                <div class="p-6">
                    <div class="flex flex-wrap gap-2 mb-3">${tags}</div>
                    <h3 class="text-xl font-semibold tracking-tight group-hover:text-[var(--ln-lime)] transition-colors duration-[400ms]">${escapeHtml(project.title)}</h3>
                    <p class="text-gray-500 text-sm mt-2 line-clamp-2">${escapeHtml(project.subtitle)}</p>
                    <div class="mt-5 text-[11px] uppercase tracking-widest text-gray-600"><span class="px-3 py-1 border border-white/15 rounded-full">${escapeHtml(project.role)}</span></div>
                        </div>
                    </div>
                </div>
            </div>`;
  });

  requestAnimationFrame(() => {
    const inners = container.querySelectorAll(".ln-port-item");
    if (reduced || typeof window.gsap === "undefined" || !window.ScrollTrigger) {
      inners.forEach((c) => {
        c.style.removeProperty("opacity");
        c.style.removeProperty("transform");
      });
    }
    queuePortfolioPinRefresh();
  });
}

function renderExperienceProjects() {
  renderCareerSection();
}

function openExperienceModal(id) {
  const list = getExperienceItems();
  const item = list.find((p) => p.id === id);
  if (!item) return;
  modalMode = "experience";
  experienceItems = list;
  currentExperienceIndex = experienceItems.findIndex((p) => p.id === id);
  if (lenis) lenis.stop();
  projects = getProjects();
  filteredProjects = [...projects];
  const tagSpans = (item.tags || [])
    .map(
      (t) =>
        `<span class="text-[10px] uppercase tracking-wider px-4 py-2 bg-white/10 rounded-full border border-white/10">${escapeHtml(t)}</span>`
    )
    .join("");
  let heroBlock = "";
  if (item.image) {
    heroBlock = `<div class="mb-8"><img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" class="w-full rounded-xl shadow-2xl border border-white/10 object-cover max-h-[min(52vh,420px)]"></div>`;
  } else if (item.logo) {
    heroBlock = `<div class="mb-8 flex justify-center py-10 bg-white/[0.04] rounded-xl border border-white/10"><img src="${escapeAttr(item.logo)}" alt="${escapeAttr(item.org || "")}" class="max-h-20 w-auto object-contain"></div>`;
  } else if (item.logoIcon) {
    heroBlock = `<div class="mb-8 flex justify-center py-10 bg-white/[0.04] rounded-xl border border-white/10"><i class="fas ${escapeAttr(item.logoIcon)} text-5xl text-[rgba(var(--ln-accent-rgb),0.8)]"></i></div>`;
  } else {
    heroBlock = `<div class="mb-8"><img src="${escapeAttr(lnTryPlaceholderPicsum(item.id))}" alt="${escapeAttr(item.title)}" class="w-full rounded-xl shadow-2xl border border-white/10 object-cover max-h-[min(52vh,420px)]"></div>`;
  }
  document.getElementById("modal-project-title").textContent = item.title;
  document.getElementById("modal-content").innerHTML = `
        ${heroBlock}
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div class="text-sm text-gray-500 uppercase tracking-widest">${escapeHtml(item.org || "")} · ${escapeHtml(item.period)} · ${escapeHtml(item.role)}</div>
            <div class="flex flex-wrap gap-2">${tagSpans}</div>
        </div>
        ${remapProjectDescription(item.description)}`;
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

function openProjectModal(id) {
  const list = getProjects();
  const project = list.find((p) => p.id === id);
  if (!project) return;
  modalMode = "portfolio";
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
  const modalImg = project.image || lnTryPlaceholderPicsum(project.id);
  document.getElementById("modal-content").innerHTML = `
        <div class="mb-8">
            <img src="${escapeAttr(modalImg)}" alt="${escapeAttr(project.title)}" class="w-full rounded-xl mb-8 shadow-2xl border border-white/10">
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
  modalMode = "portfolio";
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
  if (modalMode === "experience" && experienceItems.length) {
    currentExperienceIndex =
      (currentExperienceIndex - 1 + experienceItems.length) % experienceItems.length;
    openExperienceModal(experienceItems[currentExperienceIndex].id);
    return;
  }
  if (!filteredProjects.length) return;
  currentProjectIndex = (currentProjectIndex - 1 + filteredProjects.length) % filteredProjects.length;
  openProjectModal(filteredProjects[currentProjectIndex].id);
}

function nextProject() {
  if (modalMode === "experience" && experienceItems.length) {
    currentExperienceIndex = (currentExperienceIndex + 1) % experienceItems.length;
    openExperienceModal(experienceItems[currentExperienceIndex].id);
    return;
  }
  if (!filteredProjects.length) return;
  currentProjectIndex = (currentProjectIndex + 1) % filteredProjects.length;
  openProjectModal(filteredProjects[currentProjectIndex].id);
}

function showAllProjects() {
  projects = getProjects();
  filteredProjects = [...projects];
  renderProjects(projects);
  initLnMajorMotionBlocks();
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
  const btn = document.getElementById("mobile-menu-button");
  if (!menu || !btn) return;
  const icon = btn.querySelector("i");
  if (!icon) return;
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

function lnUnhideStaticPage() {
  document.querySelectorAll(".ln-line").forEach((el) => el.classList.add("ln-line-visible"));
  document.querySelectorAll(".ln-reveal").forEach((el) => el.classList.add("ln-reveal-on"));
  const heroImg = document.getElementById("hero-parallax-img");
  if (heroImg) {
    heroImg.classList.remove("ln-hero-img-enter");
    heroImg.classList.add("ln-hero-img-ready");
  }
}

function initialize() {
  try {
    if (!window.__lnPortfolioResizeHooked) {
      window.__lnPortfolioResizeHooked = true;
      let rt;
      window.addEventListener(
        "resize",
        () => {
          clearTimeout(rt);
          rt = setTimeout(() => {
            if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
          }, 120);
        },
        { passive: true }
      );
    }
  initLenis();
    initScrollGsap();
    initHeroImageEntrance();
    initMagnetic();
    initCustomCursor();
  initLnLineGroups();
  projects = getProjects();
  filteredProjects = [...projects];
  renderProjects(projects);
    renderExperienceProjects();
    initLnMajorMotionBlocks();
    /* 须在 renderCareerSection 之后：`#career-internship-root` / `#career-projects-root`（或 `#career-root`）内卡片为脚本注入，早于此则不会被 IO 监听而一直透明 */
    initLnReveal();
    const menuBtn = document.getElementById("mobile-menu-button");
    if (menuBtn) menuBtn.addEventListener("click", toggleMobileMenu);
  initSkillBars();
  initKeyboardShortcuts();
  initHeroTapHint();
    const projectModal = document.getElementById("project-modal");
    if (projectModal) {
      projectModal.addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
    }
    requestAnimationFrame(() => {
      try {
        initHonorsIpFan();
        if (typeof window.ScrollTrigger !== "undefined") window.ScrollTrigger.refresh();
      } catch (err) {
        console.error("initHonorsIpFan:", err);
      }
    });
  } catch (err) {
    console.error("initialize:", err);
    lnUnhideStaticPage();
  }
}

window.tryPageInit = initialize;
window.smoothScrollTo = smoothScrollTo;
window.openProjectModal = openProjectModal;
window.openExperienceModal = openExperienceModal;
window.closeModal = closeModal;
window.prevProject = prevProject;
window.nextProject = nextProject;
window.showAllProjects = showAllProjects;
window.toggleMobileMenu = toggleMobileMenu;
