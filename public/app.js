"use strict";

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwg0alV9GBUPBylCDX6kh4mi20UjcbBb9bO4F7ThGH_JcffaiZnwmGNPywnSCpzyAL0rA/exec";
const API_TIMEOUT_MS = 15000;
const STORAGE_KEY = "quizGameStatsV2";
const MAX_REVIEW_QUESTIONS = 20;

const screens = {
  start: document.getElementById("start-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen"),
  stats: document.getElementById("stats-screen"),
  ranking: document.getElementById("ranking-screen"),
  login: document.getElementById("login-screen"),
  signup: document.getElementById("signup-screen"),
  profile: document.getElementById("profile-screen"),
};

const elements = {
  loading: document.getElementById("loading"),
  loadingText: document.getElementById("loading-text"),
  errorMessage: document.getElementById("error-message"),
  quizSettings: document.getElementById("quiz-settings"),
  categorySelect: document.getElementById("category-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  questionCountSelect: document.getElementById("question-count-select"),
  startButton: document.getElementById("start-button"),
  reviewButton: document.getElementById("review-button"),
  statsButton: document.getElementById("stats-button"),
  startRankingButton: document.getElementById("start-ranking-button"),
  homeAttempts: document.getElementById("home-attempts"),
  homeBestScore: document.getElementById("home-best-score"),
  homeReviewCount: document.getElementById("home-review-count"),
  currentNumber: document.getElementById("current-number"),
  totalNumber: document.getElementById("total-number"),
  currentScore: document.getElementById("current-score"),
  progressBar: document.getElementById("progress-bar"),
  quizModeLabel: document.getElementById("quiz-mode-label"),
  comboBadge: document.getElementById("combo-badge"),
  comboCount: document.getElementById("combo-count"),
  questionText: document.getElementById("question-text"),
  choices: document.getElementById("choices"),
  answerFeedback: document.getElementById("answer-feedback"),
  answerResult: document.getElementById("answer-result"),
  answerExplanation: document.getElementById("answer-explanation"),
  nextButton: document.getElementById("next-button"),
  quizHomeButton: document.getElementById("quiz-home-button"),
  finalScore: document.getElementById("final-score"),
  finalCorrect: document.getElementById("final-correct"),
  finalTotal: document.getElementById("final-total"),
  finalRate: document.getElementById("final-rate"),
  resultTitleBadge: document.getElementById("result-title-badge"),
  resultComment: document.getElementById("result-comment"),
  scoreForm: document.getElementById("score-form"),
  playerName: document.getElementById("player-name"),
  nameError: document.getElementById("name-error"),
  saveScoreButton: document.getElementById("save-score-button"),
  saveMessage: document.getElementById("save-message"),
  resultModeMessage: document.getElementById("result-mode-message"),
  retryButton: document.getElementById("retry-button"),
  reviewWrongButton: document.getElementById("review-wrong-button"),
  resultStatsButton: document.getElementById("result-stats-button"),
  resultRankingButton: document.getElementById("result-ranking-button"),
  skipSaveHomeButton: document.getElementById("skip-save-home-button"),
  statsAttempts: document.getElementById("stats-attempts"),
  statsBestScore: document.getElementById("stats-best-score"),
  statsAccuracy: document.getElementById("stats-accuracy"),
  statsMaxCombo: document.getElementById("stats-max-combo"),
  statsTotalAnswered: document.getElementById("stats-total-answered"),
  statsReviewCount: document.getElementById("stats-review-count"),
  statsWeakCategory: document.getElementById("stats-weak-category"),
  statsReviewButton: document.getElementById("stats-review-button"),
  statsTopButton: document.getElementById("stats-top-button"),
  rankingBody: document.getElementById("ranking-body"),
  rankingEmpty: document.getElementById("ranking-empty"),
  topButton: document.getElementById("top-button"),
};

const quizState = {
  questions: [],
  currentIndex: 0,
  correctCount: 0,
  currentCombo: 0,
  maxCombo: 0,
  answered: false,
  scoreSaved: false,
  statsRecorded: false,
  mode: "normal",
  settings: {
    category: "all",
    difficulty: "all",
    questionCount: 10,
  },
};

let playerStats = loadStats();
let isStarting = false;
let authStateReady = false;
let authenticatedUser = null;
const PUBLIC_AUTH_SCREENS = new Set(["login", "signup"]);

function createDefaultStats() {
  return {
    attempts: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    bestScore: 0,
    maxCombo: 0,
    incorrectQuestions: {},
    categoryStats: {},
  };
}

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return createDefaultStats();
    return {
      attempts: Math.max(0, Number(saved.attempts) || 0),
      totalAnswered: Math.max(0, Number(saved.totalAnswered) || 0),
      totalCorrect: Math.max(0, Number(saved.totalCorrect) || 0),
      bestScore: Math.max(0, Number(saved.bestScore) || 0),
      maxCombo: Math.max(0, Number(saved.maxCombo) || 0),
      incorrectQuestions:
        saved.incorrectQuestions && typeof saved.incorrectQuestions === "object"
          ? saved.incorrectQuestions
          : {},
      categoryStats:
        saved.categoryStats && typeof saved.categoryStats === "object"
          ? saved.categoryStats
          : {},
    };
  } catch (error) {
    return createDefaultStats();
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerStats));
  } catch (error) {
    console.warn("記録をブラウザに保存できませんでした。", error);
  }
  updateHomeStats();
}

