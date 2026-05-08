import { pool } from '../config/db.js';
//Professional Controller - Handles professional-specific operations and business logic
export class ProfessionalController {
    //   Upload professional photo
    static async uploadPhoto(req, res) {
        try {
            const userId = req.session.user.id;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded"
                });
            }
            // Get professional profile
            const [profiles] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );
            if (profiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional profile not found"
                });
            }
            const professionalId = profiles[0].id;
            const photoUrl = `/uploads/${req.file.filename}`;
            // Check if this should be primary photo
            const [existingPhotos] = await pool.query(
                "SELECT COUNT(*) as count FROM professional_photos WHERE professional_id = ?",
                [professionalId]
            );
            const isPrimary = existingPhotos[0].count === 0 ? 1 : 0;
            // Insert photo record
            const [result] = await pool.query(`
                INSERT INTO professional_photos (professional_id, photo_url, is_primary, created_at)
                VALUES (?, ?, ?, NOW())
            `, [professionalId, photoUrl, isPrimary]);
            res.status(201).json({
                success: true,
                message: "Photo uploaded successfully",
                data: {
                    photo_id: result.insertId,
                    photo_url: photoUrl,
                    is_primary: isPrimary
                }
            });
        } catch (error) {
            console.error("Error uploading photo:", error);
            res.status(500).json({
                success: false,
                message: "Failed to upload photo"
            });
        }
    }

    static async setPrimaryPhoto(req, res) {
        try {
            const userId = req.session.user.id;
            const { photoId } = req.body;
            // Get professional profile
            const [profiles] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );
            if (profiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional profile not found"
                });
            }
            const professionalId = profiles[0].id;
            // Remove primary from all photos
            await pool.query(
                "UPDATE professional_photos SET is_primary = 0 WHERE professional_id = ?",
                [professionalId]
            );
            // Set new primary
            await pool.query(
                "UPDATE professional_photos SET is_primary = 1 WHERE id = ? AND professional_id = ?",
                [photoId, professionalId]
            );
            res.json({
                success: true,
                message: "Primary photo updated successfully"
            });
        } catch (error) {
            console.error("Error setting primary photo:", error);
            res.status(500).json({
                success: false,
                message: "Failed to set primary photo"
            });
        }
    }
// Delete photo
    static async deletePhoto(req, res) {
        try {
            const userId = req.session.user.id;
            const { photoId } = req.params;
            // Get professional profile
            const [profiles] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );
            if (profiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional profile not found"
                });
            }
            const professionalId = profiles[0].id;
            // Get photo details
            const [photos] = await pool.query(
                "SELECT * FROM professional_photos WHERE id = ? AND professional_id = ?",
                [photoId, professionalId]
            );
            if (photos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Photo not found"
                });
            }
            // Delete photo file
            const fs = await import('fs').then(m => m.promises);
            const photoPath = path.join(process.cwd(), 'public', photos[0].photo_url);
            try {
                await fs.unlink(photoPath);
            } catch (err) {
                console.warn("Could not delete file:", err);
            }
            // Delete photo record
            await pool.query(
                "DELETE FROM professional_photos WHERE id = ?",
                [photoId]
            );
            // If it was primary, set another as primary
            if (photos[0].is_primary) {
                const [remainingPhotos] = await pool.query(
                    "SELECT id FROM professional_photos WHERE professional_id = ? LIMIT 1",
                    [professionalId]
                );

                if (remainingPhotos.length > 0) {
                    await pool.query(
                        "UPDATE professional_photos SET is_primary = 1 WHERE id = ?",
                        [remainingPhotos[0].id]
                    );
                }
            }
            res.json({
                success: true,
                message: "Photo deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting photo:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete photo"
            });
        }
    }

    static async getPhotos(req, res) {
        try {
            const { professionalId } = req.params;

            const [photos] = await pool.query(`
                SELECT id, photo_url, is_primary, created_at
                FROM professional_photos
                WHERE professional_id = ?
                ORDER BY is_primary DESC, created_at DESC
            `, [professionalId]);

            res.json({
                success: true,
                data: photos
            });

        } catch (error) {
            console.error("Error fetching photos:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch photos"
            });
        }
    }
// Add testimonial/review
    static async addTestimonial(req, res) {
        try {
            const { professionalId, rating, comment } = req.body;
            const userId = req.session.user.id;
            // Check if professional exists
            const [professionals] = await pool.query(
                "SELECT id FROM business_profiles WHERE id = ?",
                [professionalId]
            );
            if (professionals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional not found"
                });
            }
            // Insert testimonial
            const [result] = await pool.query(`
                INSERT INTO testimonials (professional_id, user_id, rating, comment, status, created_at)
                VALUES (?, ?, ?, ?, 1, NOW())
            `, [professionalId, userId, rating, comment]);

            // Update professional rating
            await ProfessionalController.updateProfessionalRating(professionalId);

            res.status(201).json({
                success: true,
                message: "Review added successfully",
                data: {
                    testimonial_id: result.insertId,
                    rating: rating,
                    comment: comment
                }
            });

        } catch (error) {
            console.error("Error adding testimonial:", error);
            res.status(500).json({
                success: false,
                message: "Failed to add review"
            });
        }
    }
