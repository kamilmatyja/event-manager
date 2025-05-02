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

        }),
];

const deleteTicketValidator = [
    param('id')
        .notEmpty().withMessage('Ticket ID is required.')
        .isInt({gt: 0}).withMessage('Invalid Ticket ID format.'),
];

module.exports = {
    createTicketValidator,
    deleteTicketValidator,
};