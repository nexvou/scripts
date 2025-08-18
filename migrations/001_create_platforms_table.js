/**
 * Create platforms table
 * Stores e-commerce platform configurations
 */

export const up = function (knex) {
    return knex.schema.createTable('platforms', function (table) {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.string('slug', 50).unique().notNullable();
        table.string('base_url', 255).notNullable();
        table.text('logo_url');
        table.json('endpoints'); // Store endpoint configurations
        table.json('selectors'); // Store CSS selectors
        table.json('limits'); // Store scraping limits
        table.boolean('is_active').defaultTo(true);
        table.integer('priority').defaultTo(1); // Scraping priority
        table.timestamps(true, true);

        // Indexes
        table.index('slug');
        table.index('is_active');
        table.index('priority');
    });
};

export const down = function (knex) {
    return knex.schema.dropTable('platforms');
};
