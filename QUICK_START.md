# TrustExpert - Quick Reference Guide

## 🚀 **Getting Started**

### **1. Start the Application**
```bash
npm start
```
✅ Server: `http://localhost:3000`

---

## 📍 **Frontend Pages**

### **Public Pages**
| Page | URL | Description |
|------|-----|-------------|
| Home | http://localhost:3000 | Homepage with featured professionals |
| Professionals | http://localhost:3000/professional/professional-list | Browse & search professionals |
| Search | http://localhost:3000/search | Advanced search with filters |
| Login | http://localhost:3000/users/login | User login |
| Register | http://localhost:3000/users/register | Create new account |

### **User Pages (Login Required)**
| Page | URL | Description |
|------|-----|-------------|
| Profile | http://localhost:3000/users/profile | User account settings |
| Professional Profile | http://localhost:3000/professional/ | Professional dashboard |

### **Admin Pages (Login Required)**
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | http://localhost:3000/admin/dashboard | Admin overview with stats |
| Users | http://localhost:3000/admin/users | Manage users |
| Professionals | http://localhost:3000/admin/professionals | Manage professionals |
| Verifications | http://localhost:3000/admin/verifications | Verify professionals |

---

## 🔌 **API Endpoints**

### **Health & Info**
```
GET /api/health                    → Check server status
GET /api/about                     → About page content
GET /api/faq                       → FAQ content
```

### **Data Retrieval**
```
GET /api/categories                → All categories
GET /api/professionals             → All professionals
GET /api/professionals/:id         → Single professional
GET /api/locations                 → All cities
GET /api/locations/:city           → Professionals by city
GET /api/testimonials              → Reviews/testimonials
GET /api/search?query=&category=&city=  → Search professionals
GET /api/home                      → Home page data (stats)
```

### **Form Submissions**
```
POST /api/contact                  → Submit contact form
```

---

## 💾 **Database Information**

### **Connection Details**
```
Host: localhost
User: root
Password: p@bca2025
Database: trustExpert
Port: 3306
```

### **Tables**
1. roles - User roles
2. users - User accounts
3. categories - Service categories
4. states - Location states
5. cities - Location cities
6. business_profiles - Professional profiles
7. leads - Contact submissions
8. testimonials - User reviews
9. enquiries - Service requests
10. guest_testimonials - Public testimonials
11. professional_photos - Profile images
12. admin_actions - Admin activity log
13. verification_status - Profile verification

---

## 👤 **Test Credentials**

### **Create Test Data**
```
Registration: /users/register
- Email: test@example.com
- Password: Test@123

Admin Access:
- Default role: User (role_id = 2)
- To make admin: Update users set role_id = 1 in database
```

---

## 🎨 **Key Features**

### **Search & Filter**
- Search by professional name or skill
- Filter by category
- Filter by city/location
- Filter by experience
- Filter by rating
- Sort by top rated/newest/name

### **Professional Profile**
- Upload profile photo
- Add professional details
- Set service fees
- Add specializations
- Get verified

### **Admin Dashboard**
- Real-time statistics
- User management
- Professional verification
- Review management
- Activity logs

### **Security**
- Password hashing (bcryptjs)
- Session management
- Rate limiting (100 req/15min)
- Input validation
- SQL injection prevention
- CORS protection

---

## 🛠️ **Troubleshooting**

### **Server won't start?**
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process on port 3000
taskkill /PID <PID> /F

# Try again
npm start
```

### **Database connection error?**
- Check MySQL is running
- Verify credentials in .env
- Ensure database exists: `trustExpert`
- Check MySQL port: 3306

### **Pages not loading?**
- Clear browser cache
- Check browser console for JS errors
- Verify API endpoints are responding
- Check EJS template syntax

---

## 📦 **Project Files**

### **Important Files**
```
index.js                    Main server file
config/db.js                Database configuration
controllers/                Business logic
routes/                     API and page routes
views/                      EJS templates
public/                     Static files (CSS, JS, images)
.env                        Environment variables
package.json                Dependencies
```

### **Configuration**
```
.env                        Change database credentials here
index.js                    Change port (default 3000)
package.json                Add/remove dependencies
```

---

## 📊 **API Response Examples**

### **Health Check**
```json
{
  "success": true,
  "message": "Database connection healthy",
  "timestamp": "2026-03-24T10:00:00.000Z",
  "uptime": 123.456
}
```

### **Professionals List**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "business_name": "Dr. John Smith",
      "city": "Mumbai",
      "category_name": "Doctor",
      "average_rating": 4.5,
      "total_reviews": 12,
      "photo": "https://..."
    }
  ]
}
```

### **Search Results**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_results": 47,
    "per_page": 12
  }
}
```

---

## 📝 **Common Tasks**

### **Add New Professional**
1. Go to `/users/register` → Create account
2. Go to `/professional/` → Create profile
3. Admin verifies at `/admin/verifications`
4. Profile goes live

### **Search Professionals**
1. Go to `/professional/professional-list`
2. Use search bar or filters
3. Click "View Profile" for details

### **Submit Contact Form**
1. Go to any page with contact form
2. Fill in details
3. Submit via API `/api/contact`
4. Admin reviews at dashboard

### **View Admin Dashboard**
1. Login with admin account
2. Go to `/admin/dashboard`
3. View real-time statistics
4. Manage users and professionals

---

## 🔄 **Development Workflow**

### **Making Changes**
1. Edit files in your IDE
2. Nodemon auto-reloads server
3. Refresh browser to see changes

### **Adding New Routes**
1. Create route in `routes/` folder
2. Import in `index.js`
3. Add `app.use()` line
4. Test API endpoint

### **Adding New Database Tables**
1. Add table definition in `utils/utils.js`
2. Restart server
3. Table auto-creates

---

## ✅ **Project Checklist**

- ✅ Backend: Node.js + Express running
- ✅ Database: MySQL connected with 13 tables
- ✅ Frontend: EJS templates rendering
- ✅ API: All endpoints responding
- ✅ Security: Password hashing, rate limiting active
- ✅ Search: Working with real data
- ✅ Admin: Dashboard with real-time stats
- ✅ Authentication: Login/registration working
- ✅ File uploads: Multer configured
- ✅ Testing: All systems verified

---

## 🎯 **Next Steps**

1. **Test the Application**
   - Visit home page
   - Try searching providers
   - Register a test user
   - Test admin dashboard

2. **Customize**
   - Update branding/colors
   - Add your categories
   - Configure email notifications
   - Add payment integration

3. **Deploy**
   - Set up production database
   - Configure environment variables
   - Enable HTTPS
   - Set NODE_ENV=production

4. **Monitor**
   - Check server logs
   - Monitor database performance
   - Track user activity
   - Review admin logs

---

## 📞 **Support Resources**

- **Server Logs:** Check terminal output
- **Frontend Logs:** Browser DevTools → Console
- **Database Logs:** MySQL error log
- **Config:** Check `.env` file
- **Documentation:** See PROJECT_STATUS.md

---

**Status: ✅ ALL SYSTEMS OPERATIONAL**  
**Ready for: Development, Testing, Deployment**

Last Updated: 2026-03-24