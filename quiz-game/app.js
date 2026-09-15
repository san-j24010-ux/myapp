"use strict";

// GASをWebアプリとしてデプロイしたURLです。
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwg0alV9GBUPBylCDX6kh4mi20UjcbBb9bO4F7ThGH_JcffaiZnwmGNPywnSCpzyAL0rA/exec";
const API_TIMEOUT_MS = 15000;
const MAX_QUESTIONS = 10;
const POINTS_PER_ANSWER = 10;

const screens = {
  start: document.getElementById("start-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen"),
  ranking: document.getElementById("ranking-screen"),
};

const elements = {
  loading: document.getElementById("loading"),
  loadingText: document.getElementById("loading-text"),
  errorMessage: document.getElementById("error-message"),
  startButton: document.getElementById("start-button"),
  startRankingButton: document.getElementById("start-ranking-button"),
  currentNumber: document.getElementById("current-number"),
  totalNumber: document.getElementById("total-number"),
  currentScore: document.getElementById("current-score"),
  progressBar: document.getElementById("progress-bar"),
  questionText: document.getElementById("question-text"),
  choices: document.getElementById("choices"),
  answerFeedback: document.getElementById("answer-feedback"),
  answerResult: document.getElementById("answer-result"),
  answerExplanation: document.getElementById("answer-explanation"),
  nextButton: document.getElementById("next-button"),
  finalScore: document.getElementById("final-score"),
  finalCorrect: document.getElementById("final-correct"),
  finalTotal: document.getElementById("final-total"),
  finalRate: document.getElementById("final-rate"),
  scoreForm: document.getElementById("score-form"),
  playerName: document.getElementById("player-name"),
  nameError: document.getElementById("name-error"),
  saveScoreButton: document.getElementById("save-score-button"),
  saveMessage: document.getElementById("save-message"),
  retryButton: document.getElementById("retry-button"),
  resultRankingButton: document.getElementById("result-ranking-button"),
  rankingBody: document.getElementById("ranking-body"),
  rankingEmpty: document.getElementById("ranking-empty"),
  topButton: document.getElementById("top-button"),
};

const quizState = {
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  answered: false,
  scoreSaved: false,
};

