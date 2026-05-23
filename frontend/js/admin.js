// =============================================
// ADMIN DASHBOARD JAVASCRIPT
// =============================================

// ⚠️ UPDATE THIS AFTER RENDER DEPLOYMENT
const API_BASE = 'https://school-ai-agent-eynr.onrender.com';
const ADMIN_KEY = 'school-admin-super-secret-key-123';

const headers = {
  'Content-Type': 'application/json',
  'X-Admin-Key': ADMIN_KEY
};

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
      document.getElementById('serverStatus').textContent = '✅ Server Online';
      document.getElementById('dbStatusBadge').textContent = 'Connected';
      document.getElementById('dbStatusBadge').className = 'badge badge-green';
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
    }
  } catch (err) {
    document.getElementById('serverStatus').textContent = '❌ Server Offline';
    document.getElementById('serverStatus').style.color = '#e74c3c';
    document.getElementById('dbStatusBadge').textContent = 'Disconnected';
    document.getElementById('dbStatusBadge').className = 'badge badge-red';
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
startClock();
loadDashboard();
