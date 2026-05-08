import express from 'express'
import session from 'express-session'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { checkConnection, closeConnection } from './config/db.js';
import createAllTable from './utils/utils.js';
import adminRoutes from './routes/adminRoutes.js'
import userRoutes from "./routes/userRoutes.js"
import professionalRoutes from "./routes/professionalRoutes.js"
import categoryRoutes from "./routes/categoryRoutes.js"
import locationRoutes from "./routes/locationRoutes.js"
import testimonialRoutes from "./routes/testimonialRoutes.js"
import homeRoutes from "./routes/homeRoutes.js"
import apiRoutes from "./routes/apiRoutes.js"
import searchRoutes from "./routes/searchRoutes.js"
import verificationRoutes from "./routes/verificationRoutes.js"
import photoRoutes from "./routes/photoRoutes.js"
import adminPanelRoutes from "./routes/adminPanelRoutes.js"
import enquiryRoutes from "./routes/enquiryRoutes.js"
import guestTestimonialRoutes from "./routes/guestTestimonialRoutes.js"
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Apply stricter rate limiting to auth routes
app.use('/users/login', authLimiter);
app.use('/users/register', authLimiter);

// middleware
app.set('view engine','ejs')
app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.use(express.static('public'))

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'trustexpert-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}))

// Make user data available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use("/", homeRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminPanelRoutes);
app.use("/admin", verificationRoutes);
app.use("/users", userRoutes);
app.use("/professional", professionalRoutes);
app.use("/category", categoryRoutes)
app.use("/location", locationRoutes);
app.use("/testimonial", testimonialRoutes)
app.use("/enquiry", enquiryRoutes);
app.use("/testimonial", guestTestimonialRoutes);
app.use("/api", apiRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/photos", photoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        message: 'Page not found',
        url: req.originalUrl
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('Connecting to database...');
        await checkConnection();

        console.log('Creating database tables...');
        await createAllTable();

        console.log('Starting server...');
        app.listen(3000, () => {
            console.log('Server listening on port 3000!');
            console.log('Application is ready at http://localhost:3000');
        });

    } catch (error) {
        console.error('Failed to start application:', error.message);
        console.error('Please check your database configuration and try again.');
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

// Start the application
startServer();