const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'mySuperSecretKey';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
        return res.status(401).json({ message: 'Липсващ токен за достъп' });
    }

    jwt.verify(token, SECRET, (err, decoded) => {
        
        if (err) {
            return res.status(403).json({ message: 'Невалиден токен' });
        }

        // Проверяваме дали в payload има нашата "дума"
        if (decoded && decoded.accessKey !== 'super-access') {
            return res.status(403).json({ message: 'Невалидна ключова дума в токена' });
        }

        req.user = decoded;
        next();
    });
}

module.exports = { authenticateToken, SECRET };
