/**
 * Create scrape_sessions table
 * Tracks scraping sessions and performance metrics
 */

exports.up = function(knex) {
  return knex.schema.createTable('scrape_sessions', function(table) {
    table.increments('id').primary();
    table.uuid('session_id').unique().notNullable();
    table.integer('platform_id').unsigned().references('id').inTable('platforms').onDelete('CASCADE');
    table.enum('status', ['running', 'completed', 'failed', 'cancelled']).defaultTo('running');
    table.datetime('started_at').notNullable();
    table.datetime('completed_at');
    table.integer('duration_ms'); // Duration in milliseconds
    table.integer('items_found').defaultTo(0);
    table.integer('items_saved').defaultTo(0);
    table.integer('items_updated').defaultTo(0);
    table.integer('items_failed').defaultTo(0);
    table.json('error_details'); // Store error information
    table.json('performance_metrics'); // Store performance data
    table.string('scraper_version', 20); // Track scraper version
    table.string('user_agent', 255); // Track user agent used
    table.timestamps(true, true);
    
    // Indexes
    table.index('session_id');
    table.index('platform_id');
    table.index('status');
    table.index('started_at');
    table.index(['platform_id', 'status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scrape_sessions');
};