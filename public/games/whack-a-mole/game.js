const holes = Array.from(document.querySelectorAll(".hole"));
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const timeValue = document.getElementById("timeValue");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");

const STORAGE_KEY = "arcade_whack-a-mole_best";
let score = 0;
let bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let timeLeft = 30;
let moleIndex = null;
let moleTimer = null;
let countdownTimer = null;
let isRunning = false;

bestValue.textContent = bestScore;

const pickNewMole = () => {
  let next = Math.floor(Math.random() * holes.length);
  if (next === moleIndex) {
    next = (next + 1) % holes.length;
  }
  moleIndex = next;
  holes.forEach((hole, idx) => hole.classList.toggle("active", idx === moleIndex));
};

const updateScores = () => {
  scoreValue.textContent = score;
  timeValue.textContent = timeLeft;
};

const endGame = () => {
  isRunning = false;
  clearInterval(moleTimer);
  clearInterval(countdownTimer);
  holes.forEach((hole) => hole.classList.remove("active"));
  statusText.textContent = `Time! Final score: ${score}.`;
  if (score > bestScore) {
    bestScore = score;
    bestValue.textContent = bestScore;
    localStorage.setItem(STORAGE_KEY, bestScore);
  }
};

const startGame = () => {
  score = 0;
  timeLeft = 30;
  isRunning = true;
  statusText.textContent = "Whack the mole!";
  updateScores();
  pickNewMole();
  clearInterval(moleTimer);
  clearInterval(countdownTimer);
  moleTimer = setInterval(pickNewMole, 650);
  countdownTimer = setInterval(() => {
    timeLeft -= 1;
    updateScores();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
};

holes.forEach((hole, idx) => {
  hole.addEventListener("click", () => {
    if (!isRunning) return;
    if (idx === moleIndex) {
      score += 1;
      updateScores();
      pickNewMole();
    }
  });
});

restartBtn.addEventListener("click", startGame);

startGame();
