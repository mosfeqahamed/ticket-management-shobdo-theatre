/* ================================================
   SHOBDO THEATRE — Main App Logic
   SPA navigation, data rendering, CRUD operations
   ================================================ */

'use strict';

/* ---- Auth Guard ---- */
if (!api.isLoggedIn()) {
  window.location.href = 'index.html';
}

/* ---- Expose logout globally for inline handler ---- */
const app = { logout: () => api.logout() };

/* ================================================
   HELPERS
   ================================================ */

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateStatus(str) {
  if (!str) return 'past';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d     = new Date(str + 'T00:00:00'); d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'today';
  if (d > today) return 'upcoming';
  return 'past';
}

function badgeHtml(status) {
  const map = {
    today:    ['badge-today',    'Today'],
    upcoming: ['badge-upcoming', 'Upcoming'],
    past:     ['badge-past',     'Past'],
  };
  const [cls, label] = map[status] || map.past;
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---- Toast ---- */
const TOAST_ICONS = {
  success: 'ri-checkbox-circle-fill',
  error:   'ri-close-circle-fill',
  info:    'ri-information-fill',
  warning: 'ri-alert-fill',
};
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="${TOAST_ICONS[type] || TOAST_ICONS.info} toast-icon"></i><span class="toast-msg">${escHtml(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 320);
  }, 3600);
}

/* ---- Confirm Dialog ---- */
function showConfirm(title, message, dangerAction = false) {
  return new Promise(resolve => {
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = message;
    const wrap = document.getElementById('confirmIconWrap');
    wrap.style.background = dangerAction ? 'var(--error-dim)' : 'var(--warning-dim)';
    wrap.style.color      = dangerAction ? 'var(--error)'     : 'var(--warning)';
    document.getElementById('confirmOverlay').classList.add('show');

    document.getElementById('confirmOk').onclick = () => {
      document.getElementById('confirmOverlay').classList.remove('show');
      resolve(true);
    };
    document.getElementById('confirmCancel').onclick = () => {
      document.getElementById('confirmOverlay').classList.remove('show');
      resolve(false);
    };
  });
}

/* ---- Modal ---- */
function openModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = bodyHtml;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

/* ---- Loading / Empty States ---- */
function setLoading(id) {
  document.getElementById(id).innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>`;
}
function setEmpty(id, icon, title, msg) {
  document.getElementById(id).innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${msg}</p>
    </div>`;
}

/* ---- Password toggle helper (used in sub-admin form) ---- */
function togglePw(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'ri-eye-off-line';
  } else {
    input.type = 'password';
    icon.className = 'ri-eye-line';
  }
}

/* ---- Animate count-up ---- */
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const steps = 25;
  const step  = target / steps;
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.floor(cur);
    if (cur >= target) { el.textContent = target; clearInterval(timer); }
  }, 600 / steps);
}

/* ================================================
   NAVIGATION
   ================================================ */

const SECTION_TITLES = {
  overview:  'Dashboard Overview',
  dramas:    'Dramas',
  contacts:  'Contacts',
  subadmins: 'Sub-Admins',
};

function navigate(section) {
  // Deactivate all
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate target
  const sec = document.getElementById(`section-${section}`);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (nav) nav.classList.add('active');

  document.getElementById('headerTitle').textContent = SECTION_TITLES[section] || section;

  // Load data
  if (section === 'overview') loadOverview();
  if (section === 'dramas')   loadDramas();
  if (section === 'contacts') loadContacts();

  closeSidebar();
}

// Attach nav click handlers
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigate(item.dataset.section);
  });
});

/* ================================================
   SIDEBAR (MOBILE)
   ================================================ */

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
});
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

/* Modal close handlers */
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

/* ================================================
   INIT USER INFO
   ================================================ */

