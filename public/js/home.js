/* home.js */
import { createProductCard, getUrlParams } from './app.js';

const dummyProducts = [
  {
    id: 'product-001',
    name: 'グラフィックオーバーサイズパーカー',
    price: '¥8,900',
    brand: 'NEWTONE',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-002',
    name: 'レザーミニスカート',
    price: '¥6,200',
    brand: 'MOUSSY',
    shop: 'Yahoo!ショッピング',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-003',
    name: 'ワイドデニムパンツ',
    price: '¥5,400',
    brand: 'Lee',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-004',
    name: 'フーデッドニットコート',
    price: '¥13,500',
    brand: 'UNIQLO',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1520975911071-72d36a5b2e31?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-005',
    name: 'ボリュームスリーブシャツ',
    price: '¥7,200',
    brand: 'ZARA',
    shop: 'Yahoo!ショッピング',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-006',
    name: 'ベルト付きワイドパンツ',
    price: '¥9,100',
    brand: 'GU',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-007',
    name: 'メタリックチェーンバッグ',
    price: '¥4,750',
    brand: 'CHARLES & KEITH',
    shop: 'Yahoo!ショッピング',
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'product-008',
    name: 'ワントーンスニーカー',
    price: '¥11,300',
    brand: 'NIKE',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1519741491538-6b34c2036444?auto=format&fit=crop&w=800&q=80'
  }
];

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
