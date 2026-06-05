// =============================================
// ADMIN DASHBOARD JAVASCRIPT (with Language Switcher)
// =============================================

const API_BASE = 'https://school-ai-agent-eynr.onrender.com';

// ─── Auth Guard — redirect to login if no valid token
function getAdminToken() {
  return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
}

function authGuard() {
  const token = getAdminToken();
  if (!token) { window.location.href = 'login.html'; return false; }
  return token;
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAdminToken()}`
  };
}

// Logout
window.logoutAdmin = async function() {
  if (!confirm('Are you sure you want to logout?')) return;
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminUser');
  window.location.href = 'login.html';
};

// Show logged-in admin name
function showAdminUser() {
  const raw = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      const el = document.getElementById('adminUserName');
      if (el) el.textContent = '👤 ' + (u.name || u.email);
    } catch(e) {}
  }
}

const headers = getAuthHeaders();

// ─────────────────────────────────────────
// OVERRIDE setLang for admin-specific UI updates
// ─────────────────────────────────────────
function setLang(lang) {
  localStorage.setItem('schoolLang', lang);
  applyTranslations(lang);
  updateLangButtons(lang);
  // Update dynamic server status text if already loaded
  const ss = document.getElementById('serverStatus');
  if (ss && ss.dataset.online === 'true') {
    const onlineSpan = ss.querySelector('[data-i18n="status_online"]') || ss;
    if (onlineSpan) onlineSpan.textContent = t('status_online');
  }
}


// ─────────────────────────────────────────
// LIVE CLOCK
// ─────────────────────────────────────────
function startClock() {
  const el = document.getElementById('adminTime');
  function tick() {
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

// ─────────────────────────────────────────
// LOAD DASHBOARD STATS
// ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/dashboard`);
    const data = await res.json();

    if (data.success) {
      document.getElementById('statStudents').textContent = data.data.totalStudents;
      document.getElementById('statUnpaidFees').textContent = data.data.unpaidFees;
      document.getElementById('statExams').textContent = data.data.totalExams;
      document.getElementById('statStaff').textContent = data.data.totalStaff;
      const ss = document.getElementById('serverStatus');
      ss.textContent = t('status_online');
      ss.dataset.online = 'true';
      const dbBadge = document.getElementById('dbStatusBadge');
      dbBadge.textContent = t('status_connected');
      dbBadge.className = 'badge badge-green';
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
    }
  } catch (err) {
    const ss = document.getElementById('serverStatus');
    ss.textContent = t('status_offline');
    ss.style.color = '#e74c3c';
    ss.dataset.online = 'false';
    const dbBadge = document.getElementById('dbStatusBadge');
    dbBadge.textContent = t('status_disconnected');
    dbBadge.className = 'badge badge-red';
    console.error('Dashboard error:', err);
  }
}

// ─────────────────────────────────────────
// LOAD STUDENTS TABLE
// ─────────────────────────────────────────
async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/students`, { headers });
    const data = await res.json();
    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No students found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(s => `
      <tr>
        <td><b>${s.name || '—'}</b></td>
        <td>${s.class || '—'}</td>
        <td>${s.roll_no || '—'}</td>
        <td>${s.parent_name || '—'}</td>
        <td>${s.phone || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

// ─────────────────────────────────────────
// LOAD EXAMS TABLE
// ─────────────────────────────────────────
async function loadExams() {
  const tbody = document.getElementById('examsBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading...</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/exams`, { headers });
    const data = await res.json();
    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No exams found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(e => `
      <tr>
        <td><b>${e.name || '—'}</b></td>
        <td>${e.subject || '—'}</td>
        <td>${e.class || '—'}</td>
        <td>${e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${e.time || '—'}</td>
        <td>${e.room || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

// ─────────────────────────────────────────
// LOAD FEES TABLE
// ─────────────────────────────────────────
async function loadFees() {
  const tbody = document.getElementById('feesBody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Loading...</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/fees`, { headers });
    const data = await res.json();
    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No fee records found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(f => `
      <tr>
        <td><b>${f.students?.name || '—'}</b><br/><small style="color:var(--text-muted)">${f.students?.class || ''}</small></td>
        <td>₹${Number(f.amount || 0).toLocaleString('en-IN')}</td>
        <td>${f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN') : '—'}</td>
        <td>${f.paid ? '<span class="paid-badge">✅ Paid</span>' : '<span class="unpaid-badge">❌ Unpaid</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

// ─────────────────────────────────────────
// LOAD STAFF TABLE
// ─────────────────────────────────────────
async function loadStaff() {
  const tbody = document.getElementById('staffBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading...</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/admin/staff`);
    const data = await res.json();
    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No staff found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(s => `
      <tr>
        <td><b>${s.name || '—'}</b></td>
        <td>${s.role || '—'}</td>
        <td>${s.subject || '—'}</td>
        <td>${s.phone || '—'}</td>
        <td>${s.email || '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

// ─────────────────────────────────────────
// LOAD ATTENDANCE TABLE
// ─────────────────────────────────────────
async function loadAttendance() {
  const tbody = document.getElementById('attendanceBody');
  tbody.innerHTML = '<tr><td colspan="3" class="loading-row">Loading...</td></tr>';
  try {
    const res = await fetch(`${API_BASE}/api/attendance`, { headers });
    const data = await res.json();
    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No attendance records found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(a => {
      const badge = a.status === 'present' ? 'present-badge' :
                    a.status === 'absent'  ? 'absent-badge' : 'late-badge';
      return `
        <tr>
          <td><b>${a.students?.name || '—'}</b> <small style="color:var(--text-muted)">(${a.students?.class || ''})</small></td>
          <td>${a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—'}</td>
          <td><span class="${badge}">${a.status}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="loading-row">Error: ${err.message}</td></tr>`;
  }
}

// ─────────────────────────────────────────
// TAB NAVIGATION
// ─────────────────────────────────────────
const tabLoaders = { students: loadStudents, exams: loadExams, fees: loadFees, staff: loadStaff, attendance: loadAttendance };

document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tab)?.classList.add('active');

    document.getElementById('pageTitle').textContent =
      tab.charAt(0).toUpperCase() + tab.slice(1);

    if (tabLoaders[tab]) tabLoaders[tab]();

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  });
});

// ─────────────────────────────────────────
// MOBILE SIDEBAR TOGGLE
// ─────────────────────────────────────────
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
authGuard();          // Redirect to login if no token
showAdminUser();      // Show admin name in topbar
initLangSwitcher();   // from i18n.js — applies saved language on page load
startClock();
loadDashboard();