function initUser() {
  const email = api.userEmail || 'User';
  const role  = api.role || '';

  document.getElementById('sidebarUserEmail').textContent = email;
  document.getElementById('sidebarUserRole').textContent  = role;
  document.getElementById('headerUserRole').textContent   = role === 'admin' ? 'Admin' : 'Sub-Admin';

  // Hide admin-only UI for sub-admins
  if (!api.isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}

/* ================================================
   OVERVIEW
   ================================================ */

let _dramas   = [];
let _contacts = [];

async function loadOverview() {
  try {
    const requests = [api.getDramas()];
    if (api.isAdmin()) requests.push(api.getContacts());

    const results = await Promise.all(requests);
    _dramas   = results[0] || [];
    _contacts = results[1] || [];

    // Stats
    animateCount('totalDramas', _dramas.length);
    if (api.isAdmin()) animateCount('totalContacts', _contacts.length);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = _dramas.filter(d => {
      const dd = new Date(d.display_date + 'T00:00:00'); dd.setHours(0, 0, 0, 0);
      return dd >= today;
    });
    animateCount('upcomingDramas', upcoming.length);

    // Recent table — upcoming + today, sorted by date, max 6
    const sorted = [...upcoming].sort((a, b) => a.display_date.localeCompare(b.display_date));
    renderOverviewTable(sorted.slice(0, 6));

  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderOverviewTable(dramas) {
  const container = document.getElementById('overviewTableBody');
  if (dramas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎭</div>
        <h3>No upcoming dramas</h3>
        <p>All shows have passed or no dramas have been added yet.</p>
      </div>`;
    return;
  }

  const rows = dramas.map(d => {
    const status = dateStatus(d.display_date);
    return `
      <tr>
        <td><strong>${escHtml(d.drama_name)}</strong></td>
        <td>${formatDate(d.display_date)}</td>
        <td>${badgeHtml(status)}</td>
        <td><span class="sms-preview" title="${escHtml(d.custom_sms)}">${escHtml(d.custom_sms)}</span></td>
      </tr>`;
  }).join('');

  const mCards = dramas.map(d => {
    const status = dateStatus(d.display_date);
    return `
      <div class="m-card">
        <div class="m-card-header">
          <div>
            <div class="m-card-title">${escHtml(d.drama_name)}</div>
            <div class="m-card-sub">${formatDate(d.display_date)}</div>
          </div>
          ${badgeHtml(status)}
        </div>
        <div class="m-card-body">
          <div class="m-card-row">
            <span class="m-label">SMS</span>
            <span class="m-value text-sm" style="color:var(--text-secondary)">${escHtml(d.custom_sms)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Drama Name</th>
            <th>Show Date</th>
            <th>Status</th>
            <th>SMS Preview</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mobile-card-list">${mCards}</div>`;
}

/* ================================================
   DRAMAS
   ================================================ */

let dramasData   = [];
let dramasFilter = '';

async function loadDramas() {
  setLoading('dramasTableBody');
  try {
    dramasData = await api.getDramas() || [];
    renderDramas();
  } catch (err) {
    toast(err.message, 'error');
    setEmpty('dramasTableBody', '❌', 'Failed to load', err.message);
  }
}

function renderDramas() {
  const filtered = dramasData.filter(d =>
    d.drama_name.toLowerCase().includes(dramasFilter) ||
    (d.custom_sms || '').toLowerCase().includes(dramasFilter)
  );

  if (filtered.length === 0) {
    setEmpty(
      'dramasTableBody', '🎭',
      dramasFilter ? 'No results found' : 'No dramas yet',
      dramasFilter ? `No dramas match "${dramasFilter}"` : 'Add your first drama to get started.'
    );
    return;
  }

  const isAdmin = api.isAdmin();

  const rows = filtered.map(d => {
    const status = dateStatus(d.display_date);
    const actions = `
      ${isAdmin ? `<button class="btn-icon sms"    title="Send SMS" onclick="handleSendSMS('${escHtml(d.id)}','${escHtml(d.drama_name)}')"><i class="ri-message-3-line"></i></button>` : ''}
      <button class="btn-icon edit"   title="Edit"    onclick="showEditDramaModal('${escHtml(d.id)}')"><i class="ri-pencil-line"></i></button>
      ${isAdmin ? `<button class="btn-icon delete" title="Delete" onclick="handleDeleteDrama('${escHtml(d.id)}','${escHtml(d.drama_name)}')"><i class="ri-delete-bin-line"></i></button>` : ''}
    `;
    return `
      <tr>
        <td><strong>${escHtml(d.drama_name)}</strong></td>
        <td>${formatDate(d.display_date)}</td>
        <td>${badgeHtml(status)}</td>
        <td><span class="sms-preview" title="${escHtml(d.custom_sms)}">${escHtml(d.custom_sms)}</span></td>
        <td><div class="td-actions">${actions}</div></td>
      </tr>`;
  }).join('');

  const mCards = filtered.map(d => {
    const status = dateStatus(d.display_date);
    const actions = `
      ${isAdmin ? `<button class="btn-icon sms"    onclick="handleSendSMS('${escHtml(d.id)}','${escHtml(d.drama_name)}')"><i class="ri-message-3-line"></i></button>` : ''}
      <button class="btn-icon edit"   onclick="showEditDramaModal('${escHtml(d.id)}')"><i class="ri-pencil-line"></i></button>
      ${isAdmin ? `<button class="btn-icon delete" onclick="handleDeleteDrama('${escHtml(d.id)}','${escHtml(d.drama_name)}')"><i class="ri-delete-bin-line"></i></button>` : ''}
    `;
    return `
      <div class="m-card">
        <div class="m-card-header">
          <div>
            <div class="m-card-title">${escHtml(d.drama_name)}</div>
            <div class="m-card-sub">${formatDate(d.display_date)}</div>
          </div>
          ${badgeHtml(status)}
        </div>
        <div class="m-card-body">
          <div class="m-card-row">
            <span class="m-label">SMS Text</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">${escHtml(d.custom_sms)}</div>
        </div>
        <div class="m-card-actions">${actions}</div>
      </div>`;
  }).join('');

  document.getElementById('dramasTableBody').innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Drama Name</th>
            <th>Show Date</th>
            <th>Status</th>
            <th>SMS Text</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mobile-card-list">${mCards}</div>`;
}

// Search
document.getElementById('dramasSearch').addEventListener('input', e => {
  dramasFilter = e.target.value.toLowerCase().trim();
  renderDramas();
});

// ---- Add Drama ----
document.getElementById('addDramaBtn').addEventListener('click', () => {
  openModal('Add New Drama', `
    <form id="dramaForm" novalidate>
      <div class="form-group">
        <label class="form-label">Drama Name *</label>
        <div class="input-wrapper">
          <i class="ri-film-line input-icon"></i>
          <input type="text" id="df_name" class="form-input" placeholder="e.g. অপেক্ষা" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Show Date *</label>
        <div class="input-wrapper">
          <i class="ri-calendar-line input-icon"></i>
          <input type="date" id="df_date" class="form-input" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">SMS Message *</label>
        <textarea id="df_sms" class="form-textarea" placeholder="Write the message to send to ticket holders..." required maxlength="500"></textarea>
        <div class="char-counter"><span id="df_sms_count">0</span>/500</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary" id="df_submit">
          <i class="ri-add-circle-line"></i> Add Drama
        </button>
      </div>
    </form>`);

  // char counter
  document.getElementById('df_sms').addEventListener('input', function () {
    const cnt = document.getElementById('df_sms_count');
    cnt.textContent = this.value.length;
    cnt.parentElement.className = 'char-counter' + (this.value.length > 400 ? ' warn' : '');
  });

  document.getElementById('dramaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('df_submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="border-top-color:#000;width:16px;height:16px"></div>';
    try {
      await api.createDrama({
        drama_name:   document.getElementById('df_name').value.trim(),
        display_date: document.getElementById('df_date').value,
        custom_sms:   document.getElementById('df_sms').value.trim(),
      });
      closeModal();
      toast('Drama added successfully!', 'success');
      await loadDramas();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
});

// ---- Edit Drama ----
function showEditDramaModal(id) {
  const d = dramasData.find(x => x.id === id);
  if (!d) return;

  openModal('Edit Drama', `
    <form id="editDramaForm" novalidate>
      <div class="form-group">
        <label class="form-label">Drama Name *</label>
        <div class="input-wrapper">
          <i class="ri-film-line input-icon"></i>
          <input type="text" id="ed_name" class="form-input" value="${escHtml(d.drama_name)}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Show Date *</label>
        <div class="input-wrapper">
          <i class="ri-calendar-line input-icon"></i>
          <input type="date" id="ed_date" class="form-input" value="${escHtml(d.display_date)}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">SMS Message *</label>
        <textarea id="ed_sms" class="form-textarea" required maxlength="500">${escHtml(d.custom_sms)}</textarea>
        <div class="char-counter"><span id="ed_sms_count">${(d.custom_sms || '').length}</span>/500</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary" id="ed_submit">
          <i class="ri-save-line"></i> Save Changes
        </button>
      </div>
    </form>`);

  document.getElementById('ed_sms').addEventListener('input', function () {
    const cnt = document.getElementById('ed_sms_count');
    cnt.textContent = this.value.length;
    cnt.parentElement.className = 'char-counter' + (this.value.length > 400 ? ' warn' : '');
  });

  document.getElementById('editDramaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('ed_submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="border-top-color:#000;width:16px;height:16px"></div>';
    try {
      await api.updateDrama(id, {
        drama_name:   document.getElementById('ed_name').value.trim(),
        display_date: document.getElementById('ed_date').value,
        custom_sms:   document.getElementById('ed_sms').value.trim(),
      });
      closeModal();
      toast('Drama updated!', 'success');
      await loadDramas();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
}

// ---- Delete Drama ----
async function handleDeleteDrama(id, name) {
  const ok = await showConfirm(
    'Delete Drama',
    `Delete "${name}"? This will also remove all SMS logs for this drama.`,
    true
  );
  if (!ok) return;
  try {
    await api.deleteDrama(id);
    toast('Drama deleted.', 'success');
    await loadDramas();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---- Send SMS ----
async function handleSendSMS(id, name) {
  const ok = await showConfirm(
    'Send SMS',
    `Send SMS to all contacts for "${name}"? This action cannot be undone.`,
    false
  );
  if (!ok) return;
  toast('Sending SMS — please wait...', 'info');
  try {
    const res = await api.sendSMS(id);
    toast(res.message || 'SMS sent successfully!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ================================================
   CONTACTS
   ================================================ */

let contactsData   = [];
let contactsFilter = '';

async function loadContacts() {
  if (!api.isAdmin()) return;
  setLoading('contactsTableBody');
  try {
    contactsData = await api.getContacts() || [];
    renderContacts();
  } catch (err) {
    toast(err.message, 'error');
    setEmpty('contactsTableBody', '❌', 'Failed to load', err.message);
  }
}

function renderContacts() {
  const filtered = contactsData.filter(c =>
    (c.name || '').toLowerCase().includes(contactsFilter) ||
    (c.mobile_number || '').includes(contactsFilter)
  );

  const countEl = document.getElementById('contactsCountLabel');
  if (countEl) {
    countEl.textContent = filtered.length
      ? `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`
      : '';
  }

  if (filtered.length === 0) {
    setEmpty(
      'contactsTableBody', '👥',
      contactsFilter ? 'No results found' : 'No contacts yet',
      contactsFilter
        ? `No contacts match "${contactsFilter}"`
        : 'Add contacts to start sending SMS notifications.'
    );
    return;
  }

  const rows = filtered.map((c, i) => `
    <tr>
      <td class="text-muted">${i + 1}</td>
      <td><strong>${escHtml(c.name)}</strong></td>
      <td><span class="phone-tag">${escHtml(c.mobile_number)}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn-icon edit"   title="Edit"   onclick="showEditContactModal('${escHtml(c.id)}')"><i class="ri-pencil-line"></i></button>
          <button class="btn-icon delete" title="Remove" onclick="handleDeleteContact('${escHtml(c.id)}','${escHtml(c.name)}')"><i class="ri-delete-bin-line"></i></button>
        </div>
      </td>
    </tr>`).join('');

  const mCards = filtered.map(c => `
    <div class="m-card">
      <div class="m-card-header">
        <div>
          <div class="m-card-title">${escHtml(c.name)}</div>
          <div class="m-card-sub"><span class="phone-tag">${escHtml(c.mobile_number)}</span></div>
        </div>
      </div>
      <div class="m-card-actions">
        <button class="btn-icon edit"   onclick="showEditContactModal('${escHtml(c.id)}')"><i class="ri-pencil-line"></i></button>
        <button class="btn-icon delete" onclick="handleDeleteContact('${escHtml(c.id)}','${escHtml(c.name)}')"><i class="ri-delete-bin-line"></i></button>
      </div>
    </div>`).join('');

  document.getElementById('contactsTableBody').innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Mobile Number</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="mobile-card-list">${mCards}</div>`;
}

// Search
document.getElementById('contactsSearch').addEventListener('input', e => {
  contactsFilter = e.target.value.toLowerCase().trim();
  renderContacts();
});

// ---- Add Contact ----
document.getElementById('addContactBtn').addEventListener('click', () => {
  openModal('Add Contact', `
    <form id="contactForm" novalidate>
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <div class="input-wrapper">
          <i class="ri-user-line input-icon"></i>
          <input type="text" id="cf_name" class="form-input" placeholder="e.g. Rahim Uddin" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mobile Number *</label>
        <div class="input-wrapper">
          <i class="ri-phone-line input-icon"></i>
          <input type="tel" id="cf_mobile" class="form-input" placeholder="e.g. 01712345678" required />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary" id="cf_submit">
          <i class="ri-user-add-line"></i> Add Contact
        </button>
      </div>
    </form>`);

  document.getElementById('contactForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('cf_submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="border-top-color:#000;width:16px;height:16px"></div>';
    try {
      await api.createContact({
        name:          document.getElementById('cf_name').value.trim(),
        mobile_number: document.getElementById('cf_mobile').value.trim(),
      });
      closeModal();
      toast('Contact added!', 'success');
      await loadContacts();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
});

// ---- Edit Contact ----
function showEditContactModal(id) {
  const c = contactsData.find(x => x.id === id);
  if (!c) return;

  openModal('Edit Contact', `
    <form id="editContactForm" novalidate>
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <div class="input-wrapper">
          <i class="ri-user-line input-icon"></i>
          <input type="text" id="ec_name" class="form-input" value="${escHtml(c.name)}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Mobile Number *</label>
        <div class="input-wrapper">
          <i class="ri-phone-line input-icon"></i>
          <input type="tel" id="ec_mobile" class="form-input" value="${escHtml(c.mobile_number)}" required />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary" id="ec_submit">
          <i class="ri-save-line"></i> Save Changes
        </button>
      </div>
    </form>`);

  document.getElementById('editContactForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('ec_submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="btn-spinner" style="border-top-color:#000;width:16px;height:16px"></div>';
    try {
      await api.updateContact(id, {
        name:          document.getElementById('ec_name').value.trim(),
        mobile_number: document.getElementById('ec_mobile').value.trim(),
      });
      closeModal();
      toast('Contact updated!', 'success');
      await loadContacts();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });
}

// ---- Delete Contact ----
async function handleDeleteContact(id, name) {
  const ok = await showConfirm(
    'Remove Contact',
    `Remove "${name}" from contacts? They will no longer receive SMS notifications.`,
    true
  );
  if (!ok) return;
  try {
    await api.deleteContact(id);
    toast('Contact removed.', 'success');
    await loadContacts();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ================================================
   SUB-ADMINS
   ================================================ */

document.getElementById('subAdminForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn  = document.getElementById('subAdminSubmitBtn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="btn-spinner" style="border-top-color:#000;width:18px;height:18px"></div>';
  try {
    await api.createSubAdmin({
      email:    document.getElementById('subAdminEmail').value.trim(),
      password: document.getElementById('subAdminPassword').value,
    });
    toast('Sub-admin created successfully!', 'success');
    document.getElementById('subAdminForm').reset();
  } catch (err) {
    toast(err.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = orig;
});

/* ================================================
   BOOTSTRAP
   ================================================ */

initUser();
navigate('overview');
