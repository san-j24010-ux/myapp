const doGet = (e) => {
  const mode = (e.parameter && e.parameter.mode) || 'default';
  let result = { success: false, mode, items: [] };

  switch (mode) {
    case 'search':
      result = searchItems(e.parameter);
      break;
    case 'favorites':
      result = getFavorites();
      break;
    case 'rankings':
      result = getRankings();
      break;
    default:
      result = { success: true, message: 'StyleFinder GAS endpoint', mode };
  }

  return createJsonOutput(result);
};

const doPost = (e) => {
  const params = JSON.parse(e.postData.contents || '{}');
  const mode = params.mode || 'default';
  let result = { success: false, mode };

  switch (mode) {
    case 'saveFavorite':
      result = saveFavorite(params.item);
      break;
    case 'logSearch':
      result = logSearch(params.keyword);
      break;
    default:
      result = { success: false, message: 'Unsupported mode', mode };
  }

  return createJsonOutput(result);
};

const searchItems = (params) => {
  const dummyItems = [
    { id: 'item-001', name: 'ダークストリートジャケット', price: '¥12,800', brand: 'H&M', shop: 'Rakuten', imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80' },
    { id: 'item-002', name: 'Y2K シルバーネックレス', price: '¥3,490', brand: 'ZARA', shop: 'Yahoo!ショッピング', imageUrl: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5d1?auto=format&fit=crop&w=1000&q=80' },
    { id: 'item-003', name: 'ブラックレザーシューズ', price: '¥9,700', brand: 'CONVERSE', shop: 'Rakuten', imageUrl: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1000&q=80' },
  ];

  return {
    success: true,
    items: dummyItems,
    query: params,
  };
};

const getFavorites = () => {
  const sheet = getSheet('favorites');
  const values = sheet.getDataRange().getValues();
  const items = values.slice(1).map((row) => ({
    id: row[0],
    name: row[1],
    price: row[2],
    brand: row[3],
    shop: row[4],
    imageUrl: row[5],
  }));

  return { success: true, items };
};

const getRankings = () => {
  const sheet = getSheet('rankings');
  const values = sheet.getDataRange().getValues();
  const items = values.slice(1).map((row) => ({
    rank: row[0],
    name: row[1],
    brand: row[2],
    count: row[3],
  }));

  return { success: true, items };
};

const saveFavorite = (item) => {
  const sheet = getSheet('favorites');
  sheet.appendRow([item.id, item.name, item.price, item.brand, item.shop, item.imageUrl, new Date()]);
  return { success: true, item };
};

const logSearch = (keyword) => {
  const sheet = getSheet('logs');
  sheet.appendRow([new Date(), keyword]);
  return { success: true };
};

const getSheet = (name) => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(name);
  if (sheet) {
    return sheet;
  }
  return spreadsheet.insertSheet(name);
};

const createJsonOutput = (payload) => {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(payload));
  return output;
};
