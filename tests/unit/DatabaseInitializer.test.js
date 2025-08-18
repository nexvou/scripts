/**
 * DatabaseInitializer Unit Tests
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import DatabaseInitializer from '../../src/database/DatabaseInitializer.js';

// Mock the Logger
jest.mock('../../src/utils/Logger.js', () => {
    return jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }));
});

describe('DatabaseInitializer', () => {
    let initializer;
    const testDir = path.join(process.cwd(), 'test-data');
    const testDbPath = path.join(testDir, 'test.db');

    beforeEach(() => {
        initializer = new DatabaseInitializer();

        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('ensureDirectoryExists', () => {
        test('should create directory if it does not exist', async () => {
            expect(fs.existsSync(testDir)).toBe(false);

            await initializer.ensureDirectoryExists(testDir);

            expect(fs.existsSync(testDir)).toBe(true);
        });

        test('should not fail if directory already exists', async () => {
            fs.mkdirSync(testDir, { recursive: true });
            expect(fs.existsSync(testDir)).toBe(true);

            await expect(initializer.ensureDirectoryExists(testDir)).resolves.not.toThrow();
        });

        test('should create nested directories', async () => {
            const nestedDir = path.join(testDir, 'nested', 'deep');

            await initializer.ensureDirectoryExists(nestedDir);

            expect(fs.existsSync(nestedDir)).toBe(true);
        });
    });

    describe('validatePermissions', () => {
        test('should validate writable directory', async () => {
            fs.mkdirSync(testDir, { recursive: true });

            await expect(initializer.validatePermissions(testDir)).resolves.not.toThrow();
        });

        test('should throw error for non-existent directory', async () => {
            await expect(initializer.validatePermissions('/non/existent/path')).rejects.toThrow();
        });
    });

    describe('initializeSQLite', () => {
        test('should initialize SQLite with directory creation', async () => {
            const config = { filename: testDbPath };

            const result = await initializer.initializeSQLite(config);

            expect(result.success).toBe(true);
            expect(result.adapter).toBe('sqlite');
            expect(fs.existsSync(testDir)).toBe(true);
            expect(result.actions).toContain(`Ensured directory exists: ${testDir}`);
        });
    });

    describe('initializeMySQL', () => {
        test('should validate MySQL configuration', async () => {
            const config = {
                host: 'localhost',
                port: 3306,
                user: 'root',
                database: 'test',
            };

            const result = await initializer.initializeMySQL(config);

            expect(result.success).toBe(true);
            expect(result.adapter).toBe('mysql');
        });

        test('should throw error for missing configuration', async () => {
            const config = { host: 'localhost' }; // missing required fields

            await expect(initializer.initializeMySQL(config)).rejects.toThrow('Missing MySQL configuration');
        });
    });

    describe('initializePostgreSQL', () => {
        test('should validate PostgreSQL configuration', async () => {
            const config = {
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                database: 'test',
            };

            const result = await initializer.initializePostgreSQL(config);

            expect(result.success).toBe(true);
            expect(result.adapter).toBe('postgresql');
        });

        test('should throw error for missing configuration', async () => {
            const config = { host: 'localhost' }; // missing required fields

            await expect(initializer.initializePostgreSQL(config)).rejects.toThrow('Missing PostgreSQL configuration');
        });
    });

    describe('initializeSupabase', () => {
        test('should validate Supabase configuration', async () => {
            const config = {
                url: 'https://test.supabase.co',
                key: 'test-key',
            };

            const result = await initializer.initializeSupabase(config);

            expect(result.success).toBe(true);
            expect(result.adapter).toBe('supabase');
        });

        test('should throw error for missing configuration', async () => {
            const config = { url: 'https://test.supabase.co' }; // missing key

            await expect(initializer.initializeSupabase(config)).rejects.toThrow('Missing Supabase configuration');
        });
    });

    describe('createBackup', () => {
        test('should create backup of existing database', async () => {
            // Create test database file
            fs.mkdirSync(testDir, { recursive: true });
            fs.writeFileSync(testDbPath, 'test database content');

            const backupPath = await initializer.createBackup(testDbPath);

            expect(backupPath).toBeTruthy();
            expect(fs.existsSync(backupPath)).toBe(true);
            expect(fs.readFileSync(backupPath, 'utf8')).toBe('test database content');
        });

        test('should return null if no database exists', async () => {
            const backupPath = await initializer.createBackup(testDbPath);

            expect(backupPath).toBeNull();
        });
    });
});
