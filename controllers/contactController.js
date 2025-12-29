const Contact = require("../models/Contact");

// @desc    Submit contact form
// @route   POST /contact/submit
// @access  Public
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const newContact = await Contact.create({
      name,
      email,
      phone,
      company,
      message
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully! We will get back to you soon.",
      data: newContact
    });
  } catch (error) {
    console.error("Submit Contact Error:", error);
    res.status(500).json({ message: "Failed to send message. Please try again later." });
  }
};

// @desc    Get all contact messages (Admin)
// @route   GET /contact/messages
// @access  Private (Admin only)
const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// @desc    Mark message as read/unread (Admin)
// @route   PUT /contact/mark-read/:id
// @access  Private (Admin only)
const toggleReadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      id,
      { isRead },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({
      success: true,
      message: `Message marked as ${isRead ? 'read' : 'unread'}`,
      data: contact
    });
  } catch (error) {
    console.error("Toggle Read Status Error:", error);
    res.status(500).json({ message: "Failed to update status" });
  }
};

// @desc    Delete message (Admin)
// @route   DELETE /contact/:id
// @access  Private (Admin only)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Delete Message Error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

module.exports = {
  submitContact,
  getMessages,
  toggleReadStatus,
  deleteMessage
};
