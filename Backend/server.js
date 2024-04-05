require('dotenv').config();
const cors = require('cors');
const express = require('express');
const signup = require('./routes/signup');
const login = require('./routes/login');
const teachercourse = require('./routes/teachers/course')
const teacherassignment = require('./routes/teachers/assignments')
const teacherquiz = require('./routes/teachers/quiz')
const Userscourse = require('./routes/users/courses')
const UsersAssignment = require('./routes/users/assignments')
const db = require('./config/db');


const app = express();
app.use(cors());

// checkDatabaseConnection();
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to the database');
});

app.use(express.json());

app.use('', signup);
app.use('', login);
app.use('/course', teachercourse);
app.use('/course', teacherassignment);
app.use('/course', teacherquiz);
app.use('/courses', UsersAssignment);
app.use('/courses', Userscourse);

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
