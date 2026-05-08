import { pool } from '../config/db.js';

//  Admin Controller
//  Handles all admin operations and business logic

export class AdminController {

    //  Get Dashboard Statistics
     
    static async getDashboard(req, res) {
        try {
            // Get stats
            const [[users]] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role_id != 1');
            const [[professionals]] = await pool.query('SELECT COUNT(*) as count FROM business_profiles');
            const [[verified]] = await pool.query('SELECT COUNT(*) as count FROM business_profiles WHERE verification_status = "verified"');
            const [[pending]] = await pool.query('SELECT COUNT(*) as count FROM business_profiles WHERE verification_status = "pending"');
            const [[leads]] = await pool.query('SELECT COUNT(*) as count FROM leads WHERE status = 1');
            const [[testimonials]] = await pool.query('SELECT COUNT(*) as count FROM testimonials WHERE status = 1');

            // Recent unverified professionals
            const [recentPending] = await pool.query(`
                SELECT 
                    bp.id,
                    bp.business_name,
                    u.name,
                    u.email,
                    bp.created_at
                FROM business_profiles bp
                JOIN users u ON bp.user_id = u.user_id
                WHERE bp.verification_status = 'pending'
                ORDER BY bp.created_at DESC
                LIMIT 5
            `);

            // Top rated professionals
            const [topRated] = await pool.query(`
                SELECT 
                    bp.business_name,
                    bp.average_rating,
                    bp.total_reviews,
                    c.name as category
                FROM business_profiles bp
                JOIN categories c ON bp.category_id = c.id
                WHERE bp.verification_status = 'verified'
                ORDER BY bp.average_rating DESC
                LIMIT 5
            `);

            res.json({
                success: true,
                data: {
                    stats: {
                        total_users: users.count,
                        total_professionals: professionals.count,
                        verified_professionals: verified.count,
                        pending_verification: pending.count,
                        active_leads: leads.count,
                        total_testimonials: testimonials.count
                    },
                    recent_pending: recentPending,
                    top_rated: topRated
                }
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch dashboard data' 
            });
        }
    }

    //   Get All Users with Filters and Pagination

    static async getAllUsers(req, res) {
        try {
            const { role, status, page = 1, limit = 10, search = '' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT 
                    u.user_id,
                    u.name,
                    u.email,
                    u.mobile_no,
                    u.status,
                    r.name as role_name,
                    u.created_at,
                    (SELECT COUNT(*) FROM business_profiles WHERE user_id = u.user_id) as profile_count
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE 1=1
            `;

            const params = [];

            if (role) {
                query += ' AND u.role_id = ?';
                params.push(role);
            }

            if (status !== undefined) {
                query += ' AND u.status = ?';
                params.push(status);
            }

            if (search) {
                query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT[\s\S]*?FROM/, 'SELECT 1 FROM')}) subquery`;
            const [[{ total }]] = await pool.query(countQuery, params);

            // Get paginated results
            query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const [users] = await pool.query(query, params);

            res.json({
                success: true,
                data: users,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_results: total,
                    per_page: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch users' 
            });
        }
    }

    //   Get Single User by ID
     
    static async getUserById(req, res) {
        try {
            const { user_id } = req.params;
            const [users] = await pool.query(`
                SELECT 
                    u.user_id,
                    u.name,
                    u.email,
                    u.mobile_no,
                    u.status,
                    u.role_id,
                    r.name as role_name,
                    u.created_at,
                    u.updated_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.user_id = ?
            `, [user_id]);

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: users[0]
            });

        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch user' 
            });
        }
    }

    //  Update User
    static async updateUser(req, res) {
        try {
            const { user_id } = req.params;
            const { name, email, mobile_no, status, role_id } = req.body;

            // Validate input
            if (!name || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and email are required'
                });
            }

            // Check if user exists
            const [existingUsers] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
            if (existingUsers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update user
            await pool.query(`
                UPDATE users 
                SET name = ?, email = ?, mobile_no = ?, status = ?, role_id = ?, updated_at = NOW()
                WHERE user_id = ?
            `, [name, email, mobile_no, status, role_id, user_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'user_updated', 'user', user_id, {
                name, email, mobile_no, status, role_id
            });

            res.json({
                success: true,
                message: 'User updated successfully',
                data: { user_id, name, email }
            });

        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update user' 
            });
        }
    }

// Delete User
    static async deleteUser(req, res) {
        try {
            const { user_id } = req.params;

            // Prevent deleting admin users
            const [userData] = await pool.query('SELECT user_id, name, role_id FROM users WHERE user_id = ?', [user_id]);
            if (userData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (userData[0].role_id === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete admin users'
                });
            }

            // Delete user and related data
            await pool.query('DELETE FROM professional_photos WHERE professional_id IN (SELECT id FROM business_profiles WHERE user_id = ?)', [user_id]);
            await pool.query('DELETE FROM business_profiles WHERE user_id = ?', [user_id]);
            await pool.query('DELETE FROM users WHERE user_id = ?', [user_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'user_deleted', 'user', user_id, {
                name: userData[0].name
            });

            res.json({
                success: true,
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete user' 
            });
        }
    }

    //  Toggle User Status (Block/Activate)
    
    static async toggleUserStatus(req, res) {
        try {
            const { user_id } = req.params;

            // Get current status
            const [userData] = await pool.query('SELECT user_id, status, name FROM users WHERE user_id = ?', [user_id]);
            if (userData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const newStatus = userData[0].status === 1 ? 0 : 1;

            // Update status
            await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [newStatus, user_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'user_status_changed', 'user', user_id, {
                old_status: userData[0].status,
                new_status: newStatus
            });

            res.json({
                success: true,
                message: `User ${newStatus === 1 ? 'activated' : 'blocked'} successfully`,
                data: { user_id, status: newStatus }
            });

        } catch (error) {
            console.error('Error toggling user status:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to toggle user status' 
            });
        }
    }

