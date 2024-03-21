require('dotenv').config();
const cors = require('cors');
const express = require('express');
const signup = require('./routes/signup');
const login = require('./routes/login');
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

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
