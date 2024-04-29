const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/quiz');
const { verifyToken, authorizeUser } = require('../../middleware/auth');
  
router.get('/teacher/:teacherId/quiz', verifyToken, authorizeUser, userController.getAllQuizzes);

router.get('/teacher/:teacherId/quiz/:quizId', verifyToken, authorizeUser, userController.getQuizById);

router.post('/teacher/:teacherId/quiz', verifyToken, authorizeUser, userController.submitUserQuiz);

module.exports = router;
