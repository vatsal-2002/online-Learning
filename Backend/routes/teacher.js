const express = require('express');
const router = express.Router();
const course = require('../controllers/teacher');
const { verifyToken } = require('../middleware/auth');

router.post('/upload', verifyToken, course.courseUpload);
router.get('/get/:id', verifyToken, course.teacherAllCourses);
router.get('/getCourse/:courseId', verifyToken, course.getCourseById);
router.patch('/updateCourse/:courseId', verifyToken, course.updateCourseById);
router.patch('/updateUrlById/:urlId', verifyToken, course.updateUrlById);


module.exports = router;
