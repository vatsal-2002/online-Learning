const db = require('../config/db');

const getAllCourses = (req, res) => {
    try {
        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, GROUP_CONCAT(u.url) AS urls
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.deletedAt IS NULL
            GROUP BY c.id
        `;

        db.query(selectQuery, (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
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
    try {
        const courseId = req.params.courseId;
        const userId = req.user.id;

        const selectQuery = `
            SELECT c.id AS courseId, c.name, c.description, GROUP_CONCAT(u.url) AS urls
            FROM courses c
            LEFT JOIN urlList u ON c.id = u.courseId
            WHERE c.id = ? AND c.deletedAt IS NULL
            GROUP BY c.id
        `;

        db.query(selectQuery, [courseId], (error, results) => {
            if (error) {
                console.log(error, 'Internal Server Error inside query');
                return res.status(500).json({ error: 'Internal Server Error' });
            } else {
                if (results.length === 0) {
                    return res.status(404).json({ error: 'Course not found' });
                }

                const course = {
                    courseId: results[0].courseId,
                    name: results[0].name,
                    description: results[0].description,
                    urls: results[0].urls ? results[0].urls.split(',') : []
                };

                // Store data in users_courses table
                const insertQuery = `INSERT INTO users_courses (userId, courseId) VALUES (?, ?)`;
                db.query(insertQuery, [userId, courseId], (error) => {
                    if (error) {
                        console.error(error, 'Error inserting data into users_courses table');
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }
                    console.log('Data inserted into users_courses table successfully');
                });

                res.status(200).json(course);
            }
        });
    } catch (err) {
        console.error('Error in getCourseById:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getAllCourses,
    getCourseById
};
