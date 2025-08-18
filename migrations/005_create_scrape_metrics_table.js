/**
 * Create scrape_metrics table
 * Stores aggregated scraping metrics for monitoring
 */

export const up = function (knex) {
    return knex.schema.createTable('scrape_metrics', function (table) {
        table.increments('id').primary();
        table.date('date').notNullable();
        table.integer('platform_id').unsigned().references('id').inTable('platforms').onDelete('CASCADE');
        table.integer('total_sessions').defaultTo(0);
        table.integer('successful_sessions').defaultTo(0);
        table.integer('failed_sessions').defaultTo(0);
        table.integer('total_items_found').defaultTo(0);
        table.integer('total_items_saved').defaultTo(0);
        table.integer('total_items_updated').defaultTo(0);
        table.integer('total_items_failed').defaultTo(0);
        table.decimal('average_duration_ms', 10, 2);
        table.decimal('success_rate', 5, 2); // Percentage
        table.json('error_summary'); // Summary of errors
        table.timestamps(true, true);

        // Unique constraint
        table.unique(['date', 'platform_id']);

        // Indexes
        table.index('date');
        table.index('platform_id');
        table.index(['date', 'platform_id']);
    });
};

export const down = function (knex) {
    return knex.schema.dropTable('scrape_metrics');
};
