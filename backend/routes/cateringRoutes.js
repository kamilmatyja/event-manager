const express = require('express');
const cateringController = require('../controllers/cateringController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createCateringValidator, updateCateringValidator} = require('../validators/cateringValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Catering
 *   description: Catering management
 */

/**
 * @openapi
 * /caterings:
 *   get:
 *     tags: [Catering]
 *     summary: Get all caterings (Public)
 *     description: Retrieves a list of all caterings. This endpoint is public.
 *     responses:
 *       200:
 *         description: A list of caterings.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Catering'
 */
router.get('/', cateringController.getAllCaterings);

/**
 * @openapi
 * /caterings/{id}:
 *   get:
 *     tags: [Catering]
 *     summary: Get a catering by ID (Public)
 *     description: Retrieves details for a specific catering. This endpoint is public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the catering to retrieve.
 *     responses:
 *       200:
 *         description: catering details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Catering'
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
router.get('/:id', cateringController.getCateringById);

/**
 * @openapi
 * /caterings:
 *   post:
 *     tags: [Catering]
 *     summary: Create a new catering (Admin only)
 *     description: Adds a new catering to the system. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CateringInput'
 *     responses:
 *       201:
 *         description: catering created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Catering'
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
    createCateringValidator,
    handleValidationErrors,
    cateringController.createCatering
);

/**
 * @openapi
 * /caterings/{id}:
 *   put:
 *     tags: [Catering]
 *     summary: Update a catering (Admin only)
 *     description: Updates an existing catering. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the catering to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CateringInput'
 *     responses:
 *       200:
 *         description: catering updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Catering'
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
    updateCateringValidator,
    handleValidationErrors,
    cateringController.updateCatering
);

/**
 * @openapi
 * /caterings/{id}:
 *   delete:
 *     tags: [Catering]
 *     summary: Delete a catering (Admin only)
 *     description: Deletes a catering if it's not currently assigned to any events. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the catering to delete.
 *     responses:
 *       204:
 *         description: catering deleted successfully (No Content).
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
    cateringController.deleteCatering
);

module.exports = router;