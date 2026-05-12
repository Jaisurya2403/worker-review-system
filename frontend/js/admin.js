// ============================================================
// admin.js - Admin dashboard logic
// ============================================================

const API = 'https://worker-review-backend.onrender.com/api';
let adminToken = localStorage.getItem('adminToken');
let adminReviewPage = 1;
let pieChartInst = null;
let barChartInst = null;
let currentQRData = null;

// ============================================================
// Auth check
// ============================================================
if (!adminToken) {
  window.location.href = 'admin-login.html';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

function handleAuthError(res) {
  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    window.location.href = 'admin-login.html';
    return true;
  }
  return false;
}

function logout() {
  localStorage.clear();
  window.location.href = 'admin-login.html';
}

// ============================================================
// Tab Navigation
// ============================================================
function showTab(tabName, linkEl) {
  ['overview', 'stores', 'reviews'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
  });
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  if (linkEl) linkEl.classList.add('active');

  if (tabName === 'stores') loadStores();
  if (tabName === 'reviews') { loadAdminReviews(); loadStoreFilter(); }
}

// ============================================================
// Init
// ============================================================
async function init() {
  document.getElementById('admin-username').textContent = localStorage.getItem('adminUsername') || 'Admin';
  await loadStats();
}

// ============================================================
// Load platform stats
// ============================================================
async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();

    document.getElementById('stat-stores').textContent = data.total_stores || 0;
    document.getElementById('stat-active').textContent = data.active_stores || 0;
    document.getElementById('stat-disabled').textContent = data.disabled_stores || 0;
    document.getElementById('stat-reviews').textContent = data.total_reviews || 0;
    document.getElementById('stat-good').textContent = data.good_reviews || 0;
    document.getElementById('stat-bad').textContent = data.bad_reviews || 0;
    document.getElementById('stat-workers').textContent = data.total_workers || 0;

    renderAdminPieChart(data.good_reviews || 0, data.bad_reviews || 0);
    renderAdminBarChart(data.active_stores || 0, data.disabled_stores || 0);

  } catch (err) {
    console.error('Load stats error:', err);
    showAlert('Failed to load platform stats.', 'danger');
  }
}

