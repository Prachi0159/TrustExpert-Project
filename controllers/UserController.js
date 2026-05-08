import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

//  User Controller - Handles user operations and business logic
export class UserController {
    
    //   Register new user 
    static async register(req, res) {
        try {
            const { fullName, email, password, mobileNo } = req.body;
            // Check if user already exists
            const [existingUser] = await pool.query(
                "SELECT user_id FROM users WHERE email = ?", 
                [email]
            );
            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Email already registered"
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            // Insert new user
            const [result] = await pool.query(
                `INSERT INTO users (name, email, password, mobile_no, role_id, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 2, 1, NOW(), NOW())`,
                [fullName, email, hashedPassword, mobileNo]
            );

            res.status(201).json({
                success: true,
                message: "Registration successful! Please login.",
                data: {
                    user_id: result.insertId,
                    name: fullName,
                    email: email
                }
            });

        } catch (error) {
            console.error("Error registering user:", error);
            res.status(500).json({
                success: false,
                message: "Registration failed. Please try again."
            });
        }
    }

    //  Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const [users] = await pool.query(
                "SELECT * FROM users WHERE email = ? AND status = 1",
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }

            const user = users[0];

            // Compare password
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }

            // Set user session
            req.session.user = {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role_id: user.role_id
            };

            res.json({
                success: true,
                message: "Login successful",
                data: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role_id: user.role_id
                }
            });

        } catch (error) {
            console.error("Error logging in:", error);
            res.status(500).json({
                success: false,
                message: "Login failed. Please try again."
            });
        }
    }

    
    //  Get user profile
    static async getProfile(req, res) {
        try {
            const userId = req.session.user.id;

            const [users] = await pool.query(
                "SELECT * FROM users WHERE user_id = ?",
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Check if user has a professional profile
            const [profiles] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );

            res.json({
                success: true,
                data: {
                    user: users[0],
                    hasProfessionalProfile: profiles.length > 0
                }
            });

        } catch (error) {
            console.error("Error fetching profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load profile"
            });
        }
    }

    //   Update user profile
    
    static async updateProfile(req, res) {
        try {
            const userId = req.session.user.id;
            const { fullName, phone } = req.body;

            // Update user
            await pool.query(
                "UPDATE users SET name = ?, mobile_no = ?, updated_at = NOW() WHERE user_id = ?",
                [fullName, phone, userId]
            );

            // Update session data
            req.session.user.name = fullName;

            res.json({
                success: true,
                message: "Profile updated successfully",
                data: {
                    user_id: userId,
                    name: fullName,
                    phone: phone
                }
            });

        } catch (error) {
            console.error("Error updating profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update profile"
            });
        }
    }

    //   Create professional profile
    static async createProfessionalProfile(req, res) {
        try {
            const userId = req.session.user.id;

            // Check if user already has a professional profile
            const [existingProfile] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );

            if (existingProfile.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "You already have a professional profile"
                });
            }

            const {
                businessName,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode,
                highestQualification,
                languages,
                workExperience,
                certification,
                categoryId,
                shortBio,
                longBio
            } = req.body;

            // Insert professional profile
            const [result] = await pool.query(`
                INSERT INTO business_profiles
                (user_id, business_name, address_line1, address_line2, city, state, pincode,
                 highest_qualification, languages, work_experience, certification, category_id,
                 short_bio, long_bio, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            `, [
                userId,
                businessName,
                addressLine1 || null,
                addressLine2 || null,
                city || null,
                state || null,
                pincode || null,
                highestQualification || null,
                languages || null,
                workExperience || null,
                certification || null,
                categoryId,
                shortBio || null,
                longBio || null
            ]);

            // Update user role to professional (role_id = 3)
            await pool.query(
                "UPDATE users SET role_id = 3 WHERE user_id = ?",
                [userId]
            );

            req.session.user.role_id = 3;

            res.status(201).json({
                success: true,
                message: "Professional profile created successfully",
                data: {
                    professional_id: result.insertId,
                    business_name: businessName
                }
            });

        } catch (error) {
            console.error("Error creating professional profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create professional profile"
            });
        }
    }

