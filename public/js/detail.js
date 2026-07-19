/* detail.js */
const productDetail = document.getElementById('product-detail');

const dummyProducts = [
  {
    id: 'item-001',
    name: 'ダークストリートジャケット',
    price: '¥12,800',
    brand: 'H&M',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80',
    description: '重厚なブラックレザーとワイドシルエットが特徴のストリートジャケット。レイヤードスタイルに最適です。',
  },
  {
    id: 'item-002',
    name: 'Y2K シルバーネックレス',
    price: '¥3,490',
    brand: 'ZARA',
    shop: 'Yahoo!ショッピング',
    imageUrl: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5d1?auto=format&fit=crop&w=1000&q=80',
    description: 'Y2K テイストのシルバーネックレス。レイヤードコーデに映える定番アクセサリー。',
  },
];

function getFavoriteFromStorage(id) {
  try {
    const item = JSON.parse(localStorage.getItem(`favorite-${id}`));
    return item || null;
  } catch (error) {
    console.warn('Failed to parse favorite item from storage', error);
    return null;
  }
}

function renderDetail(item) {
  productDetail.innerHTML = `
    <div class="detail-image">
      <img src="${item.imageUrl}" alt="${item.name}">
    </div>
    <div class="detail-body">
      <h2>${item.name}</h2>
      <div class="meta"><span>${item.brand}</span><span>${item.shop}</span></div>
      <p class="price">${item.price}</p>
      <p>${item.description}</p>
      <div class="action-group">
        <button class="primary-button" id="rakuten-link">楽天を見る</button>
        <button class="secondary-button" id="favorite-detail">お気に入りに追加</button>
      </div>
    </div>
  `;

  document.getElementById('rakuten-link').addEventListener('click', () => {
    window.open(item.itemUrl || 'https://www.rakuten.co.jp', '_blank');
  });

  document.getElementById('favorite-detail').addEventListener('click', () => {
    localStorage.setItem(`favorite-${item.id}`, JSON.stringify(item));
    alert('お気に入りに登録しました。');
  });
}

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');
const getSelectedItemFromSession = () => {
  try {
    const item = JSON.parse(sessionStorage.getItem('styleFinder:selectedItem'));
    return item && item.id === productId ? item : null;
  } catch (error) {
    console.warn('Failed to parse selected item', error);
    return null;
  }
};

const selectedProduct = getSelectedItemFromSession()
  || getFavoriteFromStorage(productId)
  || dummyProducts.find((item) => item.id === productId)
  || dummyProducts[0];

renderDetail(selectedProduct);
