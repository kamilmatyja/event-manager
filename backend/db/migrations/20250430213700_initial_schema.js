/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('first_name', 100).notNullable();
        table.string('last_name', 100).notNullable();
        table.string('nick', 100).notNullable().unique();
        table.string('email', 255).notNullable().unique();
        table.string('password', 255).notNullable();
        table.integer('role').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('locales', (table) => {
        table.increments('id').primary();
        table.string('city', 100).notNullable();
        table.string('name', 100).notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description').notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('events', (table) => {
        table.increments('id').primary();
        table.integer('locale_id').notNullable().references('id').inTable('locales').onDelete('RESTRICT').onUpdate('CASCADE')
        table.integer('category_id').notNullable().references('id').inTable('categories').onDelete('RESTRICT').onUpdate('CASCADE');
        table.string('name', 255).notNullable().unique();
        table.text('description').notNullable().unique();
        table.decimal('price', 10, 2).notNullable();
        table.timestamp('started_at').notNullable();
        table.timestamp('ended_at').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('event_tickets', (table) => {
        table.increments('id').primary();
        table.integer('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
        table.decimal('price', 10, 2).notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['event_id', 'user_id']);
    });

    await knex.schema.createTable('prelegents', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT').onUpdate('CASCADE');
        table.string('name', 100).notNullable().unique();
        table.text('description').notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('event_prelegents', (table) => {
        table.increments('id').primary();
        table.integer('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
        table.integer('prelegent_id').notNullable().references('id').inTable('prelegents').onDelete('RESTRICT').onUpdate('CASCADE');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['event_id', 'prelegent_id']);
    });

    await knex.schema.createTable('resources', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description').notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('event_resources', (table) => {
        table.increments('id').primary();
        table.integer('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
        table.integer('resource_id').notNullable().references('id').inTable('resources').onDelete('RESTRICT').onUpdate('CASCADE');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['event_id', 'resource_id']);
    });

    await knex.schema.createTable('sponsors', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description').notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('event_sponsors', (table) => {
        table.increments('id').primary();
        table.integer('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
        table.integer('sponsor_id').notNullable().references('id').inTable('sponsors').onDelete('RESTRICT').onUpdate('CASCADE');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['event_id', 'sponsor_id']);
    });

    await knex.schema.createTable('caterings', (table) => {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        table.text('description').notNullable().unique();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });

    await knex.schema.createTable('event_caterings', (table) => {
        table.increments('id').primary();
        table.integer('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE').onUpdate('CASCADE');
        table.integer('catering_id').notNullable().references('id').inTable('caterings').onDelete('RESTRICT').onUpdate('CASCADE');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.unique(['event_id', 'catering_id']);
    });

    const tables = [
        'users', 'locales', 'categories', 'events', 'event_tickets',
        'prelegents', 'event_prelegents', 'resources', 'event_resources',
        'sponsors', 'event_sponsors', 'caterings', 'event_caterings'
    ];
    for (const table of tables) {
        await knex.raw(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
               NEW.updated_at = now();
               RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        await knex.raw(`
            CREATE TRIGGER ${table}_updated_at_modtime
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {

    const tables = [
        'users', 'locales', 'categories', 'events', 'event_tickets',
        'prelegents', 'event_prelegents', 'resources', 'event_resources',
        'sponsors', 'event_sponsors', 'caterings', 'event_caterings'
    ];
    for (const table of tables) {
        await knex.raw(`DROP TRIGGER IF EXISTS ${table}_updated_at_modtime ON ${table};`);
    }
    await knex.raw(`DROP FUNCTION IF EXISTS update_updated_at_column();`);

    await knex.schema.dropTableIfExists('event_caterings');
    await knex.schema.dropTableIfExists('caterings');
    await knex.schema.dropTableIfExists('event_sponsors');
    await knex.schema.dropTableIfExists('sponsors');
    await knex.schema.dropTableIfExists('event_resources');
    await knex.schema.dropTableIfExists('resources');
    await knex.schema.dropTableIfExists('event_prelegents');
    await knex.schema.dropTableIfExists('prelegents');
    await knex.schema.dropTableIfExists('event_tickets');
    await knex.schema.dropTableIfExists('events');
    await knex.schema.dropTableIfExists('categories');
    await knex.schema.dropTableIfExists('locales');
    await knex.schema.dropTableIfExists('users');
};