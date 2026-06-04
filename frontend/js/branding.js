/**
 * School Mitra — Global Branding Engine
 * Loads school branding from API and applies it across ALL pages automatically.
 * Include this script in every HTML page.
 */

const BRANDING_API = 'https://school-ai-agent-eynr.onrender.com/api/branding';
const BRANDING_CACHE_KEY = 'schoolMitraBranding';
const BRANDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────
// LOAD BRANDING (cache-first for speed)
// ─────────────────────────────────────────
async function loadBranding() {
  try {
    // Try cache first
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < BRANDING_CACHE_TTL) {
        applyBranding(data);
        return data;
      }
    }

    // Fetch from API
    const res = await fetch(BRANDING_API);
    const json = await res.json();
    if (json.success && json.data) {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify({ data: json.data, ts: Date.now() }));
      applyBranding(json.data);
      return json.data;
    }
  } catch (e) {
    // Silently fail — use defaults already in HTML
    console.log('Branding: using defaults');
  }
  return null;
}

// ─────────────────────────────────────────
// APPLY BRANDING TO PAGE
// ─────────────────────────────────────────
function applyBranding(b) {
  if (!b) return;

  // ── CSS Variables (colors)
  const root = document.documentElement;
  if (b.primary_color)   root.style.setProperty('--brand-primary',   b.primary_color);
  if (b.secondary_color) root.style.setProperty('--brand-secondary', b.secondary_color);
  if (b.accent_color)    root.style.setProperty('--brand-accent',    b.accent_color);

  // Derive gradient from brand colors
  if (b.primary_color && b.secondary_color) {
    root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${b.primary_color}, ${b.secondary_color})`);
  }

  // ── Page Title
  if (b.school_name) {
    const currentTitle = document.title;
    // Only update if title contains generic placeholder
    if (currentTitle.includes('Sunshine Public School') || currentTitle.includes('School Mitra')) {
      document.title = currentTitle.replace(/Sunshine Public School|School Mitra AI/g, b.school_name);
    }
  }

  // ── Logo — replace any .brand-logo or .logo-icon with actual logo
  if (b.logo_url) {
    // Replace emoji logos with actual image
    document.querySelectorAll('.logo-icon, .nav-logo-icon, .brand-logo-icon').forEach(el => {
      const img = document.createElement('img');
      img.src = b.logo_url;
      img.alt = b.school_name || 'School Logo';
      img.style.cssText = 'width:36px;height:36px;object-fit:contain;border-radius:8px;';
      el.replaceWith(img);
    });

    // Update favicon
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = b.logo_url;
  }

  // ── School Name text nodes
  if (b.school_name) {
    document.querySelectorAll('.logo-text, .brand-name, .school-name-text').forEach(el => {
      el.textContent = b.school_name;
    });
  }

  // ── Tagline
  if (b.tagline) {
    document.querySelectorAll('.brand-tagline, .school-tagline').forEach(el => {
      el.textContent = b.tagline;
    });
  }

  // ── Principal name
  if (b.principal_name) {
    document.querySelectorAll('.principal-name').forEach(el => {
      el.textContent = b.principal_name;
    });
  }

  // ── Footer address / contact
  if (b.address) {
    document.querySelectorAll('.footer-address, .school-address').forEach(el => {
      el.textContent = b.address;
    });
  }
  if (b.phone) {
    document.querySelectorAll('.footer-phone, .school-phone').forEach(el => {
      el.textContent = b.phone;
    });
  }
  if (b.email) {
    document.querySelectorAll('.footer-email, .school-email').forEach(el => {
      el.textContent = b.email;
    });
  }

  // ── Copyright footer
  if (b.school_name) {
    document.querySelectorAll('.footer-copyright').forEach(el => {
      el.textContent = `© ${new Date().getFullYear()} ${b.school_name}. Powered by School Mitra AI.`;
    });
  }

  // Dispatch event so other scripts can react
  document.dispatchEvent(new CustomEvent('brandingLoaded', { detail: b }));
}

// ─────────────────────────────────────────
// FORCE REFRESH (call after saving branding)
// ─────────────────────────────────────────
function refreshBranding() {
  localStorage.removeItem(BRANDING_CACHE_KEY);
  return loadBranding();
}

// ─────────────────────────────────────────
// AUTO-RUN on page load
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadBranding);

// Export for admin panel use
window.SchoolBranding = { load: loadBranding, apply: applyBranding, refresh: refreshBranding };
