'use strict';

/**
 * Shared helpers for the canon pipeline: a small JSON-schema subset
 * validator (the same subset the canon test suite uses), vocabulary slot
 * resolution, and canon filename/asset-id parsing. Pure JavaScript, no
 * native dependencies.
 */

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function deref(root, schema) {
  if (schema && schema.$ref) {
    const prefix = '#/$defs/';
    if (!schema.$ref.startsWith(prefix) || !root.$defs[schema.$ref.slice(prefix.length)]) {
      return null;
    }
    return deref(root, root.$defs[schema.$ref.slice(prefix.length)]);
  }
  return schema;
}

function typeOk(types, data) {
  return types.some((kind) => {
    if (kind === 'integer') return typeof data === 'number' && Number.isInteger(data);
    if (kind === 'number') return typeof data === 'number' && !Number.isNaN(data);
    if (kind === 'null') return data === null;
    if (kind === 'array') return Array.isArray(data);
    if (kind === 'object') return data !== null && typeof data === 'object' && !Array.isArray(data);
    if (kind === 'string') return typeof data === 'string';
    if (kind === 'boolean') return typeof data === 'boolean';
    return false;
  });
}

/**
 * Validate data against a (dereffable) schema subset: const, enum, type,
 * string length/pattern, number bounds, array items, object required /
 * additionalProperties / properties. Returns a list of error strings.
 */
function validate(root, schema, data, at) {
  const resolved = deref(root, schema);
  if (!resolved) return [`${at} bad $ref`];
  schema = resolved;
  const errors = [];

  if (schema.const !== undefined && data !== schema.const) return [`${at} const`];
  if (schema.enum && !schema.enum.includes(data)) return [`${at} enum`];
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!typeOk(types, data)) return [`${at} type`];
  }
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${at} minLength`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${at} pattern`);
    }
  }
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) errors.push(`${at} minimum`);
    if (schema.maximum !== undefined && data > schema.maximum) errors.push(`${at} maximum`);
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) errors.push(`${at} minItems`);
    if (schema.maxItems !== undefined && data.length > schema.maxItems) errors.push(`${at} maxItems`);
    if (schema.items) {
      data.forEach((item, index) => {
        errors.push(...validate(root, schema.items, item, `${at}/${index}`));
      });
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const props = schema.properties;
    if (schema.required) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) errors.push(`${at} missing ${key}`);
      }
    }
    if (props && schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) errors.push(`${at} unexpected ${key}`);
      }
    }
    if (props) {
      for (const [key, sub] of Object.entries(props)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          errors.push(...validate(root, sub, data[key], `${at}/${key}`));
        }
      }
    }
  }
  return errors;
}

/** True when a slot slug is allowed by the vocabulary for the given vi. */
function slotAllowed(vocab, slot, vi) {
  if (vocab.expression.includes(slot)) return true;
  if (vocab.pose.includes(slot)) return true;
  if (vocab.state.includes(slot)) return true;
  if ((vocab.reserved_slot || []).includes(slot)) return true;
  for (const prefix of vocab.slot_prefix || []) {
    if (!slot.startsWith(prefix)) continue;
    const rest = slot.slice(prefix.length);
    if (!KEBAB.test(rest)) return false;
    if (prefix === 'viseme-') return vocab.viseme.includes(rest);
    return true;
  }
  for (const pose of vocab.pose) {
    const head = `${pose}-`;
    if (slot.startsWith(head) && vocab.expression.includes(slot.slice(head.length))) return true;
  }
  const lists = vi && Array.isArray(vocab.bg[vi])
    ? [vocab.bg[vi]]
    : Object.values(vocab.bg);
  return lists.some((list) => Array.isArray(list) && list.includes(slot));
}

/** Parse a canon filename into parts, or null when the name is not canonical. */
function parseCanonFilename(name) {
  const match = /^(violet|wisteria|xylia|yarrow|zinnia)_(full|chibi|bg|sheet)_([a-z0-9]+(?:-[a-z0-9]+)*)_v([0-9]{3})\.png$/.exec(name);
  if (!match) return null;
  return {
    vi: match[1],
    type: match[2],
    slot: match[3],
    version: Number.parseInt(match[4], 10),
    assetId: `${match[1]}/${match[2]}/${match[3]}/v${match[4]}`,
  };
}

module.exports = { KEBAB, deref, validate, slotAllowed, parseCanonFilename };
