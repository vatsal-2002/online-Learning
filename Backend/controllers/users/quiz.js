const db = require('../../config/db');

const getAllQuizzes = (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        const selectQuery = `
            SELECT q.name AS quizName, q.startTime, q.endTime, ql.question, ql.options
            FROM quizs q
            INNER JOIN quiz_list ql ON q.id = ql.quizId
            WHERE q.teacherId = ? AND q.deletedAt IS NULL
        `;

        db.query(selectQuery, [teacherId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const quizzes = results.reduce((acc, quiz) => {
                    const existingQuiz = acc.find(item => item.quizName === quiz.quizName);
                    if (!existingQuiz) {
                        acc.push({
                            quizName: quiz.quizName,
                            startTime: quiz.startTime,
                            endTime: quiz.endTime,
                            questions: [{
                                question: quiz.question,
                                options: quiz.options
                            }]
                        });
                    } else {
                        existingQuiz.questions.push({
                            question: quiz.question,
                            options: quiz.options
                        });
                    }
                    return acc;
                }, []);
                res.status(200).json(quizzes);
            }
        });
    } catch (err) {
        console.error('Error in getAllQuizzes:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getQuizById = (req, res) => {
    const { teacherId, quizId } = req.params;

    try {
        const selectQuery = `
            SELECT q.name AS quizName, q.startTime, q.endTime, ql.question, ql.options
            FROM quizs q
            INNER JOIN quiz_list ql ON q.id = ql.quizId
            WHERE q.id = ? AND q.teacherId = ? AND q.deletedAt IS NULL
        `;

        db.query(selectQuery, [quizId, teacherId], (error, results) => {
            if (error) {
                console.error('Error fetching quiz by ID:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            // Construct the quiz object
            const quiz = {
                quizName: results[0].quizName,
                startTime: results[0].startTime,
                endTime: results[0].endTime,
                questions: results.map(row => ({
                    question: row.question,
                    options: row.options
                }))
            };

            res.status(200).json(quiz);
        });
    } catch (err) {
        console.error('Error in getQuizById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const submitUserQuiz = (req, res) => {
    const { teacherId } = req.params;
    const { quizId, answers, quizListId } = req.body;
    const userId = req.user.id;
    const submissionDate = new Date().toISOString().split('T')[0]; // Current date

    try {
        // Function to calculate score based on matching characters
        function calculateScore(submittedAnswer, storedAnswer) {
            return submittedAnswer === storedAnswer ? 1 : 0;
        }

        // Retrieve stored correct answers from the database based on quizListId
        const selectQuery = `SELECT correct_answer FROM quiz_list WHERE id IN (?)`;
        db.query(selectQuery, [quizListId], (error, results) => {
            if (error) {
                console.error('Error retrieving stored answers:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const storedAnswers = results.map(result => result.correct_answer);

            // Iterate over each answer and insert them into the database with the calculated score
            const quizValues = answers.map((answer, index) => {
                const score = calculateScore(answer, storedAnswers[index]); // Call calculateScore function with corresponding stored answer
                return [userId, quizId, answer, submissionDate, score];
            });

            const insertQuery = `INSERT INTO users_quiz (userId, quizId, answer, submissionDate, score) VALUES ?`;
            db.query(insertQuery, [quizValues], (error, results) => {
                if (error) {
                    console.error('Error inserting quiz detail:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.status(201).json({ message: 'User quiz submitted successfully' });
            });
        });
    } catch (err) {
        console.error('Error in submitUserQuiz:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getAllQuizzes,
    getQuizById,
    submitUserQuiz
};
