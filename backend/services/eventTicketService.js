const eventTicketModel = require('../models/eventTicketModel');
const eventModel = require('../models/eventModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');
const ForbiddenError = require('../errors/ForbiddenError');

const getUserTickets = async (userId) => {
    return await eventTicketModel.findAllWithEventDetailsByUser(userId);
};

const createTicket = async (userId, eventId) => {
    const event = await eventModel.findById(eventId);

    if (!event) {
        throw new NotFoundError(`Event with ID ${id} not found.`);
    }

    const existingTicket = await eventTicketModel.findByEventAndUser(eventId, userId);

    if (existingTicket) {
        throw new ConflictError('User is already registered for this event.');
    }

    const conflicts = await eventTicketModel.findConflictingUserTickets(
        userId,
        new Date(event.started_at),
        new Date(event.ended_at)
    );

    if (conflicts.length > 0) {
        const conflictingEvent = conflicts[0];
        throw new ConflictError(`Cannot register: Time conflict with another event "${conflictingEvent.name}" (ID: ${conflictingEvent.id}) scheduled from ${conflictingEvent.started_at} to ${conflictingEvent.ended_at}.`);
    }

    const ticketData = {
        event_id: eventId,
        user_id: userId,
        price: event.price
    };

    return await eventTicketModel.create(ticketData);
};

const deleteTicket = async (userId, ticketId) => {
    const ticket = await eventTicketModel.findById(ticketId);

    if (!ticket) {
        throw new NotFoundError(`Ticket with ID ${id} not found.`);
    }

    if (ticket.user_id !== userId) {
        throw new ForbiddenError('Forbidden: You can only delete your own tickets.');
    }

    return await eventTicketModel.deleteById(ticketId) > 0;
};

module.exports = {
    getUserTickets,
    createTicket,
    deleteTicket,
};