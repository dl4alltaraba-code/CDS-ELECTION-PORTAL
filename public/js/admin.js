(() => {
  'use strict';

  const API = '';
  let adminKey = '';

  const authForm = document.getElementById('authForm');
  const adminKeyInput = document.getElementById('adminKeyInput');
  const adminAuth = document.getElementById('adminAuth');
  const adminDashboard = document.getElementById('adminDashboard');

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminKey = adminKeyInput.value.trim();
    if (!adminKey) {
      showAdminAlert('authAlert', 'Please enter the admin key.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API}/api/settings/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey }
      });
      
      if (res.ok) {
        adminAuth.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadAll();
      } else {
        const errorData = await res.json();
        showAdminAlert('authAlert', errorData.error || 'Invalid admin key.', 'error');
      }
    } catch (err) {
      showAdminAlert('authAlert', 'Server not reachable.', 'error');
    }
  });

  async function loadAll() {
    await Promise.all([loadResults(), loadStats(), loadCandidates(), loadSettings(), loadRegisterSummary()]);
  }

  async function loadResults() {
    try {
      const res = await fetch(`${API}/api/results`);
      const data = await res.json();
      renderResults(data);
    } catch (err) {
      console.error('Results error:', err);
    }
  }

  function renderResults(data) {
    const container = document.getElementById('resultsContainer');
    if (!data.positions || data.positions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">No results yet.</p>';
      return;
    }

    container.innerHTML = data.positions.map(pos => `
      <div class="position-results-card">
        <h3>${escapeHtml(pos.position)} <span style="font-weight: 400; font-size: 0.75rem; color: var(--text-muted);">(${pos.totalVotes} vote${pos.totalVotes !== 1 ? 's' : ''})</span></h3>
        ${pos.candidates.map(c => `
          <div class="result-item">
            <div class="result-header">
              <span class="result-name">${escapeHtml(c.name)}</span>
              <span class="result-count">${c.vote_count} (${c.percentage}%)</span>
            </div>
            <div class="result-bar-bg">
              <div class="result-bar" style="width: ${c.percentage}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API}/api/results/stats`);
      const data = await res.json();
      document.getElementById('statVoters').textContent = data.totalVoted;
      document.getElementById('statRegistered').textContent = data.totalRegistered;
      document.getElementById('statTurnout').textContent = data.turnout + '%';
      document.getElementById('statPositions').textContent = data.totalPositions;
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  async function loadCandidates() {
    try {
      const res = await fetch(`${API}/api/candidates`);
      const data = await res.json();
      renderManageList(data.all || []);
    } catch (err) {
      console.error('Candidates error:', err);
    }
  }

  function renderManageList(candidates) {
    const list = document.getElementById('manageList');
    if (candidates.length === 0) {
      list.innerHTML = '<li style="color: var(--text-muted); padding: 10px;">No candidates.</li>';
      return;
    }
    list.innerHTML = candidates.map(c => `
      <li class="manage-item">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          ${c.image_url
            ? `<img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.name)}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--accent); flex-shrink: 0;" onerror="this.style.display='none'">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(76,175,80,0.15); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--accent); flex-shrink: 0;">${escapeHtml((c.name || 'C').slice(0, 2).toUpperCase())}</div>`
          }
          <div style="min-width: 0; overflow: hidden;">
            <div class="manage-item__name" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(c.name)}</div>
            <div class="manage-item__position">${escapeHtml(c.position)}</div>
          </div>
        </div>
        <button class="btn-delete" onclick="deleteCandidate(${c.id})" title="Delete">✕</button>
      </li>
    `).join('');
  }

  // --- Add Candidate Form & Image Options ---
  const addForm = document.getElementById('addCandidateForm');
  const addCandBtn = document.getElementById('addCandBtn');
  const toggleImageLinkBtn = document.getElementById('toggleImageLinkBtn');
  const toggleImageUploadBtn = document.getElementById('toggleImageUploadBtn');
  const candImageUrlWrapper = document.getElementById('candImageUrlWrapper');
  const candImageUploadWrapper = document.getElementById('candImageUploadWrapper');
  const candImageInput = document.getElementById('candImage');
  const candImageFileInput = document.getElementById('candImageFile');
  const candImageDropzone = document.getElementById('candImageDropzone');
  const candImagePreviewCard = document.getElementById('candImagePreviewCard');
  const candImagePreviewThumb = document.getElementById('candImagePreviewThumb');
  const candImagePreviewTitle = document.getElementById('candImagePreviewTitle');
  const candImagePreviewMeta = document.getElementById('candImagePreviewMeta');
  const candImageRemoveBtn = document.getElementById('candImageRemoveBtn');

  let candidateImageMode = 'link'; // 'link' | 'upload'
  let pendingCandidateImage = null; // { data: base64, name: string, size: number }

  function setCandidateImageMode(mode) {
    candidateImageMode = mode;
    if (mode === 'link') {
      toggleImageLinkBtn.classList.add('active');
      toggleImageUploadBtn.classList.remove('active');
      candImageUrlWrapper.style.display = 'block';
      candImageUploadWrapper.style.display = 'none';
    } else {
      toggleImageLinkBtn.classList.remove('active');
      toggleImageUploadBtn.classList.add('active');
      candImageUrlWrapper.style.display = 'none';
      candImageUploadWrapper.style.display = 'block';
    }
    updateCandidateImagePreview();
  }

  function clearCandidateImage() {
    pendingCandidateImage = null;
    if (candImageFileInput) candImageFileInput.value = '';
    if (candImageInput) candImageInput.value = '';
    if (candImagePreviewCard) candImagePreviewCard.style.display = 'none';
    if (candImagePreviewThumb) candImagePreviewThumb.src = '';
  }

  function updateCandidateImagePreview() {
    if (candidateImageMode === 'upload' && pendingCandidateImage) {
      candImagePreviewThumb.src = pendingCandidateImage.data;
      candImagePreviewTitle.textContent = pendingCandidateImage.name;
      const kb = Math.round(pendingCandidateImage.size / 1024);
      candImagePreviewMeta.textContent = `From device · ${kb} KB`;
      candImagePreviewCard.style.display = 'flex';
    } else if (candidateImageMode === 'link' && candImageInput.value.trim()) {
      const url = candImageInput.value.trim();
      candImagePreviewThumb.src = url;
      candImagePreviewTitle.textContent = url.split('/').pop().split('?')[0] || 'Image link';
      candImagePreviewMeta.textContent = 'Web image link';
      candImagePreviewCard.style.display = 'flex';
      candImagePreviewThumb.onerror = () => {
        candImagePreviewMeta.textContent = 'Preview unavailable (invalid link)';
      };
    } else {
      candImagePreviewCard.style.display = 'none';
      candImagePreviewThumb.src = '';
    }
  }

  function handleCandidateFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAdminAlert('addAlert', 'Please select an image file (JPEG, PNG, WebP, GIF)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAdminAlert('addAlert', 'Image size exceeds 5 MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      pendingCandidateImage = {
        data: e.target.result,
        name: file.name,
        size: file.size
      };
      updateCandidateImagePreview();
    };
    reader.onerror = () => {
      showAdminAlert('addAlert', 'Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  }

  toggleImageLinkBtn.addEventListener('click', () => setCandidateImageMode('link'));
  toggleImageUploadBtn.addEventListener('click', () => setCandidateImageMode('upload'));

  candImageDropzone.addEventListener('click', () => candImageFileInput.click());
  candImageFileInput.addEventListener('change', () => handleCandidateFile(candImageFileInput.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    candImageDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      candImageDropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    candImageDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      candImageDropzone.classList.remove('is-dragover');
    });
  });

  candImageDropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCandidateFile(e.dataTransfer.files[0]);
    }
  });

  candImageInput.addEventListener('input', updateCandidateImagePreview);
  candImageRemoveBtn.addEventListener('click', clearCandidateImage);

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('candName').value.trim();
    const position = document.getElementById('candPosition').value.trim();
    const manifesto = document.getElementById('candManifesto').value.trim() || null;
    if (!name || !position) return;

    const payload = { name, position, manifesto };

    if (candidateImageMode === 'upload' && pendingCandidateImage) {
      payload.image_data = pendingCandidateImage.data;
      payload.image_filename = pendingCandidateImage.name;
    } else if (candidateImageMode === 'link' && candImageInput.value.trim()) {
      payload.image_url = candImageInput.value.trim();
    }

    addCandBtn.classList.add('loading');
    addCandBtn.disabled = true;

    try {
      const res = await fetch(`${API}/api/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAdminAlert('addAlert', `${name} (${position}) added successfully!`, 'success');
      addForm.reset();
      clearCandidateImage();
      setCandidateImageMode('link');
      loadCandidates();
      loadStats();
    } catch (err) {
      showAdminAlert('addAlert', err.message, 'error');
    } finally {
      addCandBtn.classList.remove('loading');
      addCandBtn.disabled = false;
    }
  });

  window.deleteCandidate = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    try {
      const res = await fetch(`${API}/api/candidates/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      loadAll();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  document.getElementById('refreshBtn').addEventListener('click', loadAll);

  function showAdminAlert(id, message, type) {
    const alert = document.getElementById(id);
    const textEl = document.getElementById(id + 'Text');
    alert.className = `alert alert-${type} show`;
    textEl.textContent = message;
    alert.querySelector('span:first-child').textContent = type === 'error' ? '⚠️' : '✅';
    if (type === 'success') setTimeout(() => alert.classList.remove('show'), 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Settings Logic ---
  const toggleVoting = document.getElementById('toggleVoting');
  const toggleResults = document.getElementById('toggleResults');
  const toggleCandidatesVoting = document.getElementById('toggleCandidatesVoting');

  async function loadSettings() {
    try {
      const res = await fetch(`${API}/api/settings?_t=${Date.now()}`);
      if (res.ok) {
        const settings = await res.json();
        toggleVoting.checked = settings.voting_enabled;
        toggleResults.checked = settings.results_visible;
        toggleCandidatesVoting.checked = settings.candidates_voting_visible;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function updateSetting(key, value) {
    try {
      const payload = {};
      payload[key] = value;
      
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error('Failed to update setting');
      showAdminAlert('settingsAlert', 'Settings updated successfully', 'success');
    } catch (err) {
      showAdminAlert('settingsAlert', err.message, 'error');
      // Revert checkbox on failure
      if (key === 'voting_enabled') toggleVoting.checked = !value;
      if (key === 'results_visible') toggleResults.checked = !value;
      if (key === 'candidates_voting_visible') toggleCandidatesVoting.checked = !value;
    }
  }

  toggleVoting.addEventListener('change', (e) => updateSetting('voting_enabled', e.target.checked));
  toggleResults.addEventListener('change', (e) => updateSetting('results_visible', e.target.checked));
  toggleCandidatesVoting.addEventListener('change', (e) => updateSetting('candidates_voting_visible', e.target.checked));

  // --- Voter Register Logic ---
  const MAX_CSV_BYTES = 5 * 1024 * 1024;
  const registerFile = document.getElementById('registerFile');
  const dropzone = document.getElementById('registerDropzone');
  const dropzoneTitle = document.getElementById('dropzoneTitle');
  const previewBox = document.getElementById('registerPreview');
  const previewGrid = document.getElementById('previewGrid');
  const previewIssues = document.getElementById('previewIssues');
  const previewFile = document.getElementById('previewFile');
  const applyBtn = document.getElementById('applyImportBtn');
  const DEFAULT_DROPZONE_TITLE = dropzoneTitle.innerHTML;

  let pendingCsv = null;      // { name, text }
  let lastPreview = null;

  const selectedMode = () => document.querySelector('input[name="registerMode"]:checked').value;

  async function loadRegisterSummary() {
    try {
      const res = await fetch(`${API}/api/voters/summary`, { headers: { 'X-Admin-Key': adminKey } });
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById('regTotal').textContent = data.total.toLocaleString();
      document.getElementById('regVoted').textContent = data.voted.toLocaleString();
      const last = data.lastUpload;
      document.getElementById('regLastUpload').textContent = last
        ? `Last import: ${last.filename || 'CSV'} · ${last.mode} · ${formatDate(last.created_at)} (+${last.added} / ~${last.updated} / −${last.removed})`
        : 'No imports yet';
    } catch (err) {
      console.error('Register summary error:', err);
    }
  }

  function formatDate(sqliteUtc) {
    // SQLite datetime('now') is UTC without a timezone marker
    const d = new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
    return isNaN(d) ? sqliteUtc : d.toLocaleString();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      showAdminAlert('registerAlert', 'Please choose a .csv file.', 'error');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      showAdminAlert('registerAlert', 'File too large. Maximum size is 5 MB.', 'error');
      return;
    }
    pendingCsv = { name: file.name, text: await file.text() };
    dropzone.classList.add('has-file');
    dropzoneTitle.textContent = `📎 ${file.name}`;
    document.getElementById('registerAlert').classList.remove('show');
    runPreview();
  }

  async function sendCsv(dryRun) {
    const params = new URLSearchParams({ mode: selectedMode(), dryRun: String(dryRun) });
    const res = await fetch(`${API}/api/voters/upload?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-Admin-Key': adminKey,
        'X-Filename': encodeURIComponent(pendingCsv.name),
      },
      body: pendingCsv.text,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    return data;
  }

  async function runPreview() {
    if (!pendingCsv) return;
    previewBox.hidden = false;
    previewBox.classList.add('is-loading');
    try {
      lastPreview = await sendCsv(true);
      renderPreview(lastPreview);
    } catch (err) {
      lastPreview = null;
      previewBox.hidden = true;
      showAdminAlert('registerAlert', err.message, 'error');
    } finally {
      previewBox.classList.remove('is-loading');
    }
  }

  function renderPreview(p) {
    previewFile.textContent = `· ${pendingCsv.name} · ${p.validRows} valid of ${p.totalRows} rows`;
    const stat = (value, label, mod = '') =>
      `<div class="preview-stat ${mod} ${value === 0 ? 'preview-stat--muted' : ''}">
         <div class="preview-stat__value">${value.toLocaleString()}</div>
         <div class="preview-stat__label">${label}</div>
       </div>`;

    previewGrid.innerHTML = [
      stat(p.added, 'New', 'preview-stat--add'),
      stat(p.updated, 'Updated', 'preview-stat--update'),
      stat(p.unchanged, 'Unchanged'),
      p.mode === 'replace' ? stat(p.removed, 'Removed', 'preview-stat--remove') : '',
      p.mode === 'replace' ? stat(p.keptBecauseVoted, 'Kept (voted)', 'preview-stat--warn') : '',
      stat(p.invalidCount, 'Invalid rows', 'preview-stat--warn'),
    ].join('');

    const notes = [];
    notes.push(`<div class="preview-note preview-note--info">Register size: <strong>${p.registerBefore.toLocaleString()}</strong> → <strong>${p.registerAfter.toLocaleString()}</strong> voters.</div>`);

    if (p.keptBecauseVoted > 0) {
      notes.push(`<div class="preview-note preview-note--warn">${p.keptBecauseVoted} voter(s) not in this file have already voted and will be kept so their ballots stay valid.</div>`);
    }
    if (p.invalidCount > 0) {
      notes.push(issueList(`${p.invalidCount} row(s) will be skipped:`,
        p.invalid.map(i => `Line ${i.line}: ${escapeHtml(i.reason)}`), p.invalidCount));
    }
    if (p.duplicateCount > 0) {
      notes.push(issueList(`${p.duplicateCount} duplicate state code(s) — the last occurrence is used:`,
        p.duplicates.map(d => `Line ${d.line}: <code>${escapeHtml(d.stateCode)}</code> (first on line ${d.firstLine})`), p.duplicateCount));
    }
    previewIssues.innerHTML = notes.join('');

    const nothingToDo = p.added + p.updated + p.removed === 0;
    applyBtn.disabled = nothingToDo;
    applyBtn.classList.toggle('is-danger', p.removed > 0);
    applyBtn.querySelector('.btn-text').textContent = nothingToDo
      ? 'No changes'
      : p.removed > 0 ? `Apply & remove ${p.removed}` : 'Apply Import';
  }

  function issueList(title, items, total) {
    const more = total > items.length ? `<li>…and ${total - items.length} more</li>` : '';
    return `<div class="preview-note preview-note--warn">${title}<ul>${items.map(i => `<li>${i}</li>`).join('')}${more}</ul></div>`;
  }

  function resetRegisterUpload() {
    pendingCsv = null;
    lastPreview = null;
    registerFile.value = '';
    previewBox.hidden = true;
    dropzone.classList.remove('has-file');
    dropzoneTitle.innerHTML = DEFAULT_DROPZONE_TITLE;
  }

  applyBtn.addEventListener('click', async () => {
    if (!pendingCsv || !lastPreview) return;
    if (lastPreview.removed > 0 &&
        !confirm(`Replace the register?\n\n${lastPreview.removed} voter(s) will be removed and will no longer be able to vote.`)) {
      return;
    }
    applyBtn.classList.add('loading');
    applyBtn.disabled = true;
    try {
      const result = await sendCsv(false);
      showAdminAlert('registerAlert',
        `Register updated: ${result.added} added, ${result.updated} updated, ${result.removed} removed. ${result.registerAfter} voters registered.`,
        'success');
      resetRegisterUpload();
      await Promise.all([loadRegisterSummary(), loadStats()]);
    } catch (err) {
      showAdminAlert('registerAlert', err.message, 'error');
      applyBtn.disabled = false;
    } finally {
      applyBtn.classList.remove('loading');
    }
  });

  document.getElementById('cancelImportBtn').addEventListener('click', resetRegisterUpload);
  registerFile.addEventListener('change', () => handleFile(registerFile.files[0]));
  document.querySelectorAll('input[name="registerMode"]').forEach(r => r.addEventListener('change', runPreview));

  ['dragenter', 'dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  }));
  ['dragleave', 'drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  }));
  dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
    downloadBlob(new Blob(['Surname,State Code\r\nAdebayo,TR/25A/0001\r\nOkafor,TR/25B/0002\r\n'], { type: 'text/csv' }),
      'voter-register-template.csv');
  });

  document.getElementById('exportRegisterBtn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${API}/api/voters/export`, { headers: { 'X-Admin-Key': adminKey } });
      if (!res.ok) throw new Error('Export failed');
      const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
      downloadBlob(await res.blob(), match ? match[1] : 'voter-register.csv');
    } catch (err) {
      showAdminAlert('registerAlert', err.message, 'error');
    }
  });

})();
