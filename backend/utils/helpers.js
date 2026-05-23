/**
 * Helper Utility Functions
 * Small reusable functions used across the entire backend
 */

/**
 * Format a date to Indian readable format
 * e.g., 2026-06-15 → "15 June 2026"
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format currency in Indian Rupees
 * e.g., 5000 → "₹5,000.00"
 */
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

/**
 * Check if a date is within N days from today
 * Used for reminder checks
 */
function isDueSoon(dateStr, daysAhead = 3) {
  if (!dateStr) return false;
  const today = new Date();
  const dueDate = new Date(dateStr);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysAhead;
}

/**
 * Check if a date is overdue (in the past)
 */
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Sanitize user input (remove dangerous characters)
 */
function sanitizeInput(text) {
  if (!text) return '';
  return String(text).trim().substring(0, 2000); // Max 2000 chars
}

module.exports = { formatDate, formatCurrency, isDueSoon, isOverdue, getTodayStr, sanitizeInput };
