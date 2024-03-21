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

        // Check if userType is 'teacher'
        if (!authData || !authData.userType || authData.userType !== 'teacher') {
            console.error("Unauthorized access - userType is not teacher:", authData);
            return res.status(403).json({ error: "Unauthorized access" });
        }

        req.user = authData;
        req.authData = authData;
        next();
    });
};

module.exports = {
    verifyToken
};
