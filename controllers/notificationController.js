const Notification = require("../models/Notification");

// @desc    Get all notifications (Admin)
// @route   GET /admin/notifications
// @access  Private (Admin only)
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

// @desc    Mark notification as read
// @route   PUT /admin/notifications/:id/read
// @access  Private (Admin only)
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
};

// @desc    Delete notification
// @route   DELETE /admin/notifications/:id
// @access  Private (Admin only)
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete Notification Error:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotification,
};