//    Get professional profile
     
    static async getProfessionalProfile(req, res) {
        try {
            const userId = req.session.user.id;

            const [profiles] = await pool.query(`
                SELECT bp.*, c.name as category_name
                FROM business_profiles bp
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.user_id = ? AND bp.status = 1
            `, [userId]);

            if (profiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional profile not found"
                });
            }
            res.json({
                success: true,
                data: profiles[0]
            });

        } catch (error) {
            console.error("Error fetching professional profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load professional profile"
            });
        }
    }
    //  Update professional profile
    static async updateProfessionalProfile(req, res) {
        try {
            const userId = req.session.user.id;
            const {
                businessName,
                shortBio,
                longBio,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode,
                categoryId,
                highestQualification,
                languages,
                workExperience,
                certification
            } = req.body;
            // Update professional profile
            await pool.query(`
                UPDATE business_profiles
                SET business_name = ?, short_bio = ?, long_bio = ?, address_line1 = ?,
                    address_line2 = ?, city = ?, state = ?, pincode = ?, category_id = ?,
                    highest_qualification = ?, languages = ?, work_experience = ?,
                    certification = ?, updated_at = NOW()
                WHERE user_id = ?
            `, [businessName, shortBio,longBio,addressLine1,addressLine2,city,state,pincode,categoryId,highestQualification,languages,workExperience,certification, userId ]);
            res.json({
                success: true,
                message: "Professional profile updated successfully"
            });
        } catch (error) {
            console.error("Error updating professional profile:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update professional profile"
            });
        }
    }
    static async searchProfessionals(req, res) {
        try {
            const { category, city, search, page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            let query = `
                SELECT 
                    bp.id,
                    bp.business_name,
                    bp.short_bio,
                    bp.average_rating,
                    bp.total_reviews,
                    bp.city,
                    bp.work_experience,
                    c.name as category_name,
                    u.name as owner_name
                FROM business_profiles bp
                JOIN users u ON bp.user_id = u.user_id
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.status = 1 AND bp.verification_status = 'verified' AND u.status = 1
            `;
            const params = [];
            if (category) {
                query += ' AND bp.category_id = ?';
                params.push(category);
            }
            if (city) {
                query += ' AND bp.city LIKE ?';
                params.push(`%${city}%`);
            }
            if (search) {
                query += ' AND (bp.business_name LIKE ? OR bp.short_bio LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT[\s\S]*?FROM/, 'SELECT 1 FROM')}) subquery`;
            const [[{ total }]] = await pool.query(countQuery, params);
            // Get paginated results
            query += ' ORDER BY bp.average_rating DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
            const [professionals] = await pool.query(query, params);
            res.json({
                success: true,
                data: professionals,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_results: total,
                    per_page: parseInt(limit)
                }
            });
        } catch (error) {
            console.error("Error searching professionals:", error);
            res.status(500).json({
                success: false,
                message: "Failed to search professionals"
            });
        }
    }
    //  Get single professional details
    static async getProfessional(req, res) {
        try {
            const { id } = req.params;
            const [professionals] = await pool.query(`
                SELECT 
                    bp.*,
                    c.name as category_name,
                    u.name as owner_name,
                    u.email,
                    u.mobile_no
                FROM business_profiles bp
                JOIN users u ON bp.user_id = u.user_id
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.id = ? AND bp.status = 1 AND bp.verification_status = 'verified'
            `, [id]);
            if (professionals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional not found"
                });
            }
            // Get professional photos
            const [photos] = await pool.query(
                "SELECT id, photo_url, is_primary FROM professional_photos WHERE professional_id = ? ORDER BY is_primary DESC",
                [id]
            );
            // Get reviews
            const [reviews] = await pool.query(`
                SELECT id, rating, comment, created_at
                FROM testimonials
                WHERE professional_id = ? AND status = 1
                ORDER BY created_at DESC
                LIMIT 10
            `, [id]);
            res.json({
                success: true,
                data: {
                    ...professionals[0],
                    photos: photos,
                    reviews: reviews
                }
            });
        } catch (error) {
            console.error("Error fetching professional:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch professional details"
            });
        }
    }
}
export default UserController;
