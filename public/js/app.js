(() => {
  'use strict';

  const API = '';
  let authToken = null;
  let positions = []; // { position, candidates[] }
  let currentPositionIdx = 0;
  let selections = {}; // { position: { candidateId, candidateName, imageUrl } }

  // DOM
  const sections = {
    verify: document.getElementById('verifySection'),
    vote: document.getElementById('voteSection'),
    summary: document.getElementById('summarySection'),
    confirm: document.getElementById('confirmSection'),
  };
  const stepsContainer = document.getElementById('stepsContainer');

  // ─── Navigation ───
  function showSection(name) {
    Object.values(sections).forEach(s => s.classList.remove('active'));
    sections[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildSteps(total, current) {
    // total = 1 (verify) + positions.length + 1 (summary) + 1 (confirm) but simplify
    const count = total;
    stepsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'step';
      if (i < current) s.classList.add('done');
      if (i === current) s.classList.add('active');
      stepsContainer.appendChild(s);
    }
  }

  // ─── Helpers ───
  function showAlert(id, message, type = 'error') {
    const alert = document.getElementById(id);
    const textEl = document.getElementById(id + 'Text');
    alert.className = `alert alert-${type} show`;
    textEl.textContent = message;
    alert.querySelector('span:first-child').textContent = type === 'error' ? '⚠️' : '✅';
  }

  function hideAlert(id) {
    document.getElementById(id).classList.remove('show');
  }

  function setLoading(btn, loading) {
    if (loading) { btn.classList.add('loading'); btn.disabled = true; }
    else { btn.classList.remove('loading'); btn.disabled = false; }
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── 1. Verify ───
  const verifyForm = document.getElementById('verifyForm');
  const verifyBtn = document.getElementById('verifyBtn');
  const stateCodeInput = document.getElementById('stateCodeInput');
  const surnameInput = document.getElementById('surnameInput');

  surnameInput.addEventListener('input', () => {
    hideAlert('verifyAlert');
    surnameInput.classList.remove('error');
  });

  stateCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z0-9/]/g, '').toUpperCase();
    hideAlert('verifyAlert');
    stateCodeInput.classList.remove('error');
  });

  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const stateCode = stateCodeInput.value.trim();
    const surname = surnameInput.value.trim();
    
    let hasError = false;
    if (!surname) {
      showAlert('verifyAlert', 'Please enter your surname or Firstname.');
      surnameInput.classList.add('error');
      hasError = true;
    }
    if (!stateCode) {
      showAlert('verifyAlert', 'Please enter your state code.');
      stateCodeInput.classList.add('error');
      hasError = true;
    }
    if (hasError) return;

    setLoading(verifyBtn, true);
    hideAlert('verifyAlert');

    try {
      const res = await fetch(`${API}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateCode, surname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      authToken = data.token;
      await loadPositions();

      // Total steps: 1(verify) + positions + 1(summary) + 1(confirm)
      buildSteps(1 + positions.length + 2, 1);
      currentPositionIdx = 0;
      renderPositionVote();
      showSection('vote');
    } catch (err) {
      showAlert('verifyAlert', err.message);
      stateCodeInput.classList.add('error');
    } finally {
      setLoading(verifyBtn, false);
    }
  });

  // ─── 2. Load Positions ───
  async function loadPositions() {
    const res = await fetch(`${API}/api/candidates`);
    const data = await res.json();
    positions = data.positions; // [{ position, candidates[] }]
  }

  // ─── 3. Render each position ───
  function renderPositionVote() {
    const pos = positions[currentPositionIdx];
    document.getElementById('positionBadge').textContent = pos.position;
    document.getElementById('positionCounter').textContent =
      `Position ${currentPositionIdx + 1} of ${positions.length}`;
    document.getElementById('voteSectionTitle').textContent = `Vote for ${pos.position}`;
    document.getElementById('voteSectionDesc').textContent =
      `Select one candidate for ${pos.position}`;

    // Steps
    buildSteps(1 + positions.length + 2, 1 + currentPositionIdx);

    // Show/hide prev button
    const prevBtn = document.getElementById('prevPositionBtn');
    prevBtn.style.display = currentPositionIdx > 0 ? 'flex' : 'none';

    // Next button text
    const nextBtn = document.getElementById('nextPositionBtn');
    nextBtn.querySelector('.btn-text').textContent =
      currentPositionIdx < positions.length - 1 ? 'Next Position →' : 'Review Votes →';

    // Check if already selected for this position
    const prevSelection = selections[pos.position];
    nextBtn.disabled = !prevSelection;

    // Render candidates
    const list = document.getElementById('candidatesList');
    list.innerHTML = '';

    const colors = [
      'linear-gradient(135deg, #2e7d32, #4caf50)',
      'linear-gradient(135deg, #1b5e20, #388e3c)',
      'linear-gradient(135deg, #43a047, #66bb6a)',
      'linear-gradient(135deg, #388e3c, #81c784)',
      'linear-gradient(135deg, #4caf50, #a5d6a7)',
    ];

    pos.candidates.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.dataset.id = c.id;

      if (prevSelection && prevSelection.candidateId === c.id) {
        card.classList.add('selected');
      }

      const initials = getInitials(c.name);
      const colorIdx = idx % colors.length;

      const photoHtml = c.image_url
        ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.name)}" class="candidate-photo"
            onerror="this.outerHTML='<div class=\\'candidate-photo-placeholder\\' style=\\'background:${colors[colorIdx]}\\'>${initials}</div>'">`
        : `<div class="candidate-photo-placeholder" style="background:${colors[colorIdx]}">${initials}</div>`;

      card.innerHTML = `
        ${photoHtml}
        <div class="candidate-info">
          <div class="candidate-name">${escapeHtml(c.name)}</div>
          <div class="candidate-position">${escapeHtml(c.position)}</div>
        </div>
        <div class="candidate-check"></div>
      `;

      card.addEventListener('click', () => selectCandidate(c));
      list.appendChild(card);
    });

    hideAlert('voteAlert');
  }

  function selectCandidate(candidate) {
    const pos = positions[currentPositionIdx];
    selections[pos.position] = {
      candidateId: candidate.id,
      candidateName: candidate.name,
      imageUrl: candidate.image_url,
    };

    document.querySelectorAll('.candidate-card').forEach(card => {
      card.classList.toggle('selected', parseInt(card.dataset.id) === candidate.id);
    });

    document.getElementById('nextPositionBtn').disabled = false;
  }

  // ─── Navigation between positions ───
  document.getElementById('nextPositionBtn').addEventListener('click', () => {
    const pos = positions[currentPositionIdx];
    if (!selections[pos.position]) {
      showAlert('voteAlert', 'Please select a candidate.');
      return;
    }

    if (currentPositionIdx < positions.length - 1) {
      currentPositionIdx++;
      renderPositionVote();
      // Scroll to top of card
      sections.vote.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Go to summary
      renderSummary();
      buildSteps(1 + positions.length + 2, 1 + positions.length);
      showSection('summary');
    }
  });

  document.getElementById('prevPositionBtn').addEventListener('click', () => {
    if (currentPositionIdx > 0) {
      currentPositionIdx--;
      renderPositionVote();
    }
  });

  // ─── 4. Summary ───
  function renderSummary() {
    const list = document.getElementById('summaryList');
    list.innerHTML = '';

    positions.forEach(pos => {
      const sel = selections[pos.position];
      if (!sel) return;

      const li = document.createElement('li');
      li.className = 'summary-item';

      const initials = getInitials(sel.candidateName);
      const photoHtml = sel.imageUrl
        ? `<img src="${escapeHtml(sel.imageUrl)}" alt="${escapeHtml(sel.candidateName)}" class="summary-item__photo"
            onerror="this.style.display='none'">`
        : '';

      li.innerHTML = `
        ${photoHtml || `<div class="candidate-photo-placeholder" style="width:36px;height:36px;font-size:0.8rem;background:var(--gradient-brand);">${initials}</div>`}
        <div class="summary-item__info">
          <div class="summary-item__position">${escapeHtml(pos.position)}</div>
          <div class="summary-item__name">${escapeHtml(sel.candidateName)}</div>
        </div>
        <span class="summary-item__check">✓</span>
      `;
      list.appendChild(li);
    });
  }

  document.getElementById('backToVoteBtn').addEventListener('click', () => {
    currentPositionIdx = positions.length - 1;
    renderPositionVote();
    buildSteps(1 + positions.length + 2, 1 + currentPositionIdx);
    showSection('vote');
  });

  // ─── 5. Submit all votes ───
  const submitAllBtn = document.getElementById('submitAllBtn');

  submitAllBtn.addEventListener('click', async () => {
    setLoading(submitAllBtn, true);
    hideAlert('summaryAlert');

    const votesPayload = positions.map(pos => ({
      candidateId: selections[pos.position].candidateId,
      position: pos.position,
    }));

    try {
      const res = await fetch(`${API}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ votes: votesPayload }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Vote submission failed');

      buildSteps(1 + positions.length + 2, 1 + positions.length + 1);
      showSection('confirm');
    } catch (err) {
      showAlert('summaryAlert', err.message);
    } finally {
      setLoading(submitAllBtn, false);
    }
  });

  // Initial step
  buildSteps(3, 0);
})();
