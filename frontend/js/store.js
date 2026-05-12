// ============================================================
// store.js - Store owner dashboard logic
// ============================================================

const API = 'https://worker-review-backend.onrender.com/api';
let storeToken = localStorage.getItem('storeToken');
let currentPage = 1;
let pieChartInstance = null;
let lineChartInstance = null;
let editingWorkerId = null;

// ============================================================
// Auth check
// ============================================================
if (!storeToken) {
  window.location.href = 'store-login.html';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${storeToken}`
  };
}

function handleAuthError(res) {
  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    window.location.href = 'store-login.html';
    return true;
  }
  return false;
}

function logout() {
  localStorage.clear();
  window.location.href = 'store-login.html';
}

// ============================================================
// Tab Navigation
// ============================================================
function showTab(tabName, linkEl) {
  ['overview', 'workers', 'reviews', 'qr'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
  });
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  if (linkEl) linkEl.classList.add('active');

  if (tabName === 'workers') loadWorkers();
  if (tabName === 'reviews') { loadReviews(); loadWorkerFilter(); }
  if (tabName === 'qr') loadQRCode();
}

// ============================================================
// Init
// ============================================================
async function init() {
  document.getElementById('username-display').textContent = localStorage.getItem('storeUsername') || '';
  document.getElementById('store-name-nav').textContent = localStorage.getItem('storeName') || 'My Store';
  await loadDashboard();
}

// ============================================================
// Load dashboard overview
// ============================================================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/store/dashboard`, { headers: authHeaders() });
    if (handleAuthError(res)) return;

    if (res.status === 403) {
      const data = await res.json();
      if (data.error === 'subscription_expired') {
        showSubscriptionExpired();
        return;
      }
    }

    const data = await res.json();

    // Stats
    document.getElementById('stat-total').textContent = data.stats.total_reviews || 0;
    document.getElementById('stat-good').textContent = data.stats.good_reviews || 0;
    document.getElementById('stat-bad').textContent = data.stats.bad_reviews || 0;
    document.getElementById('stat-avg').textContent = data.stats.avg_rating || '—';

    // Best worker
    if (data.best_worker && data.best_worker.total_reviews > 0) {
      document.getElementById('best-worker-content').innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--success-light);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">👤</div>
          <div>
            <div style="font-weight:700;">${escapeHtml(data.best_worker.worker_name)}</div>
            <div style="font-size:0.8rem;color:var(--gray-500);">${data.best_worker.good_reviews || 0} good reviews</div>
          </div>
        </div>`;
    }

    // Needs improvement
    if (data.worker_needs_improvement && data.worker_needs_improvement.bad_reviews > 0) {
      document.getElementById('improve-worker-content').innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--danger-light);display:flex;align-items:center;justify-content:center;font-size:1.3rem;">👤</div>
          <div>
            <div style="font-weight:700;">${escapeHtml(data.worker_needs_improvement.worker_name)}</div>
            <div style="font-size:0.8rem;color:var(--gray-500);">${data.worker_needs_improvement.bad_reviews || 0} bad reviews</div>
          </div>
        </div>`;
    }

    // Charts
    renderPieChart(data.stats.good_reviews || 0, data.stats.bad_reviews || 0);
    renderLineChart(data.monthly_trend || []);

  } catch (err) {
    console.error('Dashboard error:', err);
    showAlert('Failed to load dashboard data.', 'danger');
  }
}

function showSubscriptionExpired() {
  document.querySelector('.dashboard-layout').innerHTML = `
    <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:40px;">
      <div class="auth-card" style="text-align:center; max-width:480px;">
        <div style="font-size:3.5rem; margin-bottom:16px;">⚠️</div>
        <h2 style="font-size:1.4rem; font-weight:800; margin-bottom:10px;">Subscription Expired</h2>
        <p style="color:var(--gray-500); font-size:0.95rem;">Your subscription has expired. Please contact the application admin to restore access.</p>
        <button class="btn btn-outline mt-3" onclick="logout()">Sign Out</button>
      </div>
    </div>`;
}

// ============================================================
// Charts
// ============================================================
function renderPieChart(good, bad) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChartInstance) pieChartInstance.destroy();

  if (good === 0 && bad === 0) {
    ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;padding:60px;color:var(--gray-400);">No reviews yet</p>';
    return;
  }

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Good', 'Bad'],
      datasets: [{
        data: [good, bad],
        backgroundColor: ['#22C55E', '#EF4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } }
      }
    }
  });
}

