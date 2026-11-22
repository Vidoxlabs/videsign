'use strict';

const service = require('../../lib/asset-service');

/**
 * Cloudflare Worker entrypoint for the Phase 0 read-only VI persona asset service
 * (ADR-022, extending ADR-010 item 3).
 */
module.exports = {
  fetch: service.handleFetch,
  ...service,
};
