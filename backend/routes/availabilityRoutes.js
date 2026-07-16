const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all availability records (Admin)
router.get('/', authenticateToken, authorizeRoles('admin'), availabilityController.getAvailability);

// Get active future availability records (Employee booking forms)
router.get('/active', authenticateToken, availabilityController.getActiveAvailability);

// Batch save or update availability slot configurations (Admin)
router.post('/save', authenticateToken, authorizeRoles('admin'), availabilityController.saveAvailability);

// Delete availability configuration for a specific date (Admin)
router.delete('/:dateString', authenticateToken, authorizeRoles('admin'), availabilityController.deleteAvailability);

module.exports = router;
