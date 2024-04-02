const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/assignments');
const { verifyToken, authorizeUser } = require('../../middleware/auth');

// Get all assignments
router.get('/getAllAssignments', verifyToken, authorizeUser, userController.getAllAssignments);

// Get assignment by ID
router.get('/getAssignment/:assignmentId', verifyToken, authorizeUser, userController.getAssignmentById);

// Submit assignment detail
router.post('/submitAssignment', verifyToken, authorizeUser, userController.submitAssignment);

module.exports = router;
