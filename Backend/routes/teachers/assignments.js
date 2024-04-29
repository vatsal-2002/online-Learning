const express = require('express');
const router = express.Router();
const teacherController = require('../../controllers/teacher/assignments');
const { verifyToken, authorizeTeacher } = require('../../middleware/auth');

router.post('/teacher/:teacherId/course/:courseId/assignment', verifyToken, authorizeTeacher, teacherController.createAssignment);

router.patch('/teacher/:teacherId/course/:courseId/assignment/:assignmentId', verifyToken, authorizeTeacher, teacherController.updateAssignmentById);

router.get('/teacher/:teacherId/course/:courseId/assignments', verifyToken, authorizeTeacher, teacherController.getAllAssignments);

router.get('/teacher/:teacherId/course/:courseId/assignment/:assignmentId', verifyToken, authorizeTeacher, teacherController.getAssignmentById);

router.patch('/teacher/:teacherId/course/:courseId/assignment/:assignmentId/assignmentlist', verifyToken, authorizeTeacher, teacherController.updateAssignmentListById);

router.delete('/teacher/:teacherId/course/:courseId/assignment/:assignmentId', verifyToken, authorizeTeacher, teacherController.softDeleteAssignmentById);

router.get('/teacher/:teacherId/course/:courseId/assignment/:assignmentId/user', verifyToken, authorizeTeacher, teacherController.getAllUserAssignments);


module.exports = router;
