const SPREADSHEET_ID = '1RaQFZR4cWZ1x6zMjRgkvbm55aTKqzCtzXn7oVKy2U6k';
const QUESTIONS_SHEET_NAME = 'questions';
const SCORES_SHEET_NAME = 'scores';
const TIME_ZONE = 'Asia/Tokyo';

/**
 * WebアプリのGETリクエストを処理します。
 * actionとmodeのどちらでも同じ処理を呼び出せます。
 */
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = params.mode || params.action || '';

  try {
    let response;
    switch (mode) {
      case 'getQuestions':
        response = getQuestions_();
        break;
      case 'saveScore':
        response = saveScore_(params);
        break;
      case 'getRanking':
        response = getRanking_();
        break;
      default:
        response = createFailure_('actionまたはmodeが正しくありません。');
        break;
    }
    return createJsonResponse_(response, params.callback);
  } catch (error) {
    console.error(error);
    return createJsonResponse_(createFailure_('サーバー処理中にエラーが発生しました。'), params.callback);
  }
}

/** enabledがTRUEで、必要な値がそろった問題だけを返します。 */
function getQuestions_() {
  const sheet = getRequiredSheet_(QUESTIONS_SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return createFailure_('questionsシートに問題が登録されていません。');
  }

  const questions = values.slice(1).reduce(function(result, row) {
    const id = row[0];
    const question = String(row[1] || '').trim();
    const choices = [row[2], row[3], row[4], row[5]].map(function(value) {
      return String(value || '').trim();
    });
    const correct = Number(row[6]);
    const explanation = String(row[7] || '').trim();
    const enabled = row[8] === true || String(row[8]).toUpperCase() === 'TRUE';
    const hasRequiredValues = id !== ''
      && question !== ''
      && choices.every(function(choice) { return choice !== ''; })
      && explanation !== '';

    if (!enabled || !hasRequiredValues || !Number.isInteger(correct) || correct < 1 || correct > 4) {
      return result;
    }

    result.push({
      id: id,
      question: question,
      choices: choices,
      correct: correct,
      explanation: explanation,
    });
    return result;
  }, []);

  if (questions.length === 0) {
    return createFailure_('出題できる有効な問題がありません。');
  }

  return createSuccess_({ questions: questions });
}

/** 入力値を検証してscoresシートへ保存します。 */
function saveScore_(params) {
  const playerName = String(params.playerName || '').trim();
  const score = toInteger_(params.score);
  const correctCount = toInteger_(params.correctCount);
  const totalQuestions = toInteger_(params.totalQuestions);
  const validationMessage = validateScore_(playerName, score, correctCount, totalQuestions);

  if (validationMessage) {
    return createFailure_(validationMessage);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getRequiredSheet_(SCORES_SHEET_NAME);
    sheet.appendRow([
      new Date(),
      sanitizeNameForSheet_(playerName),
      score,
      correctCount,
      totalQuestions,
    ]);
  } catch (error) {
    console.error(error);
    return createFailure_('スコアを保存できませんでした。時間をおいて再度お試しください。');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return createSuccess_({ saved: true });
}

/** scoresシートを並べ替え、上位10件を返します。 */
function getRanking_() {
  const sheet = getRequiredSheet_(SCORES_SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return createSuccess_({ ranking: [] });
  }

  const records = values.slice(1).reduce(function(result, row) {
    const timestamp = row[0];
    const playerName = restoreStoredName_(String(row[1] || ''));
    const score = Number(row[2]);
    const correctCount = Number(row[3]);
    const totalQuestions = Number(row[4]);

    if (!(timestamp instanceof Date)
      || !playerName
      || !Number.isInteger(score)
      || !Number.isInteger(correctCount)
      || !Number.isInteger(totalQuestions)) {
      return result;
    }

    result.push({
      timestampValue: timestamp.getTime(),
      timestamp: Utilities.formatDate(timestamp, TIME_ZONE, 'yyyy/MM/dd HH:mm'),
      playerName: playerName,
      score: score,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
    });
    return result;
  }, []);

  records.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.timestampValue - b.timestampValue;
  });

  const ranking = records.slice(0, 10).map(function(record, index) {
    return {
      rank: index + 1,
      playerName: record.playerName,
      score: record.score,
      correctCount: record.correctCount,
      totalQuestions: record.totalQuestions,
      timestamp: record.timestamp,
    };
  });

  return createSuccess_({ ranking: ranking });
}

/** スプレッドシートとサンプル問題を初期設定します。 */
function setupSpreadsheet() {
  const spreadsheet = getSpreadsheet_();
  const questionsSheet = getOrCreateSheet_(spreadsheet, QUESTIONS_SHEET_NAME);
  const scoresSheet = getOrCreateSheet_(spreadsheet, SCORES_SHEET_NAME);
  const questionHeaders = [
    'id', 'question', 'choice1', 'choice2', 'choice3', 'choice4',
    'correct', 'explanation', 'enabled',
  ];
  const scoreHeaders = ['timestamp', 'playerName', 'score', 'correctCount', 'totalQuestions'];

  setHeaders_(questionsSheet, questionHeaders);
  setHeaders_(scoresSheet, scoreHeaders);

  const existingIds = questionsSheet.getLastRow() <= 1
    ? []
    : questionsSheet.getRange(2, 1, questionsSheet.getLastRow() - 1, 1)
      .getValues()
      .map(function(row) { return String(row[0]); });
  const missingSamples = SAMPLE_QUESTIONS.filter(function(question) {
    return existingIds.indexOf(String(question[0])) === -1;
  });

  if (missingSamples.length > 0) {
    questionsSheet
      .getRange(questionsSheet.getLastRow() + 1, 1, missingSamples.length, questionHeaders.length)
      .setValues(missingSamples);
  }

  questionsSheet.setFrozenRows(1);
  scoresSheet.setFrozenRows(1);
  questionsSheet.getRange(1, 1, 1, questionHeaders.length).setFontWeight('bold');
  scoresSheet.getRange(1, 1, 1, scoreHeaders.length).setFontWeight('bold');
  questionsSheet.setColumnWidth(1, 70);
  questionsSheet.setColumnWidth(2, 340);
  questionsSheet.setColumnWidths(3, 4, 150);
  questionsSheet.setColumnWidth(7, 80);
  questionsSheet.setColumnWidth(8, 360);
  questionsSheet.setColumnWidth(9, 90);
  scoresSheet.setColumnWidth(1, 170);
  scoresSheet.setColumnWidth(2, 180);
  scoresSheet.setColumnWidths(3, 3, 120);
  scoresSheet.getRange('A:A').setNumberFormat('yyyy/MM/dd HH:mm:ss');

  SpreadsheetApp.flush();
  console.log('初期設定が完了しました。');
}

