const { supabase } = require('../config/supabase');

/**
 * Order management service
 * Handles all database operations for donation orders
 */

/**
 * Save new order to database
 * @param {Object} orderData - Order data to save
 * @returns {Promise<Object>} Saved order data
 */
async function saveOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select();

  if (error) {
    console.error('Supabase Insert Error:', error);
    throw new Error('Failed to save order');
  }

  return data[0];
}

/**
 * Update an order in the database
 * @param {string} orderId - Order ID to update
 * @param {Object} updateData - An object containing the fields to update
 * @returns {Promise<Object>} Updated order data
 */
async function updateOrder(orderId, updateData) {
  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('order_id', orderId)
    .select();

  if (error) {
    console.error('Supabase Update Error:', error);
    throw new Error('Failed to update order');
  }

  return data[0];
}

/**
 * Get order by order_id
 * @param {string} orderId - Order ID to retrieve
 * @returns {Promise<Object|null>} Order data or null if not found
 */
async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Supabase Select Error:', error);
    throw new Error('Failed to retrieve order');
  }

  return data;
}

/**
 * Get orders by user ID
 * @param {number} userId - Telegram user ID
 * @param {number} limit - Maximum number of orders to return
 * @returns {Promise<Array>} Array of user's orders
 */
async function getOrdersByUserId(userId, limit = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase Select Error:', error);
    throw new Error('Failed to retrieve user orders');
  }

  return data;
}

/**
 * Get orders by status
 * @param {string} status - Order status to filter by
 * @param {number} limit - Maximum number of orders to return
 * @returns {Promise<Array>} Array of orders with specified status
 */
async function getOrdersByStatus(status, limit = 50) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Supabase Select Error:', error);
    throw new Error('Failed to retrieve orders by status');
  }

  return data;
}

/**
 * Get total amount of completed donations for the current month.
 * @returns {Promise<number>} Total donation amount for the current month.
 */
async function getMonthlyDonations() {
  const now = new Date();
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data, error } = await supabase
    .from('orders')
    .select('amount')
    .eq('status', 'completed')
    .gte('completed_at', firstDayCurrentMonth.toISOString())
    .lt('completed_at', firstDayNextMonth.toISOString());

  if (error) {
    console.error('Supabase Aggregate Error:', error);
    throw new Error('Failed to calculate monthly donations');
  }

  return data.reduce((total, order) => total + order.amount, 0);
}

module.exports = {
  saveOrder,
  updateOrder,
  getOrderById,
  getOrdersByUserId,
  getOrdersByStatus,
  getMonthlyDonations
};
