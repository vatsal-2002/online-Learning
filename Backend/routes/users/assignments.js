const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/assignments');
const { verifyToken, authorizeUser } = require('../../middleware/auth');

router.get('/teacher/:teacherId/assignments', verifyToken, authorizeUser, userController.getAllTeacherAssignments);

router.get('/teacher/:teacherId/assignment/:assignmentId', verifyToken, authorizeUser, userController.getTeacherAssignmentById);

router.post('/teacher/:teacherId/assignment', verifyToken, authorizeUser, userController.submitAssignment);

module.exports = router;
