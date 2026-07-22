(function () {
  "use strict";

  const STORAGE_KEY = "monthlyDeliveryState";

  const STATE = {
    LANDING: "LANDING",
    BOX_ARRIVED: "BOX_ARRIVED",
    SELECTION: "SELECTION",
    TEARING: "TEARING",
    OPENED: "OPENED",
    PLAYING: "PLAYING",
  };

  // ---------- storage ----------
  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { currentMonth: songsData.month, openedBoxes: [] };
      const parsed = JSON.parse(raw);
      if (parsed.currentMonth !== songsData.month) {
        return { currentMonth: songsData.month, openedBoxes: [] };
      }
      return {
        currentMonth: parsed.currentMonth,
        openedBoxes: Array.isArray(parsed.openedBoxes) ? parsed.openedBoxes : [],
      };
    } catch (e) {
      return { currentMonth: songsData.month, openedBoxes: [] };
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentMonth: songsData.month,
          openedBoxes: app.openedBoxes,
        })
      );
    } catch (e) {
      /* ignore */
    }
  }

  // ---------- app state ----------
  const app = (() => {
    const s = loadStorage();
    return {
      screen: STATE.LANDING,
      openedBoxes: s.openedBoxes,
      selectedDay: 1,
      tapeProgress: 0,
      arrivedTimer: null,
    };
  })();

  // Per-day random size factors, fixed for this session so boxes don't
  // resize on every re-render. Index 0 = day 1.
  const BOX_SCALES = (function () {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      arr.push({
        w: 0.7 + Math.random() * 0.55, // 0.70 - 1.25
        h: 0.55 + Math.random() * 0.95, // 0.55 - 1.50 (more vertical variety)
      });
    }
    return arr;
  })();

  // Base dimensions (px) for the tower box sizes, before random scaling.
  const TOWER_BASE = {
    "tower-sm": { w: 150, h: 64 },
    "tower-lg": { w: 340, h: 190 },
  };

  const root = document.getElementById("app");
  const resetBtn = document.getElementById("reset-btn");

  resetBtn.addEventListener("click", () => {
    app.openedBoxes = [];
    app.selectedDay = 1;
    app.tapeProgress = 0;
    app.screen = STATE.LANDING;
    saveStorage();
    render();
  });

  // ---------- helpers ----------
  function monthLabel() {
    const parts = songsData.month.split("-");
    const m = parseInt(parts[1], 10);
    return isNaN(m) ? songsData.month : m + "월";
  }

  function songByDay(day) {
    return songsData.songs.find((s) => s.day === day);
  }

  function isOpened(day) {
    return app.openedBoxes.indexOf(day) !== -1;
  }

  function markOpened(day) {
    if (!isOpened(day)) {
      app.openedBoxes.push(day);
      saveStorage();
    }
  }

  function goToBox(day) {
    app.selectedDay = day;
    app.tapeProgress = 0;
    app.screen = isOpened(day) ? STATE.PLAYING : STATE.TEARING;
    render();
  }

  // ---------- element factories ----------
  function el(tag, opts, children) {
    const e = document.createElement(tag);
    if (opts) {
      if (opts.class) e.className = opts.class;
      if (opts.text != null) e.textContent = opts.text;
      if (opts.html != null) e.innerHTML = opts.html;
      if (opts.style)
        Object.keys(opts.style).forEach((k) => (e.style[k] = opts.style[k]));
      if (opts.on)
        Object.keys(opts.on).forEach((k) => e.addEventListener(k, opts.on[k]));
      if (opts.attrs)
        Object.keys(opts.attrs).forEach((k) =>
          e.setAttribute(k, opts.attrs[k])
        );
    }
    if (children) {
      children.forEach((c) => {
        if (c) e.appendChild(c);
      });
    }
    return e;
  }

  function makeBox(day, size /* "big" | "small" */, opts) {
    opts = opts || {};
    const idx = day - 1;
    const opened = isOpened(day);
    const box = el("div", {
      class: "box " + size + (opened ? " opened" : ""),
      style: { background: BOX_COLORS[idx] },
      on: opts.onClick ? { click: opts.onClick } : null,
    });
    // Random per-day sizing for the stacked tower boxes.
    const base = TOWER_BASE[size];
    if (base) {
      const sc = BOX_SCALES[idx];
      box.style.width = Math.round(base.w * sc.w) + "px";
      box.style.height = Math.round(base.h * sc.h) + "px";
    }
    // Plain rectangle (no lid / no tape / no label) — an image will fill the box later.
    if (opts.selected) box.classList.add("selected");
    return box;
  }

  // ---------- screens ----------
  function renderLanding() {
    return el("div", { class: "landing" }, [
      el("div", {
        class: "sticker",
        text: monthLabel() + " 노래 배달 왔습니다!",
        on: {
          click: () => {
            app.screen = STATE.BOX_ARRIVED;
            render();
          },
        },
      }),
    ]);
  }

  function renderBoxArrived() {
    // Whole tower of 7 boxes, shown at once (overview).
    // Auto-advances to the zoomed selection screen after 3 seconds.
    const tower = el("div", { class: "tower" });
    for (let d = 1; d <= 7; d++) {
      tower.appendChild(makeBox(d, "tower-sm", {}));
    }
    const viewport = el("div", { class: "tower-viewport" }, [tower]);

    app.arrivedTimer = setTimeout(function () {
      app.arrivedTimer = null;
      if (app.screen === STATE.BOX_ARRIVED) {
        app.screen = STATE.SELECTION;
        render();
      }
    }, 3000);

    return el("div", { class: "tower-screen" }, [
      el("div", { class: "top-hint", text: "박스가 도착했습니다. 잠시 후 열립니다…" }),
      viewport,
    ]);
  }

  function renderStackPanel() {
    const stack = el("div", { class: "stack-panel" });
    for (let d = 1; d <= 7; d++) {
      const b = makeBox(d, "small", {
        selected: d === app.selectedDay,
        onClick: () => goToBox(d),
      });
      stack.appendChild(b);
    }
    return stack;
  }

  function renderShell(stageContent) {
    return el("div", { class: "shell" }, [renderStackPanel(), stageContent]);
  }

  function renderSelection() {
    // Zoomed, scrollable tower. Scroll up/down to move through boxes;
    // the box nearest the vertical center is highlighted as selected.
    // Click a box to open it.
    const tower = el("div", { class: "tower" });
    const boxEls = [];
    for (let d = 1; d <= 7; d++) {
      const day = d;
      const b = makeBox(day, "tower-lg", {
        onClick: () => {
          app.selectedDay = day;
          app.tapeProgress = 0;
          app.screen = isOpened(day) ? STATE.OPENED : STATE.TEARING;
          render();
        },
      });
      boxEls.push({ day: day, elm: b });
      tower.appendChild(b);
    }

    const viewport = el("div", { class: "tower-viewport scrollable" }, [tower]);

    function refreshSelected() {
      const vpRect = viewport.getBoundingClientRect();
      const centerY = vpRect.top + vpRect.height / 2;
      let best = null;
      let bestDist = Infinity;
      boxEls.forEach(function (item) {
        const r = item.elm.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const dist = Math.abs(c - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      });
      boxEls.forEach(function (item) {
        item.elm.classList.remove("selected");
      });
      if (best) {
        best.elm.classList.add("selected");
        app.selectedDay = best.day;
      }
    }

    viewport.addEventListener("scroll", refreshSelected);

    const screen = el("div", { class: "tower-screen" }, [
      el("div", {
        class: "top-hint",
        text: monthLabel() + " 박스를 위아래로 스크롤해서 고르고, 클릭해서 열어보세요.",
      }),
      viewport,
    ]);

    // Center the initially-selected box and set the highlight once mounted.
    requestAnimationFrame(function () {
      const sel = boxEls.find(function (i) {
        return i.day === app.selectedDay;
      });
      if (sel) {
        sel.elm.scrollIntoView({ block: "center" });
      }
      refreshSelected();
    });

    return screen;
  }

  function renderTearingStage() {
    const idx = app.selectedDay - 1;
    const tearingBox = el(
      "div",
      { class: "tearing-box", style: { background: BOX_COLORS[idx] } },
      [el("div", { class: "lid" })]
    );

    const tape = el("div", {
      class: "tearing-tape",
      style: { background: TAPE_COLORS[idx] },
    });
    tearingBox.appendChild(tape);
    tearingBox.appendChild(
      el("div", { class: "day-label", text: "Day " + app.selectedDay })
    );

    const fill = el("div", {
      class: "fill",
      style: { width: (app.tapeProgress * 100).toFixed(0) + "%" },
    });
    const bar = el("div", { class: "progress-bar" }, [fill]);

    // ---- interactions: click adds a bit, drag adds by distance ----
    const CLICK_STEP = 0.15;
    const DRAG_TO_FULL_PX = 300;

    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartProgress = 0;
    let didDrag = false;

    function updateProgress(next) {
      app.tapeProgress = Math.max(0, Math.min(1, next));
      fill.style.width = (app.tapeProgress * 100).toFixed(0) + "%";
      if (app.tapeProgress >= 1) {
        markOpened(app.selectedDay);
        app.screen = STATE.OPENED;
        render();
      }
    }

    function pointerXY(e) {
      if (e.touches && e.touches[0]) return [e.touches[0].clientX, e.touches[0].clientY];
      return [e.clientX, e.clientY];
    }

    function onDown(e) {
      dragging = true;
      didDrag = false;
      const [x, y] = pointerXY(e);
      dragStartX = x;
      dragStartY = y;
      dragStartProgress = app.tapeProgress;
      tape.classList.add("dragging");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const [x, y] = pointerXY(e);
      const dx = x - dragStartX;
      const dy = y - dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4) didDrag = true;
      updateProgress(dragStartProgress + dist / DRAG_TO_FULL_PX);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      tape.classList.remove("dragging");
    }

    tape.addEventListener("mousedown", onDown);
    tape.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    tape.addEventListener("click", () => {
      if (didDrag) return;
      updateProgress(app.tapeProgress + CLICK_STEP);
    });

    return el("div", { class: "stage" }, [
      el("h2", { text: "테이프를 뜯어주세요" }),
      el("div", { class: "tearing-wrap" }, [
        tearingBox,
        bar,
        el("div", {
          class: "hint",
          text: "테이프를 클릭하거나 드래그해서 뜯어주세요.",
        }),
      ]),
    ]);
  }

  function renderOpenedStage() {
    const idx = app.selectedDay - 1;
    const openedBox = el(
      "div",
      {
        class: "opened-box",
        style: { background: BOX_COLORS[idx] },
        on: {
          click: () => {
            app.screen = STATE.PLAYING;
            render();
          },
        },
      },
      [
        el("div", { class: "lid" }),
        el("div", { class: "album-placeholder", text: "앨범 이미지" }),
        el("div", { class: "day-label", text: "Day " + app.selectedDay }),
      ]
    );
    return el("div", { class: "stage" }, [
      el("h2", { text: "박스가 열렸습니다" }),
      el("div", { class: "opened-wrap" }, [
        openedBox,
        el("div", { class: "hint", text: "박스를 클릭해서 재생하세요." }),
      ]),
    ]);
  }

  function renderPlayingStage() {
    const song = songByDay(app.selectedDay) || {};
    const hasVideo = !!song.videoId;

    const meta = el("div", { class: "song-meta" });
    if (song.title || song.artist) {
      if (song.title) meta.appendChild(el("div", { class: "title", text: song.title }));
      if (song.artist) meta.appendChild(el("div", { class: "artist", text: song.artist }));
    } else {
      meta.appendChild(
        el("div", {
          class: "empty",
          text: "Day " + app.selectedDay + " · 곡 정보 미입력",
        })
      );
    }

    const header = el("div", { class: "player-header" }, [
      el("div", { class: "album-small", text: "앨범" }),
      meta,
    ]);

    const playerBox = el("div", { class: "player-box" }, [
      el("div", { class: "lid" }),
    ]);

    if (hasVideo) {
      const iframe = el("iframe", {
        attrs: {
          src:
            "https://www.youtube.com/embed/" +
            encodeURIComponent(song.videoId) +
            "?autoplay=1&rel=0",
          title: "YouTube video player",
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        },
      });
      playerBox.appendChild(iframe);
    } else {
      playerBox.appendChild(
        el("div", {
          class: "no-video",
          text: "videoId 미입력 — data.js에서 채워주세요.",
        })
      );
    }

    return el("div", { class: "stage" }, [
      el("div", { class: "player-wrap" }, [header, playerBox]),
    ]);
  }

  // ---------- root render ----------
  function render() {
    // Cancel any pending auto-advance timer from a previous screen.
    if (app.arrivedTimer) {
      clearTimeout(app.arrivedTimer);
      app.arrivedTimer = null;
    }
    root.innerHTML = "";
    let node;
    switch (app.screen) {
      case STATE.LANDING:
        node = renderLanding();
        break;
      case STATE.BOX_ARRIVED:
        node = renderBoxArrived();
        break;
      case STATE.SELECTION:
        node = renderSelection();
        break;
      case STATE.TEARING:
        node = renderShell(renderTearingStage());
        break;
      case STATE.OPENED:
        node = renderShell(renderOpenedStage());
        break;
      case STATE.PLAYING:
        node = renderShell(renderPlayingStage());
        break;
      default:
        node = renderLanding();
    }
    root.appendChild(node);
  }

  render();
})();
