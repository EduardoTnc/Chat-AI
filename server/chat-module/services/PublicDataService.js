import { ApiError } from '../../utils/errorHandler.js';
import menuItemModel from '../../models/menuItemModel.js';
import orderModel from '../../models/orderModel.js';

class PublicDataService {
    constructor() {}

    /**
     * Search for menu items that match the query
     * @param {string} query - Search query
     * @param {Object} options - Additional options (limit, filters, etc.)
     * @returns {Promise<Array>} - Array of matching menu items
     */
    async searchMenuItems(query, options = {}) {
        try {
            const { limit = 5, category = null, isAvailable = true } = options;
            
            const searchQuery = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                ],
                isAvailable
            };

            if (category) {
                searchQuery.category = category;
            }

            const items = await menuItemModel.find(searchQuery)
                .select('name description price category image isAvailable')
                .limit(limit)
                .lean();

            return {
                success: true,
                data: items,
                count: items.length
            };
        } catch (error) {
            console.error('Error searching menu items:', error);
            throw new ApiError(500, 'Error al buscar en el menú');
        }
    }

    /**
     * Get order status for a user
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID to verify ownership
     * @returns {Promise<Object>} - Order status information
     */
    async getOrderStatus(orderId, userId) {
        try {
            const order = await orderModel.findOne({
                _id: orderId,
                user: userId
            }).select('status items totalAmount createdAt updatedAt');

            if (!order) {
                return {
                    success: false,
                    error: 'Orden no encontrada o no tienes permiso para verla'
                };
            }

            return {
                success: true,
                data: order
            };
        } catch (error) {
            console.error('Error getting order status:', error);
            throw new ApiError(500, 'Error al obtener el estado del pedido');
        }
    }

    /**
     * Get user's order history
     * @param {string} userId - User ID
     * @param {Object} options - Query options (limit, page, etc.)
     * @returns {Promise<Object>} - User's order history
     */
    async getOrderHistory(userId, options = {}) {
        try {
            const { limit = 5, page = 1 } = options;
            const skip = (page - 1) * limit;

            const [orders, total] = await Promise.all([
                orderModel.find({ user: userId })
                    .select('status items totalAmount createdAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                orderModel.countDocuments({ user: userId })
            ]);

            return {
                success: true,
                data: orders,
                pagination: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit),
                    limit
                }
            };
        } catch (error) {
            console.error('Error getting order history:', error);
            throw new ApiError(500, 'Error al obtener el historial de pedidos');
        }
    }

    /**
     * Get available menu categories
     * @returns {Promise<Object>} - List of available categories
     */
    async getMenuCategories() {
        try {
            const categories = await menuItemModel.distinct('category');
            return {
                success: true,
                data: categories
            };
        } catch (error) {
            console.error('Error getting menu categories:', error);
            throw new ApiError(500, 'Error al obtener las categorías del menú');
        }
    }
}

export default PublicDataService;
