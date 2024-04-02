const express = require('express');
const router = express.Router();
const teacherController = require('../../controllers/teacher/assignments');
const { verifyToken, authorizeTeacher } = require('../../middleware/auth');

// Create a get API in which student get the teacher course
router.get('/usercourse/:courseId/user', verifyToken, authorizeTeacher, teacherController.getUsersForCourse);

// create POST API to create a Assignment for user
router.post('/assignments/create', verifyToken, authorizeTeacher, teacherController.createAssignment);

router.patch('/assignments/update/:assignmentId', verifyToken, authorizeTeacher, teacherController.updateAssignmentById);

router.patch('/assignments/updateList/:assignmentListId', verifyToken, authorizeTeacher, teacherController.updateAssignmentListById);

router.get('/assignments', verifyToken, authorizeTeacher, teacherController.getAllAssignments);

router.get('/assignments/:assignmentId', verifyToken, authorizeTeacher, teacherController.getAssignmentById);

// Delete an assignment by assignment ID (soft delete)
router.delete('/deleteAssignment/:assignmentId', verifyToken, authorizeTeacher, teacherController.softDeleteAssignmentById);

// Add this line to your existing router definition
router.get('/userAssignments', verifyToken, authorizeTeacher, teacherController.getAllUserAssignments);


module.exports = router;
