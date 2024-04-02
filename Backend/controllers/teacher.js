const db = require('../config/db');
const jwt = require('jsonwebtoken');

const courseUpload = async (req, res) => {
    const { name, description, url } = req.body;
    const token = req.headers['authorization'];

    jwt.verify(token, process.env.SECRET_KEY, (err, authData) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(403).json({ error: "Invalid token" });
        }

        const teacherId = authData.id;

        db.query(`INSERT INTO courses (teacherId, name, description) VALUES (?, ?, ?)`, [teacherId, name, description], (err, results) => {
            if (err) {
                console.error('Error creating a course', err);
                res.status(500).json({ error: 'Failed to create course' });
                return;
            }

            const courseId = results.insertId;

            if (url) {
                const urlValue = Array.isArray(url) ? url : [url];
                const urlValues = urlValue.map(u => [courseId, u]);

                db.query(`INSERT INTO urlList (courseId, url) VALUES ?`, [urlValues], (err) => {
                    if (err) {
                        console.error('Error inserting URLs:', err);
                        res.status(500).json({ error: 'Failed to insert URLs' });
                        return;
                    }
                    res.status(201).json({
                        message: 'Course created successfully',
                        name: name,
                        description: description,
                        url: url
                    });
                });
            } else {
                res.status(201).json({
                    message: 'Course created successfully',
                    name: name,
                    description: description,
                    url: url
                });
            }
        });
    });
};


const teacherAllCourses = (req, res) => {
    const teacherId = req.params.id;
    try {
        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, GROUP_CONCAT(u.url) AS urls
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.teacherId = ? AND c.deletedAt IS NULL
            GROUP BY c.id
        `;

        db.query(selectQuery, [teacherId], (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                res.status(500).json({ error: 'Internal Server Error' });
            } else {
                const courses = results.map(course => ({
                    courseId: course.courseId,
                    name: course.name,
                    description: course.description,
                    url: course.urls ? course.urls.split(',') : []
                }));
                res.status(200).json(courses);
            }
        });
    } catch (err) {
        console.error('Error in getAllCourses:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getCourseById = (req, res) => {
    const courseId = req.params.courseId;
    try {
        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, u.id AS urlListId, u.url
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.id = ? AND c.deletedAt IS NULL
            ORDER BY u.id
        `;

        db.query(selectQuery, [courseId], (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                res.status(500).json({ error: 'Internal Server Error' });
            } else {
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Course not found' });
                }

                const course = {
                    courseId: results[0].courseId,
                    name: results[0].name,
                    description: results[0].description,
                    urls: results.map(row => ({ urlId: row.urlListId, url: row.url }))
                };

                res.status(200).json(course);
            }
        });
    } catch (err) {
        console.error('Error in getCourseById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateCourseById = (req, res) => {
    try {
        const courseId = req.params.courseId;
        const { name, description } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (description) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }

        const updateQuery = `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`;
        const values = [...updateValues, courseId];

        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }

            const updatedFields = {};
            updateFields.forEach((field, index) => {
                updatedFields[field.split(' ')[0]] = updateValues[index];
            });

            res.json({
                message: 'Course details updated successfully',
                updatedFields
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateUrlById = (req, res) => {
    try {
        const { url } = req.body;
        const urlId = req.params.urlId;

        // Check if both urlId and url are provided
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Update the URL in the database
        const updateQuery = `UPDATE urlList SET url = ? WHERE id = ?`;
        const values = [url, urlId];

        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update URL query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'URL not found' });
            }

            res.json({ message: 'URL updated successfully' });
        });
    } catch (err) {
        console.error('Internal server error about URL query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const softDeleteCourseById = (req, res) => {
    try {
        const courseId = req.params.courseId;

        // Soft delete the course
        const deleteCourseQuery = `UPDATE courses SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ?`;

        db.query(deleteCourseQuery, [courseId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside soft delete query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }

            // Soft delete associated URLs for the course
            const deleteUrlsQuery = `UPDATE urlList SET deletedAt = CURRENT_TIMESTAMP() WHERE courseId = ?`;

            db.query(deleteUrlsQuery, [courseId], (error) => {
                if (error) {
                    console.error(error, 'Internal Server Error inside soft delete URLs query');
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.json({ message: 'Course and associated URLs soft deleted successfully' });
            });
        });
    } catch (err) {
        console.error('Internal server error about soft delete query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

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




module.exports = {
    courseUpload,
    teacherAllCourses,
    getCourseById,
    updateCourseById,
    updateUrlById,
    softDeleteCourseById,
    createAssignment,
    getUsersForCourse,
    updateAssignmentById,
    updateAssignmentListById,
    getAllAssignments,
    getAssignmentById
};
