const eventService = require('../services/eventService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllEvents = async (req, res) => {
    const events = await eventService.findAllEvents();
    res.status(200).json(events);
};

const getEventById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid event ID format.');
    }
    const event = await eventService.findEventById(id);
    if (!event) {
        throw new NotFoundError('Event not found');
    }
    res.status(200).json(event);
};

const createEvent = async (req, res) => {
    const newEvent = await eventService.createEvent(req.body);
    res.status(201).json(newEvent);
};

const updateEvent = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid event ID format.');
    }

    const updatedEvent = await eventService.updateEvent(id, req.body);
    if (!updatedEvent) {
        throw new NotFoundError('Event not found');
    }
    res.status(200).json(updatedEvent);
};

const deleteEvent = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid event ID format.');
    }
    const success = await eventService.deleteEvent(id);
    if (!success) {
        throw new NotFoundError('Event not found');
    }
    res.status(204).send();
};

module.exports = {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
};