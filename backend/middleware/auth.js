import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;

  // 1. Check inbound headers for Authorization token channel
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_signing_key_2026');
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ status: 'error', message: 'Not authorized, token verification failed.' });
    }
  }

  // 2. Fallback check if token is passed via secure cookies context layer
  if (req.cookies && req.cookies.token) {
    try {
      token = req.cookies.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_signing_key_2026');
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ status: 'error', message: 'Not authorized, cookie session invalid.' });
    }
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, missing session token allocation.' });
  }
};

// Universal RBAC Gatekeeper
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if the logged-in user's role is in the allowed list
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'fail', 
        message: 'Access Denied: You do not possess the required clearance level for this action.' 
      });
    }
    next();
  };
};

// Modern ES Module named export standard structure
export { protect, restrictTo };