/** 指定した画面だけを表示します。 */
function showScreen(screenName) {
  Object.entries(screens).forEach(([name, screen]) => {
    screen.hidden = name !== screenName;
  });
  showError("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** 通信中表示を切り替えます。 */
function showLoading(isVisible, message = "通信中です...") {
  elements.loading.hidden = !isVisible;
  setText(elements.loadingText, message);
}

/** エラーメッセージを安全に表示します。 */
function showError(message) {
  setText(elements.errorMessage, message);
  elements.errorMessage.hidden = !message;
}

/** textContentを使って文字列を安全に表示します。 */
function setText(element, value) {
  element.textContent = String(value ?? "");
}

/** 配列をFisher-Yates法でシャッフルし、新しい配列を返します。 */
function shuffleArray(sourceArray) {
  const array = [...sourceArray];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

/** クイズの状態を初期化します。 */
function resetQuizState() {
  quizState.questions = [];
  quizState.currentIndex = 0;
  quizState.score = 0;
  quizState.correctCount = 0;
  quizState.answered = false;
  quizState.scoreSaved = false;
  elements.scoreForm.reset();
  elements.nameError.hidden = true;
  elements.saveMessage.hidden = true;
  elements.saveScoreButton.disabled = false;
  setText(elements.saveScoreButton, "スコアを登録する");
}

/** GASから問題を取得します。 */
async function fetchQuestions() {
  const data = await apiRequest({ mode: "getQuestions" });
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (questions.length === 0) {
    throw new Error("出題できる問題がありません。questionsシートを確認してください。");
  }
  return shuffleArray(questions).slice(0, MAX_QUESTIONS);
}

/** スタートボタンからクイズを開始します。 */
async function startQuiz() {
  if (elements.startButton.disabled) return;

  elements.startButton.disabled = true;
  showError("");
  showLoading(true, "問題を取得しています...");

  try {
    resetQuizState();
    quizState.questions = await fetchQuestions();
    showScreen("quiz");
    showQuestion();
  } catch (error) {
    showScreen("start");
    showError(error.message || "問題の取得に失敗しました。");
  } finally {
    showLoading(false);
    elements.startButton.disabled = false;
  }
}

/** 現在の問題を画面に表示します。 */
function showQuestion() {
  const question = quizState.questions[quizState.currentIndex];
  quizState.answered = false;

  setText(elements.currentNumber, quizState.currentIndex + 1);
  setText(elements.totalNumber, quizState.questions.length);
  setText(elements.currentScore, quizState.score);
  setText(elements.questionText, question.question);
  elements.progressBar.style.width = `${((quizState.currentIndex + 1) / quizState.questions.length) * 100}%`;
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

/** 選択した回答を採点して、正誤と解説を表示します。 */
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
    quizState.score += POINTS_PER_ANSWER;
    quizState.correctCount += 1;
    setText(elements.answerResult, "正解！ 🎉");
    elements.answerResult.classList.add("correct-text");
  } else {
    selectedButton.classList.add("incorrect");
    setText(elements.answerResult, "残念、不正解です");
    elements.answerResult.classList.add("incorrect-text");
  }

  setText(elements.currentScore, quizState.score);
  setText(elements.answerExplanation, question.explanation || "解説はありません。");
  elements.answerFeedback.hidden = false;
  elements.nextButton.hidden = false;
  setText(
    elements.nextButton,
    quizState.currentIndex === quizState.questions.length - 1 ? "結果を見る" : "次の問題へ",
  );
  elements.nextButton.focus();
}

/** 次の問題へ進むか、結果画面を表示します。 */
function goToNextQuestion() {
  if (!quizState.answered) return;

  quizState.currentIndex += 1;
  if (quizState.currentIndex >= quizState.questions.length) {
    showResult();
    return;
  }
  showQuestion();
}

/** クイズ結果を表示します。 */
function showResult() {
  const total = quizState.questions.length;
  const rate = total > 0 ? Math.round((quizState.correctCount / total) * 100) : 0;

  setText(elements.finalScore, quizState.score);
  setText(elements.finalCorrect, quizState.correctCount);
  setText(elements.finalTotal, total);
  setText(elements.finalRate, `${rate}%`);
  showScreen("result");
  elements.playerName.focus();
}

/** プレイヤー名を検証して、問題があればメッセージを返します。 */
function validatePlayerName(rawName) {
  const playerName = rawName.trim();
  if (playerName.length === 0) return "プレイヤー名を入力してください。";
  if (playerName.length > 20) return "プレイヤー名は20文字以内で入力してください。";
  return "";
}

/** 結果をGASへ送信してスプレッドシートに保存します。 */
async function saveScore(event) {
  event.preventDefault();
  if (quizState.scoreSaved || elements.saveScoreButton.disabled) return;

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
      score: quizState.score,
      correctCount: quizState.correctCount,
      totalQuestions: quizState.questions.length,
    });
    quizState.scoreSaved = true;
    setText(elements.saveMessage, "スコアを登録しました！");
    elements.saveMessage.hidden = false;
    setText(elements.saveScoreButton, "登録済み");
  } catch (error) {
    showError(error.message || "スコアの登録に失敗しました。");
    elements.saveScoreButton.disabled = false;
    setText(elements.saveScoreButton, "スコアを登録する");
  } finally {
    showLoading(false);
  }
}

/** GASからランキングを取得します。 */
async function fetchRanking() {
  const data = await apiRequest({ mode: "getRanking" });
  return Array.isArray(data.ranking) ? data.ranking : [];
}

/** ランキング画面を表示します。 */
async function showRanking() {
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

/** fetchがCORSで失敗した場合に使うJSONP通信です。 */
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

/** GASへGETリクエストを送り、共通形式のdataを返します。 */
async function apiRequest(params) {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("ここに")) {
    throw new Error("app.jsにGASのWebアプリURLを設定してください。");
  }

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
    if (!response.ok) {
      throw new Error(`通信エラーが発生しました（HTTP ${response.status}）。`);
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("GASから受け取ったデータを解析できませんでした。");
    }

    if (!result || result.success !== true) {
      throw new Error(result?.message || "GASでエラーが発生しました。");
    }
    return result.data || {};
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("通信がタイムアウトしました。時間をおいて再度お試しください。");
    }
    // Cloudflare PagesからGASへのfetchがCORSで拒否された場合にJSONPへ切り替えます。
    if (error instanceof TypeError || error.message === "Failed to fetch") {
      return jsonpRequest(Object.fromEntries(requestParams.entries()));
    }
    throw error;
  } finally {
    window.clearTimeout(timerId);
  }
}

elements.startButton.addEventListener("click", startQuiz);
elements.startRankingButton.addEventListener("click", showRanking);
elements.nextButton.addEventListener("click", goToNextQuestion);
elements.scoreForm.addEventListener("submit", saveScore);
elements.retryButton.addEventListener("click", startQuiz);
elements.resultRankingButton.addEventListener("click", showRanking);
elements.topButton.addEventListener("click", () => showScreen("start"));

showScreen("start");
