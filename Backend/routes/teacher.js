const express = require('express');
const router = express.Router();
const teacherController = require('../controllers//teacher');
const { verifyToken, authorizeTeacher } = require('../middleware/auth');

router.post('/upload', verifyToken, authorizeTeacher, teacherController.courseUpload);
router.get('/get/:id', verifyToken, authorizeTeacher, teacherController.teacherAllCourses);
router.get('/getCourse/:courseId', verifyToken, authorizeTeacher, teacherController.getCourseById);
router.patch('/updateCourse/:courseId', verifyToken, authorizeTeacher, teacherController.updateCourseById);
router.patch('/updateUrlById/:urlId', verifyToken, authorizeTeacher, teacherController.updateUrlById);
router.delete('/delete/:courseId', verifyToken, authorizeTeacher, teacherController.softDeleteCourseById);

// Create a get API in which student get the teacher course
router.get('/usercourse/:courseId/user', verifyToken, authorizeTeacher, teacherController.getUsersForCourse);

// create POST API to create a Assignment for user
router.post('/assignments/create', verifyToken, authorizeTeacher, teacherController.createAssignment);

router.patch('/assignments/update/:assignmentId', verifyToken, authorizeTeacher, teacherController.updateAssignmentById);

router.patch('/assignments/updateList/:assignmentListId', verifyToken, authorizeTeacher, teacherController.updateAssignmentListById);

router.get('/assignments', verifyToken, authorizeTeacher, teacherController.getAllAssignments);

router.get('/assignments/:assignmentId', verifyToken, authorizeTeacher, teacherController.getAssignmentById);
module.exports = router;
