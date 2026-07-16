/* favorite.js */
import { createProductCard } from './app.js';

const favoriteList = document.getElementById('favorite-list');

function loadFavorites() {
  const favorites = [];
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('favorite-')) {
      try {
        const item = JSON.parse(localStorage.getItem(key));
        if (item) favorites.push(item);
      } catch (error) {
        console.warn('お気に入り読み込みエラー', error);
      }
    }
  });
  return favorites;
}

function renderFavorites() {
  const favorites = loadFavorites();
  if (favorites.length === 0) {
    favoriteList.textContent = 'お気に入り商品はまだありません。検索ページから追加してください。';
    return;
  }
  favoriteList.innerHTML = '';
  favorites.forEach(item => {
    favoriteList.appendChild(createProductCard(item));
  });
}

renderFavorites();
