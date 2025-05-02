const express = require('express');
const localeController = require('../controllers/localeController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createLocaleValidator, updateLocaleValidator} = require('../validators/localeValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Locales
 *   description: Locale management
 */

/**
 * @openapi
 * /locales:
 *   get:
 *     tags: [Locales]
 *     summary: Get all locales (Public)
 *     description: Retrieves a list of all locales. This endpoint is public.
 *     responses:
 *       200:
 *         description: A list of locales.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Locale'
 */
router.get('/', localeController.getAllLocales);

/**
 * @openapi
 * /locales/{id}:
 *   get:
 *     tags: [Locales]
 *     summary: Get a locale by ID (Public)
 *     description: Retrieves details for a specific locale. This endpoint is public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the locale to retrieve.
 *     responses:
 *       200:
 *         description: Locale details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Locale'
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
router.get('/:id', localeController.getLocaleById);

/**
 * @openapi
 * /locales:
 *   post:
 *     tags: [Locales]
 *     summary: Create a new locale (Admin only)
 *     description: Adds a new locale to the system. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocaleInput'
 *     responses:
 *       201:
 *         description: Locale created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Locale'
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
    createLocaleValidator,
    handleValidationErrors,
    localeController.createLocale
);

/**
 * @openapi
 * /locales/{id}:
 *   put:
 *     tags: [Locales]
 *     summary: Update a locale (Admin only)
 *     description: Updates an existing locale. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the locale to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocaleInput'
 *     responses:
 *       200:
 *         description: Locale updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Locale'
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
    updateLocaleValidator,
    handleValidationErrors,
    localeController.updateLocale
);

/**
 * @openapi
 * /locales/{id}:
 *   delete:
 *     tags: [Locales]
 *     summary: Delete a locale (Admin only)
 *     description: Deletes a locale if it's not currently assigned to any events. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the locale to delete.
 *     responses:
 *       204:
 *         description: Locale deleted successfully (No Content).
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
    localeController.deleteLocale
);

module.exports = router;