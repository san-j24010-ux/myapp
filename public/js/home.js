/* home.js */
import { createProductCard, getUrlParams } from './app.js';

const dummyProducts = generateDummyProducts(100);

function generateDummyProducts(count) {
  const names = [
    'オーバーサイズパーカー', 'レザーミニスカート', 'ワイドデニムパンツ', 'フーデッドニットコート',
    'ボリュームスリーブシャツ', 'ベルト付きワイドパンツ', 'メタリックチェーンバッグ', 'ワントーンスニーカー',
    'クロップドジャケット', 'テクスチャーニット', 'アシンメトリースカート', 'カジュアルトレンチ',
    'ストリートキャップ', 'サテンワンピース', 'スリムテーラード', 'レイヤードロングT',
    'バイカラーカーデ', 'フェイクレザートラウザー', 'スエードブーツ', 'グラフィックTシャツ'
  ];
  const brands = ['NIKE', 'UNIQLO', 'ZARA', 'GU', 'H&M', 'MOUSSY', 'CONVERSE', 'BEAMS', 'ADIDAS', 'AMERICAN EAGLE'];
  const shops = ['Rakuten', 'Yahoo!ショッピング', 'ZOZOTOWN'];
  const images = [
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1495121605193-b116b5b9c5d1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1520975911071-72d36a5b2e31?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519741491538-6b34c2036444?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'
  ];

  return Array.from({ length: count }, (_, index) => {
    const name = names[index % names.length];
    const brand = brands[index % brands.length];
    const shop = shops[index % shops.length];
    const imageUrl = images[index % images.length];
    const price = (Math.floor(30 + (index % 35)) * 100).toLocaleString();
    return {
      id: `product-${String(index + 1).padStart(3, '0')}`,
      name: `${brand} ${name}`,
      price: `¥${price}`,
      brand,
      shop,
      imageUrl,
    };
  });
}

const popularKeywords = ['モード', 'ストリート', 'Y2K', 'ガーリー', 'アメカジ'];

const todayPick = document.getElementById('today-pick');
const keywordList = document.getElementById('popular-keywords');

function renderTodayPick() {
  todayPick.innerHTML = '';
  dummyProducts.forEach(product => {
    todayPick.appendChild(createProductCard(product));
  });
}

function renderKeywords() {
  popularKeywords.forEach(keyword => {
    const item = document.createElement('li');
    item.textContent = keyword;
    keywordList.appendChild(item);
  });
}

function applyQueryFromUrl() {
  const params = getUrlParams();
  const style = params.get('style');
  if (style) {
    const keywordElement = document.createElement('div');
    keywordElement.className = 'notification';
    keywordElement.textContent = `${style} の検索結果を表示しています。（ダミー表示）`;
    document.querySelector('.container').prepend(keywordElement);
  }
}

renderTodayPick();
renderKeywords();
applyQueryFromUrl();
