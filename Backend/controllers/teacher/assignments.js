const db = require('../../config/db');
const jwt = require('jsonwebtoken');


const createAssignment = (req, res) => {
    const { name, startDate, endDate, questions } = req.body;
    const { teacherId, courseId } = req.params;
    const token = req.headers['authorization'];

    jwt.verify(token, process.env.SECRET_KEY, (err, authData) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(403).json({ error: "Invalid token" });
        }

        if (authData.id !== parseInt(teacherId)) {
            // Ensure that the authenticated teacherId matches the one provided in the request
            return res.status(403).json({ error: "Unauthorized access" });
        }

        db.query(`INSERT INTO assignments (teacherId, courseId, name, startDate, endDate) VALUES (?, ?, ?, ?, ?)`,
            [teacherId, courseId, name, startDate, endDate], (err, results) => {
                if (err) {
                    console.error('Error creating an assignment', err);
                    return res.status(500).json({ error: 'Failed to create assignment' });
                }

                const assignmentId = results.insertId;

                if (questions && questions.length > 0) {
                    const questionValues = questions.map(question => [assignmentId, question.question, question.answer]);

                    db.query(`INSERT INTO assignment_list (assId, question, answer) VALUES ?`, [questionValues], (err) => {
                        if (err) {
                            console.error('Error inserting questions:', err);
                            return res.status(500).json({ error: 'Failed to insert questions' });
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


const updateAssignmentById = (req, res) => {
    try {
        const { teacherId, courseId, assignmentId } = req.params; // Extracting teacherId, courseId, and assignmentId from params
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

        // Add teacherId, courseId, and assignmentId to the update query
        updateFields.push('teacherId = ?', 'courseId = ?');
        updateValues.push(teacherId, courseId);

        const updateQuery = `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = ? AND teacherId = ? AND courseId = ?`;
        const values = [...updateValues, assignmentId, teacherId, courseId];

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
        const assignmentId = req.params.assignmentId;
        const { assignmentQuestion } = req.body;

        if (!Array.isArray(assignmentQuestion)) {
            return res.status(400).json({ error: 'Invalid assignmentQuestion payload' });
        }

        const updatePromises = assignmentQuestion.map(item => {
            return new Promise((resolve, reject) => {
                const { id, question, answer, action } = item;

                if (action === 'delete') {
                    // Soft delete the assignment list item
                    const softDeleteQuery = `UPDATE assignment_list SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ?`;
                    db.query(softDeleteQuery, [id], (error, results) => {
                        if (error) {
                            console.error(error, 'Internal Server Error inside soft delete query');
                            reject({ error: 'Internal Server Error' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'Assignment list item not found' });
                            return;
                        }

                        resolve({ message: 'Assignment list items deleted successfully' });
                    });
                } else {
                    // Update the assignment list item
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
                    const values = [...updateValues, id];

                    db.query(updateQuery, values, (error, results) => {
                        if (error) {
                            console.error(error, 'Internal Server Error inside update query');
                            reject({ error: 'Internal Server Error' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'Assignment list item not found' });
                            return;
                        }

                        resolve({ message: 'Assignment list items updated successfully' });
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
                console.error('Error updating/deleting assignment list items:', error);
                res.status(500).json({ error: 'Failed to update/delete assignment list items' });
            });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getAllAssignments = (req, res) => {
    const teacherId = req.params.teacherId;
    const courseId = req.params.courseId;

    try {
        // Query to fetch all assignments for the teacher and course along with associated questions and answers
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.teacherId = ? AND a.courseId = ?
        `;

        db.query(selectQuery, [teacherId, courseId], (error, results) => {
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
    const teacherId = req.params.teacherId;
    const courseId = req.params.courseId;
    const assignmentId = req.params.assignmentId;

    try {
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.teacherId = ? AND a.courseId = ? AND a.id = ?;
        `;

        db.query(selectQuery, [teacherId, courseId, assignmentId], (error, results) => {
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
    const { teacherId, courseId, assignmentId } = req.params;

    try {
        // Verify that the teacherId from URL params matches the one from JWT token
        if (parseInt(teacherId) !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        // Soft delete the assignment
        const softDeleteAssignmentQuery = `
            UPDATE assignments 
            SET deletedAt = CURRENT_TIMESTAMP() 
            WHERE id = ? AND teacherId = ? AND courseId = ?
        `;
        db.query(softDeleteAssignmentQuery, [assignmentId, teacherId, courseId], (error, assignmentResult) => {
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
        const teacherId = req.params.teacherId;
        const courseId = req.params.courseId;
        const assignmentId = req.params.assignmentId;

        const selectQuery = `
            SELECT ua.id, ua.userId, ua.assId, ua.answer, ua.submissionDate, ua.score, u.firstname, u.lastname, u.email
            FROM users_assignment ua
            INNER JOIN users u ON ua.userId = u.id
            INNER JOIN assignments a ON ua.assId = a.id
            WHERE a.teacherId = ? AND a.courseId = ? AND a.id = ?
        `;

        db.query(selectQuery, [teacherId, courseId, assignmentId], (error, results) => {
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
    updateAssignmentById,
    updateAssignmentListById,
    getAllAssignments,
    getAssignmentById,
    softDeleteAssignmentById,
    getAllUserAssignments
};
