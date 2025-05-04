const db = require('../db/knex');
const eventModel = require('../models/eventModel');
const prelegentModel = require('../models/prelegentModel');
const resourceModel = require('../models/resourceModel');
const sponsorModel = require('../models/sponsorModel');
const cateringModel = require('../models/cateringModel');
const eventPrelegentModel = require('../models/eventPrelegentModel');
const eventResourceModel = require('../models/eventResourceModel');
const eventSponsorModel = require('../models/eventSponsorModel');
const eventCateringModel = require('../models/eventCateringModel');
const eventTicketModel = require('../models/eventTicketModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const enrichEventData = async (event) => {
    if (!event) return null;

    const [prelegentLinks, resourceLinks, sponsorLinks, cateringLinks, ticketCount] = await Promise.all([
        eventPrelegentModel.findByEventId(event.id),
        eventResourceModel.findByEventId(event.id),
        eventSponsorModel.findByEventId(event.id),
        eventCateringModel.findByEventId(event.id),
        eventTicketModel.countByEventId(event.id)
    ]);

    event.prelegent_ids = prelegentLinks.map(p => p.prelegent_id);
    event.resource_ids = resourceLinks.map(r => r.resource_id);
    event.sponsor_ids = sponsorLinks.map(s => s.sponsor_id);
    event.catering_ids = cateringLinks.map(c => c.catering_id);
    event.ticket_count = ticketCount;

    return event;
};

const findAllEvents = async () => {
    const events = await eventModel.findAll();

    const enrichedEvents = await Promise.all(
        events.map(event => enrichEventData(event))
    );

    return enrichedEvents;
};

const findEventById = async (id) => {
    const event = await eventModel.findByIdDetails(id);

    if (!event) {
        throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    return await enrichEventData(event);
};

const handleRelatedEntities = async (trx, eventId, startedAt, endedAt, relatedData) => {
    const {prelegent_ids, resource_ids, sponsor_ids, catering_ids} = relatedData;

    await eventPrelegentModel.deleteByEventId(eventId, trx);
    if (prelegent_ids && prelegent_ids.length > 0) {
        for (const prelegentId of prelegent_ids) {

            const prelegentExists = await prelegentModel.findById(prelegentId);
            if (!prelegentExists) throw new NotFoundError(`Prelegent with ID ${prelegentId} not found.`);

            const conflicts = await eventModel.findConflictingPrelegentEvents(prelegentId, startedAt, endedAt, eventId, trx);
            if (conflicts.length > 0) {
                throw new ConflictError(`Prelegent (ID: ${prelegentId}) has a time conflict with another event (ID: ${conflicts[0].id}) during this period.`);
            }
            await eventPrelegentModel.create({event_id: eventId, prelegent_id: prelegentId}, trx);
        }
    }

    await eventResourceModel.deleteByEventId(eventId, trx);
    if (resource_ids && resource_ids.length > 0) {
        for (const resourceId of resource_ids) {
            const resourceExists = await resourceModel.findById(resourceId);
            if (!resourceExists) throw new NotFoundError(`Resource with ID ${resourceId} not found.`);

            const conflicts = await eventModel.findConflictingResourceEvents(resourceId, startedAt, endedAt, eventId, trx);
            if (conflicts.length > 0) {
                throw new ConflictError(`Resource (ID: ${resourceId}) has a time conflict with another event (ID: ${conflicts[0].id}) during this period.`);
            }
            await eventResourceModel.create({event_id: eventId, resource_id: resourceId}, trx);
        }
    }

    await eventSponsorModel.deleteByEventId(eventId, trx);
    if (sponsor_ids && sponsor_ids.length > 0) {
        for (const sponsorId of sponsor_ids) {
            const sponsorExists = await sponsorModel.findById(sponsorId);
            if (!sponsorExists) throw new NotFoundError(`Sponsor with ID ${sponsorId} not found.`);
            await eventSponsorModel.create({event_id: eventId, sponsor_id: sponsorId}, trx);
        }
    }

    await eventCateringModel.deleteByEventId(eventId, trx);
    if (catering_ids && catering_ids.length > 0) {
        for (const cateringId of catering_ids) {
            const cateringExists = await cateringModel.findById(cateringId);
            if (!cateringExists) throw new NotFoundError(`Catering with ID ${cateringId} not found.`);
            await eventCateringModel.create({event_id: eventId, catering_id: cateringId}, trx);
        }
    }
};

const createEvent = async (eventData) => {
    const {
        name, description, price, locale_id, category_id, started_at, ended_at,
        prelegent_ids, resource_ids, sponsor_ids, catering_ids
    } = eventData;

    let newEvent;
    await db.transaction(async (trx) => {
        const eventInput = {name, description, price, locale_id, category_id, started_at, ended_at};

        newEvent = await eventModel.create(eventInput, trx);

        await handleRelatedEntities(trx, newEvent.id, new Date(started_at), new Date(ended_at), {
            prelegent_ids, resource_ids, sponsor_ids, catering_ids
        });
    });

    return await findEventById(newEvent.id);
};

const updateEvent = async (id, eventData) => {
    const event = await eventModel.findByIdDetails(id);

    if (!event) {
        throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    const {
        name, description, price, locale_id, category_id, started_at, ended_at,
        prelegent_ids, resource_ids, sponsor_ids, catering_ids
    } = eventData;

    await db.transaction(async (trx) => {
        const eventInput = {name, description, price, locale_id, category_id, started_at, ended_at};

        await eventModel.update(id, eventInput, trx);

        const relatedDataToUpdate = {prelegent_ids, resource_ids, sponsor_ids, catering_ids};

        await handleRelatedEntities(trx, id, new Date(started_at), new Date(ended_at), relatedDataToUpdate);
    });

    return await findEventById(id);
};

const deleteEvent = async (id) => {
    const event = await eventModel.findByIdDetails(id);

    if (!event) {
        throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    const ticketCount = await eventTicketModel.countByEventId(id);

    if (ticketCount > 0) {
        throw new ConflictError(`Cannot delete event: There are ${ticketCount} tickets sold for this event.`);
    }

    return await eventModel.deleteById(id) > 0;
};

module.exports = {
    findAllEvents,
    findEventById,
    createEvent,
    updateEvent,
    deleteEvent,
};