const express = require('express');
const resourceController = require('../controllers/resourceController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const {ROLES} = require('../config/roles');
const {createResourceValidator, updateResourceValidator} = require('../validators/resourceValidators');
const {handleValidationErrors} = require('../validators/validationErrorHandler');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Resources
 *   description: Resource management
 */

/**
 * @openapi
 * /resources:
 *   get:
 *     tags: [Resources]
 *     summary: Get all resources (Public)
 *     description: Retrieves a list of all resources. This endpoint is public.
 *     responses:
 *       200:
 *         description: A list of resources.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Resource'
 */
router.get('/', resourceController.getAllResources);

/**
 * @openapi
 * /resources/{id}:
 *   get:
 *     tags: [Resources]
 *     summary: Get a resource by ID (Public)
 *     description: Retrieves details for a specific resource. This endpoint is public.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the resource to retrieve.
 *     responses:
 *       200:
 *         description: Resource details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
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
router.get('/:id', resourceController.getResourceById);

/**
 * @openapi
 * /resources:
 *   post:
 *     tags: [Resources]
 *     summary: Create a new resource (Admin only)
 *     description: Adds a new resource to the system. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceInput'
 *     responses:
 *       201:
 *         description: Resource created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
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
    createResourceValidator,
    handleValidationErrors,
    resourceController.createResource
);

/**
 * @openapi
 * /resources/{id}:
 *   put:
 *     tags: [Resources]
 *     summary: Update a resource (Admin only)
 *     description: Updates an existing resource. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the resource to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceInput'
 *     responses:
 *       200:
 *         description: Resource updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
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
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(ROLES.ADMINISTRATOR),
    updateResourceValidator,
    handleValidationErrors,
    resourceController.updateResource
);

/**
 * @openapi
 * /resources/{id}:
 *   delete:
 *     tags: [Resources]
 *     summary: Delete a resource (Admin only)
 *     description: Deletes a resource if it's not currently assigned to any events. Requires Administrator role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the resource to delete.
 *     responses:
 *       204:
 *         description: Resource deleted successfully (No Content).
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
    authenticateToken,
    authorizeRole(ROLES.ADMINISTRATOR),
    resourceController.deleteResource
);

module.exports = router;