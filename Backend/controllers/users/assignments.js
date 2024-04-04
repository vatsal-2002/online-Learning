const db = require('../../config/db');

const getAllAssignments = (req, res) => {
    try {
        const selectQuery = `
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.id AS assignmentListId, al.question, al.answer
            FROM assignments a
            LEFT JOIN assignment_list al ON a.id = al.assId
            WHERE a.deletedAt IS NULL
        `;

        db.query(selectQuery, (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const assignments = results.reduce((acc, assignment) => {
                    const existingAssignment = acc.find(item => item.assignmentId === assignment.assignmentId);
                    if (!existingAssignment) {
                        acc.push({
                            assignmentId: assignment.assignmentId,
                            teacherId: assignment.teacherId,
                            name: assignment.name,
                            startDate: assignment.startDate,
                            endDate: assignment.endDate,
                            questions: []
                        });
                    }
                    const assignmentIndex = acc.findIndex(item => item.assignmentId === assignment.assignmentId);
                    acc[assignmentIndex].questions.push({
                        assignmentListId: assignment.assignmentListId,
                        question: assignment.question,
                        answer: assignment.answer
                    });
                    return acc;
                }, []);
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
            SELECT a.id AS assignmentId, a.teacherId, a.name, a.startDate, a.endDate, al.id AS assignmentListId, al.question, al.answer
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
                        assignmentListId: result.assignmentListId,
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
    const { assignmentId, answers, assignmentListIds } = req.body;
    const userId = req.user.id;
    const submissionDate = new Date().toISOString().split('T')[0]; // Current date

    try {
        // Function to calculate score based on matching characters
        function calculateScore(submittedAnswer, storedAnswer) {
            const maxLength = Math.max(submittedAnswer.length, storedAnswer.length);
            let matchingCharacters = 0;

            for (let i = 0; i < maxLength; i++) {
                if (submittedAnswer[i] && storedAnswer[i] && submittedAnswer[i] === storedAnswer[i]) {
                    matchingCharacters++;
                }
            }

            const percentageMatch = (matchingCharacters / maxLength) * 100;

            // Define score ranges as per specified criteria
            if (percentageMatch === 100) {
                return 2;
            } else if (percentageMatch >= 90) {
                return 1.8;
            } else if (percentageMatch >= 80) {
                return 1.6;
            } else if (percentageMatch >= 70) {
                return 1.4;
            } else if (percentageMatch >= 60) {
                return 1.2;
            } else if (percentageMatch >= 50) {
                return 1;
            } else if (percentageMatch >= 40) {
                return 0.8;
            } else if (percentageMatch >= 30) {
                return 0.6;
            } else if (percentageMatch >= 20) {
                return 0.4;
            } else if (percentageMatch >= 10) {
                return 0.2;
            } else if (percentageMatch > 0) {
                return 0.1;
            } else {
                return 0; // Default score for unmatched answers
            }
        }

        // Retrieve stored answers from the database based on assignmentListIds
        const selectQuery = `SELECT answer FROM assignment_list WHERE id IN (?)`;
        db.query(selectQuery, [assignmentListIds], (error, results) => {
            if (error) {
                console.error('Error retrieving stored answers:', error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const storedAnswers = results.map(result => result.answer);

            // Iterate over each answer and corresponding assignment list ID and insert them into the database
            const assignmentValues = answers.map((answer, index) => {
                const score = calculateScore(answer, storedAnswers[index]); // Call calculateScore function with corresponding stored answer
                return [userId, assignmentId, answer, submissionDate, assignmentListIds[index], score];
            });

            const insertQuery = `INSERT INTO users_assignment (userId, assId, answer, submissionDate, assignment_listID, score) VALUES ?`;
            db.query(insertQuery, [assignmentValues], (error, results) => {
                if (error) {
                    console.error('Error inserting assignment detail:', error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                // Construct the response object including assId, assignment_listID, and score
                const response = assignmentValues.map((value, index) => ({
                    assId: value[1],
                    assignment_listID: value[4],
                    score: value[5]
                }));

                res.status(201).json({ message: 'Assignment detail submitted successfully', responses: response });
            });
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
