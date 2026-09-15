const SPREADSHEET_ID = '1RaQFZR4cWZ1x6zMjRgkvbm55aTKqzCtzXn7oVKy2U6k';
const QUESTIONS_SHEET_NAME = 'questions';
const SCORES_SHEET_NAME = 'scores';
const TIME_ZONE = 'Asia/Tokyo';
const QUESTION_HEADERS = [
  'id', 'question', 'choice1', 'choice2', 'choice3', 'choice4',
  'correct', 'explanation', 'enabled', 'category', 'difficulty',
];

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
        response = getQuestions_(params);
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
function getQuestions_(params) {
  const sheet = ensureQuestionData_();
  const values = sheet.getDataRange().getValues();
  const categoryFilter = String(params.category || 'all').trim();
  const difficultyFilter = String(params.difficulty || 'all').trim();

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
    const category = String(row[9] || '一般常識').trim();
    const difficulty = String(row[10] || 'ふつう').trim();
    const hasRequiredValues = id !== ''
      && question !== ''
      && choices.every(function(choice) { return choice !== ''; })
      && explanation !== '';

    const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || difficulty === difficultyFilter;

    if (!enabled || !hasRequiredValues || !matchesCategory || !matchesDifficulty
      || !Number.isInteger(correct) || correct < 1 || correct > 4) {
      return result;
    }

    result.push({
      id: id,
      question: question,
      choices: choices,
      correct: correct,
      explanation: explanation,
      category: category,
      difficulty: difficulty,
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
  const questionsSheet = ensureQuestionData_();
  const scoresSheet = getOrCreateSheet_(spreadsheet, SCORES_SHEET_NAME);
  const scoreHeaders = ['timestamp', 'playerName', 'score', 'correctCount', 'totalQuestions'];

  setHeaders_(scoresSheet, scoreHeaders);

  questionsSheet.setFrozenRows(1);
  scoresSheet.setFrozenRows(1);
  questionsSheet.getRange(1, 1, 1, QUESTION_HEADERS.length).setFontWeight('bold');
  scoresSheet.getRange(1, 1, 1, scoreHeaders.length).setFontWeight('bold');
  questionsSheet.setColumnWidth(1, 70);
  questionsSheet.setColumnWidth(2, 340);
  questionsSheet.setColumnWidths(3, 4, 150);
  questionsSheet.setColumnWidth(7, 80);
  questionsSheet.setColumnWidth(8, 360);
  questionsSheet.setColumnWidth(9, 90);
  questionsSheet.setColumnWidths(10, 2, 120);
  scoresSheet.setColumnWidth(1, 170);
  scoresSheet.setColumnWidth(2, 180);
  scoresSheet.setColumnWidths(3, 3, 120);
  scoresSheet.getRange('A:A').setNumberFormat('yyyy/MM/dd HH:mm:ss');

  SpreadsheetApp.flush();
  console.log('初期設定が完了しました。');
}

/** questionsシートへ新しい列と不足しているサンプル問題を自動追加します。 */
function ensureQuestionData_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateSheet_(spreadsheet, QUESTIONS_SHEET_NAME);
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    setHeaders_(sheet, QUESTION_HEADERS);

    const existingIds = sheet.getLastRow() <= 1
      ? []
      : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
        .getValues()
        .map(function(row) { return String(row[0]); });
    const missingSamples = SAMPLE_QUESTIONS.filter(function(question) {
      return existingIds.indexOf(String(question[0])) === -1;
    });

    if (missingSamples.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, missingSamples.length, QUESTION_HEADERS.length)
        .setValues(missingSamples);
    }

    const dataRowCount = Math.max(0, sheet.getLastRow() - 1);
    if (dataRowCount > 0) {
      const rows = sheet.getRange(2, 1, dataRowCount, QUESTION_HEADERS.length).getValues();
      const sampleMap = {};
      SAMPLE_QUESTIONS.forEach(function(sample) {
        sampleMap[String(sample[0])] = sample;
      });
      let needsMetadataUpdate = false;
      const metadata = rows.map(function(row) {
        const sample = sampleMap[String(row[0])];
        const category = String(row[9] || (sample && sample[9]) || '一般常識').trim();
        const difficulty = String(row[10] || (sample && sample[10]) || 'ふつう').trim();
        if (!row[9] || !row[10]) needsMetadataUpdate = true;
        return [category, difficulty];
      });
      if (needsMetadataUpdate) {
        sheet.getRange(2, 10, dataRowCount, 2).setValues(metadata);
      }
    }
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return sheet;
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
  if (score > 100) return 'スコアが上限を超えています。';
  if (score !== Math.round((correctCount / totalQuestions) * 100)) {
    return 'スコアと正解数が一致しません。';
  }
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
  [1, '日本で最も高い山はどれ？', '富士山', '北岳', '槍ヶ岳', '高尾山', 1, '富士山は標高3,776メートルで、日本で最も高い山です。', true, '地理', 'かんたん'],
  [2, '世界で最も大きい海洋はどれ？', '大西洋', 'インド洋', '太平洋', '北極海', 3, '太平洋は地球上で最も広い海洋です。', true, '地理', 'ふつう'],
  [3, '1年は通常何日？', '360日', '365日', '366日', '370日', 2, '通常の年は365日で、うるう年は366日です。', true, '一般常識', 'かんたん'],
  [4, '植物が光を使って栄養を作る働きを何という？', '呼吸', '発酵', '蒸散', '光合成', 4, '植物は光合成によって光エネルギーを利用し、栄養を作ります。', true, '科学', 'ふつう'],
  [5, '日本の国鳥はどれ？', 'キジ', 'ツル', 'スズメ', 'トキ', 1, 'キジは1947年に日本鳥学会によって国鳥に選ばれました。', true, '一般常識', 'むずかしい'],
  [6, '水が凍る温度は、摂氏何度？', '0度', '10度', '32度', '100度', 1, '標準的な気圧では、水は摂氏0度で凍ります。', true, '科学', 'かんたん'],
  [7, 'オリンピックの五輪マークに使われている輪はいくつ？', '4つ', '5つ', '6つ', '7つ', 2, '五輪マークは5つの輪で構成されています。', true, 'スポーツ', 'かんたん'],
  [8, '地球の衛星はどれ？', '太陽', '月', '火星', '金星', 2, '月は地球の周りを回る天然の衛星です。', true, '科学', 'かんたん'],
  [9, '日本の都道府県はいくつ？', '43', '45', '47', '49', 3, '日本には1都1道2府43県、合計47都道府県があります。', true, '地理', 'かんたん'],
  [10, '「百獣の王」と呼ばれる動物はどれ？', 'ゾウ', 'ライオン', 'トラ', 'キリン', 2, 'ライオンは強さや堂々とした姿から「百獣の王」と呼ばれます。', true, '一般常識', 'かんたん'],
  [11, '虹の色は日本では一般に何色とされる？', '5色', '6色', '7色', '8色', 3, '日本では虹は一般に7色とされています。', true, '科学', 'ふつう'],
  [12, '太陽系で最も大きい惑星はどれ？', '地球', '土星', '木星', '海王星', 3, '木星は太陽系で最も大きい惑星です。', true, '科学', 'むずかしい'],
  [13, '鎌倉幕府を開いた人物は誰？', '源頼朝', '徳川家康', '足利尊氏', '豊臣秀吉', 1, '源頼朝は鎌倉に武家政権を築きました。', true, '歴史', 'かんたん'],
  [14, '江戸幕府を開いた人物は誰？', '織田信長', '徳川家康', '坂本龍馬', '西郷隆盛', 2, '徳川家康は1603年に征夷大将軍となり、江戸幕府を開きました。', true, '歴史', 'かんたん'],
  [15, '大正時代の直前の時代はどれ？', '江戸時代', '昭和時代', '明治時代', '平成時代', 3, '明治時代の次に大正時代が始まりました。', true, '歴史', 'ふつう'],
  [16, '本能寺の変で討たれた武将は誰？', '武田信玄', '上杉謙信', '織田信長', '伊達政宗', 3, '織田信長は1582年、本能寺の変で明智光秀に攻められました。', true, '歴史', 'むずかしい'],
  [17, '邪馬台国の女王として知られる人物は誰？', '紫式部', '卑弥呼', '北条政子', '推古天皇', 2, '卑弥呼は中国の歴史書にも記された邪馬台国の女王です。', true, '歴史', 'むずかしい'],
  [18, '豆腐の主な原料はどれ？', '小麦', '大豆', '米', 'そば', 2, '豆腐は大豆から作られます。', true, '食べ物', 'かんたん'],
  [19, '寿司で「シャリ」と呼ばれるものはどれ？', '魚', '酢飯', '海苔', 'わさび', 2, '寿司では酢飯のことをシャリと呼びます。', true, '食べ物', 'かんたん'],
  [20, 'みその主な原料として使われるものはどれ？', '大豆', 'じゃがいも', 'りんご', '牛乳', 1, 'みそは主に大豆、こうじ、塩から作られます。', true, '食べ物', 'ふつう'],
  [21, 'パスタ料理の本場として知られる国はどこ？', 'イタリア', 'インド', 'メキシコ', 'タイ', 1, 'パスタはイタリアを代表する料理の一つです。', true, '食べ物', 'ふつう'],
  [22, 'チョコレートの主原料はどれ？', 'コーヒー豆', 'カカオ豆', '小豆', '大豆', 2, 'チョコレートはカカオ豆を加工して作られます。', true, '食べ物', 'むずかしい'],
  [23, '野球で守備につく選手は1チーム何人？', '7人', '8人', '9人', '11人', 3, '野球では1チーム9人が守備につきます。', true, 'スポーツ', 'かんたん'],
  [24, 'サッカーで試合開始時に出場する選手は1チーム何人？', '9人', '10人', '11人', '12人', 3, 'サッカーは通常、1チーム11人で試合を行います。', true, 'スポーツ', 'かんたん'],
  [25, 'マラソンの正式な距離はどれ？', '40km', '41.195km', '42.195km', '43km', 3, 'マラソンの正式距離は42.195kmです。', true, 'スポーツ', 'むずかしい'],
  [26, 'ウィンブルドン選手権で行われるスポーツはどれ？', 'ゴルフ', 'テニス', 'ラグビー', '卓球', 2, 'ウィンブルドン選手権はテニスの四大大会の一つです。', true, 'スポーツ', 'むずかしい'],
  [27, '日本で面積が最も大きい都道府県はどこ？', '長野県', '岩手県', '北海道', '福島県', 3, '北海道は日本の都道府県で最も広い面積を持ちます。', true, '地理', 'かんたん'],
  [28, '日本で面積が最も小さい都道府県はどこ？', '大阪府', '東京都', '沖縄県', '香川県', 4, '香川県は日本の都道府県で最も小さい面積です。', true, '地理', 'むずかしい'],
  [29, '七夕は一般に何月何日に行われる？', '1月7日', '3月3日', '7月7日', '9月9日', 3, '七夕は一般に7月7日の行事として知られています。', true, '一般常識', 'かんたん'],
  [30, '1ダースはいくつ？', '10個', '12個', '20個', '24個', 2, '1ダースは12個を表します。', true, '一般常識', 'かんたん'],
];
