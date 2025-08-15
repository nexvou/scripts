/**
 * Create coupons table
 * Main table for storing coupon and promotion data
 */

exports.up = function(knex) {
  return knex.schema.createTable('coupons', function(table) {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.text('description');
    table.enum('discount_type', ['percentage', 'fixed', 'shipping', 'cashback', 'bogo']).defaultTo('percentage');
    table.decimal('discount_value', 10, 2);
    table.string('discount_text', 100); // Original discount text from scraping
    table.string('coupon_code', 50);
    table.integer('platform_id').unsigned().references('id').inTable('platforms').onDelete('CASCADE');
    table.integer('merchant_id').unsigned().references('id').inTable('merchants').onDelete('SET NULL');
    table.text('source_url').notNullable();
    table.text('image_url');
    table.enum('status', ['active', 'expired', 'disabled', 'pending']).defaultTo('active');
    table.boolean('is_featured').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.decimal('min_purchase', 12, 2); // Minimum purchase amount
    table.decimal('max_discount', 10, 2); // Maximum discount amount
    table.integer('usage_limit'); // Usage limit per user
    table.integer('total_usage').defaultTo(0); // Total times used
    table.json('terms_conditions'); // Terms and conditions
    table.json('categories'); // Product categories
    table.datetime('valid_from');
    table.datetime('valid_until');
    table.datetime('scraped_at').notNullable();
    table.timestamps(true, true);
    
    // Unique constraint to prevent duplicates
    table.unique(['title', 'platform_id', 'merchant_id']);
    
    // Indexes for performance
    table.index('platform_id');
    table.index('merchant_id');
    table.index('status');
    table.index('is_featured');
    table.index('discount_type');
    table.index('valid_until');
    table.index('scraped_at');
    table.index(['platform_id', 'status']);
    table.index(['merchant_id', 'status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('coupons');
};