/*
 * 공통 레이아웃(헤더/푸터) 삽입 + 페이지별 렌더링
 * 각 HTML의 <body data-page="..."> 값으로 페이지를 구분합니다.
 * 데이터는 assets/data/data.json 에서 불러옵니다.
 */
(function () {
  "use strict";

  const DATA_URL = "assets/data/data.json";

  let DATA;
  let SITE;

  const NAV = [
    { page: "home", label: "홈", href: "index.html" },
    { page: "current", label: "진행 행사", href: "index.html#current" },
    { page: "archive", label: "아카이브", href: "archive.html" },
    { page: "about", label: "소개", href: "about.html" },
  ];

  /* ---------- 유틸 ---------- */

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDate(iso) {
    const date = parseDate(iso);
    const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${week})`;
  }

  function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function isUpcoming(event) {
    return parseDate(event.date) >= today();
  }

  function sortedEvents() {
    return [...DATA.events].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }

  // 가장 가까운 예정 행사
  function currentEvent() {
    return sortedEvents().filter(isUpcoming).pop() || null;
  }

  function pastEvents() {
    return sortedEvents().filter((e) => !isUpcoming(e));
  }

  /* ---------- 공통 조각 ---------- */

  // 정규 회차는 vol 번호, 번외(mini 등)는 vol: null
  // label이 있으면 포스터 자리표시에 우선 사용 (예: "REVENGE")
  function volLabel(event) {
    if (event.label) return event.label;
    return event.vol != null ? `Vol.${event.vol}` : "mini";
  }

  function nightLabel(event) {
    return event.vol != null ? `第${event.vol}夜` : "番外";
  }

  function xLink(handle, text) {
    if (!handle) return esc(text);
    return `<a href="https://x.com/${encodeURIComponent(handle)}" target="_blank" rel="noopener">${esc(text)}</a>`;
  }

  function poster(event, extraClass = "") {
    if (event.poster) {
      return `<img class="poster ${extraClass}" src="${esc(event.poster)}" alt="${esc(event.title)} 포스터" loading="lazy">`;
    }
    return `<div class="poster poster--empty ${extraClass}" role="img" aria-label="포스터 준비 중">
      <span class="poster__vol">${esc(volLabel(event))}</span>
      <span class="poster__note">POSTER</span>
    </div>`;
  }

  function eventCard(event) {
    const badge = isUpcoming(event)
      ? `<span class="badge badge--live">예정</span>`
      : `<span class="badge">종료</span>`;
    return `<a class="ofuda-card" href="event.html?id=${encodeURIComponent(event.id)}">
      <span class="ofuda-card__strip" aria-hidden="true">${nightLabel(event)}</span>
      <div class="ofuda-card__body">
        ${poster(event, "poster--card")}
        <div class="ofuda-card__meta">
          ${badge}
          <h3 class="ofuda-card__title">${esc(event.title)}</h3>
          <p class="ofuda-card__sub">${esc(event.subtitle)}</p>
          <p class="ofuda-card__date">${formatDate(event.date)} · ${esc(event.venue.name)}</p>
        </div>
      </div>
    </a>`;
  }

  // time이 있으면 시간순 타임테이블, 없으면 역할(DJ/VJ) 표기
  function timetable(event) {
    const lineup = event.lineup;
    if (!lineup || !lineup.length) {
      return `<p class="muted">${isUpcoming(event) ? "라인업 추후 공개" : "라인업 정보 준비 중"}</p>`;
    }
    return `<ol class="timetable">
      ${lineup
        .map(
          (slot) => `<li class="timetable__row">
            <span class="timetable__time">${esc(slot.time || slot.role)}</span>
            <span class="timetable__name">
              ${slot.time && slot.role ? `<span class="timetable__role">${esc(slot.role)}</span>` : ""}
              ${xLink(slot.x, slot.name)}
              ${slot.note ? `<span class="muted">· ${esc(slot.note)}</span>` : ""}
            </span>
          </li>`
        )
        .join("")}
    </ol>`;
  }

  function credits(event) {
    if (!event.credits || !event.credits.length) return "";
    return `<dl class="info-list credits">
      ${event.credits
        .map(
          (c) => `<div class="info-list__row"><dt>${esc(c.role)}</dt>
            <dd>${c.people.map((p) => xLink(p.x, p.name)).join(", ")}</dd></div>`
        )
        .join("")}
    </dl>`;
  }

  function relatedLinks(event) {
    if (!event.links || !event.links.length) return "";
    return `<ul class="link-list">
      ${event.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join("")}
    </ul>`;
  }

  /* ---------- 예매 ---------- */

  // "YYYY-MM-DDTHH:MM" (시간대 없음 = 브라우저 로컬 시간)
  function parseDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDateTime(value) {
    const date = parseDateTime(value);
    if (!date) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // 예매 상태: "open" | "before" | "closed" | null(예매 정보 없음)
  // closeAt이 없으면 행사 종료 시각까지 예매 가능으로 간주
  function ticketState(event, now = new Date()) {
    const ticket = event.ticket;
    if (!ticket || !ticket.url) return null;
    const openAt = ticket.openAt ? parseDateTime(ticket.openAt) : null;
    const closeAt =
      (ticket.closeAt && parseDateTime(ticket.closeAt)) ||
      parseDateTime(`${event.date}T${event.close || "23:59"}`);
    if (openAt && now < openAt) return "before";
    if (closeAt && now > closeAt) return "closed";
    return "open";
  }

  function ticketButton(event, primary = true) {
    const state = ticketState(event);
    if (!state) return "";
    if (state === "open") {
      return `<a class="btn${primary ? " btn--primary" : ""}" href="${esc(event.ticket.url)}" target="_blank" rel="noopener">티켓 예매</a>`;
    }
    const label = state === "before" ? `예매 오픈 예정 · ${formatDateTime(event.ticket.openAt)}` : "예매 마감";
    return `<span class="btn btn--disabled" role="link" aria-disabled="true">${esc(label)}</span>`;
  }

  function ticketPeriod(ticket) {
    if (!ticket || (!ticket.openAt && !ticket.closeAt)) return "";
    return `${ticket.openAt ? formatDateTime(ticket.openAt) : ""} ~ ${ticket.closeAt ? formatDateTime(ticket.closeAt) : ""}`;
  }

  function infoList(event) {
    const rows = [
      ["일시", `${formatDate(event.date)} ${esc(event.open)}${event.close ? ` – ${esc(event.close)}` : ""}`],
      ["장소", `${esc(event.venue.name)}<br><span class="muted">${esc(event.venue.address)}</span>`],
    ];
    if (event.ticket) {
      const period = ticketPeriod(event.ticket);
      rows.push(["티켓", `${esc(event.ticket.price)}${period ? `<br><span class="muted">예매 기간 ${esc(period)}</span>` : ""}`]);
    }
    return `<dl class="info-list">
      ${rows.map(([k, v]) => `<div class="info-list__row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
    </dl>`;
  }

  /* ---------- 헤더 / 푸터 ---------- */

  function renderHeader(activePage) {
    const header = document.getElementById("site-header");
    if (!header) return;
    header.className = "site-header";
    header.innerHTML = `<div class="container site-header__inner">
      <a class="logo" href="index.html">
        <span class="logo__mark" aria-hidden="true"></span>
        <span class="logo__text">
          <span class="logo__ko">${esc(SITE.name)}</span>
          <span class="logo__ja">${esc(SITE.nameJa)}</span>
        </span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="메뉴 열기">
        <span></span><span></span><span></span>
      </button>
      <nav id="site-nav" class="site-nav">
        <ul>
          ${NAV.map(
            (item) =>
              `<li><a href="${item.href}"${item.page === activePage ? ' aria-current="page"' : ""}>${item.label}</a></li>`
          ).join("")}
        </ul>
      </nav>
    </div>`;

    const toggle = header.querySelector(".nav-toggle");
    const nav = header.querySelector(".site-nav");
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  function renderFooter() {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    footer.className = "site-footer";
    footer.innerHTML = `<div class="container site-footer__inner">
      <div>
        <p class="site-footer__name">${esc(SITE.name)} <span>${esc(SITE.nameJa)}</span></p>
        <p class="muted">${esc(SITE.contact.email)}</p>
      </div>
      <ul class="site-footer__links">
        ${SITE.contact.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("")}
      </ul>
      <p class="site-footer__copy">© ${new Date().getFullYear()} ${esc(SITE.name)}. 본 행사는 동방 프로젝트의 비공식 팬 이벤트입니다.</p>
    </div>`;
  }

  /* ---------- 페이지 ---------- */

  function renderHome() {
    const current = currentEvent();
    const currentEl = document.getElementById("current-event");
    if (currentEl) {
      currentEl.innerHTML = current
        ? `<div class="feature">
            ${poster(current, "poster--feature")}
            <div class="feature__body">
              <span class="badge badge--live">NEXT</span>
              <h3 class="feature__title">${esc(current.title)}</h3>
              <p class="feature__sub">${esc(current.subtitle)}</p>
              ${infoList(current)}
              <div class="btn-row">
                <a class="btn btn--primary" href="event.html?id=${encodeURIComponent(current.id)}">상세 보기</a>
                ${ticketButton(current, false)}
              </div>
            </div>
          </div>`
        : `<p class="empty">현재 예정된 행사가 없습니다. 다음 소식을 기다려 주세요.</p>`;
    }

    const archiveEl = document.getElementById("archive-preview");
    if (archiveEl) {
      const past = pastEvents().slice(0, 3);
      archiveEl.innerHTML = past.length
        ? `<div class="card-grid">${past.map(eventCard).join("")}</div>`
        : `<p class="empty">아직 기록된 행사가 없습니다.</p>`;
    }
  }

  function renderArchive() {
    const listEl = document.getElementById("archive-list");
    const filterEl = document.getElementById("archive-filter");
    if (!listEl) return;

    const events = sortedEvents();
    const years = [...new Set(events.map((e) => e.date.slice(0, 4)))];
    let activeYear = "all";

    function draw() {
      const filtered = activeYear === "all" ? events : events.filter((e) => e.date.startsWith(activeYear));
      listEl.innerHTML = filtered.length
        ? `<div class="card-grid">${filtered.map(eventCard).join("")}</div>`
        : `<p class="empty">해당 연도의 행사가 없습니다.</p>`;
      if (filterEl) {
        filterEl.querySelectorAll("button").forEach((btn) => {
          btn.setAttribute("aria-pressed", String(btn.dataset.year === activeYear));
        });
      }
    }

    if (filterEl) {
      filterEl.innerHTML = ["all", ...years]
        .map((y) => `<button type="button" class="chip" data-year="${y}">${y === "all" ? "전체" : y}</button>`)
        .join("");
      filterEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        activeYear = btn.dataset.year;
        draw();
      });
    }
    draw();
  }

  function renderEvent() {
    const el = document.getElementById("event-detail");
    if (!el) return;
    const id = new URLSearchParams(location.search).get("id");
    const event = DATA.events.find((e) => e.id === id);

    if (!event) {
      el.innerHTML = `<div class="container section"><p class="empty">행사를 찾을 수 없습니다.</p>
        <p style="text-align:center"><a class="btn" href="archive.html">아카이브로 돌아가기</a></p></div>`;
      return;
    }

    document.title = `${event.title} | ${SITE.name}`;
    const upcoming = isUpcoming(event);
    const hasTimes = (event.lineup || []).some((slot) => slot.time);

    el.innerHTML = `<header class="page-hero pattern-waves">
        <div class="container">
          <p class="page-hero__label">${nightLabel(event)} · ${upcoming ? "開催予定" : "記録"}</p>
          <h1 class="page-hero__title">${esc(event.title)}</h1>
          <p class="page-hero__sub">${esc(event.subtitle)}</p>
        </div>
      </header>
      <div class="container section">
        <div class="detail">
          <div class="detail__poster">${poster(event, "poster--feature")}</div>
          <div class="detail__body">
            ${infoList(event)}
            <p class="detail__desc">${esc(event.description)}</p>
            <div class="btn-row">
              ${ticketButton(event)}
              ${event.venue.mapUrl ? `<a class="btn" href="${esc(event.venue.mapUrl)}" target="_blank" rel="noopener">지도 보기</a>` : ""}
            </div>
          </div>
        </div>
      </div>
      <section class="container section">
        <div class="section-head">
          <span class="section-head__label">演目</span>
          <h2 class="section-head__title">${hasTimes ? "타임테이블" : "라인업"}</h2>
        </div>
        ${timetable(event)}
      </section>
      ${event.credits && event.credits.length ? `<section class="container section">
        <div class="section-head">
          <span class="section-head__label">裏方</span>
          <h2 class="section-head__title">스태프</h2>
        </div>
        ${credits(event)}
      </section>` : ""}
      <section class="container section">
        <div class="section-head">
          <span class="section-head__label">記録</span>
          <h2 class="section-head__title">갤러리</h2>
        </div>
        <div class="gallery">
          ${Array.from({ length: 6 }, () => `<div class="gallery__item" aria-hidden="true"></div>`).join("")}
        </div>
        <p class="muted" style="margin-top:12px">사진 리소스 준비 중</p>
      </section>
      ${event.links && event.links.length ? `<section class="container section">
        <div class="section-head">
          <span class="section-head__label">告知</span>
          <h2 class="section-head__title">관련 게시글</h2>
        </div>
        ${relatedLinks(event)}
      </section>` : ""}
      <div class="container section" style="padding-top:0">
        <a class="btn" href="archive.html">← 아카이브 목록</a>
      </div>`;
  }

  function renderAbout() {
    const descEl = document.getElementById("about-desc");
    if (descEl) descEl.textContent = SITE.description;
    const contactEl = document.getElementById("about-contact");
    if (contactEl) {
      contactEl.innerHTML = `<dl class="info-list">
        <div class="info-list__row"><dt>메일</dt><dd><a href="mailto:${esc(SITE.contact.email)}">${esc(SITE.contact.email)}</a></dd></div>
        ${SITE.contact.links
          .map((l) => `<div class="info-list__row"><dt>${esc(l.label)}</dt><dd><a href="${esc(l.url)}" target="_blank" rel="noopener">바로가기</a></dd></div>`)
          .join("")}
      </dl>`;
    }
  }

  /* ---------- 실행 ---------- */

  function renderLoadError(error) {
    console.error("[HTSC] 데이터 로드 실패:", error);
    const main = document.querySelector("main");
    if (!main) return;
    const isFile = location.protocol === "file:";
    main.innerHTML = `<div class="container section"><p class="empty">
      데이터를 불러오지 못했습니다.${isFile ? "<br>파일을 직접 열면 동작하지 않습니다. 로컬 서버로 실행해 주세요." : ""}
    </p></div>`;
  }

  async function init() {
    const page = document.body.dataset.page;
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      DATA = await res.json();
      SITE = DATA.site;
    } catch (error) {
      renderLoadError(error);
      return;
    }
    renderHeader(page);
    renderFooter();
    ({ home: renderHome, archive: renderArchive, event: renderEvent, about: renderAbout })[page]?.();
  }

  init();
})();
