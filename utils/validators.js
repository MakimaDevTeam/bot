function isValidURL(str) {
  if (!str) return false;
  return /^https?:\/\/.+/i.test(str.trim());
}

function isValidHexColor(str) {
  if (!str) return false;
  const clean = str.trim().replace(/^#/, '');
  return /^[0-9A-Fa-f]{6}$/.test(clean);
}

function normalizeHexColor(str) {
  const clean = str.trim().replace(/^#/, '');
  return `#${clean.toUpperCase()}`;
}

module.exports = { isValidURL, isValidHexColor, normalizeHexColor };
