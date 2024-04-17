const db = require('../../config/db');
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
    const teacherId = req.params.id; // Extract the teacherId from URL parameter

    try {
        // Define the SQL query to fetch courses for the specified teacher
        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, GROUP_CONCAT(u.url) AS urls
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.teacherId = ? AND c.deletedAt IS NULL
            GROUP BY c.id
        `;

        // Execute the SQL query to fetch courses
        db.query(selectQuery, [teacherId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // If successful, format the results and send them as JSON response
            const courses = results.map(course => ({
                courseId: course.courseId,
                name: course.name,
                description: course.description,
                url: course.urls ? course.urls.split(',') : []
            }));
            res.status(200).json(courses);
        });
    } catch (err) {
        console.error('Error in teacherAllCourses:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getCourseById = (req, res) => {
    const teacherId = req.params.teacherId;
    const courseId = req.params.courseId;

    try {
        // Check if courseId is available
        if (!courseId) {
            return res.status(400).json({ error: 'Invalid Course' });
        }

        // Define the SQL query to fetch the course details
        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, u.id AS urlListId, u.url
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.id = ? AND c.teacherId = ? AND c.deletedAt IS NULL
            ORDER BY u.id
        `;

        // Execute the SQL query to fetch the course details
        db.query(selectQuery, [courseId, teacherId], (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Check if the course is found
            if (results.length === 0) {
                return res.status(404).json({ error: 'Course not found' });
            }

            // Format the course details and send as JSON response
            const course = {
                courseId: results[0].courseId,
                name: results[0].name,
                description: results[0].description,
                urls: results.map(row => ({ urlId: row.urlListId, url: row.url }))
            };

            res.status(200).json(course);
        });
    } catch (err) {
        console.error('Error in getCourseById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const updateCourseById = (req, res) => {
    try {
        const teacherId = req.params.teacherId;
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

        // Construct the SQL update query
        const updateQuery = `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ? AND teacherId = ?`;
        const values = [...updateValues, courseId, teacherId];

        // Execute the update query
        db.query(updateQuery, values, (error, results) => {
            if (error) {
                console.error(error, 'Internal Server Error inside update query');
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Check if the course was found and updated
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Course not found or you do not have required permissions' });
            }

            // Retrieve the updated course details
            const selectQuery = `SELECT * FROM courses WHERE id = ?`;
            db.query(selectQuery, [courseId], (error, results) => {
                if (error) {
                    console.error(error, 'Internal Server Error inside select query');
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                // Extract the updated course details
                const updatedCourse = results[0];

                // Send the updated course object in the response
                res.json({
                    message: 'Course details updated successfully',
                    course: updatedCourse
                });
            });
        });
    } catch (err) {
        console.error('Internal server error about query', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const updateUrlById = (req, res) => {
    try {
        const { urls } = req.body;

        // Check if urls array is provided
        if (!urls || !Array.isArray(urls)) {
            return res.status(400).json({ error: 'Invalid URLs payload' });
        }

        // Loop through each URL object in the array and update/delete the URL in the database
        const updatePromises = urls.map(urlObj => {
            return new Promise((resolve, reject) => {
                const { id, action } = urlObj;

                // Check if id and action are provided for each URL object
                if (!id || !action || (action !== 'update' && action !== 'delete')) {
                    reject({ error: 'URL ID and action (update/delete) are required for each URL object' });
                    return;
                }

                // If action is 'update', update the URL in the database
                if (action === 'update') {
                    const { value } = urlObj;

                    // Check if value is provided for updating
                    if (!value) {
                        reject({ error: 'Value is required for updating the URL' });
                        return;
                    }

                    const updateQuery = `UPDATE urlList SET url = ? WHERE id = ?`;
                    const values = [value, id];

                    db.query(updateQuery, values, (error, results) => {
                        if (error) {
                            reject({ error: 'Internal Server Error inside update URL query' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'URL not found' });
                            return;
                        }

                        resolve();
                    });
                } else if (action === 'delete') {
                    // Soft delete the URL
                    const softDeleteQuery = `UPDATE urlList SET deletedAt = CURRENT_TIMESTAMP() WHERE id = ?`;
                    db.query(softDeleteQuery, [id], (error, results) => {
                        if (error) {
                            reject({ error: 'Internal Server Error inside soft delete URL query' });
                            return;
                        }

                        if (results.affectedRows === 0) {
                            reject({ error: 'URL not found' });
                            return;
                        }

                        resolve();
                    });
                }
            });
        });

        // Execute all update/delete promises concurrently
        Promise.all(updatePromises)
            .then(() => {
                // Check if any URL was updated (if any promise resolves)
                const isUpdate = urls.some(urlObj => urlObj.action === 'update');

                // Determine the message based on the action
                const message = isUpdate ? 'URLs updated successfully' : 'URLs deleted successfully';

                // Send the appropriate message in the response
                res.json({ message });
            })
            .catch(error => {
                console.error('Error updating/deleting URLs:', error);
                res.status(500).json({ error: 'Failed to update/delete URLs' });
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

module.exports = {
    courseUpload,
    teacherAllCourses,
    getCourseById,
    updateCourseById,
    updateUrlById,
    softDeleteCourseById,
    getUsersForCourse
};