#!/usr/bin/env node

/**
 * Nexvou Scripts Scraper CLI
 * Command line interface for the scraper system
 */

const path = require('path');
const KuponScraper = require('../index');

// Change working directory to script root
process.chdir(path.dirname(__dirname));

// Run the scraper
const scraper = new KuponScraper();
scraper.start().catch(console.error);
