const db = require('../db/knex');
const {intervalId} = require('../config/blacklist');

async function truncateTables() {
    const tables = [
        'event_tickets',
        'event_prelegents',
        'event_resources',
        'event_sponsors',
        'event_caterings',
        'events',
        'prelegents',
        'users',
        'categories',
        'locales',
        'resources',
        'sponsors',
        'caterings',
    ];

    try {
        await db.raw(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
    } catch (error) {
        console.error('Error truncating tables:', error);
        throw error;
    }
}

beforeAll(async () => {
    console.log('Running migrations before tests...');
    try {
        await db.migrate.latest();
        console.log('Migrations complete.');
    } catch (error) {
        console.error('Error during beforeAll setup:', error);
        throw error;
    }
});

beforeEach(async () => {
    console.log('Cleanup database connection before single test...');
    await truncateTables();
});

afterAll(async () => {
    console.log('Closing database connection after tests...');
    try {
        await db.destroy();
        clearInterval(intervalId);
        console.log('Cleared blacklist cleanup interval.');
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error during afterAll cleanup:', error);
    }
});

afterEach(async () => {
    console.log('Cleanup database connection after single test...');
    await truncateTables();
})