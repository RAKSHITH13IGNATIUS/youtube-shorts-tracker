function formatMinutes(seconds) {
  return (seconds / 60).toFixed(1);
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function refresh() {
  chrome.storage.local.get("stats", ({ stats }) => {
    const s = stats || { date: todayKey(), shortsWatched: 0, totalSeconds: 0 };

    // Daily reset safeguard
    if (s.date !== todayKey()) {
      const fresh = { date: todayKey(), shortsWatched: 0, totalSeconds: 0 };
      chrome.storage.local.set({ stats: fresh }, () => show(fresh));
    } else {
      show(s);
    }
  });
}

function show(s) {
  document.getElementById("date").textContent = "Today: " + s.date;
  document.getElementById("count").textContent =
    "Shorts watched: " + s.shortsWatched;
  document.getElementById("time").textContent =
    "Minutes spent: " + formatMinutes(s.totalSeconds);
}

document.getElementById("reset").addEventListener("click", () => {
  const fresh = { date: todayKey(), shortsWatched: 0, totalSeconds: 0 };
  chrome.storage.local.set({ stats: fresh }, refresh);
});

refresh();
