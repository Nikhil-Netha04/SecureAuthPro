import jwt from 'jsonwebtoken';

const userAuth = async (req, res, next) => {
const { token } = req.cookies;
console.log("Received Token:", token);


    if (!token) {
        return res.status(401).json({ success: false, message: 'Not Authorized' });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
        
        if (tokenDecode.id) {
            req.body.userId = tokenDecode.id;
            next();
        } else {
            return res.status(401).json({ success: false, message: 'Not Authorized, login again' });
        }

    } catch (err) {
        return res.status(401).json({ success: false, message: err.message });
    }
};

export default userAuth;
