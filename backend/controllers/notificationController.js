const Notification = require('../models/Notification');

// Get all notifications for the logged in user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate({
        path: 'ticketId',
        select: 'clientName1 clientName2 templeName status'
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark notifications as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: req.user.id },
        { $set: { isRead: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { userId: req.user.id },
        { $set: { isRead: true } }
      );
    }

    return res.status(200).json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
