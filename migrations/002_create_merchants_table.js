/**
 * Create merchants table
 * Stores merchant/brand information
 */

exports.up = function(knex) {
  return knex.schema.createTable('merchants', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('slug', 50).unique().notNullable();
    table.integer('platform_id').unsigned().references('id').inTable('platforms').onDelete('CASCADE');
    table.text('logo_url');
    table.string('website_url', 255);
    table.text('description');
    table.json('categories'); // Store merchant categories
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.timestamps(true, true);
    
    // Indexes
    table.index('slug');
    table.index('platform_id');
    table.index('is_active');
    table.index('is_verified');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('merchants');
};