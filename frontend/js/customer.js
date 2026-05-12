// ============================================================
// customer.js - Customer review page logic
// ============================================================

const API = 'https://worker-review-backend.onrender.com/api';

let selectedWorkerId = null;
let selectedRating = 0;
let selectedReviewType = null;

// Get store slug from URL query param
const urlParams = new URLSearchParams(window.location.search);
const qrSlug = urlParams.get('store');

// Character counter for description
document.getElementById('review-description').addEventListener('input', function () {
  document.getElementById('char-count').textContent = this.value.length;
});

// ============================================================
// Initialize page
// ============================================================
async function init() {
  if (!qrSlug) {
    showError('Invalid QR Code', 'No store identifier found in the URL. Please scan the correct QR code.');
    return;
  }

  try {
    // Load store info
    const storeRes = await fetch(`${API}/public/store/${qrSlug}`);
    const storeData = await storeRes.json();

    if (!storeRes.ok) {
      if (storeData.error === 'store_disabled') {
        showError('Store Unavailable', storeData.message || 'This store is not currently accepting reviews.');
      } else {
        showError('Store Not Found', storeData.error || 'Could not find this store.');
      }
      return;
    }

    // Show store name
    document.getElementById('store-name-badge').textContent = storeData.store.store_name;
    document.title = `Review - ${storeData.store.store_name}`;

    // Show main page
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('main-page').classList.remove('hidden');
    document.getElementById('main-page').style.display = 'block';

    // Load workers
    await loadWorkers();

  } catch (err) {
    showError('Connection Error', 'Cannot connect to the server. Please try again later.');
    console.error(err);
  }
}

// ============================================================
// Load workers for this store
// ============================================================
async function loadWorkers() {
  try {
    const res = await fetch(`${API}/public/store/${qrSlug}/workers`);
    const data = await res.json();

    const container = document.getElementById('worker-cards');
    const loadingEl = document.getElementById('workers-loading');
    const noWorkersEl = document.getElementById('no-workers');

    loadingEl.style.display = 'none';

    if (!res.ok || !data.workers || data.workers.length === 0) {
      noWorkersEl.classList.remove('hidden');
      return;
    }

    container.style.display = 'grid';
    container.innerHTML = '';

    data.workers.forEach(worker => {
      const card = document.createElement('div');
      card.className = 'worker-card';
      card.setAttribute('data-id', worker.id);
      card.onclick = () => selectWorker(worker.id, card);

      const avatarHtml = worker.image_path
        ? `<img src="${API.replace('/api', '')}/${worker.image_path}" class="worker-avatar" alt="${worker.worker_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="worker-avatar-placeholder" style="display:none;">👤</div>`
        : `<div class="worker-avatar-placeholder">👤</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <div class="worker-name">${escapeHtml(worker.worker_name)}</div>
        <div class="worker-role">${escapeHtml(worker.role || '')}</div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Load workers error:', err);
    document.getElementById('workers-loading').innerHTML = '<p style="color:var(--danger)">Failed to load workers.</p>';
  }
}

// ============================================================
// Select a worker
// ============================================================
function selectWorker(workerId, cardEl) {
  selectedWorkerId = workerId;
  document.querySelectorAll('.worker-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
}

// ============================================================
// Select review type (good/bad)
// ============================================================
function selectReviewType(type) {
  selectedReviewType = type;
  document.getElementById('btn-good').classList.remove('selected');
  document.getElementById('btn-bad').classList.remove('selected');
  document.getElementById(`btn-${type}`).classList.add('selected');

  // Auto-set star rating based on type if not already set
  if (selectedRating === 0) {
    selectRating(type === 'good' ? 5 : 1);
  }
}

// ============================================================
// Select star rating
// ============================================================
function selectRating(value) {
  selectedRating = value;
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  document.getElementById('rating-text').textContent = ratingLabels[value] || '';

  document.querySelectorAll('.star').forEach((star, index) => {
    star.classList.toggle('active', index < value);
  });
}

// ============================================================
// Submit the review
// ============================================================
async function submitReview() {
  const alertArea = document.getElementById('alert-area');
  alertArea.innerHTML = '';

  // Validation
  if (!selectedWorkerId) {
    alertArea.innerHTML = `<div class="alert alert-danger">Please select a team member who served you.</div>`;
    document.getElementById('step-worker').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (!selectedReviewType) {
    alertArea.innerHTML = `<div class="alert alert-danger">Please select Good or Bad to rate your experience.</div>`;
    document.getElementById('step-rating').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const description = document.getElementById('review-description').value.trim();
  const submitBtn = document.getElementById('submit-btn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const res = await fetch(`${API}/public/store/${qrSlug}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: selectedWorkerId,
        rating: selectedRating || (selectedReviewType === 'good' ? 5 : 1),
        review_type: selectedReviewType,
        description: description || null
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alertArea.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to submit review.'}</div>`;
      return;
    }

    // Show success page
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('success-page').classList.remove('hidden');
    document.getElementById('success-page').style.display = 'flex';

  } catch (err) {
    alertArea.innerHTML = `<div class="alert alert-danger">Connection error. Please try again.</div>`;
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Review';
  }
}

// ============================================================
// Show error screen
// ============================================================
function showError(title, message) {
  document.getElementById('loading-screen').style.display = 'none';
  const errorScreen = document.getElementById('error-screen');
  errorScreen.classList.remove('hidden');
  errorScreen.style.display = 'flex';
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-msg').textContent = message;
}

// ============================================================
// Utility: Escape HTML to prevent XSS
// ============================================================
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Start
init();
