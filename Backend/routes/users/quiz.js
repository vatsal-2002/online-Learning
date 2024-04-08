const express = require('express');
const router = express.Router();
const userController = require('../../controllers/users/quiz');
const { verifyToken, authorizeUser } = require('../../middleware/auth');

router.get('/getAllQuizzes', verifyToken, authorizeUser, userController.getAllQuizzes);
router.get('/getQuiz/:quizId', verifyToken, authorizeUser, userController.getQuizById);
router.post('/submitUserQuiz', verifyToken, authorizeUser, userController.submitUserQuiz);

module.exports = router;
