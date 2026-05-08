# TrustExpert - Professional Services Directory Platform

**IGNOU BCA Project** | Production-Ready Web Application

A complete web-based platform for connecting users with verified professional service providers.

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- **Node.js** v14+ - [Download](https://nodejs.org/)
- **MySQL** 8.0+ - [Download](https://dev.mysql.com/downloads/mysql/)
- **npm** (included with Node.js)

### Installation Steps

```bash
# 1. Navigate to project
cd TrustExpert

# 2. Install dependencies
npm install

# 3. Configure .env file
# Update database credentials:
#   DB_HOST=localhost
#   DB_USER=root
#   DB_PASS=your_password
#   DB_NAME=trustExpert

# 4. Start application
npm run start

# 5. Open browser
# Visit: http://localhost:3000
```

---

## ✅ Features Implemented
- ✅ **Error Handling** - Comprehensive error handling middleware with custom error pages
- ✅ **Input Validation** - Form validation using express-validator
- ✅ **Security Features** - CORS, Helmet security headers, rate limiting
- ✅ **Unit & Integration Tests** - Jest and Supertest testing setup

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with mysql2
- **Authentication**: express-session, bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **Testing**: Jest, Supertest
- **Template Engine**: EJS
- **Development**: nodemon

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=trustExpert
   SESSION_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. Start the MySQL server and create the database

5. Run the application:
   ```bash
   npm start
   ```

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories

### Professionals
- `GET /api/professionals` - Get all professionals
- `GET /api/professionals/:id` - Get professional by ID

### Locations
- `GET /api/states` - Get all states
- `GET /api/cities/:stateId` - Get cities by state

### Contact
- `POST /api/contact` - Submit contact form

### Testimonials
- `GET /api/testimonials` - Get all testimonials

## Testing

Run tests with:
```bash
npm test
```

## Project Structure

```
├── config/
│   └── db.js              # Database configuration
├── routes/
│   ├── apiRoutes.js       # API endpoints
│   ├── userRoutes.js      # User authentication
│   ├── homeRoutes.js      # Home and contact
│   ├── professionalRoutes.js # Professional listings
│   └── ...                # Other route files
├── utils/
│   └── utils.js           # Database table creation
├── views/
│   ├── error.ejs          # Error page
│   ├── 404.ejs            # 404 page
│   └── ...                # Other EJS templates
├── tests/
│   ├── api.test.js        # API tests
│   └── db.test.js         # Database tests
├── public/                # Static files
├── index.js               # Main application file
├── package.json
├── jest.config.json       # Jest configuration
└── .env                   # Environment variables
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API rate limiting (100 requests/15min, 5 auth attempts/15min)
- **Input Validation**: Form validation and sanitization
- **Session Management**: Secure session handling
- **Password Hashing**: bcrypt for password security

## Development

The application uses ES modules and includes:
- Hot reloading with nodemon
- Environment-based configuration
- Comprehensive error handling
- Unit and integration tests

## License

ISC