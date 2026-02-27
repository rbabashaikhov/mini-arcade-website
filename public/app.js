const cardsGrid = document.getElementById("cardsGrid");
const nowPlayingTitle = document.getElementById("nowPlayingTitle");
const controlsHint = document.getElementById("controlsHint");
const gameFrame = document.getElementById("gameFrame");
const restartBtn = document.getElementById("restartBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const openBtn = document.getElementById("openBtn");
const searchInput = document.getElementById("searchInput");
const gamesCount = document.getElementById("gamesCount");
const iframeLoader = document.getElementById("iframeLoader");
const themeToggle = document.getElementById("themeToggle");
const playArea = document.querySelector(".play-area");
const stageWrapper = document.querySelector(".stage-wrapper");
const stagePanelHint = document.getElementById("stagePanelHint");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

let games = [];
let activeSlug = null;

const STORAGE_LAST = "arcade_last_game";
const STORAGE_THEME = "arcade_theme";
const STORAGE_SIDEBAR = "sidebarCollapsed";
const TETRIS_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "Space",
  "KeyZ",
  "KeyX",
  "KeyP",
  "KeyR",
  "KeyC",
]);
const TETRIS_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  " ",
  "z",
  "x",
  "p",
  "r",
  "c",
]);

const setTheme = (mode) => {
  document.body.dataset.theme = mode;
  localStorage.setItem(STORAGE_THEME, mode);
};

const toggleTheme = () => {
  const current = document.body.dataset.theme || "light";
  setTheme(current === "light" ? "dark" : "light");
};

const showLoader = (show) => {
  iframeLoader.classList.toggle("active", show);
};

const clearCards = () => {
  cardsGrid.innerHTML = "";
};

const GAME_ICONS = {
  "whack-a-mole": "🔨",
  pong: "🏓",
  tetris: "🧱",
  snake: "🐍",
  "space-invaders": "👾",
  pacman: "🟡",
  "flappy-bird": "🐦",
  asteroids: "☄️",
};

const GAME_LAYOUT = {
  "whack-a-mole": "compact",
};

const createCard = (game) => {
  const item = document.createElement("div");
  item.className = "nav-item";
  item.dataset.slug = game.slug;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.title = game.title;
  button.setAttribute("aria-label", `Play ${game.title}`);
  button.innerHTML = `
    <span class="game-icon" aria-hidden="true">${
      GAME_ICONS[game.slug] || "🎮"
    }</span>
    <span class="game-label">
      <span class="game-title">${game.title}</span>
    </span>
  `;

  button.addEventListener("click", () => selectGame(game.slug));
  item.appendChild(button);
  return item;
};

const renderCards = (list) => {
  clearCards();
  list.forEach((game) => {
    cardsGrid.appendChild(createCard(game));
  });
  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No games found.";
    cardsGrid.appendChild(empty);
  }
  updateSelectedCard();
  updateNavTooltips();
};

const updateSelectedCard = () => {
  document.querySelectorAll(".nav-item").forEach((card) => {
    card.classList.toggle("selected", card.dataset.slug === activeSlug);
  });
};

const selectGame = (slug) => {
  const game = games.find((item) => item.slug === slug);
  if (!game) return;
  activeSlug = slug;
  localStorage.setItem(STORAGE_LAST, slug);
  nowPlayingTitle.textContent = game.title;
  controlsHint.textContent = game.controls;
  showLoader(true);
  gameFrame.src = game.path;
  const layout = GAME_LAYOUT[slug] ?? "wide";
  playArea.dataset.layout = layout;
  stageWrapper.classList.toggle("stage-wrapper--compact", layout === "compact");
  stagePanelHint.textContent = game.controls;
  updateSelectedCard();
  closeMobileMenu();
};

const restartGame = () => {
  if (!gameFrame.src) return;
  showLoader(true);
  gameFrame.src = gameFrame.src;
};

const openGame = () => {
  const game = games.find((item) => item.slug === activeSlug);
  if (!game) return;
  window.open(game.path, "_blank", "noopener");
};

const fullscreenGame = async () => {
  if (!gameFrame) return;

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  try {
    await gameFrame.requestFullscreen();
    focusGameFrame();
  } catch (error) {
    console.error("Fullscreen failed:", error);
  }
};

const isEditableTarget = (event) => {
  const active = event.target;
  const tag = active ? active.tagName : "";
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (active && active.isContentEditable)
  );
};

const shouldForwardKey = (event) => {
  const code = event.code;
  const key = event.key ? event.key.toLowerCase() : "";
  return TETRIS_CODES.has(code) || TETRIS_KEYS.has(event.key) || TETRIS_KEYS.has(key);
};

const focusGameFrame = () => {
  if (!gameFrame || !gameFrame.src) return;
  try {
    gameFrame.focus();
  } catch (error) {
    // no-op
  }
};

const forwardKeyEvent = (event, isDown) => {
  if (!gameFrame || !gameFrame.src) return;
  if (isEditableTarget(event)) return;
  if (!shouldForwardKey(event)) return;
  event.preventDefault();
  gameFrame.contentWindow?.postMessage(
    {
      type: "arcade:key",
      down: isDown,
      key: event.key,
      code: event.code,
    },
    "*"
  );
};

