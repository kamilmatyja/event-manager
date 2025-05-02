const db = require('../db/knex');
const eventModel = require('../models/eventModel');
const localeModel = require('../models/localeModel');
const categoryModel = require('../models/categoryModel');
const prelegentModel = require('../models/prelegentModel');
const resourceModel = require('../models/resourceModel');
const sponsorModel = require('../models/sponsorModel');
const cateringModel = require('../models/cateringModel');
const eventPrelegentModel = require('../models/eventPrelegentModel');
const eventResourceModel = require('../models/eventResourceModel');
const eventSponsorModel = require('../models/eventSponsorModel');
const eventCateringModel = require('../models/eventCateringModel');
const eventTicketModel = require('../models/eventTicketModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const enrichEventData = async (event) => {
    if (!event) return null;

    const [prelegentLinks, resourceLinks, sponsorLinks, cateringLinks, ticketCount] = await Promise.all([
        eventPrelegentModel.findByEventId(event.id),
        eventResourceModel.findByEventId(event.id),
        eventSponsorModel.findByEventId(event.id),
        eventCateringModel.findByEventId(event.id),
        eventTicketModel.countByEventId(event.id)
    ]);

    event.prelegentIds = prelegentLinks.map(p => p.prelegent_id);
    event.resourceIds = resourceLinks.map(r => r.resource_id);
    event.sponsorIds = sponsorLinks.map(s => s.sponsor_id);
    event.cateringIds = cateringLinks.map(c => c.catering_id);
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
        throw new NotFoundError('Event not found.');
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

    if (new Date(ended_at) <= new Date(started_at)) {
        throw new ConflictError('End date must be after start date.');
    }

    const existingName = await eventModel.findByName(name);
    if (existingName) throw new ConflictError('Event name already exists.');
    const existingDesc = await eventModel.findByDescription(description);
    if (existingDesc) throw new ConflictError('Event description already exists.');

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
    const currentEvent = await eventModel.findById(id);
    if (!currentEvent) {
        throw new NotFoundError('Event not found.');
    }

    const {
        name, description, price, locale_id, category_id, started_at, ended_at,
        prelegent_ids, resource_ids, sponsor_ids, catering_ids
    } = eventData;

    const checkStartDate = started_at ? new Date(started_at) : new Date(currentEvent.started_at);
    const checkEndDate = ended_at ? new Date(ended_at) : new Date(currentEvent.ended_at);

    if (checkEndDate <= checkStartDate) {
        throw new ConflictError('End date must be after start date.');
    }

    if (name && name !== currentEvent.name) {
        const existingName = await eventModel.findByName(name);
        if (existingName) throw new ConflictError('Event name already exists.');
    }
    if (description && description !== currentEvent.description) {
        const existingDesc = await eventModel.findByDescription(description);
        if (existingDesc) throw new ConflictError('Event description already exists.');
    }

    await db.transaction(async (trx) => {

        const eventInput = {};
        if (name !== undefined) eventInput.name = name;
        if (description !== undefined) eventInput.description = description;
        if (price !== undefined) eventInput.price = price;
        if (locale_id !== undefined) eventInput.locale_id = locale_id;
        if (category_id !== undefined) eventInput.category_id = category_id;
        if (started_at !== undefined) eventInput.started_at = started_at;
        if (ended_at !== undefined) eventInput.ended_at = ended_at;

        if (Object.keys(eventInput).length > 0) {
            await eventModel.update(id, eventInput, trx);
        }

        const relatedDataToUpdate = {};
        if (prelegent_ids !== undefined) relatedDataToUpdate.prelegent_ids = prelegent_ids;
        if (resource_ids !== undefined) relatedDataToUpdate.resource_ids = resource_ids;
        if (sponsor_ids !== undefined) relatedDataToUpdate.sponsor_ids = sponsor_ids;
        if (catering_ids !== undefined) relatedDataToUpdate.catering_ids = catering_ids;

        if (Object.keys(relatedDataToUpdate).length > 0) {
            await handleRelatedEntities(trx, id, checkStartDate, checkEndDate, relatedDataToUpdate);
        }
    });

    return await findEventById(id);
};

const deleteEvent = async (id) => {

    const event = await eventModel.findById(id);
    if (!event) {
        throw new NotFoundError('Event not found.');
    }

    const ticketCount = await eventTicketModel.countByEventId(id);
    if (ticketCount > 0) {
        throw new ConflictError(`Cannot delete event: There are ${ticketCount} tickets sold for this event.`);
    }

    const deletedCount = await eventModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllEvents,
    findEventById,
    createEvent,
    updateEvent,
    deleteEvent,
};