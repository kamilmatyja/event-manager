const express = require('express');
const prelegentController = require('../controllers/prelegentController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createPrelegentValidator, updatePrelegentValidator} = require('../validators/prelegentValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Prelegents
 *   description: Prelegent management
 */

router.use(authenticateToken);
router.use(authorizeRole(ROLES.ADMINISTRATOR));

/**
 * @openapi
 * /prelegents:
 *   get:
 *     tags: [Prelegents]
 *     summary: Get all prelegents (Public)
 *     description: Retrieves a list of all prelegents. This endpoint is public.
 *     responses:
 *       200:
 *         description: A list of prelegents.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Prelegent'
 */
router.get('/', prelegentController.getAllPrelegents);

/**
 * @openapi
 * /prelegents/{id}:
 *   get:
 *     tags: [Prelegents]
 *     summary: Get a prelegent by ID (Public)
 *     description: Retrieves details for a specific prelegent. This endpoint is public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the prelegent to retrieve.
 *     responses:
 *       200:
 *         description: Prelegent details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prelegent'
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
router.get('/:id', prelegentController.getPrelegentById);

/**
 * @openapi
 * /prelegents:
 *   post:
 *     tags: [Prelegents]
 *     summary: Create a new prelegent (Admin only)
 *     description: Adds a new prelegent to the system. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrelegentInput'
 *     responses:
 *       201:
 *         description: Prelegent created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prelegent'
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
    createPrelegentValidator,
    handleValidationErrors,
    prelegentController.createPrelegent
);

/**
 * @openapi
 * /prelegents/{id}:
 *   put:
 *     tags: [Prelegents]
 *     summary: Update a prelegent (Admin only)
 *     description: Updates an existing prelegent's details. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the prelegent to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrelegentInput'
 *     responses:
 *       200:
 *         description: Prelegent updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prelegent'
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
    updatePrelegentValidator,
    handleValidationErrors,
    prelegentController.updatePrelegent
);

/**
 * @openapi
 * /prelegents/{id}:
 *   delete:
 *     tags: [Prelegents]
 *     summary: Delete a prelegent (Admin only)
 *     description: Deletes a prelegent if they are not assigned to any events. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the prelegent to delete.
 *     responses:
 *       204:
 *         description: Prelegent deleted successfully (No Content).
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
    prelegentController.deletePrelegent
);

module.exports = router;