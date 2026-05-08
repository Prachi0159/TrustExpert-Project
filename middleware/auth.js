// Authentication middleware
export const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/users/login');
    }
};
// Admin authorization middleware
export const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role_id === 1) {
        return next();
    } else {
        return res.status(403).render('error', {
            message: 'Access Denied',
            error: 'You do not have permission to access this page.'
        });
    }
};
// Professional authorization middleware
export const requireProfessional = (req, res, next) => {
    if (req.session && req.session.user && (req.session.user.role_id === 1 || req.session.user.role_id === 3)) {
        return next();
    } else {
        return res.status(403).render('error', {
            message: 'Access Denied',
            error: 'You need to be a professional to access this page.'
        });
    }
};
// Middleware to pass user to all views
export const passUserToViews = (req, res, next) => {
    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
    }
    next();
};