// Get All Professionals with Filters and Pagination
    static async getAllProfessionals(req, res) {
        try {
            const { status, page = 1, limit = 10, search = '' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let query = `
                SELECT 
                    bp.id,
                    bp.business_name,
                    u.name,
                    u.email,
                    bp.verification_status,
                    bp.average_rating,
                    bp.total_reviews,
                    c.name as category,
                    bp.created_at
                FROM business_profiles bp
                JOIN users u ON bp.user_id = u.user_id
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE 1=1
            `;

            const params = [];

            if (status) {
                query += ' AND bp.verification_status = ?';
                params.push(status);
            }

            if (search) {
                query += ' AND (bp.business_name LIKE ? OR u.email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT[\s\S]*?FROM/, 'SELECT 1 FROM')}) subquery`;
            const [[{ total }]] = await pool.query(countQuery, params);

            // Get paginated results
            query += ' ORDER BY bp.created_at DESC LIMIT ? OFFSET ?';
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
            console.error('Error fetching professionals:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch professionals' 
            });
        }
    }

    //   Get Single Professional by ID
   
    static async getProfessionalById(req, res) {
        try {
            const { professional_id } = req.params;

            const [professionals] = await pool.query(`
                SELECT 
                    bp.id,
                    bp.user_id,
                    bp.business_name,
                    bp.short_bio,
                    bp.long_bio,
                    bp.address_line1,
                    bp.address_line2,
                    bp.city,
                    bp.state,
                    bp.pincode,
                    bp.category_id,
                    bp.verification_status,
                    bp.average_rating,
                    bp.total_reviews,
                    bp.status,
                    u.name,
                    u.email,
                    u.mobile_no,
                    c.name as category_name,
                    bp.created_at
                FROM business_profiles bp
                JOIN users u ON bp.user_id = u.user_id
                LEFT JOIN categories c ON bp.category_id = c.id
                WHERE bp.id = ?
            `, [professional_id]);

            if (professionals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Professional not found'
                });
            }
            res.json({
                success: true,
                data: professionals[0]
            });

        } catch (error) {
            console.error('Error fetching professional:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch professional' 
            });
        }
    }

    //   Update Professional Profile
    static async updateProfessional(req, res) {
        try {
            const { professional_id } = req.params;
            const { business_name, short_bio, long_bio, verification_status, status } = req.body;

            // Validate input
            if (!business_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Business name is required'
                });
            }

            // Check if professional exists
            const [existingProfs] = await pool.query('SELECT id FROM business_profiles WHERE id = ?', [professional_id]);
            if (existingProfs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Professional not found'
                });
            }

            // Update professional
            await pool.query(`
                UPDATE business_profiles 
                SET business_name = ?, short_bio = ?, long_bio = ?, verification_status = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `, [business_name, short_bio, long_bio, verification_status, status, professional_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'professional_updated', 'professional', professional_id, {
                business_name, verification_status, status
            });

            res.json({
                success: true,
                message: 'Professional updated successfully',
                data: { professional_id, business_name }
            });
        } catch (error) {
            console.error('Error updating professional:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to update professional' 
            });
        }
    }
    //   Delete Professional Profile

    static async deleteProfessional(req, res) {
        try {
            const { professional_id } = req.params;

            // Get professional data
            const [profData] = await pool.query('SELECT id, business_name FROM business_profiles WHERE id = ?', [professional_id]);
            if (profData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Professional not found'
                });
            }

            // Delete related photos
            await pool.query('DELETE FROM professional_photos WHERE professional_id = ?', [professional_id]);

            // Delete professional profile
            await pool.query('DELETE FROM business_profiles WHERE id = ?', [professional_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'professional_deleted', 'professional', professional_id, {
                business_name: profData[0].business_name
            });
            res.json({
                success: true,
                message: 'Professional deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting professional:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to delete professional' 
            });
        }
    }

    //   Verify Professional Profile  
    static async verifyProfessional(req, res) {
        try {
            const { professional_id } = req.params;
            const [profData] = await pool.query('SELECT id, business_name FROM business_profiles WHERE id = ?', [professional_id]);
            if (profData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Professional not found'
                });
            }

            await pool.query('UPDATE business_profiles SET verification_status = "verified" WHERE id = ?', [professional_id]);

            // Log admin action
            await this.logAdminAction(req.session.user.id, 'professional_verified', 'professional', professional_id, {
                business_name: profData[0].business_name
            });
            res.json({
                success: true,
                message: 'Professional verified successfully',
                data: { professional_id }
            });
        } catch (error) {
            console.error('Error verifying professional:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to verify professional' 
            });
        }
    }
    //   Get Activity Log
     
    static async getActivityLog(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [actions] = await pool.query(`
                SELECT 
                    aa.id,
                    aa.action_type,
                    aa.target_type,
                    aa.target_id,
                    aa.details,
                    aa.created_at,
                    u.name as admin_name,
                    u.email as admin_email
                FROM admin_actions aa
                JOIN users u ON aa.admin_id = u.user_id
                ORDER BY aa.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limit), offset]);

            const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM admin_actions');

            res.json({
                success: true,
                data: actions,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_results: total,
                    per_page: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching activity log:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch activity log' 
            });
        }
    }

    //   Log Admin Action (for audit trail)
     
    static async logAdminAction(adminId, actionType, targetType, targetId, details) {
        try {
            await pool.query(`
                INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [adminId, actionType, targetType, targetId, JSON.stringify(details)]);
        } catch (error) {
            console.error('Error logging admin action:', error);
        }
    }
}
export default AdminController;
