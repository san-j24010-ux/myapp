/* api.js */
import { GAS_ENDPOINT, fetchFromGas } from './app.js';

/**
 * Search items by query and return structured response.
 * @param {Object} query
 * @returns {Promise<Object[]>}
 */
export async function searchItems(query) {
  // 実装時には GAS 内の楽天API検索を呼び出す
  const result = await fetchFromGas({ mode: 'search', ...query });
  return result.items || [];
}

/**
 * Fetch favorite items from GAS backend.
 * @returns {Promise<Object[]>}
 */
export async function fetchFavorites() {
  const result = await fetchFromGas({ mode: 'favorites' });
  return result.items || [];
}

/**
 * Save a favorite item via POST to GAS.
 * @param {Object} item
 * @returns {Promise<Object>}
 */
export async function saveFavorite(item) {
  const response = await fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'saveFavorite', item }),
  });

  if (!response.ok) {
    throw new Error('Failed to save favorite');
  }

  return response.json();
}
