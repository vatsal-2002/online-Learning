const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { validateEmail } = require('../helpers/validation');

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const emailValidation = validateEmail(email);

        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check in the teachers table
        let query = 'SELECT * FROM teachers WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error("Server error about query", err);
                return res.status(500).json({ error: "Server Error" });
            }

            if (results.length > 0) {
                const user = results[0];
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (passwordMatch) {
                    const token = jwt.sign({ id: user.id, userType: 'teacher' }, process.env.SECRET_KEY);
                    return res.status(200).json({ message: "Login successful", userType: "teacher", email: user.email, token: token });
                }
            }

            // If not found in teachers, check in the users table
            query = 'SELECT * FROM users WHERE email = ?';
            db.query(query, [email], async (err, results) => {
                if (err) {
                    console.error("Server error about query", err);
                    return res.status(500).json({ error: "Server Error" });
                }

                if (results.length > 0) {
                    const user = results[0];
                    const passwordMatch = await bcrypt.compare(password, user.password);

                    if (passwordMatch) {
                        const token = jwt.sign({ id: user.id, userType: 'user' }, process.env.SECRET_KEY);
                        return res.status(200).json({ message: "Login successful", userType: "user", email: user.email, token: token });
                    }
                }

                // If not found in both tables, return error
                return res.status(401).json({ error: "Invalid email or password" });
            });
        });
    } catch (error) {
        console.error("Error parsing request body:", error);
        return res.status(400).json({ error: "Invalid request body" });
    }
};

module.exports = {
    login,
};
