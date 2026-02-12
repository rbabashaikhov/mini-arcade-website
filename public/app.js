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

let games = [];
let activeSlug = null;

const STORAGE_LAST = "arcade_last_game";
const STORAGE_THEME = "arcade_theme";

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

const createCard = (game) => {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.slug = game.slug;

  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = `
    <h3>${game.title}</h3>
    <p class="muted">${game.description}</p>
    <div class="card-tags">
      <span class="tag">${game.difficulty}</span>
      ${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
    </div>
  `;

  button.addEventListener("click", () => selectGame(game.slug));
  card.appendChild(button);
  return card;
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
};

const updateSelectedCard = () => {
  document.querySelectorAll(".card").forEach((card) => {
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
  updateSelectedCard();
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

const fullscreenGame = () => {
  const container = document.querySelector(".play-area");
  if (!document.fullscreenElement && container.requestFullscreen) {
    container.requestFullscreen();
  } else if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen();
  }
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

const loadGames = async () => {
  try {
    const response = await fetch("./games.json");
    games = await response.json();
    gamesCount.textContent = `${games.length} games`;
    renderCards(games);
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

  themeToggle.addEventListener("click", toggleTheme);
  restartBtn.addEventListener("click", restartGame);
  openBtn.addEventListener("click", openGame);
  fullscreenBtn.addEventListener("click", fullscreenGame);
  searchInput.addEventListener("input", applySearch);

  gameFrame.addEventListener("load", () => showLoader(false));

  loadGames();
};

init();
