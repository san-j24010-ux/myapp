/* ranking.js */
const rankingPanel = document.getElementById('ranking-panel');
const tabs = document.querySelectorAll('.tab');

const rankingData = {
  today: [
    { rank: 1, name: 'ブラックフーディー', brand: 'UNIQLO', count: '230' },
    { rank: 2, name: 'ワイドデニム', brand: 'GU', count: '180' },
  ],
  weekly: [
    { rank: 1, name: 'レザーショートブーツ', brand: 'ZARA', count: '712' },
    { rank: 2, name: 'ロゴスウェット', brand: 'Champion', count: '592' },
  ],
  brand: [
    { rank: 1, name: 'NIKE', brand: 'ブランド別人気', count: '1,520' },
    { rank: 2, name: 'adidas', brand: 'ブランド別人気', count: '1,120' },
  ]
};

function renderRanking(category) {
  rankingPanel.innerHTML = '';
  rankingData[category].forEach(item => {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="card-body">
        <div class="meta"><strong>${item.rank}位</strong> ${item.name}</div>
        <p>${item.brand}</p>
        <p>検索数 ${item.count}</p>
      </div>
    `;
    rankingPanel.appendChild(row);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(button => button.classList.remove('active'));
    tab.classList.add('active');
    renderRanking(tab.dataset.target);
  });
});

renderRanking('today');
