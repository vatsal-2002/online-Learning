const db = require('../../config/db');
const jwt = require('jsonwebtoken');

const createAssignment = (req, res) => {
    const { name, startDate, endDate, questions } = req.body;
    const token = req.headers['authorization'];

    jwt.verify(token, process.env.SECRET_KEY, (err, authData) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(403).json({ error: "Invalid token" });
        }

        const teacherId = authData.id;

        db.query(`INSERT INTO assignments (teacherId, name, startDate, endDate) VALUES (?, ?, ?, ?)`, [teacherId, name, startDate, endDate], (err, results) => {
            if (err) {
                console.error('Error creating an assignment', err);
                res.status(500).json({ error: 'Failed to create assignment' });
                return;
            }

            const assignmentId = results.insertId;

            if (questions && questions.length > 0) {
                const questionValues = questions.map(question => [assignmentId, question.question, question.answer]);

                db.query(`INSERT INTO assignment_list (assId, question, answer) VALUES ?`, [questionValues], (err) => {
                    if (err) {
                        console.error('Error inserting questions:', err);
                        res.status(500).json({ error: 'Failed to insert questions' });
                        return;
                    }
                    res.status(201).json({
                        message: 'Assignment created successfully',
                        assignmentId: assignmentId,
                        name: name,
                        startDate: startDate,
                        endDate: endDate,
                        questions: questions
                    });
                });
            } else {
                res.status(201).json({
                    message: 'Assignment created successfully',
                    assignmentId: assignmentId,
                    name: name,
                    startDate: startDate,
                    endDate: endDate,
                    questions: []
                });
            }
        });
    });
};


const getUsersForCourse = (req, res) => {
    const courseId = req.params.courseId;
    try {
        const selectQuery = `
            SELECT u.id AS userId, u.email, u.firstName, u.lastName
            FROM users u
            INNER JOIN users_courses cu ON u.id = cu.userId
            WHERE cu.courseId = ?;
        `;

        db.query(selectQuery, [courseId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const users = results.map(user => ({
                    userId: user.userId,
                    firstname: user.firstName,
                    lastname: user.lastName,
                    email: user.email
                }));
                const userCount = users.length;
                res.status(200).json({ userCount, users });
            }
        });
    } catch (err) {
        console.error('Error in getUsersForCourse:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateAssignmentById = (req, res) => {
    try {
        const assignmentId = req.params.assignmentId;
        const { name, startDate, endDate, questions } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (startDate) {
            updateFields.push('startDate = ?');
            updateValues.push(startDate);
        }

        if (endDate) {
            updateFields.push('endDate = ?');
            updateValues.push(endDate);
        }

        const updateQuery = `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = ?`;
        const values = [...updateValues, assignmentId];

        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.json({
                message: 'Assignment details updated successfully'
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateAssignmentListById = (req, res) => {
    try {
        const assignmentListId = req.params.assignmentListId;
        const { question, answer } = req.body;

        if (!question && !answer) {
            return res.status(400).json({ error: 'At least one field (question or answer) is required for update' });
        }

        const updateFields = [];
        const updateValues = [];

        if (question) {
            updateFields.push('question = ?');
            updateValues.push(question);
        }

        if (answer) {
            updateFields.push('answer = ?');
            updateValues.push(answer);
        }

        const updateQuery = `UPDATE assignment_list SET ${updateFields.join(', ')} WHERE id = ?`;
        const values = [...updateValues, assignmentListId];

        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Assignment list item not found' });
            }

            res.json({
                message: 'Assignment list item updated successfully'
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAllAssignments = (req, res) => {
    const teacherId = req.user.id; // Assuming you extract teacher ID from the token

    try {
        // Query to fetch all assignments for the teacher along with associated questions and answers
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.teacherId = ?
        `;

        db.query(selectQuery, [teacherId], (error, results) => {
            if (error) {
                console.error('Error fetching assignments:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const assignments = {};

                // Group results by assignment ID
                results.forEach(row => {
                    if (!assignments[row.assignmentId]) {
                        assignments[row.assignmentId] = {
                            assignmentId: row.assignmentId,
                            teacherId: row.teacherId,
                            name: row.name,
                            startDate: row.startDate,
                            endDate: row.endDate,
                            questions: []
                        };
                    }

                    if (row.question && row.answer) {
                        assignments[row.assignmentId].questions.push({
                            question: row.question,
                            answer: row.answer
                        });
                    }
                });

                // Convert object to array
                const assignmentsArray = Object.values(assignments);

                res.status(200).json(assignmentsArray);
            }
        });
    } catch (err) {
        console.error('Error in getAllAssignments:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getAssignmentById = (req, res) => {
    const assignmentId = req.params.assignmentId;
    try {
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.id = ?;
        `;

        db.query(selectQuery, [assignmentId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Assignment not found' });
                }

                const assignment = {
                    assignmentId: results[0].assignmentId,
                    teacherId: results[0].teacherId,
                    name: results[0].name,
                    startDate: results[0].startDate,
                    endDate: results[0].endDate,
                    questions: results.map(row => ({
                        question: row.question,
                        answer: row.answer
                    }))
                };

                res.status(200).json(assignment);
            }
        });
    } catch (err) {
        console.error('Error in getAssignmentById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const softDeleteAssignmentById = (req, res) => {
    const assignmentId = req.params.assignmentId;

    try {
        // Soft delete the assignment
        const softDeleteAssignmentQuery = `UPDATE assignments SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ?`;
        db.query(softDeleteAssignmentQuery, [assignmentId], (error, assignmentResult) => {
            if (error) {
                console.error('Error soft deleting assignment:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Soft delete associated questions and answers
            const softDeleteQuestionsQuery = `UPDATE assignment_list SET deletedAt = CURRENT_TIMESTAMP() WHERE assId = ?`;
            db.query(softDeleteQuestionsQuery, [assignmentId], (error, questionsResult) => {
                if (error) {
                    console.error('Error soft deleting questions:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.status(200).json({ message: 'Assignment and associated questions soft deleted successfully' });
            });
        });
    } catch (err) {
        console.error('Error in softDeleteAssignmentById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getAllUserAssignments = (req, res) => {
    try {
        const selectQuery = `
            SELECT ua.id, ua.userId, ua.assId, ua.answer, ua.submissionDate, ua.score, u.firstname, u.lastname, u.email
            FROM users_assignment ua
            INNER JOIN users u ON ua.userId = u.id
        `;

        db.query(selectQuery, (error, results) => {
            if (error) {
                console.error('Error fetching user assignments:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.status(200).json(results);
        });
    } catch (err) {
        console.error('Error in getAllUserAssignments:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


module.exports = {
    createAssignment,
    getUsersForCourse,
    updateAssignmentById,
    updateAssignmentListById,
    getAllAssignments,
    getAssignmentById,
    softDeleteAssignmentById,
    getAllUserAssignments
};
