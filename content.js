// ---- Config ----
const MIN_SECONDS_TO_COUNT_A_SHORT = 5; // avoid counting accidental opens

// ---- State ----
let startTime = null;
let lastUrl = location.href;

// ---- Helpers ----
function todayKey() {
  // YYYY-MM-DD in your local time
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultStats() {
  return { date: todayKey(), shortsWatched: 0, totalSeconds: 0 };
}

function safeGet(cb) {
  try {
    if (!chrome?.storage?.local) return cb(defaultStats());
    chrome.storage.local.get("stats", (data) => {
      const s = data?.stats || defaultStats();
      // daily reset
      if (s.date !== todayKey()) {
        const fresh = defaultStats();
        chrome.storage.local.set({ stats: fresh }, () => cb(fresh));
      } else {
        cb(s);
      }
    });
  } catch {
    cb(defaultStats());
  }
}

function safeSet(stats) {
  try {
    if (!chrome?.runtime?.id) return; // extension was reloaded/disabled
    chrome.storage.local.set({ stats });
  } catch {
    // swallow — happens only if extension context is invalidated mid-flight
  }
}

// ---- Tracking core ----
function startTracking() {
  if (!startTime) {
    startTime = Date.now();
    // console.log("[ShortsTracker] start", location.href);
  }
}

function stopTracking() {
  if (!startTime) return;

  const duration = Math.floor((Date.now() - startTime) / 1000);
  startTime = null;

  if (duration <= 0) return;

  // Persist this session safely
  safeGet((stats) => {
    stats.totalSeconds += duration;
    if (duration >= MIN_SECONDS_TO_COUNT_A_SHORT) {
      stats.shortsWatched += 1;
    }
    safeSet(stats);
    // console.log("[ShortsTracker] stop: +", duration, "s =>", stats);
  });
}

// Start immediately if we're on a Shorts page
if (location.href.includes("/shorts/")) {
  startTracking();
}

// Detect SPA URL changes (YouTube is an SPA)
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    // finish previous video
    stopTracking();

    // start new video if still in Shorts
    if (location.href.includes("/shorts/")) {
      startTracking();
    }
    lastUrl = location.href;
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// Save when leaving the page/tab
window.addEventListener("beforeunload", () => {
  // Important: don't touch chrome.runtime directly here if extension is reloading.
  stopTracking();
});

// Extra safety: heartbeat write every 10s so you don't lose progress on sudden closes
let heartbeatPrev = Date.now();
setInterval(() => {
  if (!startTime) return;
  const now = Date.now();
  const inc = Math.floor((now - heartbeatPrev) / 1000);
  if (inc <= 0) return;

  heartbeatPrev = now;

  safeGet((stats) => {
    stats.totalSeconds += inc;
    // don't increment shortsWatched here; only on stopTracking with threshold
    safeSet(stats);
  });
}, 10000);