function setText(element, value) {
  element.textContent = String(value ?? "");
}

function isAuthenticated() {
  return authStateReady && Boolean(authenticatedUser);
}

function requireAuthentication() {
  if (isAuthenticated()) return true;
  showScreen("login");
  return false;
}

function showScreen(screenName) {
  if (!screens[screenName]) return false;
  const targetScreen =
    PUBLIC_AUTH_SCREENS.has(screenName) || isAuthenticated()
      ? screenName
      : "login";
  Object.entries(screens).forEach(([name, screen]) => {
    screen.hidden = name !== targetScreen;
  });
  showError("");
  if (targetScreen === "start") updateHomeStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
  return targetScreen === screenName;
}

function setAuthState(user) {
  authStateReady = true;
  authenticatedUser = user || null;
  showLoading(false);

  const activeScreenName = Object.entries(screens)
    .find(([, screen]) => !screen.hidden)?.[0];

  if (!authenticatedUser) {
    if (!activeScreenName || !PUBLIC_AUTH_SCREENS.has(activeScreenName)) {
      showScreen("login");
    }
    return;
  }

  if (!activeScreenName) showScreen("start");
}

function showLoading(isVisible, message = "通信中です...") {
  elements.loading.hidden = !isVisible;
  setText(elements.loadingText, message);
}

function showError(message) {
  setText(elements.errorMessage, message);
  elements.errorMessage.hidden = !message;
}

