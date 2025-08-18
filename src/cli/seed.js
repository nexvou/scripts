#!/usr/bin/env node

/**
 * CLI Tool for Database Seeding
 * Usage: node src/cli/seed.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import DatabaseAdapter from '../database/DatabaseAdapter.js';
import Logger from '../utils/Logger.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Load environment variables with explicit path
dotenv.config({ path: join(projectRoot, '.env') });

const logger = new Logger('Seeding');

async function runSeeds() {
    const database = new DatabaseAdapter();

    try {
        logger.info('🌱 Starting database seeding...');

        await database.connect();
        await database.runSeeds();

        logger.info('✅ Seeding completed successfully');

        await database.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

runSeeds();
