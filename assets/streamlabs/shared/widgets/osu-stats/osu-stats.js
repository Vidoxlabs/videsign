/* Violet Streamlabs Osu! Stats Widget — JavaScript Logic */
// Connects to gosumemory standard local WebSocket port
const wsUrl = "ws://127.0.0.1:24050/ws";

let socket;
let reconnectInterval;

// DOM Elements
const container = document.getElementById("violet-osu-container");
const bgElement = document.getElementById("osu-bg");
const stateLabel = document.getElementById("osu-state-label");
const titleElement = document.getElementById("osu-title");
const artistElement = document.getElementById("osu-artist");
const ppElement = document.getElementById("osu-pp");
const accElement = document.getElementById("osu-acc");
const comboElement = document.getElementById("osu-combo");
const progressFill = document.getElementById("osu-progress-fill");

let lastBgPath = "";

function connectWebSocket() {
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("[Violet Osu! Widget] Connected to gosumemory");
    clearInterval(reconnectInterval);
    container.classList.remove("hidden");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      updateWidget(data);
    } catch (e) {
      console.error("[Violet Osu! Widget] Error parsing data:", e);
    }
  };

  socket.onclose = () => {
    console.log("[Violet Osu! Widget] Disconnected. Retrying...");
    container.classList.add("hidden");
    reconnectInterval = setTimeout(connectWebSocket, 5000);
  };

  socket.onerror = (err) => {
    console.error("[Violet Osu! Widget] WebSocket Error");
    socket.close();
  };
}

function updateWidget(data) {
  // State handling (hide when not playing or in results, depending on preference)
  // gosumemory states: 2 = playing, 7 = results, 0 = menu
  const state = data.menu.state;
  if (state === 2) {
    stateLabel.innerText = "NOW PLAYING";
    container.classList.remove("hidden");
  } else if (state === 7) {
    stateLabel.innerText = "RESULTS";
    container.classList.remove("hidden");
  } else {
    // Optionally hide when in menu: container.classList.add("hidden");
    stateLabel.innerText = "IDLE";
    container.classList.remove("hidden");
  }

  // Song Metadata
  const bm = data.menu.bm;
  if (bm.metadata) {
    titleElement.innerText = bm.metadata.title || "Unknown Title";
    artistElement.innerText = bm.metadata.artist || "Unknown Artist";
  }

  // Background Image
  // gosumemory provides a direct path, usually accessible via http://127.0.0.1:24050/Songs/...
  if (bm.path && bm.path.full) {
    // To construct the URL properly, we replace # with %23, etc.
    const bgUrl = `http://127.0.0.1:24050/Songs/${encodeURIComponent(bm.path.folder)}/${encodeURIComponent(bm.path.bg)}`
      .replace(/%5C/g, '/'); // Fix Windows backslashes if present
    
    if (bgUrl !== lastBgPath) {
      // Check if bg is actually provided
      if (bm.path.bg) {
        bgElement.style.backgroundImage = `url("${bgUrl}")`;
      } else {
        bgElement.style.backgroundImage = `none`;
      }
      lastBgPath = bgUrl;
    }
  }

  // Live Metrics
  const gameplay = data.gameplay;
  
  // PP
  const currentPP = gameplay.pp.current || 0;
  ppElement.innerText = Math.round(currentPP).toString();

  // Accuracy
  const currentAcc = gameplay.accuracy || 0;
  accElement.innerText = currentAcc.toFixed(2) + "%";

  // Combo
  const currentCombo = gameplay.combo.current || 0;
  comboElement.innerText = currentCombo + "x";

  // Progress Bar
  const timeInfo = bm.time;
  if (timeInfo && timeInfo.mp3) {
    const current = timeInfo.current || 0;
    const total = timeInfo.mp3 || 1;
    let progress = (current / total) * 100;
    progress = Math.max(0, Math.min(progress, 100)); // Clamp between 0-100
    progressFill.style.width = progress + "%";
  }
}

// Initialize
connectWebSocket();
