(() => {
  'use strict';

  async function loadAll() {
    try {
      await Promise.all([loadStats(), loadResults()]);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      document.getElementById('resultsContainer').innerHTML = 
        '<div class="card" style="text-align: center; padding: 48px 24px; color: var(--error);">Failed to load results. Please try again later.</div>';
    }
  }

  async function loadStats() {
    const res = await fetch('/api/results/stats');
    if (!res.ok) throw new Error('Stats fetch failed');
    const data = await res.json();
    
    document.getElementById('statVoters').textContent = data.totalVoted;
    document.getElementById('statTurnout').textContent = data.turnout + '%';
    document.getElementById('statPositions').textContent = data.totalPositions;
  }

  async function loadResults() {
    const res = await fetch('/api/results');
    if (!res.ok) throw new Error('Results fetch failed');
    const data = await res.json();
    
    const container = document.getElementById('resultsContainer');
    
    if (!data.positions || data.positions.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center; padding: 40px;">No results available yet.</div>';
      return;
    }

    container.innerHTML = data.positions.map(pos => {
      // Find the winner(s) - handle ties
      let maxVotes = -1;
      pos.candidates.forEach(c => {
        if (c.vote_count > maxVotes) maxVotes = c.vote_count;
      });
      
      const isConcluded = pos.totalVotes > 0; // Assuming some votes cast means it's active/concluded

      return `
      <div class="card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--glass-border); padding-bottom: 16px;">
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--accent); margin: 0;">${escapeHtml(pos.position)}</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted); padding: 4px 12px; background: rgba(76, 175, 80, 0.1); border-radius: 20px;">
            ${pos.totalVotes} Vote${pos.totalVotes !== 1 ? 's' : ''} Target
          </span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${pos.candidates.map(c => {
            const isWinner = isConcluded && c.vote_count === maxVotes && maxVotes > 0;
            const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            
            const photoHtml = c.image_url
              ? '<img src="' + escapeHtml(c.image_url) + '" alt="' + escapeHtml(c.name) + '" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ' + (isWinner ? 'var(--warning)' : 'var(--glass-border)') + ';" onerror="this.src=\'\'">' // fall back to css placeholder if error
              : '<div style="width: 48px; height: 48px; border-radius: 50%; background: var(--gradient-brand); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">' + initials + '</div>';

            return `
            <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: var(--radius-md); background: ${isWinner ? 'rgba(255, 167, 38, 0.05)' : 'var(--glass-bg)'}; border: 1px solid ${isWinner ? 'rgba(255, 167, 38, 0.2)' : 'transparent'};">
              ${photoHtml}
              
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <h3 style="font-size: 1rem; font-weight: ${isWinner ? '700' : '500'}; color: ${isWinner ? 'var(--warning)' : 'var(--text-primary)'}; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(c.name)} ${isWinner ? '👑' : ''}
                  </h3>
                  <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-left: 8px;">
                    ${c.vote_count} <span style="font-weight: 400; font-size: 0.75rem; color: var(--text-muted);">(${c.percentage}%)</span>
                  </span>
                </div>
                
                <div style="height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; overflow: hidden; margin-top: 8px;">
                  <div style="height: 100%; width: ${c.percentage}%; background: ${isWinner ? 'var(--gradient-gold)' : 'var(--gradient-brand)'}; border-radius: 3px; transition: width 1s ease-out;"></div>
                </div>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `}).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initial load
  loadAll();

  // Auto-refresh stats every 15 seconds
  setInterval(loadAll, 15000);
})();
