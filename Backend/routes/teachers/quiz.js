const express = require('express');
const router = express.Router();
const { verifyToken, authorizeTeacher } = require('../../middleware/auth');
const teacherQuizzesController = require('../../controllers/teacher/quiz');

router.post('/post', verifyToken, authorizeTeacher, teacherQuizzesController.postQuiz);
router.get('/getall', verifyToken, authorizeTeacher, teacherQuizzesController.getTeacherQuizzes);
router.get('/getdata/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.getQuizById);
router.patch('/update/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.updateQuizById);
router.patch('/updatequizlist/:quizListId', verifyToken, authorizeTeacher, teacherQuizzesController.updateQuizListItemById);
router.delete('/deletequizbyid/:quizId', verifyToken, authorizeTeacher, teacherQuizzesController.deleteQuizAndItemsById);
router.get('/getAllUserQuizzes',verifyToken, authorizeTeacher, teacherQuizzesController.getAllUserQuizzes);

module.exports = router;
