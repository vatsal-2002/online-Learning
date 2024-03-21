const jwt = require('jsonwebtoken');
const db = require('../config/db');


const verifyToken = (req, res, next) => {
    const userToken = req.headers['authorization'];

    if (!userToken) {
        return res.status(403).json({ error: "Invalid or missing token" });
    }

    const token = userToken;

    jwt.verify(token, process.env.SECRET_KEY, (err, authData) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(403).json({ error: "Invalid token" });
        }

        // authData has the 'id' property
        if (!authData || !authData.id) {
            console.error("Invalid authData:", authData);
            return res.status(403).json({ error: "Invalid token format" });
        }

        req.user = authData;
        req.authData = authData;
        // console.log("Decoded token:", authData);
        next();
    });
};

module.exports = {
    verifyToken,
};
