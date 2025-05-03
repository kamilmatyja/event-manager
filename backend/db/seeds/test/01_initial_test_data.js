const bcrypt = require('bcrypt');
const {ROLES} = require('../../../config/roles');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {

    await knex('event_tickets').del();
    await knex('event_prelegents').del();
    await knex('event_resources').del();
    await knex('event_sponsors').del();
    await knex('event_caterings').del();
    await knex('events').del();
    await knex('prelegents').del();
    await knex('users').del();
    await knex('categories').del();
    await knex('locales').del();
    await knex('resources').del();
    await knex('sponsors').del();
    await knex('caterings').del();

    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('adminpass', saltRounds);
    const memberPassword = await bcrypt.hash('memberpass', saltRounds);

    const [adminUser] = await knex('users').insert([
        {
            first_name: 'Admin',
            last_name: 'User',
            nick: 'admin_user',
            email: 'admin@test.com',
            password: adminPassword,
            role: ROLES.ADMINISTRATOR,
        },
    ]).returning('*');

    const [memberUser] = await knex('users').insert([
        {
            first_name: 'Regular',
            last_name: 'Member',
            nick: 'member_user',
            email: 'member@test.com',
            password: memberPassword,
            role: ROLES.MEMBER,
        },
    ]).returning('*');

    const [catConf, catWorkshop] = await knex('categories').insert([
        {name: 'Konferencja Test', description: 'Testowe wydarzenia konferencyjne'},
        {name: 'Warsztat Test', description: 'Testowe sesje praktyczne'},
    ]).returning('*');

    const [localeWaw, localeKrk] = await knex('locales').insert([
        {city: 'Test Warszawa', name: 'Test Venue Waw'},
        {city: 'Test Kraków', name: 'Test Venue Krk'},
    ]).returning('*');

    const [prelegent1] = await knex('prelegents').insert([
        {user_id: adminUser.id, name: 'Dr. Admin Prelegent', description: 'Ekspert od testowania'}
    ]).returning('*');

    const [resource1] = await knex('resources').insert([
        {name: 'Test Projektor', description: 'Projektor do testów'}
    ]).returning('*');

    const [sponsor1] = await knex('sponsors').insert([
        {name: 'Test Sponsor Główny', description: 'Sponsoruje testy'}
    ]).returning('*');

    const [catering1] = await knex('caterings').insert([
        {name: 'Test Catering Kawowy', description: 'Kawa i ciastka na testy'}
    ]).returning('*');

    const [event1] = await knex('events').insert([
        {
            locale_id: localeWaw.id,
            category_id: catConf.id,
            name: 'Test Event Konferencja',
            description: 'Pierwsze testowe wydarzenie',
            price: 99.99,
            started_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            ended_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
    ]).returning('*');

    await knex('event_prelegents').insert({event_id: event1.id, prelegent_id: prelegent1.id});
    await knex('event_resources').insert({event_id: event1.id, resource_id: resource1.id});
    await knex('event_sponsors').insert({event_id: event1.id, sponsor_id: sponsor1.id});
    await knex('event_caterings').insert({event_id: event1.id, catering_id: catering1.id});

    await knex('events').insert([
        {
            locale_id: localeKrk.id,
            category_id: catWorkshop.id,
            name: 'Test Event Warsztat Pusty',
            description: 'Drugie testowe wydarzenie bez powiązań',
            price: 49.00,
            started_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            ended_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        },
    ]);

    await knex('event_tickets').insert([
        {event_id: event1.id, user_id: memberUser.id, price: event1.price}
    ]);

};