/** スコア入力値を検証します。 */
function validateScore_(playerName, score, correctCount, totalQuestions) {
  if (playerName.length < 1 || playerName.length > 20) {
    return 'プレイヤー名は1文字以上20文字以内で入力してください。';
  }
  if (!Number.isInteger(score) || score < 0) return 'スコアは0以上の整数で指定してください。';
  if (!Number.isInteger(correctCount) || correctCount < 0) return '正解数は0以上の整数で指定してください。';
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1) return '問題数は1以上の整数で指定してください。';
  if (correctCount > totalQuestions) return '正解数は問題数以下にしてください。';
  if (score > totalQuestions * 10) return 'スコアが上限を超えています。';
  if (score !== correctCount * 10) return 'スコアと正解数が一致しません。';
  return '';
}

/** 文字列が整数を表す場合だけ数値へ変換します。 */
function toInteger_(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  const number = Number(value);
  return Number.isInteger(number) ? number : NaN;
}

/** 数式として評価される文字で始まる名前を無害化します。 */
function sanitizeNameForSheet_(playerName) {
  return /^[=+\-@]/.test(playerName) ? "'" + playerName : playerName;
}

/** ランキング表示時に、無害化用の先頭アポストロフィを除きます。 */
function restoreStoredName_(playerName) {
  return /^'[=+\-@]/.test(playerName) ? playerName.slice(1) : playerName;
}

/** スプレッドシートを取得します。 */
function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('スプレッドシートを取得できません。SPREADSHEET_IDを設定してください。');
  }
  return spreadsheet;
}

/** 必須シートを取得します。 */
function getRequiredSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(sheetName + 'シートがありません。setupSpreadsheetを実行してください。');
  return sheet;
}

/** シートがなければ作成します。 */
function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

/** 見出し行を設定します。 */
function setHeaders_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

/** 成功レスポンスを作成します。 */
function createSuccess_(data) {
  return { success: true, data: data || {} };
}

/** 失敗レスポンスを作成します。 */
function createFailure_(message) {
  return { success: false, message: message };
}

/** JSONまたはJSONP形式のレスポンスを作成します。 */
function createJsonResponse_(payload, callback) {
  const json = JSON.stringify(payload);
  const output = ContentService.createTextOutput();

  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return output
      .setMimeType(ContentService.MimeType.JAVASCRIPT)
      .setContent(callback + '(' + json + ');');
  }
  return output.setMimeType(ContentService.MimeType.JSON).setContent(json);
}

const SAMPLE_QUESTIONS = [
  [1, '日本で最も高い山はどれ？', '富士山', '北岳', '槍ヶ岳', '高尾山', 1, '富士山は標高3,776メートルで、日本で最も高い山です。', true],
  [2, '世界で最も大きい海洋はどれ？', '大西洋', 'インド洋', '太平洋', '北極海', 3, '太平洋は地球上で最も広い海洋です。', true],
  [3, '1年は通常何日？', '360日', '365日', '366日', '370日', 2, '通常の年は365日で、うるう年は366日です。', true],
  [4, '植物が光を使って栄養を作る働きを何という？', '呼吸', '発酵', '蒸散', '光合成', 4, '植物は光合成によって光エネルギーを利用し、栄養を作ります。', true],
  [5, '日本の国鳥はどれ？', 'キジ', 'ツル', 'スズメ', 'トキ', 1, 'キジは1947年に日本鳥学会によって国鳥に選ばれました。', true],
  [6, '水が凍る温度は、摂氏何度？', '0度', '10度', '32度', '100度', 1, '標準的な気圧では、水は摂氏0度で凍ります。', true],
  [7, 'オリンピックの五輪マークに使われている輪はいくつ？', '4つ', '5つ', '6つ', '7つ', 2, '五輪マークは5つの輪で構成されています。', true],
  [8, '地球の衛星はどれ？', '太陽', '月', '火星', '金星', 2, '月は地球の周りを回る天然の衛星です。', true],
  [9, '日本の都道府県はいくつ？', '43', '45', '47', '49', 3, '日本には1都1道2府43県、合計47都道府県があります。', true],
  [10, '「百獣の王」と呼ばれる動物はどれ？', 'ゾウ', 'ライオン', 'トラ', 'キリン', 2, 'ライオンは強さや堂々とした姿から「百獣の王」と呼ばれます。', true],
  [11, '虹の色は一般に何色とされる？', '5色', '6色', '7色', '8色', 3, '日本では虹は一般に7色とされています。', true],
  [12, '太陽系で最も大きい惑星はどれ？', '地球', '土星', '木星', '海王星', 3, '木星は太陽系で最も大きい惑星です。', true],
];
