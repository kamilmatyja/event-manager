const express = require('express');
const sponsorController = require('../controllers/sponsorController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createSponsorValidator, updateSponsorValidator} = require('../validators/sponsorValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Sponsors
 *   description: Sponsor management
 */

/**
 * @openapi
 * /sponsors:
 *   get:
 *     tags: [Sponsors]
 *     summary: Get all sponsors (Public)
 *     description: Retrieves a list of all sponsors. This endpoint is public.
 *     responses:
 *       200:
 *         description: A list of sponsors.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sponsor'
 */
router.get('/', sponsorController.getAllSponsors);

/**
 * @openapi
 * /sponsors/{id}:
 *   get:
 *     tags: [Sponsors]
 *     summary: Get a sponsor by ID (Public)
 *     description: Retrieves details for a specific sponsor. This endpoint is public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the sponsor to retrieve.
 *     responses:
 *       200:
 *         description: Sponsor details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sponsor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', sponsorController.getSponsorById);

/**
 * @openapi
 * /sponsors:
 *   post:
 *     tags: [Sponsors]
 *     summary: Create a new sponsor (Admin only)
 *     description: Adds a new sponsor to the system. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorInput'
 *     responses:
 *       201:
 *         description: Sponsor created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sponsor'
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
 *       409:
 *         description: Conflict error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/',
    authenticateToken,
    authorizeRole(ROLES.ADMINISTRATOR),
    createSponsorValidator,
    handleValidationErrors,
    sponsorController.createSponsor
);

/**
 * @openapi
 * /sponsors/{id}:
 *   put:
 *     tags: [Sponsors]
 *     summary: Update a sponsor (Admin only)
 *     description: Updates an existing sponsor. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the sponsor to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorInput'
 *     responses:
 *       200:
 *         description: Sponsor updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sponsor'
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
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(ROLES.ADMINISTRATOR),
    updateSponsorValidator,
    handleValidationErrors,
    sponsorController.updateSponsor
);

/**
 * @openapi
 * /sponsors/{id}:
 *   delete:
 *     tags: [Sponsors]
 *     summary: Delete a sponsor (Admin only)
 *     description: Deletes a sponsor if they are not currently assigned to any events. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the sponsor to delete.
 *     responses:
 *       204:
 *         description: Sponsor deleted successfully (No Content).
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
 *       404:
 *         description: Not found error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(ROLES.ADMINISTRATOR),
    sponsorController.deleteSponsor
);

module.exports = router;