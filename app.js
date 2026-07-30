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
      tapeDir: 0,
      arrivedTimer: null,
      albumTimer: null,
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
    // Left side stack: same per-box ratio as tower-lg, scaled down.
    stack: { w: 100, h: 56 },
  };

  const root = document.getElementById("app");

  // ---------- browser history (back button = previous screen) ----------
  let restoringHistory = false;

  function navKey(screen, day) {
    return screen + ":" + day;
  }

  window.addEventListener("popstate", function (e) {
    const st = e.state || { screen: STATE.LANDING, selectedDay: 1 };
    restoringHistory = true;
    app.screen = st.screen;
    app.selectedDay = st.selectedDay || 1;
    app.tapeProgress = 0;
    app.tapeDir = 0;
    render();
    restoringHistory = false;
  });

  function doReset() {
    app.openedBoxes = [];
    app.selectedDay = 1;
    app.tapeProgress = 0;
    app.tapeDir = 0;
    app.screen = STATE.LANDING;
    saveStorage();
    render();
  }

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
    app.tapeDir = 0;
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
    }, 1500);

    return el("div", { class: "tower-screen" }, [
      el("div", { class: "top-hint", text: "박스가 도착했습니다. 잠시 후 열립니다…" }),
      viewport,
    ]);
  }

  function renderStackPanel() {
    const stack = el("div", { class: "stack-panel" });
    for (let d = 1; d <= 7; d++) {
      const b = makeBox(d, "stack", {
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
          app.tapeDir = 0;
          app.screen = isOpened(day) ? STATE.PLAYING : STATE.TEARING;
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

  // Base size of the focused box; scaled per box so each keeps its own size.
  const FOCUS_BASE = { w: 756, h: 423 };

  function focusSize(idx) {
    const sc = BOX_SCALES[idx];
    return {
      w: Math.round(FOCUS_BASE.w * sc.w),
      h: Math.round(FOCUS_BASE.h * sc.h),
    };
  }

  function renderTearingStage() {
    const idx = app.selectedDay - 1;
    const size = focusSize(idx);
    const tearingBox = el("div", {
      class: "tearing-box",
      style: {
        background: BOX_COLORS[idx],
        width: size.w + "px",
        height: size.h + "px",
      },
    });

    const tape = el("div", {
      class: "tearing-tape",
      style: { background: TAPE_COLORS[idx] },
    });
    tearingBox.appendChild(tape);

    // ---- interaction: a single left/right drag peels the tape in that
    // direction; progress follows drag distance and the box opens at 100%.
    // Larger value = lower sensitivity (needs more drag distance to tear).
    const DRAG_TO_FULL_PX = 780;

    let dragging = false;
    let dragStartX = 0;
    let dragStartProgress = 0;

    function applyTapeVisual() {
      const pct = (app.tapeProgress * 100).toFixed(1) + "%";
      if (app.tapeDir === 1) {
        // Peeling to the right: torn part recedes from the left edge.
        tape.style.left = pct;
        tape.style.right = "0";
      } else if (app.tapeDir === -1) {
        // Peeling to the left: torn part recedes from the right edge.
        tape.style.left = "0";
        tape.style.right = pct;
      } else {
        tape.style.left = "0";
        tape.style.right = "0";
      }
    }

    function updateProgress(next) {
      app.tapeProgress = Math.max(0, Math.min(1, next));
      applyTapeVisual();
      if (app.tapeProgress >= 1) {
        markOpened(app.selectedDay);
        app.screen = STATE.OPENED;
        render();
      }
    }

    function pointerX(e) {
      if (e.touches && e.touches[0]) return e.touches[0].clientX;
      return e.clientX;
    }

    function onDown(e) {
      dragging = true;
      dragStartX = pointerX(e);
      dragStartProgress = app.tapeProgress;
      tape.classList.add("dragging");
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const dx = pointerX(e) - dragStartX;
      if (app.tapeDir === 0 && Math.abs(dx) > 6) {
        app.tapeDir = dx > 0 ? 1 : -1;
      }
      if (app.tapeDir !== 0) {
        const signedDx = dx * app.tapeDir;
        updateProgress(dragStartProgress + signedDx / DRAG_TO_FULL_PX);
      }
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

    applyTapeVisual();

    return el("div", { class: "stage" }, [
      el("h2", { text: "테이프를 뜯어주세요" }),
      el("div", { class: "tearing-wrap" }, [
        tearingBox,
        el("div", {
          class: "hint",
          text: "테이프를 좌우로 드래그해서 뜯어주세요.",
        }),
      ]),
    ]);
  }

  // Opened-box player. The opened box stays visible the whole time and keeps
  // the selected box's own size ratio. The album appears inside the box,
  // centered, then (withIntro) rises up to the header while the video plays.
  function renderPlayer(withIntro) {
    const idx = app.selectedDay - 1;
    const song = songByDay(app.selectedDay) || {};
    const hasVideo = !!song.videoId;
    const boxColor = BOX_COLORS[idx];

    // Box body: same per-box size as the tearing box, so tearing -> opened
    // keeps this box's body size (flaps are added outside of this).
    const size = focusSize(idx);
    const IW = size.w;
    const IH = size.h;
    const albumSide = Math.round(Math.min(IW, IH) * 0.62);

    const player = el("div", { class: "player3" });

    // The opened box: interior + side flaps + top/bottom bars. Always shown.
    const box = el("div", {
      class: "box3",
      style: { width: IW + "px", height: IH + "px", background: boxColor },
    });
    box.appendChild(el("div", { class: "flap left", style: { background: boxColor } }));
    box.appendChild(el("div", { class: "flap right", style: { background: boxColor } }));
    box.appendChild(el("div", { class: "bar top", style: { background: boxColor } }));
    box.appendChild(el("div", { class: "bar bottom", style: { background: boxColor } }));

    // Video fills the interior, revealed when playback starts.
    const videoFrame = el("div", { class: "video-frame" });
    box.appendChild(videoFrame);

    // Title / artist above the box (in the header slot).
    const meta = el("div", { class: "p3-meta" });
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
    box.appendChild(meta);

    // Album: starts centered inside the box, then rises to the header slot.
    const album = el("div", {
      class: "p3-album",
      text: song.image ? "" : "앨범 이미지",
      style: {
        width: albumSide + "px",
        height: albumSide + "px",
        left: Math.round((IW - albumSide) / 2) + "px",
        top: Math.round((IH - albumSide) / 2) + "px",
      },
    });
    if (song.image) {
      // Use the album artwork as the background; falls back to gray if missing.
      album.style.backgroundImage = 'url("' + song.image + '")';
      album.style.backgroundSize = "cover";
      album.style.backgroundPosition = "center";
    }
    box.appendChild(album);

    player.appendChild(box);

    function raiseAlbum() {
      album.style.width = "72px";
      album.style.height = "72px";
      album.style.left = "6px";
      album.style.top = "-96px";
    }

    function startVideo() {
      if (hasVideo) {
        videoFrame.appendChild(
          el("iframe", {
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
          })
        );
      } else {
        videoFrame.appendChild(
          el("div", {
            class: "no-video",
            text: "videoId 미입력 — data.js에서 채워주세요.",
          })
        );
      }
    }

    if (withIntro) {
      // Box + album (centered inside) show first; after 1s the album rises to
      // the header and the video plays. The box stays visible throughout.
      app.albumTimer = setTimeout(function () {
        app.albumTimer = null;
        player.classList.add("playing");
        raiseAlbum();
        startVideo();
      }, 1000);
    } else {
      player.classList.add("playing");
      raiseAlbum();
      startVideo();
    }

    // Pre = previous (upper) box, Next = next (lower) box, Reset = restart.
    const preBtn = el("button", {
      class: "p3-nav p3-pre",
      text: "Pre",
      on: { click: () => { if (app.selectedDay > 1) goToBox(app.selectedDay - 1); } },
    });
    if (app.selectedDay <= 1) preBtn.disabled = true;

    const nextBtn = el("button", {
      class: "p3-nav p3-next",
      text: "Next",
      on: { click: () => { if (app.selectedDay < 7) goToBox(app.selectedDay + 1); } },
    });
    if (app.selectedDay >= 7) nextBtn.disabled = true;

    const resetNav = el("button", {
      class: "p3-nav p3-reset",
      text: "Reset",
      on: { click: doReset },
    });

    return el("div", { class: "stage" }, [player, preBtn, nextBtn, resetNav]);
  }

  function renderOpenedStage() {
    return renderPlayer(true);
  }

  function renderPlayingStage() {
    return renderPlayer(false);
  }

  // ---------- root render ----------
  function render() {
    // Cancel any pending timers from a previous screen.
    if (app.arrivedTimer) {
      clearTimeout(app.arrivedTimer);
      app.arrivedTimer = null;
    }
    if (app.albumTimer) {
      clearTimeout(app.albumTimer);
      app.albumTimer = null;
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

    // Screens 1-2 (landing, box arrived) use the entry background.
    const withBg =
      app.screen === STATE.LANDING || app.screen === STATE.BOX_ARRIVED;
    document.body.classList.toggle("entry-bg", withBg);

    // Screens 3-6 (selection, tearing, opened, playing) use the wood background.
    const withWood =
      app.screen === STATE.SELECTION ||
      app.screen === STATE.TEARING ||
      app.screen === STATE.OPENED ||
      app.screen === STATE.PLAYING;
    document.body.classList.toggle("wood-bg", withWood);

    // Sync browser history so the back button walks the screen flow.
    if (!restoringHistory) {
      const snap = { screen: app.screen, selectedDay: app.selectedDay };
      const cur = history.state;
      if (cur == null) {
        history.replaceState(snap, "");
      } else if (navKey(cur.screen, cur.selectedDay) !== navKey(app.screen, app.selectedDay)) {
        // BOX_ARRIVED is a brief auto-advancing screen — replace it rather
        // than leaving a history entry the back button would bounce on.
        if (cur.screen === STATE.BOX_ARRIVED) {
          history.replaceState(snap, "");
        } else {
          history.pushState(snap, "");
        }
      }
    }
  }

  render();
})();
