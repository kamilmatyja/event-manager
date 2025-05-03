const {body, param} = require('express-validator');
const EventModel = require('../models/eventModel');

const createTicketValidator = [
    body('event_id')
        .notEmpty().withMessage('Event ID is required.')
        .isInt({gt: 0}).withMessage('Invalid Event ID format.')
        .custom(async (value) => {
            const event = await EventModel.findById(value);
            if (!event) {
                return Promise.reject('Event with the provided ID does not exist.');
            }
            if (new Date(event.ended_at) < new Date()) {
                return Promise.reject('Cannot create a ticket for an event that has already ended.');
            }
        }),
];

const deleteTicketValidator = [
    param('id')
        .notEmpty().withMessage('Ticket ID is required.')
        .isInt({gt: 0}).withMessage('Invalid Ticket ID format.')
        .custom(async (value) => {
            const event = await EventModel.findByTicketId(value);
            if (!event) {
                return Promise.reject('Event with the provided ID does not exist.');
            }
            if (new Date(event.started_at) < new Date()) {
                return Promise.reject('Cannot delete a ticket for an event that has already started.');
            }
        }),
];

module.exports = {
    createTicketValidator,
    deleteTicketValidator,
};