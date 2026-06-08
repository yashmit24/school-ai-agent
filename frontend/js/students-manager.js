/**
 * School Mitra — Student Management JS
 * Full CRUD: Add, Edit, Delete, Search, Filter
 */

var API = 'https://school-ai-agent-eynr.onrender.com';
var allStudents = [];   // full dataset
var deleteTargetId = null;

// ─────────────────────────────────────────
// AUTH HEADERS (JWT)
// ─────────────────────────────────────────
function getHdrs() {
  var token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

// ─────────────────────────────────────────
// LOAD ALL STUDENTS
// ─────────────────────────────────────────
async function loadStudents() {
  var tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row">⏳ Loading students...</td></tr>';

  try {
    var res = await fetch(API + '/api/students', { headers: getHdrs() });
    var json = await res.json();

    if (!json.success) throw new Error(json.error || 'Failed to load');
    allStudents = json.data || [];
    renderStudents(allStudents);
    updateStats(allStudents);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">❌ Error: ' + err.message + '</td></tr>';
  }
}

// ─────────────────────────────────────────
// RENDER TABLE
// ─────────────────────────────────────────
function renderStudents(list) {
  var tbody = document.getElementById('studentsBody');
  var countEl = document.getElementById('studentCount');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No students found. Click ➕ Add Student to get started!</td></tr>';
    if (countEl) countEl.textContent = '';
    return;
  }

  tbody.innerHTML = list.map(function(s, i) {
    var gender_icon = s.gender === 'Female' ? '👩‍🎓' : '👨‍🎓';
    var classLabel = s.class ? (s.section ? s.class + '-' + s.section : s.class) : '—';
    var blood = s.blood_group ? '<span class="badge-blood">' + s.blood_group + '</span>' : '—';
    var allergy = s.allergies && s.allergies !== 'None' && s.allergies !== 'none' && s.allergies !== ''
      ? '<br/><small style="color:#f7c948;font-size:0.72rem">⚠️ ' + s.allergies + '</small>' : '';

    return '<tr>' +
      '<td style="color:var(--text-muted)">' + (i + 1) + '</td>' +
      '<td><b>' + gender_icon + ' ' + (s.name || '—') + '</b>' + allergy + '</td>' +
      '<td><span class="badge-class">' + classLabel + '</span></td>' +
      '<td>' + (s.roll_no || '—') + '</td>' +
      '<td>' + (s.parent_name || '—') + '</td>' +
      '<td>' + (s.phone || '—') + '</td>' +
      '<td>' + blood + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="btn-edit" onclick="openEditStudentModal(\'' + s.id + '\')">✏️ Edit</button> ' +
        '<button class="btn-del" onclick="openDeleteModal(\'' + s.id + '\',\'' + escHtml(s.name) + '\')">🗑️</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  if (countEl) countEl.textContent = 'Showing ' + list.length + ' of ' + allStudents.length + ' students';
}

function escHtml(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────
function updateStats(list) {
  var el = document.getElementById('studentStats');
  if (!el) return;

  var total = list.length;
  var boys = list.filter(function(s){ return s.gender === 'Male'; }).length;
  var girls = list.filter(function(s){ return s.gender === 'Female'; }).length;
  var classes = {};
  list.forEach(function(s){ if(s.class) classes[s.class] = (classes[s.class]||0) + 1; });
  var classCount = Object.keys(classes).length;

  el.innerHTML =
    '<span>👥 Total: <b style="color:#e0e0f0">' + total + '</b></span>' +
    '<span>👨 Boys: <b style="color:#6c63ff">' + boys + '</b></span>' +
    '<span>👩 Girls: <b style="color:#48cfad">' + girls + '</b></span>' +
    '<span>🏫 Classes: <b style="color:#f7c948">' + classCount + '</b></span>';
}

// ─────────────────────────────────────────
// SEARCH + FILTER (live, client-side)
// ─────────────────────────────────────────
function filterStudents() {
  var q = (document.getElementById('studentSearch').value || '').toLowerCase();
  var cls = (document.getElementById('classFilter').value || '').toLowerCase();

  var filtered = allStudents.filter(function(s) {
    var matchQ = !q ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.parent_name || '').toLowerCase().includes(q) ||
      (s.roll_no || '').toString().includes(q) ||
      (s.class || '').toLowerCase().includes(q) ||
      (s.admission_no || '').toLowerCase().includes(q);
    var matchC = !cls || (s.class || '').toLowerCase() === cls;
    return matchQ && matchC;
  });

  renderStudents(filtered);
}

// ─────────────────────────────────────────
// OPEN ADD MODAL
// ─────────────────────────────────────────
window.openAddStudentModal = function() {
  document.getElementById('modalTitle').textContent = '➕ Add New Student';
  document.getElementById('studentForm').reset();
  document.getElementById('studentId').value = '';
  document.getElementById('saveStudentBtn').textContent = '💾 Save Student';
  hideModalAlert();
  showStudentModal();
};

// ─────────────────────────────────────────
// OPEN EDIT MODAL (pre-fill)
// ─────────────────────────────────────────
window.openEditStudentModal = function(id) {
  var s = allStudents.find(function(x){ return x.id === id; });
  if (!s) return;

  document.getElementById('modalTitle').textContent = '✏️ Edit Student';
  document.getElementById('studentId').value = s.id;
  setVal('sf_name', s.name);
  setVal('sf_admission_no', s.admission_no);
  setVal('sf_class', s.class);
  setVal('sf_section', s.section);
  setVal('sf_roll_no', s.roll_no);
  setVal('sf_gender', s.gender);
  setVal('sf_dob', s.dob);
  setVal('sf_blood_group', s.blood_group);
  setVal('sf_address', s.address);
  setVal('sf_parent_name', s.parent_name);
  setVal('sf_phone', s.phone);
  setVal('sf_email', s.email);
  setVal('sf_emergency_contact', s.emergency_contact);
  setVal('sf_telegram_id', s.telegram_id);
  setVal('sf_allergies', s.allergies);
  setVal('sf_medical_notes', s.medical_notes);
  document.getElementById('saveStudentBtn').textContent = '💾 Update Student';
  hideModalAlert();
  showStudentModal();
};

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val || '';
}

// ─────────────────────────────────────────
// SAVE STUDENT (Add or Update)
// ─────────────────────────────────────────
window.saveStudent = async function(e) {
  e.preventDefault();
  var btn = document.getElementById('saveStudentBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Saving...';
  hideModalAlert();

  var id = document.getElementById('studentId').value;
  var body = {
    name:              document.getElementById('sf_name').value.trim(),
    admission_no:      document.getElementById('sf_admission_no').value.trim(),
    class:             document.getElementById('sf_class').value,
    section:           document.getElementById('sf_section').value,
    roll_no:           document.getElementById('sf_roll_no').value || null,
    gender:            document.getElementById('sf_gender').value,
    dob:               document.getElementById('sf_dob').value || null,
    blood_group:       document.getElementById('sf_blood_group').value,
    address:           document.getElementById('sf_address').value.trim(),
    parent_name:       document.getElementById('sf_parent_name').value.trim(),
    phone:             document.getElementById('sf_phone').value.trim(),
    email:             document.getElementById('sf_email').value.trim(),
    emergency_contact: document.getElementById('sf_emergency_contact').value.trim(),
    telegram_id:       document.getElementById('sf_telegram_id').value.trim(),
    allergies:         document.getElementById('sf_allergies').value.trim(),
    medical_notes:     document.getElementById('sf_medical_notes').value.trim(),
  };

  try {
    var url = id ? API + '/api/students/' + id : API + '/api/students';
    var method = id ? 'PUT' : 'POST';
    var res = await fetch(url, { method: method, headers: getHdrs(), body: JSON.stringify(body) });
    var json = await res.json();

    if (json.success) {
      showModalAlert('✅ ' + (id ? 'Student updated!' : 'Student added!'), 'success');
      await loadStudents();
      setTimeout(function(){ closeStudentModal(); }, 1000);
    } else {
      throw new Error(json.error || 'Save failed');
    }
  } catch (err) {
    showModalAlert('❌ ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = id ? '💾 Update Student' : '💾 Save Student';
};

// ─────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────
window.openDeleteModal = function(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteStudentName').textContent = 'Student: ' + name;
  document.getElementById('deleteModal').style.display = 'flex';
};

window.confirmDelete = async function() {
  if (!deleteTargetId) return;
  try {
    var res = await fetch(API + '/api/students/' + deleteTargetId, { method: 'DELETE', headers: getHdrs() });
    var json = await res.json();
    if (json.success) {
      document.getElementById('deleteModal').style.display = 'none';
      deleteTargetId = null;
      loadStudents();
    } else {
      alert('Error: ' + json.error);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// ─────────────────────────────────────────
// MODAL HELPERS
// ─────────────────────────────────────────
function showStudentModal() {
  document.getElementById('studentModal').style.display = 'flex';
}

window.closeStudentModal = function() {
  document.getElementById('studentModal').style.display = 'none';
};

function showModalAlert(msg, type) {
  var el = document.getElementById('modalAlert');
  el.style.display = 'block';
  el.style.background = type === 'success' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)';
  el.style.border = '1px solid ' + (type === 'success' ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)');
  el.style.color = type === 'success' ? '#2ecc71' : '#e74c3c';
  el.textContent = msg;
}

function hideModalAlert() {
  var el = document.getElementById('modalAlert');
  if (el) el.style.display = 'none';
}

// Close modal on backdrop click
document.addEventListener('click', function(e) {
  if (e.target.id === 'studentModal') closeStudentModal();
  if (e.target.id === 'deleteModal') document.getElementById('deleteModal').style.display = 'none';
});

// ESC key closes modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeStudentModal();
    document.getElementById('deleteModal').style.display = 'none';
  }
});
