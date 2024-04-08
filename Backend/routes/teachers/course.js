const express = require('express');
const router = express.Router();
const teacherController = require('../../controllers/teacher/courses');
const { verifyToken, authorizeTeacher } = require('../../middleware/auth');

router.post('/upload', verifyToken, authorizeTeacher, teacherController.courseUpload);
router.get('/get/:id', verifyToken, authorizeTeacher, teacherController.teacherAllCourses);
router.get('/getCourse/:courseId', verifyToken, authorizeTeacher, teacherController.getCourseById);
router.patch('/updateCourse/:courseId', verifyToken, authorizeTeacher, teacherController.updateCourseById);
router.patch('/updateUrlById/:urlId', verifyToken, authorizeTeacher, teacherController.updateUrlById);
router.delete('/delete/:courseId', verifyToken, authorizeTeacher, teacherController.softDeleteCourseById);
router.get('/usercourse/:courseId/user', verifyToken, authorizeTeacher, teacherController.getUsersForCourse);


module.exports = router;
