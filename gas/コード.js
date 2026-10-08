const SPREADSHEET_ID = '1RaQFZR4cWZ1x6zMjRgkvbm55aTKqzCtzXn7oVKy2U6k';
const RAKUTEN_APP_ID = 'fdc4ab2d-ac17-4fe3-99e0-51ed09b51238';
const RAKUTEN_ACCESS_KEY = PropertiesService.getScriptProperties()
  .getProperty('RAKUTEN_ACCESS_KEY');
const APP_ORIGIN = 'https://myapp-9us.pages.dev';

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
    case 'keywords':
      result = getKeywords();
      break;
    default:
      result = { success: true, message: 'StyleFinder GAS endpoint', mode };
  }

  return createJsonOutput(result, e.parameter && e.parameter.callback);
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
  const keyword = params.keyword || params.style || params.vibe || '';
  const minPrice = params.minPrice || '';
  const maxPrice = params.maxPrice || '';
  const gender = params.gender || '';

  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) {
    return {
      success: false,
      error: 'Rakuten Application ID or Access Key is not configured.',
      items: [],
    };
  }

  const endpoint = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
  const queryParams = {
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    format: 'json',
    formatVersion: 2,
    keyword: keyword || 'ファッション',
    hits: 30,
    page: 1,
    imageFlag: 1,
    availability: 1,
  };

  if (minPrice) {
    queryParams.minPrice = minPrice;
  }
  if (maxPrice) {
    queryParams.maxPrice = maxPrice;
  }

  const fetchPage = (page) => {
    const pageParams = { ...queryParams, page };
    const paramString = Object.keys(pageParams)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(pageParams[key])}`)
      .join('&');
    const response = UrlFetchApp.fetch(`${endpoint}?${paramString}`, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        Referer: `${APP_ORIGIN}/`,
        Origin: APP_ORIGIN,
      },
    });
    return JSON.parse(response.getContentText());
  };

  const payload = fetchPage(1);

  if (payload.error || payload.errors) {
    return {
      success: false,
      error: payload.error_description || JSON.stringify(payload.error || payload.errors),
      items: [],
    };
  }

  let rawItems = payload.items || payload.Items || [];
  if (Number(payload.pageCount) > 1) {
    Utilities.sleep(1100);
    const nextPayload = fetchPage(2);
    if (!nextPayload.error && !nextPayload.errors) {
      rawItems = rawItems.concat(nextPayload.items || nextPayload.Items || []);
    }
  }

  const items = rawItems.map((itemWrapper) => {
    const item = itemWrapper.item || itemWrapper.Item || itemWrapper;
    const sourceImageUrl = item.mediumImageUrls
      && item.mediumImageUrls[0]
      && (item.mediumImageUrls[0].imageUrl || item.mediumImageUrls[0]);
    return {
      id: item.itemCode,
      name: item.itemName,
      price: `¥${Number(item.itemPrice).toLocaleString()}`,
      brand: item.shopName,
      shop: 'Rakuten',
      imageUrl: sourceImageUrl && sourceImageUrl.replace(/_ex=128x128/, '_ex=600x600'),
      itemUrl: item.itemUrl,
    };
  });

  return {
    success: true,
    items,
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

const getKeywords = () => {
  const sheet = getSheet('keywords');
  const values = sheet.getDataRange().getValues();
  const items = values.slice(1).map((row) => ({ keyword: row[0] }));
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

const getSpreadsheet = () => {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== 'PUT_YOUR_SPREADSHEET_ID_HERE') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
};

const getSheet = (name) => {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(name);
  if (sheet) {
    return sheet;
  }
  return spreadsheet.insertSheet(name);
};

const createJsonOutput = (payload, callback) => {
  const output = ContentService.createTextOutput();
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    output.setContent(`${callback}(${JSON.stringify(payload)});`);
    return output;
  }
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(payload));
  return output;
};
