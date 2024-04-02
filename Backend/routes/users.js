const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');
const { verifyToken, authorizeUser } = require('../middleware/auth');


// Routes accessible only to users
router.get('/getAllCourses', verifyToken, authorizeUser, userController.getAllCourses);
router.get('/getCourse/:courseId', verifyToken, authorizeUser, userController.getCourseById);

// Get all assignments
router.get('/getAllAssignments', verifyToken, authorizeUser, userController.getAllAssignments);

// Get assignment by ID
router.get('/getAssignment/:assignmentId', verifyToken, authorizeUser, userController.getAssignmentById);

// Submit assignment detail
router.post('/submitAssignment', verifyToken, authorizeUser, userController.submitAssignment);

module.exports = router;
