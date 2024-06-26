const db = require('../../config/db');

const postQuiz = (req, res) => {
    const { name, startTime, endTime, questions } = req.body;
    const teacherId = req.params.teacherId;
    const courseId = req.params.courseId;

    try {
        db.query(`INSERT INTO quizs (teacherId, courseId, name, startTime, endTime) VALUES (?, ?, ?, ?, ?)`, [teacherId, courseId, name, startTime, endTime], (err, results) => {
            if (err) {
                console.error('Error creating a quiz', err);
                return res.status(500).json({ error: 'Failed to create quiz' });
            }

            const quizId = results.insertId;

            const questionValues = questions.map(({ question, options, answer, correct_answer }) => {
                // Ensure correct_answer matches one of the ENUM values ('A', 'B', 'C', 'D')
                const sanitizedCorrectAnswer = correct_answer.toUpperCase(); // Convert to uppercase
                if (!['A', 'B', 'C', 'D'].includes(sanitizedCorrectAnswer)) {
                    console.error('Invalid correct_answer:', sanitizedCorrectAnswer);
                    throw new Error('Invalid correct_answer');
                }

                return [quizId, question, options.join(','), answer, sanitizedCorrectAnswer];
            });

            db.query(`INSERT INTO quiz_list (quizId, question, options, answer, correct_answer) VALUES ?`, [questionValues], (err) => {
                if (err) {
                    console.error('Error inserting quiz questions:', err);
                    return res.status(500).json({ error: 'Failed to insert quiz questions' });
                }

                res.status(201).json({
                    message: 'Quiz created successfully',
                    quizId: quizId
                });
            });
        });
    } catch (err) {
        console.error('Error in postQuiz:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getTeacherQuizzes = (req, res) => {
    const { teacherId, courseId } = req.params;

    try {
        const selectQuery = `
            SELECT q.id AS quizId, q.name AS quizName, q.startTime, q.endTime, ql.id AS questionId, ql.question, ql.options, ql.answer, ql.correct_answer
            FROM quizs q
            INNER JOIN quiz_list ql ON q.id = ql.quizId
            WHERE q.teacherId = ? AND q.courseId = ?
        `;

        db.query(selectQuery, [teacherId, courseId], (error, results) => {
            if (error) {
                console.error('Error fetching teacher quizzes:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Grouping quiz questions by quizId
            const quizzes = {};
            results.forEach(row => {
                const { quizId, quizName, startTime, endTime, questionId, question, options, answer, correct_answer } = row;
                if (!quizzes[quizId]) {
                    quizzes[quizId] = {
                        quizId,
                        quizName,
                        startTime,
                        endTime,
                        questions: []
                    };
                }
                quizzes[quizId].questions.push({ questionId, question, options, answer, correct_answer });
            });

            // Convert object to array
            const quizzesArray = Object.values(quizzes);

            res.status(200).json(quizzesArray);
        });
    } catch (err) {
        console.error('Error in getTeacherQuizzes:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getQuizById = (req, res) => {
    const { teacherId, courseId, quizId } = req.params;

    try {
        const selectQuery = `
            SELECT q.id AS quizId, q.name AS quizName, q.startTime, q.endTime, ql.id AS questionId, ql.question, ql.options, ql.answer, ql.correct_answer
            FROM quizs q
            INNER JOIN quiz_list ql ON q.id = ql.quizId
            WHERE q.id = ? AND q.teacherId = ? AND q.courseId = ?
        `;

        db.query(selectQuery, [quizId, teacherId, courseId], (error, results) => {
            if (error) {
                console.error('Error fetching quiz by ID:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            // Grouping quiz questions by quizId
            const quiz = {
                quizId: results[0].quizId,
                quizName: results[0].quizName,
                startTime: results[0].startTime,
                endTime: results[0].endTime,
                questions: results.map(row => ({
                    questionId: row.questionId,
                    question: row.question,
                    options: row.options,
                    answer: row.answer,
                    correct_answer: row.correct_answer
                }))
            };

            res.status(200).json(quiz);
        });
    } catch (err) {
        console.error('Error in getQuizById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateQuizById = (req, res) => {
    try {
        const quizId = req.params.quizId;
        const { name, startTime, endTime, questions } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (startTime) {
            updateFields.push('startTime = ?');
            updateValues.push(startTime);
        }

        if (endTime) {
            updateFields.push('endTime = ?');
            updateValues.push(endTime);
        }

        // You may need to handle updating quiz questions in a separate function

        const updateQuery = `UPDATE quizs SET ${updateFields.join(', ')} WHERE id = ?`;
        const values = [...updateValues, quizId];

        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Quiz not found' });
            }

            res.json({
                message: 'Quiz details updated successfully'
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateQuizListItemById = (req, res) => {
    try {
        const { teacherId, courseId, quizId } = req.params;
        const { quiz } = req.body;

        if (!Array.isArray(quiz)) {
            return res.status(400).json({ error: 'Invalid quiz payload' });
        }

        const updatePromises = quiz.map(item => {
            return new Promise((resolve, reject) => {
                const { id, question, options, answer, correct_answer, action } = item;

                if (action === 'delete') {
                    // Soft delete the quiz list item
                    const softDeleteQuery = `UPDATE quiz_list SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ? AND quizId = ?`;
                    db.query(softDeleteQuery, [id, quizId], (error, results) => {
                        if (error) {
                            console.error(error, 'Internal Server Error inside soft delete query');
                            reject({ error: 'Internal Server Error' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'Quiz list item not found' });
                            return;
                        }

                        resolve({ message: 'Quiz list items deleted successfully' });
                    });
                } else {
                    // Update the quiz list item
                    const updateFields = [];
                    const updateValues = [];

                    if (question) {
                        updateFields.push('question = ?');
                        updateValues.push(question);
                    }

                    if (options) {
                        updateFields.push('options = ?');
                        updateValues.push(JSON.stringify(options));
                    }

                    if (answer) {
                        updateFields.push('answer = ?');
                        updateValues.push(answer);
                    }

                    if (correct_answer) {
                        updateFields.push('correct_answer = ?');
                        updateValues.push(correct_answer);
                    }

                    const updateQuery = `UPDATE quiz_list SET ${updateFields.join(', ')} WHERE id = ? AND quizId = ?`;
                    const values = [...updateValues, id, quizId];

                    db.query(updateQuery, values, (error, results) => {
                        if (error) {
                            console.error(error, 'Internal Server Error inside update query');
                            reject({ error: 'Internal Server Error' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'Quiz list item not found' });
                            return;
                        }

                        resolve({ message: 'Quiz list item updated successfully' });
                    });
                }
            });
        });

        // Execute all update/delete promises concurrently
        Promise.all(updatePromises)
            .then(messages => {
                res.json({ messages });
            })
            .catch(error => {
                console.error('Error updating/deleting quiz list items:', error);
                res.status(500).json({ error: 'Failed to update/delete quiz list items' });
            });
    } catch (err) {
        console.error('Internal server error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const deleteQuizAndItemsById = (req, res) => {
    try {
        const quizId = req.params.quizId;

        // Soft delete query for quiz
        const softDeleteQuizQuery = `UPDATE quizs SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ?`;

        // Soft delete query for quiz list items
        const softDeleteQuizListQuery = `UPDATE quiz_list SET deletedAt = CURRENT_TIMESTAMP() WHERE quizId = ?`;

        // Run both queries in a transaction
        db.beginTransaction(error => {
            if (error) {
                console.error('Transaction error:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            db.query(softDeleteQuizQuery, [quizId], (error, results) => {
                if (error) {
                    return db.rollback(() => {
                        console.error(error, 'Error deleting quiz');
                        return res.status(500).json({ error: 'Internal Server Error' });
                    });
                }

                db.query(softDeleteQuizListQuery, [quizId], (error, results) => {
                    if (error) {
                        return db.rollback(() => {
                            console.error(error, 'Error deleting quiz list items');
                            return res.status(500).json({ error: 'Internal Server Error' });
                        });
                    }

                    db.commit(error => {
                        if (error) {
                            console.error('Commit error:', error);
                            return db.rollback(() => {
                                console.error('Rollback successful');
                                return res.status(500).json({ error: 'Internal Server Error' });
                            });
                        }

                        res.json({
                            message: 'Quiz and associated items soft deleted successfully'
                        });
                    });
                });
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAllUserQuizzes = (req, res) => {
    try {
        const { teacherId, courseId, quizId } = req.params;

        const selectQuery = `
            SELECT uq.id, uq.userId, uq.quizId, uq.answer, uq.submissionDate, uq.score, u.firstname, u.lastname, u.email
            FROM users_quiz uq
            INNER JOIN users u ON uq.userId = u.id
            WHERE uq.quizId = ?;
        `;

        db.query(selectQuery, [quizId], (error, results) => {
            if (error) {
                console.error('Error fetching user quizzes:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.status(200).json(results);
        });
    } catch (err) {
        console.error('Error in getAllUserQuizzes:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    postQuiz,
    getTeacherQuizzes,
    getQuizById,
    updateQuizById,
    updateQuizListItemById,
    deleteQuizAndItemsById,
    getAllUserQuizzes
};

