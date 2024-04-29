const express = require('express');
const router = express.Router();
const { verifyToken, authorizeTeacher } = require('../../middleware/auth');
const teacherQuizzesController = require('../../controllers/teacher/quiz');

router.post('/teacher/:teacherId/course/:courseId/quiz', verifyToken, authorizeTeacher, teacherQuizzesController.postQuiz);

router.get('/teacher/:teacherId/course/:courseId/quiz', verifyToken, authorizeTeacher, teacherQuizzesController.getTeacherQuizzes);

router.get('/teacher/:teacherId/course/:courseId/quiz/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.getQuizById);

router.patch('/teacher/:teacherId/course/:courseId/quiz/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.updateQuizById);

router.patch('/teacher/:teacherId/course/:courseId/quiz/:quizId/quizList', verifyToken, authorizeTeacher, teacherQuizzesController.updateQuizListItemById);

router.delete('/teacher/:teacherId/course/:courseId/quiz/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.deleteQuizAndItemsById);

router.get('/teacher/:teacherId/course/:courseId/quiz/:quizId/user', verifyToken, authorizeTeacher, teacherQuizzesController.getAllUserQuizzes);

module.exports = router;