// ============================================================
// Charts
// ============================================================
function renderAdminPieChart(good, bad) {
  const ctx = document.getElementById('adminPieChart').getContext('2d');
  if (pieChartInst) pieChartInst.destroy();

  if (good === 0 && bad === 0) {
    ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;padding:60px;color:var(--gray-400);">No reviews yet</p>';
    return;
  }

  pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Good Reviews', 'Bad Reviews'],
      datasets: [{
        data: [good, bad],
        backgroundColor: ['#22C55E', '#EF4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderAdminBarChart(active, disabled) {
  const ctx = document.getElementById('adminBarChart').getContext('2d');
  if (barChartInst) barChartInst.destroy();

  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Active Stores', 'Disabled Stores'],
      datasets: [{
        data: [active, disabled],
        backgroundColor: ['#22C55E', '#EF4444'],
        borderRadius: 8,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ============================================================
// Stores
// ============================================================
async function loadStores() {
  const container = document.getElementById('stores-list');
  container.innerHTML = `<div class="loading-state"><div class="spinner spinner-dark"></div><p>Loading stores...</p></div>`;

  try {
    const res = await fetch(`${API}/admin/stores`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();

    if (!data.stores || data.stores.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏪</div><p>No stores yet. Create your first store!</p></div>`;
      return;
    }

    const rows = data.stores.map(s => `
      <tr>
        <td>
          <div style="font-weight:700;">${escapeHtml(s.store_name)}</div>
          <div style="font-size:0.78rem; color:var(--gray-500);">${escapeHtml(s.store_address || '—')}</div>
        </td>
        <td>
          <code style="font-size:0.78rem; background:var(--gray-100); padding:3px 7px; border-radius:6px;">${escapeHtml(s.owner_username || '—')}</code>
        </td>
        <td><span class="badge badge-${s.subscription_status === 'active' ? 'success' : 'danger'}">${s.subscription_status}</span></td>
        <td>${s.worker_count || 0}</td>
        <td>${s.review_count || 0}</td>
        <td>${new Date(s.created_at).toLocaleDateString()}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" onclick="viewQR('${escapeHtml(s.qr_slug)}', '${escapeHtml(s.store_name)}', '${s.qr_code_path || ''}')">📱 QR</button>
            ${s.subscription_status === 'active'
              ? `<button class="btn btn-sm btn-danger" onclick="toggleStoreStatus(${s.id}, 'disabled', '${escapeHtml(s.store_name)}')">🔴 Disable</button>`
              : `<button class="btn btn-sm btn-success" onclick="toggleStoreStatus(${s.id}, 'active', '${escapeHtml(s.store_name)}')">✅ Enable</button>`
            }
            <button class="btn btn-sm btn-danger" onclick="deleteStore(${s.id}, '${escapeHtml(s.store_name)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Store</th><th>Owner Login</th><th>Status</th><th>Workers</th><th>Reviews</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load stores.</div>`;
    console.error('Load stores error:', err);
  }
}

function openAddStoreModal() {
  document.getElementById('store-modal-alert').innerHTML = '';
  document.getElementById('new-store-name').value = '';
  document.getElementById('new-store-address').value = '';
  document.getElementById('new-owner-username').value = '';
  document.getElementById('new-owner-password').value = '';
  document.getElementById('add-store-modal').classList.remove('hidden');
}

async function createStore(e) {
  e.preventDefault();
  const alertEl = document.getElementById('store-modal-alert');
  const btn = document.getElementById('create-store-btn');
  alertEl.innerHTML = '';

  const storeName = document.getElementById('new-store-name').value.trim();
  const storeAddress = document.getElementById('new-store-address').value.trim();
  const ownerUsername = document.getElementById('new-owner-username').value.trim();
  const ownerPassword = document.getElementById('new-owner-password').value;

  if (!storeName || !ownerUsername || !ownerPassword) {
    alertEl.innerHTML = `<div class="alert alert-danger">Store name, owner username, and password are required.</div>`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    const res = await fetch(`${API}/admin/stores`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        store_name: storeName,
        store_address: storeAddress,
        owner_username: ownerUsername,
        owner_password: ownerPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alertEl.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to create store.'}</div>`;
      return;
    }

    // Close add modal, show success modal
    closeModal('add-store-modal');

    const baseUrl = window.location.origin;
    document.getElementById('created-store-name').textContent = storeName;
    document.getElementById('created-owner-username').textContent = ownerUsername;
    document.getElementById('created-qr-url').textContent = `${baseUrl}/customer-review.html?store=${data.store.qr_slug}`;

    document.getElementById('store-success-modal').classList.remove('hidden');

    loadStats();

  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-danger">Connection error. Please try again.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Store';
  }
}

async function toggleStoreStatus(id, newStatus, storeName) {
  const action = newStatus === 'active' ? 'enable' : 'disable';
  if (!confirm(`Are you sure you want to ${action} "${storeName}"?`)) return;

  try {
    const res = await fetch(`${API}/admin/stores/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || 'Failed to update store status.', 'danger');
      return;
    }

    showAlert(data.message, 'success');
    loadStores();
    loadStats();
  } catch (err) {
    showAlert('Connection error.', 'danger');
  }
}

async function deleteStore(id, storeName) {
  if (!confirm(`⚠️ Permanently delete "${storeName}"? This will also delete all workers and reviews. This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/admin/stores/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || 'Failed to delete store.', 'danger');
      return;
    }

    showAlert('Store deleted successfully.', 'success');
    loadStores();
    loadStats();
  } catch (err) {
    showAlert('Connection error.', 'danger');
  }
}

function viewQR(qrSlug, storeName, qrCodePath) {
  const baseUrl = `https://worker-review-backend.onrender.com`;
  const reviewUrl = `${window.location.origin}/customer-review.html?store=${qrSlug}`;
  currentQRData = { storeName, reviewUrl, qrCodePath };

  const qrContent = document.getElementById('qr-modal-content');

  if (qrCodePath) {
    qrContent.innerHTML = `
      <p style="font-weight:700; margin-bottom:12px;">${escapeHtml(storeName)}</p>
      <img src="${baseUrl}/${qrCodePath}" style="width:200px;height:200px; border:6px solid white; box-shadow:var(--shadow); border-radius:var(--radius);" alt="QR Code" onerror="this.style.display='none'; document.getElementById('qr-fallback').style.display='block';" />
      <div id="qr-fallback" style="display:none; background:var(--gray-100); padding:20px; border-radius:var(--radius); margin-top:8px;">
        <p style="font-size:0.82rem; color:var(--gray-500);">QR image not found on server.</p>
      </div>
      <p style="margin-top:12px; font-size:0.78rem; word-break:break-all;">
        <a href="${reviewUrl}" target="_blank" style="color:var(--primary);">${reviewUrl}</a>
      </p>`;
  } else {
    qrContent.innerHTML = `
      <p style="color:var(--gray-500); font-size:0.9rem; margin:20px 0;">QR code not generated for this store.</p>
      <p style="font-size:0.82rem; word-break:break-all;">Review URL:<br/>
      <a href="${reviewUrl}" target="_blank" style="color:var(--primary);">${reviewUrl}</a></p>`;
  }

  document.getElementById('qr-modal').classList.remove('hidden');
}

function printQRFromModal() {
  if (!currentQRData) return;
  const img = document.querySelector('#qr-modal-content img');
  if (!img) { alert('QR code image not available to print.'); return; }

  const w = window.open('');
  w.document.write(`<html><body style="text-align:center;padding:40px;">
    <h2 style="font-family:sans-serif;">${currentQRData.storeName}</h2>
    <p style="font-family:sans-serif; color:#666;">Scan to leave a review</p>
    <img src="${img.src}" style="width:250px;height:250px;" />
    <p style="font-family:sans-serif; font-size:0.8rem; color:#999; margin-top:12px;">Thank you for your feedback!</p>
  </body></html>`);
  w.document.close();
  w.print();
}

// ============================================================
// Admin Reviews Moderation
// ============================================================
async function loadStoreFilter() {
  try {
    const res = await fetch(`${API}/admin/stores`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const sel = document.getElementById('admin-filter-store');
    sel.innerHTML = '<option value="">All Stores</option>';
    (data.stores || []).forEach(s => {
      sel.innerHTML += `<option value="${s.id}">${escapeHtml(s.store_name)}</option>`;
    });
  } catch (e) {}
}

async function loadAdminReviews(page = 1) {
  adminReviewPage = page;
  const container = document.getElementById('admin-reviews-list');
  container.innerHTML = `<div class="loading-state"><div class="spinner spinner-dark"></div><p>Loading reviews...</p></div>`;

  const storeId = document.getElementById('admin-filter-store').value;
  const reviewType = document.getElementById('admin-filter-type').value;

  const params = new URLSearchParams({ page, limit: 20 });
  if (storeId) params.append('store_id', storeId);
  if (reviewType) params.append('review_type', reviewType);

  try {
    const res = await fetch(`${API}/admin/reviews?${params}`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();

    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><p>No reviews found.</p></div>`;
      document.getElementById('admin-reviews-pagination').innerHTML = '';
      return;
    }

    const starsHtml = (r) => '★'.repeat(r || 0) + '☆'.repeat(5 - (r || 0));

    const rows = data.reviews.map(r => `
      <tr>
        <td>${escapeHtml(r.store_name)}</td>
        <td>
          <div style="font-weight:600;">${escapeHtml(r.worker_name)}</div>
          <div style="font-size:0.78rem; color:var(--gray-500);">${escapeHtml(r.role || '')}</div>
        </td>
        <td><span class="badge badge-${r.review_type === 'good' ? 'success' : 'danger'}">${r.review_type === 'good' ? '😊 Good' : '😕 Bad'}</span></td>
        <td><span style="color:var(--warning);">${starsHtml(r.rating)}</span></td>
        <td style="max-width:200px; font-size:0.85rem;">${r.description ? escapeHtml(r.description).substring(0, 100) + (r.description.length > 100 ? '...' : '') : '<span style="color:var(--gray-400);">—</span>'}</td>
        <td style="white-space:nowrap;">${new Date(r.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Store</th><th>Worker</th><th>Type</th><th>Rating</th><th>Comment</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Pagination
    const paginationEl = document.getElementById('admin-reviews-pagination');
    if (data.pages > 1) {
      let buttons = '';
      for (let i = 1; i <= data.pages; i++) {
        buttons += `<button class="btn ${i === page ? 'btn-primary' : 'btn-outline'} btn-sm" style="margin:2px;" onclick="loadAdminReviews(${i})">${i}</button>`;
      }
      paginationEl.innerHTML = buttons;
    } else {
      paginationEl.innerHTML = '';
    }

  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Failed to load reviews.</div>`;
    console.error('Load admin reviews error:', err);
  }
}

async function deleteReview(id) {
  if (!confirm('Delete this review? This action cannot be undone.')) return;

  try {
    const res = await fetch(`${API}/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || 'Failed to delete review.', 'danger');
      return;
    }

    showAlert('Review deleted.', 'success');
    loadAdminReviews(adminReviewPage);
    loadStats();
  } catch (err) {
    showAlert('Connection error.', 'danger');
  }
}

function clearAdminFilters() {
  document.getElementById('admin-filter-store').value = '';
  document.getElementById('admin-filter-type').value = '';
  loadAdminReviews();
}

// ============================================================
// Modal Helpers
// ============================================================
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function closeModalOutside(e, modalId) {
  if (e.target === document.getElementById(modalId)) {
    closeModal(modalId);
  }
}

// ============================================================
// Alert
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
