/* app.js */
export const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwg0alV9GBUPBylCDX6kh4mi20UjcbBb9bO4F7ThGH_JcffaiZnwmGNPywnSCpzyAL0rA/exec';

/**
 * Fetch JSON from GAS backend with optional query parameters.
 * @param {Record<string, string>} params
 * @returns {Promise<any>}
 */
export async function fetchFromGas(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${GAS_ENDPOINT}?${query}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GAS request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a styled product card element from product data.
 * @param {Object} item
 * @returns {HTMLElement}
 */
export function createProductCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  const image = document.createElement('img');
  image.src = item.imageUrl;
  image.alt = item.name;

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h3');
  title.textContent = item.name;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<span>${item.brand}</span><span>${item.shop}</span>`;

  const price = document.createElement('p');
  price.className = 'price';
  price.textContent = item.price;

  const actions = document.createElement('div');
  actions.className = 'actions';
  const favoriteButton = document.createElement('button');
  favoriteButton.textContent = 'お気に入り';
  favoriteButton.addEventListener('click', () => {
    localStorage.setItem(`favorite-${item.id}`, JSON.stringify(item));
    favoriteButton.textContent = '登録済み';
  });
  actions.appendChild(favoriteButton);

  body.append(title, meta, price, actions);
  card.append(image, body);

  card.addEventListener('click', (event) => {
    if (event.target !== favoriteButton) {
      window.location.href = `detail.html?id=${encodeURIComponent(item.id)}`;
    }
  });

  return card;
}

/**
 * Parse query params from the current URL.
 * @returns {URLSearchParams}
 */
export function getUrlParams() {
  return new URLSearchParams(window.location.search);
}
