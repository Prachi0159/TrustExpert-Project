import { pool } from '../config/db.js';

//  Route/API Controller -Handles route-specific operations and business logic
export class RouteController {
    // Handle home page data
    static async getHomeData(req, res) {
        try {
            // Get featured categories
            const [categories] = await pool.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.icon,
                    COUNT(bp.id) as professional_count
                FROM categories c
                LEFT JOIN business_profiles bp ON c.id = bp.category_id AND bp.status = 1 AND bp.verification_status = 'verified'
                WHERE c.status = 1
                GROUP BY c.id
                ORDER BY professional_count DESC
                LIMIT 8
            `);
            // Get featured professionals
            const [professionals] = await pool.query(`
                SELECT 
                    bp.id,
                    bp.business_name,
                    bp.short_bio,
                    bp.average_rating,
                    bp.total_reviews,
                    bp.city,
                    c.name as category_name,
                    (SELECT photo_url FROM professional_photos WHERE professional_id = bp.id AND is_primary = 1 LIMIT 1) as photo
                FROM business_profiles bp
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.status = 1 AND bp.verification_status = 'verified'
                ORDER BY bp.average_rating DESC, bp.total_reviews DESC
                LIMIT 6
            `);

            // Get recent testimonials
            const [testimonials] = await pool.query(`
                SELECT 
                    t.id,
                    t.rating,
                    t.comment,
                    u.name as user_name,
                    bp.business_name,
                    t.created_at
                FROM testimonials t
                JOIN users u ON t.user_id = u.user_id
                JOIN business_profiles bp ON t.professional_id = bp.id
                WHERE t.status = 1
                ORDER BY t.created_at DESC
                LIMIT 5
            `);

            // Get statistics
            const [[users]] = await pool.query(
                "SELECT COUNT(*) as count FROM users WHERE role_id = 2 AND status = 1"
            );

            const [[professionals_count]] = await pool.query(
                "SELECT COUNT(*) as count FROM business_profiles WHERE status = 1 AND verification_status = 'verified'"
            );

            const [[reviews_count]] = await pool.query(
                "SELECT COUNT(*) as count FROM testimonials WHERE status = 1"
            );

            res.json({
                success: true,
                data: {
                    categories: categories,
                    professionals: professionals,
                    testimonials: testimonials,
                    statistics: {
                        total_users: users.count,
                        total_professionals: professionals_count.count,
                        total_reviews: reviews_count.count
                    }
                }
            });

        } catch (error) {
            console.error("Error fetching home data:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch home data"
            });
        }
    }

    /**
     * Handle search
     */
    static async search(req, res) {
        try {
            const { query, category, city, page = 1, limit = 12 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            if (!query || query.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Search query must be at least 2 characters"
                });
            }

            let sqlQuery = `
                SELECT 
                    bp.id,
                    bp.business_name,
                    bp.short_bio,
                    bp.average_rating,
                    bp.total_reviews,
                    bp.city,
                    c.name as category_name,
                    (SELECT photo_url FROM professional_photos WHERE professional_id = bp.id AND is_primary = 1 LIMIT 1) as photo
                FROM business_profiles bp
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.status = 1 AND bp.verification_status = 'verified'
                AND (bp.business_name LIKE ? OR bp.short_bio LIKE ? OR bp.long_bio LIKE ?)
            `;

            const params = [`%${query}%`, `%${query}%`, `%${query}%`];

            if (category) {
                sqlQuery += ' AND bp.category_id = ?';
                params.push(category);
            }

            if (city) {
                sqlQuery += ' AND bp.city LIKE ?';
                params.push(`%${city}%`);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${sqlQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT 1 FROM')}) subquery`;
            const [[{ total }]] = await pool.query(countQuery, params);

            // Get results
            sqlQuery += ' ORDER BY bp.average_rating DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const [results] = await pool.query(sqlQuery, params);

            res.json({
                success: true,
                data: results,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_results: total,
                    per_page: parseInt(limit)
                }
            });

        } catch (error) {
            console.error("Error in search:", error);
            res.status(500).json({
                success: false,
                message: "Search failed"
            });
        }
    }

    /**
     * Handle contact form submission
     */
    static async submitContact(req, res) {
        try {
            const { name, email, phone, subject, message } = req.body;

            // Validate required fields
            if (!name || !email || !message) {
                return res.status(400).json({
                    success: false,
                    message: "Name, email, and message are required"
                });
            }

            // Insert contact submission
            const [result] = await pool.query(`
                INSERT INTO contact_submissions (name, email, phone, subject, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'new', NOW())
            `, [name, email, phone || null, subject || null, message]);

            res.status(201).json({
                success: true,
                message: "Your message has been sent successfully. We will contact you soon.",
                data: {
                    submission_id: result.insertId
                }
            });

        } catch (error) {
            console.error("Error submitting contact:", error);
            res.status(500).json({
                success: false,
                message: "Failed to send message"
            });
        }
    }

    /**
     * Get all locations (cities)
     */
    static async getLocations(req, res) {
        try {
            const [locations] = await pool.query(`
                SELECT DISTINCT city
                FROM business_profiles
                WHERE status = 1 AND verification_status = 'verified' AND city IS NOT NULL
                ORDER BY city ASC
            `);

            const cities = locations.map(loc => loc.city);

            res.json({
                success: true,
                data: cities
            });

        } catch (error) {
            console.error("Error fetching locations:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch locations"
            });
        }
    }

    /**
     * Get professionals in location
     */
    static async getLocationProfessionals(req, res) {
        try {
            const { city } = req.params;
            const { category, page = 1, limit = 12 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            if (!city || city.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "City is required"
                });
            }

            let query = `
                SELECT 
                    bp.id,
                    bp.business_name,
                    bp.short_bio,
                    bp.average_rating,
                    bp.total_reviews,
                    c.name as category_name,
                    (SELECT photo_url FROM professional_photos WHERE professional_id = bp.id AND is_primary = 1 LIMIT 1) as photo
                FROM business_profiles bp
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.status = 1 AND bp.verification_status = 'verified' AND bp.city LIKE ?
            `;

            const params = [`%${city}%`];

            if (category) {
                query += ' AND bp.category_id = ?';
                params.push(category);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT[\s\S]*?FROM/, 'SELECT 1 FROM')}) subquery`;
            const [[{ total }]] = await pool.query(countQuery, params);

            // Get results
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
            console.error("Error fetching location professionals:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch professionals"
            });
        }
    }

    /**
     * Get FAQ content
     */
    static async getFAQ(req, res) {
        try {
            const faqs = [
                {
                    id: 1,
                    question: "How can I find a professional?",
                    answer: "You can browse our categories or use the search feature to find professionals by name, category, or location."
                },
                {
                    id: 2,
                    question: "How do I become a professional on TrustExpert?",
                    answer: "First, create a user account. Then, go to 'Create Professional Profile' and fill in your details. Your profile will need to be verified by our admin team before going live."
                },
                {
                    id: 3,
                    question: "How are professionals rated?",
                    answer: "Professionals are rated based on reviews and testimonials from users who have worked with them. Higher ratings indicate better service quality."
                },
                {
                    id: 4,
                    question: "Is my information secure?",
                    answer: "Yes, we take security seriously. All user information is encrypted and stored securely. We follow industry-standard practices for data protection."
                },
                {
                    id: 5,
                    question: "How can I contact a professional?",
                    answer: "You can view their profile and use the 'Contact' button to send them a message directly through our platform."
                },
                {
                    id: 6,
                    question: "Can I leave a review?",
                    answer: "Yes, after interacting with a professional, you can leave a review and rating on their profile to help other users make informed decisions."
                }
            ];

            res.json({
                success: true,
                data: faqs
            });

        } catch (error) {
            console.error("Error fetching FAQ:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch FAQ"
            });
        }
    }
// Get about page content
    static async getAbout(req, res) {
        try {
            const about = {
                title: "About TrustExpert",
                description: "TrustExpert is a platform dedicated to connecting users with verified professionals across various categories.",
                mission: "Our mission is to make it easy for people to find trusted professionals and services in their area.",
                vision: "We envision a world where finding and hiring professionals is simple, transparent, and trustworthy.",
                values: [
                    "Trust",
                    "Quality",
                    "Transparency",
                    "Innovation",
                    "Customer Service"
                ]
            };
            res.json({
                success: true,
                data: about
            });
        } catch (error) {
            console.error("Error fetching about:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch about information"
            });
        }
    }
    //  Get testimonials/reviews display
    static async getTestimonialsPage(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            // Get total count
            const [[{ total }]] = await pool.query(
                "SELECT COUNT(*) as total FROM testimonials WHERE status = 1"
            );
            // Get testimonials
            const [testimonials] = await pool.query(`
                SELECT 
                    t.id,
                    t.rating,
                    t.comment,
                    u.name as user_name,
                    bp.business_name,
                    bp.id as professional_id,
                    t.created_at
                FROM testimonials t
                JOIN users u ON t.user_id = u.user_id
                JOIN business_profiles bp ON t.professional_id = bp.id
                WHERE t.status = 1
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limit), offset]);
            res.json({
                success: true,
                data: testimonials,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_results: total,
                    per_page: parseInt(limit)
                }
            });
        } catch (error) {
            console.error("Error fetching testimonials page:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch testimonials"
            });
        }
    }
}
export default RouteController;
