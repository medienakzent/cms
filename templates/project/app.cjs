/**
 * Startup file for Plesk (Phusion Passenger). Passenger loads CommonJS, the SvelteKit server
 * (build/index.js) is an ES module; `.env` next to this file is loaded because Plesk starts
 * `node` without it. Variables set in the Plesk panel take precedence.
 */
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const envFile = join(__dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

import('./build/index.js');
