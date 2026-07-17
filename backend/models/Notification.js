const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  type: {
    type: String,
    enum: ['message', 'status_change', 'pdf_upload', 'ticket_assignment'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  senderName: {
    type: String
  },
  clientName: {
    type: String
  },
  fileName: {
    type: String
  },
  bodyText: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
