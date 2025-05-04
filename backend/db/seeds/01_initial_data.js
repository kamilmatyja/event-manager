const bcrypt = require('bcrypt');
const {ROLES} = require('../../config/roles');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    console.log('Deleting existing data...');

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
    console.log('Existing data deleted.');

    const saltRounds = 10;

    console.log('Inserting users...');
    let password = await bcrypt.hash('zaq1@WSX', saltRounds);

    const usersToInsert = [
        {
            first_name: 'Admin', last_name: 'Root', nick: 'admin_root',
            email: 'admin@example.com', password: password, role: ROLES.ADMINISTRATOR,
        },
        {
            first_name: 'Regular', last_name: 'Member', nick: 'member_one',
            email: 'member@example.com', password: password, role: ROLES.MEMBER,
        },
        {
            first_name: 'Anna',
            last_name: 'Nowak',
            nick: 'anna_prelegent',
            email: 'anna.prelegent@example.com',
            password: await bcrypt.hash('prelegentPass1', saltRounds),
            role: ROLES.PRELEGENT,
        },
        {
            first_name: 'Piotr', last_name: 'Kowalski', nick: 'piotr_member',
            email: 'piotr@example.com', password: await bcrypt.hash('memberPass2', saltRounds), role: ROLES.MEMBER,
        },
        {
            first_name: 'Jan',
            last_name: 'Zieliński',
            nick: 'jan_prelegent',
            email: 'jan.prelegent@example.com',
            password: await bcrypt.hash('prelegentPass2', saltRounds),
            role: ROLES.PRELEGENT,
        },
        ...Array.from({length: 5}, (_, i) => ({
            first_name: `UserFirstName${i + 6}`,
            last_name: `UserLastName${i + 6}`,
            nick: `user_${i + 6}`,
            email: `user${i + 6}@example.com`,
            password: bcrypt.hashSync(`userPass${i + 6}`, saltRounds),
            role: ROLES.MEMBER,
        })),
    ];
    const insertedUsers = await knex('users').insert(usersToInsert).returning('*');
    console.log(`Inserted ${insertedUsers.length} users.`);

    console.log('Inserting categories...');
    const categoriesToInsert = [
        {name: 'Konferencja Tech', description: 'Wydarzenia poświęcone technologii.'},
        {name: 'Warsztat Programowania', description: 'Praktyczne sesje kodowania.'},
        {name: 'Networking Biznesowy', description: 'Spotkania dla profesjonalistów.'},
        {name: 'Szkolenie Marketingowe', description: 'Rozwój kompetencji marketingowych.'},
        {name: 'Panel Dyskusyjny', description: 'Dyskusje ekspertów na ważne tematy.'},
        {name: 'Hackathon', description: 'Maratony programowania.'},
        {name: 'Meetup Społeczności', description: 'Nieformalne spotkania grupowe.'},
        {name: 'Prezentacja Produktu', description: 'Pokazy nowych produktów lub usług.'},
        {name: 'Gala Wręczenia Nagród', description: 'Uroczyste wydarzenia z nagrodami.'},
        {name: 'Targi Pracy IT', description: 'Wydarzenia rekrutacyjne dla branży IT.'},
    ];
    const insertedCategories = await knex('categories').insert(categoriesToInsert).returning('*');
    console.log(`Inserted ${insertedCategories.length} categories.`);

    console.log('Inserting locales...');
    const localesToInsert = [
        {city: 'Warszawa', name: 'Centrum Konferencyjne Złote Tarasy'},
        {city: 'Kraków', name: 'ICE Kraków Congress Centre'},
        {city: 'Wrocław', name: 'Hala Stulecia'},
        {city: 'Poznań', name: 'Międzynarodowe Targi Poznańskie'},
        {city: 'Gdańsk', name: 'AmberExpo'},
        {city: 'Warszawa', name: 'PGE Narodowy - Strefa Biznes'},
        {city: 'Katowice', name: 'Międzynarodowe Centrum Kongresowe'},
        {city: 'Łódź', name: 'EC1 Łódź - Miasto Kultury'},
        {city: 'Online', name: 'Platforma Zoom Events'},
        {city: 'Online', name: 'Platforma Hopin'},
    ];
    const insertedLocales = await knex('locales').insert(localesToInsert).returning('*');
    console.log(`Inserted ${insertedLocales.length} locales.`);

    console.log('Inserting prelegents...');
    const prelegentsToInsert = [

        {
            user_id: insertedUsers.find(u => u.nick === 'anna_prelegent').id,
            name: 'Dr Anna Nowak',
            description: 'Specjalistka AI i Machine Learning.'
        },
        {
            user_id: insertedUsers.find(u => u.nick === 'jan_prelegent').id,
            name: 'Prof. Jan Zieliński',
            description: 'Ekspert cyberbezpieczeństwa.'
        },
        {
            user_id: insertedUsers.find(u => u.nick === 'admin_root').id,
            name: 'Admin Prelegent Wewn.',
            description: 'Prelegent wewnętrzny firmy.'
        },

        ...insertedUsers.slice(3, 10).map((user, i) => ({
            user_id: user.id,
            name: `${user.first_name} ${user.last_name} (Prelegent ${i + 3})`,
            description: `Opis prelegenta dla ${user.nick}. Zajmuje się tematyką ${i % 2 === 0 ? 'Frontend' : 'Backend'} i chmurą.`,
        })),
    ];
    const insertedPrelegents = await knex('prelegents').insert(prelegentsToInsert).returning('*');
    console.log(`Inserted ${insertedPrelegents.length} prelegents.`);

    console.log('Inserting resources...');
    const resourcesToInsert = [
        {name: 'Projektor 1080p', description: 'Standardowy projektor Full HD.'},
        {name: 'Ekran Projekcyjny Duży', description: 'Ekran 3x2m.'},
        {name: 'System Nagłośnienia', description: 'Mikrofony, głośniki, mikser.'},
        {name: 'Flipchart + Markery', description: 'Tablica z papierem i pisakami.'},
        {name: 'Laptop Prezentera', description: 'Laptop z podstawowym oprogramowaniem.'},
        {name: 'Dostęp do Wi-Fi (Gość)', description: 'Sieć bezprzewodowa dla uczestników.'},
        {name: 'Stanowiska komputerowe (x10)', description: 'Dziesięć komputerów dla warsztatów.'},
        {name: 'Drukarka', description: 'Drukarka laserowa A4.'},
        {name: 'Rzutnik Multimedialny Laserowy', description: 'Projektor wysokiej jakości.'},
        {name: 'Obsługa Techniczna', description: 'Dedykowany technik na miejscu.'},
    ];
    const insertedResources = await knex('resources').insert(resourcesToInsert).returning('*');
    console.log(`Inserted ${insertedResources.length} resources.`);

    console.log('Inserting sponsors...');
    const sponsorsToInsert = [
        {name: 'TechCorp Global', description: 'Międzynarodowa firma technologiczna.'},
        {name: 'Innovate Solutions', description: 'Dostawca innowacyjnych rozwiązań IT.'},
        {name: 'CloudMasters', description: 'Specjaliści od rozwiązań chmurowych.'},
        {name: 'CodeCrafters Academy', description: 'Akademia programowania.'},
        {name: 'Marketing Wizards', description: 'Agencja marketingowa.'},
        {name: 'Startup Hub Poland', description: 'Wsparcie dla startupów.'},
        {name: 'Eco Power Ltd.', description: 'Firma z branży OZE.'},
        {name: 'Finance Experts Group', description: 'Doradztwo finansowe.'},
        {name: 'Local Software House', description: 'Lokalny producent oprogramowania.'},
        {name: 'University of Technology', description: 'Partner Akademicki.'},
    ];
    const insertedSponsors = await knex('sponsors').insert(sponsorsToInsert).returning('*');
    console.log(`Inserted ${insertedSponsors.length} sponsors.`);

    console.log('Inserting caterings...');
    const cateringsToInsert = [
        {name: 'Przerwa Kawowa Standard', description: 'Kawa, herbata, ciastka.'},
        {name: 'Lunch Bufetowy', description: 'Zestaw obiadowy w formie bufetu.'},
        {name: 'Kanapki Konferencyjne', description: 'Różnorodne kanapki.'},
        {name: 'Opcje Wegańskie', description: 'Posiłki przygotowane bez składników odzwierzęcych.'},
        {name: 'Opcje Bezglutenowe', description: 'Posiłki bez glutenu.'},
        {name: 'Finger Food', description: 'Małe przekąski.'},
        {name: 'Napoje Zimne', description: 'Soki, woda, napoje gazowane.'},
        {name: 'Kolacja Bankietowa', description: 'Uroczysta kolacja serwowana.'},
        {name: 'Stoisko z Owocami', description: 'Świeże owoce sezonowe.'},
        {name: 'Pełne Wyżywienie Całodniowe', description: 'Obejmuje przerwy kawowe, lunch i kolację.'},
    ];
    const insertedCaterings = await knex('caterings').insert(cateringsToInsert).returning('*');
    console.log(`Inserted ${insertedCaterings.length} caterings.`);

    console.log('Inserting events...');
    const eventsToInsert = [];
    const baseDate = Date.now();
    for (let i = 0; i < 10; i++) {
        const startDaysOffset = (i + 1) * 7;
        const endDaysOffset = startDaysOffset + (i % 3);
        const startTime = new Date(baseDate + startDaysOffset * 24 * 60 * 60 * 1000);

        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(baseDate + endDaysOffset * 24 * 60 * 60 * 1000);

        endTime.setHours(17, 0, 0, 0);

        eventsToInsert.push({
            locale_id: insertedLocales[i % insertedLocales.length].id,
            category_id: insertedCategories[i % insertedCategories.length].id,
            name: `Wydarzenie Testowe #${i + 1} - ${insertedCategories[i % insertedCategories.length].name}`,
            description: `Szczegółowy opis wydarzenia testowego numer ${i + 1}. Tematyka: ${insertedCategories[i % insertedCategories.length].name}. Lokalizacja: ${insertedLocales[i % insertedLocales.length].name}, ${insertedLocales[i % insertedLocales.length].city}.`,
            price: (50 + Math.random() * 250).toFixed(2),
            started_at: startTime,
            ended_at: endTime,
        });
    }
    const insertedEvents = await knex('events').insert(eventsToInsert).returning('*');
    console.log(`Inserted ${insertedEvents.length} events.`);

    console.log('Populating junction tables...');
    const eventPrelegentsToInsert = [];
    const eventResourcesToInsert = [];
    const eventSponsorsToInsert = [];
    const eventCateringsToInsert = [];
    const eventTicketsToInsert = [];

    insertedEvents.forEach((event) => {
        if (Math.random() > 0.3) {
            const numPrelegents = Math.floor(Math.random() * 3) + 1;
            const shuffledPrelegents = [...insertedPrelegents].sort(() => 0.5 - Math.random());
            for (let i = 0; i < numPrelegents && i < shuffledPrelegents.length; i++) {
                eventPrelegentsToInsert.push({event_id: event.id, prelegent_id: shuffledPrelegents[i].id});
            }
        }

        const numResources = Math.floor(Math.random() * 4) + 2;
        const shuffledResources = [...insertedResources].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numResources && i < shuffledResources.length; i++) {
            eventResourcesToInsert.push({event_id: event.id, resource_id: shuffledResources[i].id});
        }

        if (Math.random() > 0.5) {
            const numSponsors = Math.floor(Math.random() * 2) + 1;
            const shuffledSponsors = [...insertedSponsors].sort(() => 0.5 - Math.random());

            for (let i = 0; i < numSponsors && i < shuffledSponsors.length; i++) {
                eventSponsorsToInsert.push({event_id: event.id, sponsor_id: shuffledSponsors[i].id});
            }
        }

        const numCaterings = Math.floor(Math.random() * 4) + 1;
        const shuffledCaterings = [...insertedCaterings].sort(() => 0.5 - Math.random());

        for (let i = 0; i < numCaterings && i < shuffledCaterings.length; i++) {
            eventCateringsToInsert.push({event_id: event.id, catering_id: shuffledCaterings[i].id});
        }

        insertedUsers.forEach(user => {
            if (user.role !== ROLES.ADMINISTRATOR && Math.random() > 0.7) {
                eventTicketsToInsert.push({event_id: event.id, user_id: user.id, price: event.price});
            }
        });
    });

    if (eventPrelegentsToInsert.length > 0) await knex('event_prelegents').insert(eventPrelegentsToInsert);
    if (eventResourcesToInsert.length > 0) await knex('event_resources').insert(eventResourcesToInsert);
    if (eventSponsorsToInsert.length > 0) await knex('event_sponsors').insert(eventSponsorsToInsert);
    if (eventCateringsToInsert.length > 0) await knex('event_caterings').insert(eventCateringsToInsert);
    if (eventTicketsToInsert.length > 0) await knex('event_tickets').insert(eventTicketsToInsert);

    console.log(`Inserted ${eventPrelegentsToInsert.length} event_prelegent records.`);
    console.log(`Inserted ${eventResourcesToInsert.length} event_resource records.`);
    console.log(`Inserted ${eventSponsorsToInsert.length} event_sponsor records.`);
    console.log(`Inserted ${eventCateringsToInsert.length} event_catering records.`);
    console.log(`Inserted ${eventTicketsToInsert.length} event_ticket records.`);

    console.log('Seeding finished.');
};