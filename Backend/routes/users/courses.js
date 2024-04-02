const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/courses');
const { verifyToken, authorizeUser } = require('../../middleware/auth');


router.get('/getAllCourses', verifyToken, authorizeUser, userController.getAllCourses);
router.get('/getCourse/:courseId', verifyToken, authorizeUser, userController.getCourseById);

module.exports = router;
