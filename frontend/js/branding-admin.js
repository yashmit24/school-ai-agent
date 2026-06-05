/**
 * School Mitra — Branding Admin Panel JS
 * Handles loading existing branding, logo upload, form save
 */

const API = 'https://school-ai-agent-eynr.onrender.com';

function getBrandingHeaders() {
  const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}
const ADMIN_HEADERS = getBrandingHeaders();

// ─────────────────────────────────────────
// LOAD EXISTING BRANDING INTO FORM
// ─────────────────────────────────────────
async function loadBrandingForm() {
  try {
    const res = await fetch(`${API}/api/branding`);
    const json = await res.json();
    if (!json.success) return;
    const b = json.data;

    // Fill form fields
    setValue('b_school_name',   b.school_name || '');
    setValue('b_tagline',       b.tagline || '');
    setValue('b_principal_name',b.principal_name || '');
    setValue('b_phone',         b.phone || '');
    setValue('b_email',         b.email || '');
    setValue('b_address',       b.address || '');
    setValue('b_logo_url',      b.logo_url || '');
    setValue('b_primary',       b.primary_color   || '#6c63ff');
    setValue('b_secondary',     b.secondary_color || '#48cfad');
    setValue('b_accent',        b.accent_color    || '#f7c948');

    // Update preview
    if (b.school_name)   setPreview('previewName', b.school_name);
    if (b.tagline)       setPreview('previewTagline', b.tagline);
    if (b.principal_name) setPreview('previewPrincipal', 'Principal: ' + b.principal_name);
    if (b.primary_color)   document.getElementById('previewColor1').style.background = b.primary_color;
    if (b.secondary_color) document.getElementById('previewColor2').style.background = b.secondary_color;
    if (b.accent_color)    document.getElementById('previewColor3').style.background = b.accent_color;

    if (b.logo_url) updateLogoPreview(b.logo_url);

  } catch (e) {
    console.error('Branding load error:', e.message);
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setPreview(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ─────────────────────────────────────────
// LOGO UPLOAD → convert to base64
// ─────────────────────────────────────────
window.handleLogoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Warn if file > 300KB
  if (file.size > 300 * 1024) {
    document.getElementById('logoSizeWarning').style.display = 'block';
    // Still try — compress via canvas
    compressAndPreview(file);
    return;
  }
  document.getElementById('logoSizeWarning').style.display = 'none';
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    document.getElementById('b_logo_url').value = base64;
    updateLogoPreview(base64);
  };
  reader.readAsDataURL(file);
};

// Compress image via canvas if too large
function compressAndPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { h = (h / w) * MAX; w = MAX; }
      else        { w = (w / h) * MAX; h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/png', 0.7);
      document.getElementById('b_logo_url').value = compressed;
      document.getElementById('logoSizeWarning').style.display = 'none';
      updateLogoPreview(compressed);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ─────────────────────────────────────────
// LOGO PREVIEW UPDATE
// ─────────────────────────────────────────
window.updateLogoPreview = function(src) {
  const img = document.getElementById('previewLogoImg');
  const emoji = document.getElementById('previewLogoEmoji');
  if (!src) {
    img.style.display = 'none';
    emoji.style.display = 'block';
    return;
  }
  img.src = src;
  img.style.display = 'block';
  emoji.style.display = 'none';
};

// ─────────────────────────────────────────
// SAVE BRANDING FORM
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load existing branding when branding tab is opened
  document.querySelector('[data-tab="branding"]')?.addEventListener('click', loadBrandingForm);

  const form = document.getElementById('brandingForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('brandingSaveBtn');
    const msg = document.getElementById('brandingSaveMsg');

    btn.textContent = '⏳ Saving...';
    btn.disabled = true;
    msg.style.display = 'none';

    try {
      const body = {
        school_name:     document.getElementById('b_school_name').value.trim(),
        tagline:         document.getElementById('b_tagline').value.trim(),
        principal_name:  document.getElementById('b_principal_name').value.trim(),
        phone:           document.getElementById('b_phone').value.trim(),
        email:           document.getElementById('b_email').value.trim(),
        address:         document.getElementById('b_address').value.trim(),
        logo_url:        document.getElementById('b_logo_url').value.trim(),
        primary_color:   document.getElementById('b_primary').value,
        secondary_color: document.getElementById('b_secondary').value,
        accent_color:    document.getElementById('b_accent').value,
      };

      const res = await fetch(`${API}/api/branding`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(body)
      });
      const json = await res.json();

      if (json.success) {
        btn.textContent = '✅ Saved!';
        msg.textContent = '🎉 Branding updated! Refreshing pages...';
        msg.style.color = '#2ecc71';
        msg.style.display = 'inline';

        // Clear cache so all pages pick up new branding
        if (window.SchoolBranding) window.SchoolBranding.refresh();

        setTimeout(() => {
          btn.textContent = '💾 Save Branding';
          btn.disabled = false;
          msg.style.display = 'none';
        }, 2500);
      } else {
        throw new Error(json.error || 'Save failed');
      }
    } catch (err) {
      btn.textContent = '❌ Failed';
      msg.textContent = 'Error: ' + err.message;
      msg.style.color = '#e74c3c';
      msg.style.display = 'inline';
      setTimeout(() => {
        btn.textContent = '💾 Save Branding';
        btn.disabled = false;
      }, 2000);
    }
  });
});
