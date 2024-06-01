const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        console.log(token);
        console.log(req.cookies.token);

        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const decoded = await jwt.verify(token, process.env.SECRET_KEY);
        req.user = await User.findById(decoded._id);

        next();
    } catch (error) {
        res.status(500).json({ message: 'error' });
    }
}