const express = require('express');
const eventTicketController = require('../controllers/eventTicketController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createTicketValidator, deleteTicketValidator} = require('../validators/eventTicketValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Tickets
 *   description: Event ticket management
 */

router.use(authenticateToken);
router.use(authorizeRole(ROLES.MEMBER));

/**
 * @openapi
 * /tickets/my:
 *   get:
 *     tags: [Tickets]
 *     summary: Get my tickets (Member only)
 *     description: Retrieves a list of tickets purchased by the currently logged-in user. Requires Member role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's tickets.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventTicket'
 *       401:
 *         description: Unauthorized error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/my', eventTicketController.getMyTickets);

/**
 * @openapi
 * /tickets:
 *   post:
 *     tags: [Tickets]
 *     summary: Register for an event (buy a ticket) (Member only)
 *     description: Creates a ticket for the logged-in user for the specified event. Requires Member role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventTicketInput'
 *     responses:
 *       201:
 *         description: Ticket created successfully. Returns the new ticket details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventTicket'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Unauthorized error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/',
    createTicketValidator,
    handleValidationErrors,
    eventTicketController.createTicket
);

/**
 * @openapi
 * /tickets/{id}:
 *   delete:
 *     tags: [Tickets]
 *     summary: Unsubscribe from an event (delete ticket) (Member only)
 *     description: Deletes a ticket owned by the logged-in user. Requires Member role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the ticket to delete.
 *     responses:
 *       204:
 *         description: Ticket deleted successfully (No Content).
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Unauthorized error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
    '/:id',
    deleteTicketValidator,
    handleValidationErrors,
    eventTicketController.deleteTicket
);

module.exports = router;