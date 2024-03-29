const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');
const { verifyToken, authorizeUser } = require('../middleware/auth');


// Routes accessible only to users
router.get('/getAllCourses', verifyToken, authorizeUser, userController.getAllCourses);
router.get('/getCourse/:courseId', verifyToken, authorizeUser, userController.getCourseById);

module.exports = router;