function shuffleArray(sourceArray) {
  const array = [...sourceArray];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function normalizeQuestion(question) {
  return {
    id: question.id,
    question: String(question.question || ""),
    choices: Array.isArray(question.choices) ? question.choices.map(String) : [],
    correct: Number(question.correct),
    explanation: String(question.explanation || ""),
    category: String(question.category || "一般常識"),
    difficulty: String(question.difficulty || "ふつう"),
  };
}

function calculateScore() {
  const total = quizState.questions.length;
  return total > 0 ? Math.round((quizState.correctCount / total) * 100) : 0;
}

function getTitleForScore(score) {
  if (score === 100) return ["クイズ王", "全問正解！すばらしい知識です。"];
  if (score >= 90) return ["雑学教授", "あと一歩で満点。圧倒的な成績です！"];
  if (score >= 70) return ["雑学マスター", "幅広い知識が身についています！"];
  if (score >= 40) return ["ひらめき研究員", "復習すれば、さらに上を目指せます。"];
  return ["雑学ビギナー", "ここから成長開始！間違えた問題を復習しましょう。"];
}

function updateHomeStats() {
  const reviewCount = Object.keys(playerStats.incorrectQuestions).length;
  setText(elements.homeAttempts, `${playerStats.attempts}回`);
  setText(elements.homeBestScore, `${playerStats.bestScore}点`);
  setText(elements.homeReviewCount, `${reviewCount}問`);
  setText(elements.reviewButton, `間違えた問題を復習（${reviewCount}問）`);
  elements.reviewButton.disabled = reviewCount === 0;
}

function resetQuizState(mode) {
  quizState.questions = [];
  quizState.currentIndex = 0;
  quizState.correctCount = 0;
  quizState.currentCombo = 0;
  quizState.maxCombo = 0;
  quizState.answered = false;
  quizState.scoreSaved = false;
  quizState.statsRecorded = false;
  quizState.mode = mode;
  elements.scoreForm.reset();
  elements.nameError.hidden = true;
  elements.saveMessage.hidden = true;
  elements.resultModeMessage.hidden = true;
  elements.saveScoreButton.disabled = false;
  setText(elements.saveScoreButton, "スコアを登録する");
}

async function fetchQuestions(settings) {
  const data = await apiRequest({
    mode: "getQuestions",
    category: settings.category,
    difficulty: settings.difficulty,
  });
  const questions = Array.isArray(data.questions)
    ? data.questions.map(normalizeQuestion)
    : [];
  if (questions.length === 0) {
    throw new Error("条件に合う問題がありません。カテゴリーや難易度を変更してください。");
  }
  return shuffleArray(questions).slice(0, settings.questionCount);
}

async function startQuiz() {
  if (!requireAuthentication()) return;
  if (isStarting) return;
  isStarting = true;
  elements.startButton.disabled = true;
  showError("");
  showLoading(true, "問題を取得しています...");

  try {
    resetQuizState("normal");
    quizState.settings = {
      category: elements.categorySelect.value,
      difficulty: elements.difficultySelect.value,
      questionCount: Number(elements.questionCountSelect.value),
    };
    quizState.questions = await fetchQuestions(quizState.settings);
    showScreen("quiz");
    showQuestion();
  } catch (error) {
    showScreen("start");
    showError(error.message || "問題の取得に失敗しました。");
  } finally {
    showLoading(false);
    elements.startButton.disabled = false;
    isStarting = false;
  }
}

function startReviewQuiz() {
  if (!requireAuthentication()) return;
  if (isStarting) return;
  const reviewQuestions = Object.values(playerStats.incorrectQuestions)
    .map(normalizeQuestion)
    .filter((question) =>
      question.question
      && question.choices.length === 4
      && Number.isInteger(question.correct)
      && question.correct >= 1
      && question.correct <= 4);

  if (reviewQuestions.length === 0) {
    showScreen("start");
    showError("復習待ちの問題はありません。まず通常クイズに挑戦しましょう。");
    return;
  }

  resetQuizState("review");
  quizState.questions = shuffleArray(reviewQuestions).slice(0, MAX_REVIEW_QUESTIONS);
  showScreen("quiz");
  showQuestion();
}

function showQuestion() {
  const question = quizState.questions[quizState.currentIndex];
  quizState.answered = false;

  setText(elements.currentNumber, quizState.currentIndex + 1);
  setText(elements.totalNumber, quizState.questions.length);
  setText(elements.currentScore, calculateScore());
  setText(elements.questionText, question.question);
  setText(
    elements.quizModeLabel,
    quizState.mode === "review"
      ? "復習チャレンジ"
      : `${question.category}・${question.difficulty}`,
  );
  elements.progressBar.style.width =
    `${((quizState.currentIndex + 1) / quizState.questions.length) * 100}%`;
  elements.comboBadge.hidden = quizState.currentCombo < 2;
  elements.answerFeedback.hidden = true;
  elements.nextButton.hidden = true;
  elements.choices.replaceChildren();

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    const number = document.createElement("span");
    const label = document.createElement("span");
    button.type = "button";
    button.className = "choice-button";
    button.setAttribute("aria-label", `選択肢${index + 1}: ${choice}`);
    number.className = "choice-number";
    setText(number, index + 1);
    setText(label, choice);
    button.append(number, label);
    button.addEventListener("click", () => selectAnswer(index + 1, button));
    elements.choices.appendChild(button);
  });
}

function recordAnswer(question, isCorrect) {
  const category = question.category || "一般常識";
  const categoryRecord = playerStats.categoryStats[category] || { answered: 0, correct: 0 };
  categoryRecord.answered += 1;
  if (isCorrect) categoryRecord.correct += 1;
  playerStats.categoryStats[category] = categoryRecord;
  playerStats.totalAnswered += 1;
  if (isCorrect) {
    playerStats.totalCorrect += 1;
    delete playerStats.incorrectQuestions[String(question.id)];
  } else {
    playerStats.incorrectQuestions[String(question.id)] = question;
  }
  saveStats();
}

