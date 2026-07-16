/* search.js */
import { createProductCard } from './app.js';
import { searchItems } from './api.js';

const searchForm = document.getElementById('search-form');
const searchResults = document.getElementById('search-results');

const dummyResults = [
  {
    id: 'item-001',
    name: 'ダークストリートジャケット',
    price: '¥12,800',
    brand: 'H&M',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'item-002',
    name: 'Y2K シルバーネックレス',
    price: '¥3,490',
    brand: 'ZARA',
    shop: 'Yahoo!ショッピング',
    imageUrl: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5d1?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'item-003',
    name: 'ブラックレザーシューズ',
    price: '¥9,700',
    brand: 'CONVERSE',
    shop: 'Rakuten',
    imageUrl: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80'
  },
];

function renderSearchResults(results) {
  searchResults.innerHTML = '';
  if (results.length === 0) {
    searchResults.textContent = '検索条件に一致する商品が見つかりませんでした。';
    return;
  }
  results.forEach(item => {
    searchResults.appendChild(createProductCard(item));
  });
}

function filterDummyResults(query) {
  return dummyResults.filter(item => {
    const priceLimit = Number(query.price);
    const price = Number(item.price.replace(/[^\d]/g, ''));
    return !priceLimit || price <= priceLimit;
  });
}

async function handleSearch(event) {
  event.preventDefault();

  const formData = new FormData(searchForm);
  const query = Object.fromEntries(formData.entries());

  try {
    const items = await searchItems(query);
    renderSearchResults(items);
  } catch (error) {
    console.warn('GAS search failed, fallback to dummy results', error);
    renderSearchResults(filterDummyResults(query));
  }
}

searchForm.addEventListener('submit', handleSearch);
renderSearchResults(dummyResults);