function renderLineChart(trend) {
  const ctx = document.getElementById('lineChart').getContext('2d');
  if (lineChartInstance) lineChartInstance.destroy();

  if (!trend || trend.length === 0) {
    ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;padding:60px;color:var(--gray-400);">No monthly data yet</p>';
    return;
  }

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(t => t.month),
      datasets: [
        {
          label: 'Good',
          data: trend.map(t => t.good),
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34,197,94,0.08)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Bad',
          data: trend.map(t => t.bad),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ============================================================
// Workers
// ============================================================
async function loadWorkers() {
  try {
    const res = await fetch(`${API}/store/workers`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();

    const container = document.getElementById('workers-list');

    if (!data.workers || data.workers.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No workers yet. Add your first team member!</p></div>`;
      return;
    }

    const rows = data.workers.map(w => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${w.image_path
              ? `<img src="${API.replace('/api','')}/${w.image_path}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;" onerror="this.src=''" />`
              : `<div style="width:38px;height:38px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;">👤</div>`
            }
            <span style="font-weight:600;">${escapeHtml(w.worker_name)}</span>
          </div>
        </td>
        <td>${escapeHtml(w.role || '—')}</td>
        <td><span class="badge badge-${w.status === 'active' ? 'success' : 'gray'}">${w.status}</span></td>
        <td>${new Date(w.created_at).toLocaleDateString()}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="openEditWorkerModal(${w.id}, '${escapeHtml(w.worker_name)}', '${escapeHtml(w.role||'')}', '${w.status}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteWorker(${w.id}, '${escapeHtml(w.worker_name)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Worker</th><th>Role</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  } catch (err) {
    console.error('Load workers error:', err);
    document.getElementById('workers-list').innerHTML = `<div class="alert alert-danger">Failed to load workers.</div>`;
  }
}

function openAddWorkerModal() {
  editingWorkerId = null;
  document.getElementById('modal-title-text').textContent = 'Add Worker';
  document.getElementById('worker-form').reset();
  document.getElementById('image-preview-img').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'flex';
  document.getElementById('status-group').style.display = 'none';
  document.getElementById('modal-alert').innerHTML = '';
  document.getElementById('edit-worker-id').value = '';
  document.getElementById('worker-modal').classList.remove('hidden');
}

function openEditWorkerModal(id, name, role, status) {
  editingWorkerId = id;
  document.getElementById('modal-title-text').textContent = 'Edit Worker';
  document.getElementById('edit-worker-id').value = id;
  document.getElementById('worker-name').value = name;
  document.getElementById('worker-role').value = role;
  document.getElementById('worker-status').value = status;
  document.getElementById('status-group').style.display = 'block';
  document.getElementById('modal-alert').innerHTML = '';
  document.getElementById('image-preview-img').style.display = 'none';
  document.getElementById('upload-placeholder').style.display = 'flex';
  document.getElementById('worker-modal').classList.remove('hidden');
}

function closeWorkerModal() {
  document.getElementById('worker-modal').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('worker-modal')) closeWorkerModal();
}

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = document.getElementById('image-preview-img');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function saveWorker(e) {
  e.preventDefault();
  const alertEl = document.getElementById('modal-alert');
  const btn = document.getElementById('save-worker-btn');
  alertEl.innerHTML = '';

  const name = document.getElementById('worker-name').value.trim();
  const role = document.getElementById('worker-role').value.trim();
  const status = document.getElementById('worker-status').value;
  const imageFile = document.getElementById('worker-image').files[0];

  if (!name) {
    alertEl.innerHTML = `<div class="alert alert-danger">Worker name is required.</div>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    const formData = new FormData();
    formData.append('worker_name', name);
    formData.append('role', role);
    if (status) formData.append('status', status);
    if (imageFile) formData.append('image', imageFile);

    const isEdit = !!editingWorkerId;
    const url = isEdit ? `${API}/store/workers/${editingWorkerId}` : `${API}/store/workers`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${storeToken}` },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alertEl.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to save worker.'}</div>`;
      return;
    }

    closeWorkerModal();
    showAlert(isEdit ? 'Worker updated successfully!' : 'Worker added successfully!', 'success');
    loadWorkers();

  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-danger">Connection error. Please try again.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Worker';
  }
}

async function deleteWorker(id, name) {
  if (!confirm(`Deactivate "${name}"? They will no longer appear for customer reviews.`)) return;

  try {
    const res = await fetch(`${API}/store/workers/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Failed to deactivate worker.', 'danger');
      return;
    }

    showAlert('Worker deactivated.', 'success');
    loadWorkers();
  } catch (err) {
    showAlert('Connection error.', 'danger');
  }
}

// ============================================================
// Reviews
// ============================================================
async function loadWorkerFilter() {
  try {
    const res = await fetch(`${API}/store/workers`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('filter-worker');
    sel.innerHTML = '<option value="">All Workers</option>';
    data.workers.forEach(w => {
      sel.innerHTML += `<option value="${w.id}">${escapeHtml(w.worker_name)}</option>`;
    });
  } catch (e) {}
}

async function loadReviews(page = 1) {
  currentPage = page;
  const container = document.getElementById('reviews-list');
  container.innerHTML = `<div class="loading-state"><div class="spinner spinner-dark"></div><p>Loading reviews...</p></div>`;

  const workerId = document.getElementById('filter-worker').value;
  const reviewType = document.getElementById('filter-type').value;
  const rating = document.getElementById('filter-rating').value;
  const dateFrom = document.getElementById('filter-from').value;
  const dateTo = document.getElementById('filter-to').value;

  const params = new URLSearchParams({ page, limit: 15 });
  if (workerId) params.append('worker_id', workerId);
  if (reviewType) params.append('review_type', reviewType);
  if (rating) params.append('rating', rating);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);

  try {
    const res = await fetch(`${API}/store/reviews?${params}`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();

    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No reviews match your filters.</p></div>`;
      document.getElementById('reviews-pagination').innerHTML = '';
      return;
    }

    const starsHtml = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

    container.innerHTML = data.reviews.map(r => `
      <div class="review-item">
        <div class="${r.image_path ? 'review-avatar' : 'review-avatar-placeholder'}">
          ${r.image_path ? `<img src="${API.replace('/api','')}/${r.image_path}" class="review-avatar" alt="" />` : '👤'}
        </div>
        <div class="review-body">
          <div class="review-name">${escapeHtml(r.worker_name)} <span style="font-weight:400;color:var(--gray-500); font-size:0.82rem;">${escapeHtml(r.role||'')}</span></div>
          <div class="review-meta">
            <span class="badge badge-${r.review_type === 'good' ? 'success' : 'danger'}">${r.review_type === 'good' ? '😊 Good' : '😕 Bad'}</span>
            <span class="stars-display" style="margin-left:8px;">${starsHtml(r.rating || 0)}</span>
            <span style="margin-left:8px;">${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          ${r.description ? `<div class="review-desc">"${escapeHtml(r.description)}"</div>` : ''}
        </div>
      </div>
    `).join('');

    // Pagination
    const paginationEl = document.getElementById('reviews-pagination');
    if (data.pages > 1) {
      let buttons = '';
      for (let i = 1; i <= data.pages; i++) {
        buttons += `<button class="btn ${i === page ? 'btn-primary' : 'btn-outline'} btn-sm" style="margin:2px;" onclick="loadReviews(${i})">${i}</button>`;
      }
      paginationEl.innerHTML = buttons;
    } else {
      paginationEl.innerHTML = '';
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load reviews.</div>`;
  }
}

function clearFilters() {
  document.getElementById('filter-worker').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-rating').value = '';
  document.getElementById('filter-from').value = '';
  document.getElementById('filter-to').value = '';
  loadReviews();
}

// ============================================================
// QR Code
// ============================================================
async function loadQRCode() {
  try {
    const res = await fetch(`${API}/store/dashboard`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const store = data.store;
    const baseUrl = API.replace('/api', '');
    const reviewUrl = `${window.location.origin}/customer-review.html?store=${store.qr_slug}`;

    const qrDisplay = document.getElementById('qr-display');
    qrDisplay.innerHTML = store.qr_code_path
      ? `<img src="${baseUrl}/${store.qr_code_path}" alt="QR Code" style="width:200px;height:200px;" />`
      : `<p style="color:var(--gray-500);">QR code not generated yet.</p>`;

    document.getElementById('qr-url-display').innerHTML = `
      <p style="font-size:0.82rem; color:var(--gray-500); word-break:break-all;">Review URL:<br/>
      <a href="${reviewUrl}" target="_blank" style="color:var(--primary);">${reviewUrl}</a></p>`;

  } catch (e) {
    document.getElementById('qr-display').innerHTML = `<p style="color:var(--danger);">Failed to load QR code.</p>`;
  }
}

function printQR() {
  const qrImg = document.querySelector('#qr-display img');
  if (!qrImg) { alert('No QR code to print.'); return; }
  const w = window.open('');
  w.document.write(`<html><body style="text-align:center;padding:40px;">
    <h2 style="font-family:sans-serif;">${localStorage.getItem('storeName')}</h2>
    <p style="font-family:sans-serif; color:#666;">Scan to leave a review</p>
    <img src="${qrImg.src}" style="width:250px;height:250px;" />
    <p style="font-family:sans-serif; font-size:0.8rem; color:#999; margin-top:12px;">Thank you for your feedback!</p>
  </body></html>`);
  w.document.close();
  w.print();
}

// ============================================================
// Utilities
// ============================================================
function showAlert(msg, type = 'success') {
  const el = document.getElementById('alert-area');
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Start
init();
