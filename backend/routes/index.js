const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const localeRoutes = require('./localeRoutes');
const categoryRoutes = require('./categoryRoutes');
const eventRoutes = require('./eventRoutes');
const eventTicketRoutes = require('./eventTicketRoutes');
const prelegentRoutes = require('./prelegentRoutes');
const resourceRoutes = require('./resourceRoutes');
const sponsorRoutes = require('./sponsorRoutes');
const cateringRoutes = require('./cateringRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/locales', localeRoutes);
router.use('/categories', categoryRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', eventTicketRoutes);
router.use('/prelegents', prelegentRoutes);
router.use('/resources', resourceRoutes);
router.use('/sponsors', sponsorRoutes);
router.use('/caterings', cateringRoutes);

module.exports = router;