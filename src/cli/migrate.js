#!/usr/bin/env node

/**
 * CLI Tool for Database Migrations
 * Usage: node src/cli/migrate.js
 */

const DatabaseAdapter = require('../database/DatabaseAdapter');
const Logger = require('../utils/Logger');

const logger = new Logger('Migration');

async function runMigrations() {
  const database = new DatabaseAdapter();
  
  try {
    logger.info('🚀 Starting database migrations...');
    
    await database.connect();
    await database.runMigrations();
    
    logger.info('✅ Migrations completed successfully');
    
    await database.close();
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();