const db = require('../../config/db');

const getAllAssignments = (req, res) => {
    try {
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.deletedAt IS NULL
        `;

        db.query(selectQuery, (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const assignments = results.map(assignment => ({
                    assignmentId: assignment.assignmentId,
                    teacherId: assignment.teacherId,
                    name: assignment.name,
                    startDate: assignment.startDate,
                    endDate: assignment.endDate,
                    questions: results
                        .filter(result => result.assignmentId === assignment.assignmentId)
                        .map(result => ({
                            question: result.question,
                            answer: result.answer
                        }))
                }));
                res.status(200).json(assignments);
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
            WHERE a.id = ? AND a.deletedAt IS NULL
        `;

        db.query(selectQuery, [assignmentId], (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
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
                    questions: results.map(result => ({
                        question: result.question,
                        answer: result.answer
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

const submitAssignment = (req, res) => {
    const { assignmentId, answers } = req.body;
    const userId = req.user.id;
    const submissionDate = new Date().toISOString().split('T')[0]; // Current date

    try {
        // Iterate over each answer and insert it into the database
        const answerValues = answers.map(answer => [userId, assignmentId, answer, submissionDate]);

        const insertQuery = `INSERT INTO users_assignment (userId, assId, answer, submissionDate) VALUES ?`;
        db.query(insertQuery, [answerValues], (error, results) => {
            if (error) {
                console.error('Error inserting assignment detail:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            res.status(201).json({ message: 'Assignment detail submitted successfully', assignmentId: results.insertId });
        });
    } catch (err) {
        console.error('Error in submitAssignment:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



module.exports = {
    getAllAssignments,
    getAssignmentById,
    submitAssignment
};