function selectAnswer(selectedNumber, selectedButton) {
  if (quizState.answered) return;
  quizState.answered = true;
  const question = quizState.questions[quizState.currentIndex];
  const choiceButtons = [...elements.choices.querySelectorAll(".choice-button")];
  const isCorrect = selectedNumber === question.correct;

  choiceButtons.forEach((button, index) => {
    button.disabled = true;
    if (index + 1 === question.correct) button.classList.add("correct");
  });

  elements.answerResult.classList.remove("correct-text", "incorrect-text");
  if (isCorrect) {
    quizState.correctCount += 1;
    quizState.currentCombo += 1;
    quizState.maxCombo = Math.max(quizState.maxCombo, quizState.currentCombo);
    setText(elements.answerResult, "正解！ 🎉");
    elements.answerResult.classList.add("correct-text");
  } else {
    quizState.currentCombo = 0;
    selectedButton.classList.add("incorrect");
    setText(elements.answerResult, "残念、不正解です");
    elements.answerResult.classList.add("incorrect-text");
  }

  recordAnswer(question, isCorrect);
  setText(elements.currentScore, calculateScore());
  setText(elements.comboCount, quizState.currentCombo);
  elements.comboBadge.hidden = quizState.currentCombo < 2;
  setText(elements.answerExplanation, question.explanation || "解説はありません。");
  elements.answerFeedback.hidden = false;
  elements.nextButton.hidden = false;
  setText(
    elements.nextButton,
    quizState.currentIndex === quizState.questions.length - 1 ? "結果を見る" : "次の問題へ",
  );
  elements.nextButton.focus();
}

function goToNextQuestion() {
  if (!quizState.answered) return;
  quizState.currentIndex += 1;
  if (quizState.currentIndex >= quizState.questions.length) {
    showResult();
    return;
  }
  showQuestion();
}

function showResult() {
  const total = quizState.questions.length;
  const score = calculateScore();
  const [title, comment] = getTitleForScore(score);

  if (!quizState.statsRecorded) {
    playerStats.attempts += 1;
    playerStats.bestScore = Math.max(playerStats.bestScore, score);
    playerStats.maxCombo = Math.max(playerStats.maxCombo, quizState.maxCombo);
    quizState.statsRecorded = true;
    saveStats();
  }

  setText(elements.finalScore, score);
  setText(elements.finalCorrect, quizState.correctCount);
  setText(elements.finalTotal, total);
  setText(elements.finalRate, `${score}%`);
  setText(elements.resultTitleBadge, title);
  setText(elements.resultComment, comment);
  elements.scoreForm.hidden = quizState.mode === "review";
  elements.resultModeMessage.hidden = quizState.mode !== "review";
  if (quizState.mode === "review") {
    setText(elements.resultModeMessage, "復習チャレンジはランキング対象外です。");
  }
  const reviewCount = Object.keys(playerStats.incorrectQuestions).length;
  setText(elements.reviewWrongButton, `間違えた問題に再挑戦（${reviewCount}問）`);
  elements.reviewWrongButton.disabled = reviewCount === 0;
  showScreen("result");
  if (quizState.mode === "normal") elements.playerName.focus();
}

function validatePlayerName(rawName) {
  const playerName = rawName.trim();
  if (playerName.length === 0) return "プレイヤー名を入力してください。";
  if (playerName.length > 20) return "プレイヤー名は20文字以内で入力してください。";
  return "";
}

async function saveScore(event) {
  event.preventDefault();
  if (!requireAuthentication()) return;
  if (quizState.mode === "review" || quizState.scoreSaved || elements.saveScoreButton.disabled) return;
  const playerName = elements.playerName.value.trim();
  const validationMessage = validatePlayerName(playerName);
  setText(elements.nameError, validationMessage);
  elements.nameError.hidden = !validationMessage;
  elements.saveMessage.hidden = true;
  if (validationMessage) {
    elements.playerName.focus();
    return;
  }

  elements.saveScoreButton.disabled = true;
  setText(elements.saveScoreButton, "登録中...");
  showLoading(true, "スコアを登録しています...");
  showError("");
  try {
    await apiRequest({
      mode: "saveScore",
      playerName,
      score: calculateScore(),
      correctCount: quizState.correctCount,
      totalQuestions: quizState.questions.length,
    });
    quizState.scoreSaved = true;
    setText(elements.saveMessage, "スコアを登録しました！ホームへ戻ります...");
    elements.saveMessage.hidden = false;
    setText(elements.saveScoreButton, "登録済み");
    window.setTimeout(() => showScreen("start"), 1200);
  } catch (error) {
    showError(error.message || "スコアの登録に失敗しました。");
    elements.saveScoreButton.disabled = false;
    setText(elements.saveScoreButton, "スコアを登録する");
  } finally {
    showLoading(false);
  }
}

