const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { validateName, validateEmail } = require('../helpers/validation');

const signUp = async (req, res) => {
    const { firstName, lastName, email, password, userType, skills } = req.body;

    try {
        if (!firstName || !lastName || !email || !password || !userType) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const firstNameValidation = validateName(firstName, 'FirstName');
        const lastNameValidation = validateName(lastName, 'LastName');

        if (!firstNameValidation.isValid) {
            return res.status(400).json({ error: firstNameValidation.error });
        }

        if (!lastNameValidation.isValid) {
            return res.status(400).json({ error: lastNameValidation.error });
        }

        const emailValidation = validateEmail(email);

        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        const existingUser = (email) => {
            return new Promise((resolve, reject) => {
                const table = userType === 'teacher' ? 'teachers' : 'users';
                const query = `SELECT * FROM ${table} WHERE email = ?`;
                db.query(query, [email], (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                });
            });
        };

        const existUser = await existingUser(email);

        if (existUser) {
            return res.status(400).json({ message: 'User Already Exists' });
        }

        const saltRounds = parseInt(process.env.saltRounds);
        const saltKey = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, saltKey);

        const table = userType === 'teacher' ? 'teachers' : 'users';
        let queryValues = [firstName, lastName, email, hashedPassword, saltKey, userType];

        // If user is a teacher, include the skills in the query
        if (userType === 'teacher') {
            queryValues.splice(5, 0, skills);
        }

        const query = `INSERT INTO ${table} (firstName, lastName, email, password, saltKey, ${userType === 'teacher' ? 'skills, ' : ''}userType) VALUES (?, ?, ?, ?, ?, ${userType === 'teacher' ? '?, ' : ''}?)`;
        db.query(query, queryValues, (err, results) => {
            if (err) {
                console.log("server error about query", err);
                return res.status(500).json({ error: "Server Error" });
            }
            const token = jwt.sign({ id: results.insertId }, process.env.SECRET_KEY, (err, token) => {
                res.header('Authorization', token).status(201).json({ message: "SignUp successful", token: token });
            });
        });

    } catch (error) {
        res.json({ error });
    }
};

module.exports = {
    signUp,
};
