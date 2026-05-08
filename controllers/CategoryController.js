import { pool } from '../config/db.js';
// Category Controller -  Handles category operations and business logic
export class CategoryController {
    
    //  Get all categories
    static async getAllCategories(req, res) {
        try {
            const [categories] = await pool.query(`
                SELECT id, name, description, icon, status
                FROM categories
                WHERE status = 1
                ORDER BY name ASC
            `);
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch categories"
            });
        }
    }
    //   Get category with professionals count
    static async getCategoryWithStats(req, res) {
        try {
            const [categories] = await pool.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.description,
                    c.icon,
                    COUNT(bp.id) as professional_count
                FROM categories c
                LEFT JOIN business_profiles bp ON c.id = bp.category_id AND bp.status = 1 AND bp.verification_status = 'verified'
                WHERE c.status = 1
                GROUP BY c.id
                ORDER BY professional_count DESC
            `);
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error("Error fetching categories with stats:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch categories"
            });
        }
    }
    //   Get single category
    static async getCategory(req, res) {
        try {
            const { categoryId } = req.params;

            const [categories] = await pool.query(
                "SELECT * FROM categories WHERE id = ? AND status = 1",
                [categoryId]
            );
            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }
            res.json({
                success: true,
                data: categories[0]
            });
        } catch (error) {
            console.error("Error fetching category:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch category"
            });
        }
    }
// Get professionals in category
    static async getCategoryProfessionals(req, res) {
        try {
            const { categoryId } = req.params;
            const { page = 1, limit = 12, sort = 'rating' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            // Validate category exists
            const [categories] = await pool.query(
                "SELECT id FROM categories WHERE id = ? AND status = 1",
                [categoryId]
            );
            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }
            // Build sort clause
            let orderBy = 'bp.average_rating DESC';
            if (sort === 'recent') {
                orderBy = 'bp.created_at DESC';
            } else if (sort === 'reviews') {
                orderBy = 'bp.total_reviews DESC';
            } else if (sort === 'name') {
                orderBy = 'bp.business_name ASC';
            }

            // Get total count
            const [[{ total }]] = await pool.query(`
                SELECT COUNT(*) as total
                FROM business_profiles bp
                WHERE bp.category_id = ? AND bp.status = 1 AND bp.verification_status = 'verified'
            `, [categoryId]);
            // Get professionals
            const [professionals] = await pool.query(`
                SELECT 
                    bp.id,
                    bp.business_name,
                    bp.short_bio,
                    bp.average_rating,
                    bp.total_reviews,
                    bp.city,
                    bp.work_experience,
                    (SELECT photo_url FROM professional_photos WHERE professional_id = bp.id AND is_primary = 1 LIMIT 1) as primary_photo
                FROM business_profiles bp
                WHERE bp.category_id = ? AND bp.status = 1 AND bp.verification_status = 'verified'
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `, [categoryId, parseInt(limit), offset]);

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
            console.error("Error fetching category professionals:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch professionals"
            });
        }
    }
// Create category (Admin only)
    static async createCategory(req, res) {
        try {
            const { name, description, icon } = req.body;

            // Validate input
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Category name is required"
                });
            }
            // Check if category already exists
            const [existing] = await pool.query(
                "SELECT id FROM categories WHERE name = ?",
                [name]
            );
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Category already exists"
                });
            }
            // Insert category
            const [result] = await pool.query(`
                INSERT INTO categories (name, description, icon, status, created_at, updated_at)
                VALUES (?, ?, ?, 1, NOW(), NOW())
            `, [name, description || null, icon || null]);

            res.status(201).json({
                success: true,
                message: "Category created successfully",
                data: {
                    category_id: result.insertId,
                    name: name,
                    description: description
                }
            });
        } catch (error) {
            console.error("Error creating category:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create category"
            });
        }
    }
// Update category (Admin only)
    static async updateCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const { name, description, icon, status } = req.body;

            // Check category exists
            const [categories] = await pool.query(
                "SELECT id FROM categories WHERE id = ?",
                [categoryId]
            );

            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            // Update category
            await pool.query(`
                UPDATE categories
                SET name = ?, description = ?, icon = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `, [name, description, icon, status || 1, categoryId]);

            res.json({
                success: true,
                message: "Category updated successfully"
            });

        } catch (error) {
            console.error("Error updating category:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update category"
            });
        }
    }
// Delete category (Admin only) 
    static async deleteCategory(req, res) {
        try {
            const { categoryId } = req.params;
            // Check category exists
            const [categories] = await pool.query(
                "SELECT id FROM categories WHERE id = ?",
                [categoryId]
            );
            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }
            // Check if category has professionals
            const [[{ count }]] = await pool.query(
                "SELECT COUNT(*) as count FROM business_profiles WHERE category_id = ?",
                [categoryId]
            );
            if (count > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot delete category with professionals. Please reassign professional profiles first."
                });
            }
            // Delete category
            await pool.query(
                "DELETE FROM categories WHERE id = ?",
                [categoryId]
            );
            res.json({
                success: true,
                message: "Category deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting category:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete category"
            });
        }
    }
// Search categories
    static async searchCategories(req, res) {
        try {
            const { search, limit = 10 } = req.query;
            let query = "SELECT id, name, icon FROM categories WHERE status = 1";
            const params = [];

            if (search) {
                query += " AND name LIKE ?";
                params.push(`%${search}%`);
            }
            query += " LIMIT ?";
            params.push(parseInt(limit));

            const [categories] = await pool.query(query, params);
            res.json({
                success: true,
                data: categories
            });

        } catch (error) {
            console.error("Error searching categories:", error);
            res.status(500).json({
                success: false,
                message: "Failed to search categories"
            });
        }
    }
}
export default CategoryController;
