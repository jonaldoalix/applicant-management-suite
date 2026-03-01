/**
 * Backend Entry Point
 * Aggregates functional modules for the Firebase runtime.
 */

const admin = require('firebase-admin');

// Initialize the App instance once for all modules
admin.initializeApp();

// Export Modules
exports.auth = require('./src/modules/auth');
exports.audit = require('./src/modules/audit');
exports.interviews = require('./src/modules/interviews');
exports.daily = require('./src/modules/dailyCo');
exports.mail = require('./src/modules/zoho');
exports.search = require('./src/modules/search');
exports.sms = require('./src/modules/twilio');
exports.admin = require('./src/modules/backfill');
exports.automations = require('./src/modules/automations');