/*
 * For compact-layout games, scale the game-shell inside the iframe so the
 * entire game fits the available height without clipping or scrollbars.
 *
 * CSS `zoom` is used instead of `transform: scale` because zoom affects both
 * layout dimensions AND visual rendering, so the browser clips at the correct
 * boundary. `transform` only changes visual appearance — layout stays at the
 * original size and overflow:hidden would still cut off the bottom.
 *
 * The injected <style> lives inside the iframe document and is naturally
 * discarded when a different game loads (iframe navigates to a new document).
 */
const fitCompactStage = () => {
  if (GAME_LAYOUT[activeSlug] !== "compact") return;

  const doc = gameFrame.contentDocument;
  if (!doc?.head || !doc?.body) return;

  // Remove any scale style from a previous resize / re-load
  doc.getElementById("arcade-fit")?.remove();

  const shell = doc.querySelector(".game-shell");
  if (!shell) return;

  const available = gameFrame.clientHeight;
  const contentH = shell.scrollHeight;

  if (contentH <= available) return; // already fits, nothing to do

  const scale = available / contentH;

  const style = doc.createElement("style");
  style.id = "arcade-fit";
  style.textContent = `.game-shell { zoom: ${scale.toFixed(4)}; }`;
  doc.head.appendChild(style);
};

const applySearch = () => {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = games.filter((game) => {
    const haystack = [
      game.title,
      game.description,
      game.tags.join(" "),
      game.difficulty,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  gamesCount.textContent = `${filtered.length} games`;
  renderCards(filtered);
};

const updateNavTooltips = () => {
  const isCollapsed = document.body.classList.contains("sidebar-collapsed");
  document.querySelectorAll(".nav-item button").forEach((button) => {
    const title = button.dataset.title || "";
    if (isCollapsed && title) {
      button.setAttribute("title", title);
    } else {
      button.removeAttribute("title");
    }
  });
};

const setSidebarCollapsed = (collapsed) => {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  localStorage.setItem(STORAGE_SIDEBAR, collapsed ? "true" : "false");
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  sidebarToggle?.setAttribute("aria-label", label);
  updateNavTooltips();
};

const openMobileMenu = () => {
  document.body.classList.add("sidebar-open");
  mobileMenuBtn?.setAttribute("aria-label", "Close game menu");
};

const closeMobileMenu = () => {
  document.body.classList.remove("sidebar-open");
  mobileMenuBtn?.setAttribute("aria-label", "Open game menu");
};

const toggleMobileMenu = () => {
  if (document.body.classList.contains("sidebar-open")) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
};

const loadGames = async () => {
  try {
    const response = await fetch("./games.json");
    games = await response.json();
    gamesCount.textContent = `${games.length} games`;
    renderCards(games);
    updateNavTooltips();
    const stored = localStorage.getItem(STORAGE_LAST);
    if (stored && games.some((game) => game.slug === stored)) {
      selectGame(stored);
    } else if (games[0]) {
      selectGame(games[0].slug);
    }
  } catch (error) {
    gamesCount.textContent = "Failed to load.";
    clearCards();
    const fallback = document.createElement("p");
    fallback.className = "muted";
    fallback.textContent = "Unable to load games list.";
    cardsGrid.appendChild(fallback);
  }
};

const init = () => {
  const savedTheme = localStorage.getItem(STORAGE_THEME) || "light";
  setTheme(savedTheme);
  const savedSidebar = localStorage.getItem(STORAGE_SIDEBAR) === "true";
  setSidebarCollapsed(savedSidebar);

  themeToggle.addEventListener("click", toggleTheme);
  restartBtn.addEventListener("click", restartGame);
  openBtn.addEventListener("click", openGame);
  fullscreenBtn.addEventListener("click", fullscreenGame);
  searchInput.addEventListener("input", applySearch);
  sidebarToggle?.addEventListener("click", () => {
    const isCollapsed = document.body.classList.contains("sidebar-collapsed");
    setSidebarCollapsed(!isCollapsed);
  });
  mobileMenuBtn?.addEventListener("click", toggleMobileMenu);
  sidebarOverlay?.addEventListener("click", closeMobileMenu);

  gameFrame.addEventListener("load", () => {
    showLoader(false);
    focusGameFrame();
    gameFrame.contentWindow?.postMessage({ type: "arcade:focus" }, "*");
    // Defer one frame so the iframe layout is fully committed before measuring
    requestAnimationFrame(fitCompactStage);
  });

  document.addEventListener("fullscreenchange", () => {
    const isActive = Boolean(document.fullscreenElement);
    playArea.classList.toggle("is-fullscreen", isActive);
    document.body.classList.toggle("fullscreen-active", isActive);
    document.documentElement.classList.toggle("fullscreen-active", isActive);
    focusGameFrame();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (playArea.classList.contains("is-fullscreen")) {
        playArea.classList.remove("is-fullscreen");
        document.body.classList.remove("fullscreen-active");
        document.documentElement.classList.remove("fullscreen-active");
      }
      return;
    }
    forwardKeyEvent(event, true);
  });

  document.addEventListener("keyup", (event) => {
    forwardKeyEvent(event, false);
  });

  playArea?.addEventListener("pointerdown", focusGameFrame);
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      closeMobileMenu();
    }
    fitCompactStage();
  });

  loadGames();
};

init();
