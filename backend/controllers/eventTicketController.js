const eventTicketService = require('../services/eventTicketService');
const NotFoundError = require("../errors/NotFoundError");

const getMyTickets = async (req, res) => {
    const userId = req.user.id;
    const tickets = await eventTicketService.getUserTickets(userId);

    res.status(200).json(tickets);
};

const createTicket = async (req, res) => {
    const userId = req.user.id;
    const {event_id} = req.body;

    const newTicket = await eventTicketService.createTicket(userId, event_id);

    if (!newTicket) {
        throw new NotFoundError('Ticket not found');
    }

    res.status(201).json(newTicket);
};

const deleteTicket = async (req, res) => {
    const userId = req.user.id;

    const success = await eventTicketService.deleteTicket(userId, req.params.id);

    if (!success) {
        throw new NotFoundError('Ticket not found');
    }

    res.status(204).send();
};

module.exports = {
    getMyTickets,
    createTicket,
    deleteTicket,
};