'use strict';

/**
 * Fail-closed readers for brand/tokens.json, brand/brand.json, and
 * brand/MANIFEST.json. An unset, blank, or empty document is denied.
 */

const REQUIRED_TOKEN_KEYS = [
  'brand-signature-violet-base',
  'brand-signature-wisteria-base',
  'brand-signature-xylia-base',
  'brand-signature-yarrow-base',
  'brand-signature-zinnia-base',
  'brand-field-dark',
  'brand-field-light',
  'ambient-glow-wisteria-base',
];

const REQUIRED_SPEC_KEYS = ['facets', 'vi', 'min_sizes_px', 'card_sizes_px'];

function emptyError(message) {
  const error = new Error(message);
  error.code = 'BRAND_CONFIG_EMPTY';
  return error;
}

function parseObject(raw, label) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw emptyError(`${label} is unset or empty`);
  }
  let data;
  try {
    data = JSON.parse(String(raw));
  } catch (err) {
    throw emptyError(`${label} is unset or empty`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw emptyError(`${label} is unset or empty`);
  }
  if (Object.keys(data).length === 0) {
    throw emptyError(`${label} is unset or empty`);
  }
  return data;
}

function loadBrandTokens(raw) {
  const data = parseObject(raw, 'brand tokens');
  for (const key of REQUIRED_TOKEN_KEYS) {
    const value = data[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw emptyError(`brand token ${key} is unset or empty`);
    }
  }
  return data;
}

function loadBrandSpec(raw) {
  const data = parseObject(raw, 'brand spec');
  for (const key of REQUIRED_SPEC_KEYS) {
    const value = data[key];
    if (value === undefined || value === null || value === '') {
      throw emptyError(`brand spec ${key} is unset or empty`);
    }
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      throw emptyError(`brand spec ${key} is unset or empty`);
    }
  }
  if (!Array.isArray(data.facets.top) || data.facets.top.length === 0) {
    throw emptyError('brand spec facets.top is unset or empty');
  }
  if (!Array.isArray(data.facets.side) || data.facets.side.length === 0) {
    throw emptyError('brand spec facets.side is unset or empty');
  }
  if (typeof data.facets.band !== 'string' || data.facets.band.trim() === '') {
    throw emptyError('brand spec facets.band is unset or empty');
  }
  if (!data.vi || typeof data.vi !== 'object' || Object.keys(data.vi).length === 0) {
    throw emptyError('brand spec vi is unset or empty');
  }
  return data;
}

function loadBrandManifest(raw) {
  const data = parseObject(raw, 'brand manifest');
  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw emptyError('brand manifest is unset or empty');
  }
  for (const row of data.files) {
    if (row === null || typeof row !== 'object') {
      throw emptyError('brand manifest row is unset or empty');
    }
    for (const key of ['path', 'family', 'asset', 'version', 'sha256']) {
      if (typeof row[key] !== 'string' || row[key].trim() === '') {
        throw emptyError(`brand manifest ${key} is unset or empty`);
      }
    }
  }
  return data;
}

module.exports = {
  REQUIRED_TOKEN_KEYS,
  loadBrandTokens,
  loadBrandSpec,
  loadBrandManifest,
};
