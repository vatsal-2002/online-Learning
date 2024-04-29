const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: "Invalid or missing token" });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, authData) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(403).json({ error: "Invalid token" });
        }

        req.user = authData;
        req.authData = authData;
        next();
    });
};

// Middleware to authorize access for teachers
const authorizeTeacher = (req, res, next) => {
    const userType = req.user.userType;

    if (userType !== 'teacher') {
        console.error("Unauthorized access - userType is not teacher");
        return res.status(403).json({ error: "Unauthorized access" });
    }

    next();
};

// Middleware to authorize access for users
const authorizeUser = (req, res, next) => {
    const userType = req.user.userType;

    if (userType !== 'user') {
        console.error("Unauthorized access - userType is not user");
        return res.status(403).json({ error: "Unauthorized access" });
    }

    next();
};

module.exports = {
    verifyToken,
    authorizeTeacher,
    authorizeUser
};
