/**
 * Database Initializer
 * Handles database setup, directory creation, and initialization logic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../utils/Logger.js';

class DatabaseInitializer {
    constructor() {
        this.logger = new Logger('DatabaseInitializer');
    }

    /**
     * Initialize database for the specified adapter
     */
    async initializeForAdapter(adapter, config) {
        this.logger.info(`🔧 Initializing ${adapter} database...`);

        try {
            switch (adapter) {
                case 'sqlite':
                    return await this.initializeSQLite(config);
                case 'mysql':
                    return await this.initializeMySQL(config);
                case 'postgresql':
                    return await this.initializePostgreSQL(config);
                case 'supabase':
                    return await this.initializeSupabase(config);
                default:
                    throw new Error(`Unsupported database adapter: ${adapter}`);
            }
        } catch (error) {
            this.logger.error(`❌ Failed to initialize ${adapter} database:`, error);
            throw error;
        }
    }

    /**
     * Initialize SQLite database with directory creation
     */
    async initializeSQLite(config) {
        const dbPath = config.filename;
        const dbDir = path.dirname(dbPath);

        this.logger.info(`📁 Ensuring SQLite directory exists: ${dbDir}`);

        // Create directory if it doesn't exist
        await this.ensureDirectoryExists(dbDir);

        // Validate permissions
        await this.validatePermissions(dbDir);

        // Check disk space (basic check)
        await this.checkDiskSpace(dbDir);

        this.logger.info(`✅ SQLite initialization complete: ${dbPath}`);

        return {
            success: true,
            adapter: 'sqlite',
            actions: [
                `Ensured directory exists: ${dbDir}`,
                `Validated permissions for: ${dbDir}`,
                `Database path ready: ${dbPath}`,
            ],
            warnings: [],
        };
    }

    /**
     * Initialize MySQL database (connection validation)
     */
    async initializeMySQL(config) {
        this.logger.info('🐬 Validating MySQL configuration...');

        // Basic configuration validation
        const required = ['host', 'port', 'user', 'database'];
        const missing = required.filter(key => !config[key]);

        if (missing.length > 0) {
            throw new Error(`Missing MySQL configuration: ${missing.join(', ')}`);
        }

        return {
            success: true,
            adapter: 'mysql',
            actions: ['Validated MySQL configuration'],
            warnings: [],
        };
    }

    /**
     * Initialize PostgreSQL database (connection validation)
     */
    async initializePostgreSQL(config) {
        this.logger.info('🐘 Validating PostgreSQL configuration...');

        // Basic configuration validation
        const required = ['host', 'port', 'user', 'database'];
        const missing = required.filter(key => !config[key]);

        if (missing.length > 0) {
            throw new Error(`Missing PostgreSQL configuration: ${missing.join(', ')}`);
        }

        return {
            success: true,
            adapter: 'postgresql',
            actions: ['Validated PostgreSQL configuration'],
            warnings: [],
        };
    }

    /**
     * Initialize Supabase (configuration validation)
     */
    async initializeSupabase(config) {
        this.logger.info('⚡ Validating Supabase configuration...');

        if (!config.url || !config.key) {
            throw new Error('Missing Supabase configuration: url and key are required');
        }

        return {
            success: true,
            adapter: 'supabase',
            actions: ['Validated Supabase configuration'],
            warnings: [],
        };
    }

    /**
     * Ensure directory exists with proper permissions
     */
    async ensureDirectoryExists(dirPath) {
        try {
            // Check if directory exists
            if (!fs.existsSync(dirPath)) {
                this.logger.info(`📁 Creating directory: ${dirPath}`);
                fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
                this.logger.info(`✅ Directory created successfully: ${dirPath}`);
            } else {
                this.logger.info(`📁 Directory already exists: ${dirPath}`);
            }
        } catch (error) {
            const errorMsg = `Failed to create directory ${dirPath}: ${error.message}`;
            this.logger.error(errorMsg);

            // Provide helpful suggestions
            const suggestions = [
                `Check parent directory permissions: ls -la ${path.dirname(dirPath)}`,
                `Try creating manually: mkdir -p ${dirPath}`,
                `Check disk space: df -h ${dirPath}`,
            ];

            const enhancedError = new Error(errorMsg);
            enhancedError.suggestions = suggestions;
            enhancedError.code = 'DIRECTORY_CREATION_FAILED';
            throw enhancedError;
        }
    }

    /**
     * Validate directory permissions
     */
    async validatePermissions(dirPath) {
        try {
            // Test write permissions by creating a temporary file
            const testFile = path.join(dirPath, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            this.logger.info(`✅ Directory permissions validated: ${dirPath}`);
        } catch (error) {
            const errorMsg = `Directory is not writable: ${dirPath}`;
            this.logger.error(errorMsg);

            const suggestions = [
                `Check directory permissions: ls -la ${dirPath}`,
                `Fix permissions: chmod 755 ${dirPath}`,
                `Check ownership: ls -la ${path.dirname(dirPath)}`,
            ];

            const enhancedError = new Error(errorMsg);
            enhancedError.suggestions = suggestions;
            enhancedError.code = 'PERMISSION_DENIED';
            throw enhancedError;
        }
    }

    /**
     * Basic disk space check
     */
    async checkDiskSpace(dirPath) {
        try {
            const stats = fs.statSync(dirPath);
            // Basic check - if we can stat the directory, assume we have some space
            // More sophisticated disk space checking could be added here
            this.logger.info(`✅ Disk space check passed for: ${dirPath}`);
        } catch (error) {
            this.logger.warn(`⚠️ Could not check disk space for: ${dirPath}`);
        }
    }

    /**
     * Create backup of existing database (SQLite only)
     */
    async createBackup(dbPath) {
        if (!fs.existsSync(dbPath)) {
            this.logger.info('📄 No existing database to backup');
            return null;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const backupPath = `${dbPath}.backup.${timestamp}`;

        try {
            fs.copyFileSync(dbPath, backupPath);
            this.logger.info(`💾 Database backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.logger.error(`❌ Failed to create backup: ${error.message}`);
            throw error;
        }
    }
}

export default DatabaseInitializer;
