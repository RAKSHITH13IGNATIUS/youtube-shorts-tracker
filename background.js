let stats = { shortsWatched: 0, totalSeconds: 0, date: getToday() };

function getToday() {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Load stats on startup
function loadStats() {
  chrome.storage.local.get("stats", (data) => {
    if (data.stats) {
      // If stats are from today → continue
      if (data.stats.date === getToday()) {
        stats = data.stats;
      } else {
        // If stats are from a previous day → reset
        stats = { shortsWatched: 0, totalSeconds: 0, date: getToday() };
        chrome.storage.local.set({ stats });
      }
    } else {
      // First time → initialize
      stats = { shortsWatched: 0, totalSeconds: 0, date: getToday() };
      chrome.storage.local.set({ stats });
    }
    console.log("[ShortsTracker] Stats loaded:", stats);
  });
}

chrome.runtime.onStartup.addListener(loadStats);
chrome.runtime.onInstalled.addListener(loadStats);

// Handle incoming messages
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "updateTime") {
    // Always check if date changed
    if (stats.date !== getToday()) {
      stats = { shortsWatched: 0, totalSeconds: 0, date: getToday() };
    }

    stats.totalSeconds += message.duration;

    // Only count Shorts if ≥ 5 sec
    if (message.duration >= 5) {
      stats.shortsWatched += 1;
    }

    chrome.storage.local.set({ stats });
    console.log("[ShortsTracker] Updated stats:", stats);
  }
});
  