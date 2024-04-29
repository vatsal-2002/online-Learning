const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/courses');
const { verifyToken, authorizeUser } = require('../../middleware/auth');

router.get('/teacher/:teacherId/allCourses', verifyToken, authorizeUser, userController.getAllTeacherCourses);

router.get('/teacher/:teacherId/course/:courseId/user', verifyToken, authorizeUser, userController.getcourse);

module.exports = router;