function findWeakCategory() {
  const categories = Object.entries(playerStats.categoryStats)
    .filter(([, value]) => Number(value.answered) > 0)
    .map(([name, value]) => ({
      name,
      accuracy: Number(value.correct) / Number(value.answered),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
  return categories.length > 0 ? categories[0].name : "まだ記録がありません";
}

function showStats() {
  if (!requireAuthentication()) return;
  const accuracy = playerStats.totalAnswered > 0
    ? Math.round((playerStats.totalCorrect / playerStats.totalAnswered) * 100)
    : 0;
  const reviewCount = Object.keys(playerStats.incorrectQuestions).length;
  setText(elements.statsAttempts, `${playerStats.attempts}回`);
  setText(elements.statsBestScore, `${playerStats.bestScore}点`);
  setText(elements.statsAccuracy, `${accuracy}%`);
  setText(elements.statsMaxCombo, playerStats.maxCombo);
  setText(elements.statsTotalAnswered, `${playerStats.totalAnswered}問`);
  setText(elements.statsReviewCount, `${reviewCount}問`);
  setText(elements.statsWeakCategory, findWeakCategory());
  elements.statsReviewButton.disabled = reviewCount === 0;
  showScreen("stats");
}

async function fetchRanking() {
  const data = await apiRequest({ mode: "getRanking" });
  return Array.isArray(data.ranking) ? data.ranking : [];
}

async function showRanking() {
  if (!requireAuthentication()) return;
  showScreen("ranking");
  elements.rankingBody.replaceChildren();
  elements.rankingEmpty.hidden = true;
  showLoading(true, "ランキングを取得しています...");
  try {
    const ranking = await fetchRanking();
    if (ranking.length === 0) {
      elements.rankingEmpty.hidden = false;
      return;
    }
    ranking.forEach((record) => {
      const row = document.createElement("tr");
      const values = [
        record.rank,
        record.playerName,
        `${record.score}点`,
        `${record.correctCount}/${record.totalQuestions}問`,
        record.timestamp,
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        setText(cell, value);
        row.appendChild(cell);
      });
      elements.rankingBody.appendChild(row);
    });
  } catch (error) {
    showError(error.message || "ランキングの取得に失敗しました。");
  } finally {
    showLoading(false);
  }
}

function jsonpRequest(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `quizJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const requestParams = new URLSearchParams(params);
    requestParams.set("callback", callbackName);
    const timerId = window.setTimeout(() => {
      cleanup();
      reject(new Error("通信がタイムアウトしました。時間をおいて再度お試しください。"));
    }, API_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timerId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (response) => {
      cleanup();
      if (!response || response.success !== true) {
        reject(new Error(response?.message || "GASでエラーが発生しました。"));
        return;
      }
      resolve(response.data || {});
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("通信に失敗しました。GASの公開設定とURLを確認してください。"));
    };
    script.src = `${GAS_WEB_APP_URL}?${requestParams.toString()}`;
    document.head.appendChild(script);
  });
}

async function apiRequest(params) {
  const requestParams = new URLSearchParams(params);
  const mode = requestParams.get("mode") || requestParams.get("action");
  if (mode) {
    requestParams.set("mode", mode);
    requestParams.set("action", mode);
  }
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?${requestParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`通信エラーが発生しました（HTTP ${response.status}）。`);
    const result = await response.json();
    if (!result || result.success !== true) {
      throw new Error(result?.message || "GASでエラーが発生しました。");
    }
    return result.data || {};
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("通信がタイムアウトしました。時間をおいて再度お試しください。");
    }
    if (error instanceof TypeError || error.message === "Failed to fetch") {
      return jsonpRequest(Object.fromEntries(requestParams.entries()));
    }
    throw error;
  } finally {
    window.clearTimeout(timerId);
  }
}

elements.startButton.addEventListener("click", startQuiz);
elements.reviewButton.addEventListener("click", startReviewQuiz);
elements.statsButton.addEventListener("click", showStats);
elements.startRankingButton.addEventListener("click", showRanking);
elements.nextButton.addEventListener("click", goToNextQuestion);
elements.quizHomeButton.addEventListener("click", () => showScreen("start"));
elements.scoreForm.addEventListener("submit", saveScore);
elements.retryButton.addEventListener("click", startQuiz);
elements.reviewWrongButton.addEventListener("click", startReviewQuiz);
elements.resultStatsButton.addEventListener("click", showStats);
elements.resultRankingButton.addEventListener("click", showRanking);
elements.skipSaveHomeButton.addEventListener("click", () => showScreen("start"));
elements.statsReviewButton.addEventListener("click", startReviewQuiz);
elements.statsTopButton.addEventListener("click", () => showScreen("start"));
elements.topButton.addEventListener("click", () => showScreen("start"));

window.quizApp = Object.freeze({ isAuthenticated, setAuthState, showScreen });
updateHomeStats();
Object.values(screens).forEach((screen) => {
  screen.hidden = true;
});
showLoading(true, "ログイン状態を確認しています...");