// Get testimonials for professional
    static async getTestimonials(req, res) {
        try {
            const { professionalId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            // Get total count
            const [[{ total }]] = await pool.query(
                "SELECT COUNT(*) as total FROM testimonials WHERE professional_id = ? AND status = 1",
                [professionalId]
            );
            // Get testimonials
            const [testimonials] = await pool.query(`
                SELECT t.*, u.name as user_name
                FROM testimonials t
                JOIN users u ON t.user_id = u.user_id
                WHERE t.professional_id = ? AND t.status = 1
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `, [professionalId, parseInt(limit), offset]);

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
            console.error("Error fetching testimonials:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch testimonials"
            });
        }
    }
// Update professional rating based on testimonials
    static async updateProfessionalRating(professionalId) {
        try {
            const [[result]] = await pool.query(`
                SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
                FROM testimonials
                WHERE professional_id = ? AND status = 1
            `, [professionalId]);

            await pool.query(`
                UPDATE business_profiles
                SET average_rating = ?, total_reviews = ?
                WHERE id = ?
            `, [
                result.avg_rating || 0,
                result.total_reviews || 0,
                professionalId
            ]);

        } catch (error) {
            console.error("Error updating professional rating:", error);
        }
    }
// Get professional statistics
    static async getProfessionalStats(req, res) {
        try {
            const userId = req.session.user.id;

            // Get professional profile
            const [profiles] = await pool.query(
                "SELECT id FROM business_profiles WHERE user_id = ?",
                [userId]
            );
            if (profiles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional profile not found"
                });
            }
            const professionalId = profiles[0].id;
            // Get various statistics
            const [[reviews]] = await pool.query(
                "SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM testimonials WHERE professional_id = ? AND status = 1",
                [professionalId]
            );
            const [[photos]] = await pool.query(
                "SELECT COUNT(*) as total FROM professional_photos WHERE professional_id = ?",
                [professionalId]
            );
            const [[views]] = await pool.query(
                "SELECT COUNT(*) as total FROM professional_views WHERE professional_id = ?",
                [professionalId]
            );
            const [[contacts]] = await pool.query(
                "SELECT COUNT(*) as total FROM contact_submissions WHERE professional_id = ?",
                [professionalId]
            );
            res.json({
                success: true,
                data: {
                    reviews: {
                        total: reviews.total || 0,
                        average_rating: reviews.avg_rating || 0
                    },
                    photos: {
                        total: photos.total || 0
                    },
                    views: {
                        total: views.total || 0
                    },
                    contacts: {
                        total: contacts.total || 0
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching professional stats:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch professional statistics"
            });
        }
    }
//  Log professional view
    static async logView(req, res) {
        try {
            const { professionalId } = req.params;
            const [professionals] = await pool.query(
                "SELECT id FROM business_profiles WHERE id = ?",
                [professionalId]
            );
            if (professionals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional not found"
                });
            }
            const userId = req.session.user?.id || null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            // Insert view record
            await pool.query(`
                INSERT INTO professional_views (professional_id, user_id, ip_address, created_at)
                VALUES (?, ?, ?, NOW())
            `, [professionalId, userId, ipAddress]);
            res.json({
                success: true,
                message: "View logged"
            });
        } catch (error) {
            console.error("Error logging view:", error);
            res.status(500).json({
                success: false,
                message: "Failed to log view"
            });
        }
    }
// Submit contact inquiry
    static async submitContact(req, res) {
        try {
            const { professionalId, subject, message, phone, email } = req.body;
            const userId = req.session.user?.id || null;
            // Check professional exists
            const [professionals] = await pool.query(
                "SELECT id, user_id FROM business_profiles WHERE id = ?",
                [professionalId]
            );
            if (professionals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Professional not found"
                });
            }
            // Insert contact submission
            const [result] = await pool.query(`
                INSERT INTO contact_submissions (professional_id, user_id, subject, message, phone, email, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())
            `, [professionalId, userId, subject, message, phone, email]);
            res.status(201).json({
                success: true,
                message: "Contact submission sent successfully",
                data: {
                    submission_id: result.insertId
                }
            });
        } catch (error) {
            console.error("Error submitting contact:", error);
            res.status(500).json({
                success: false,
                message: "Failed to submit contact inquiry"
            });
        }
    }
}
export default ProfessionalController;
