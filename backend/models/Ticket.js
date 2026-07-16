const mongoose = require('mongoose');

const PdfHistorySchema = new mongoose.Schema({
  pdfPath: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  version: { type: Number, required: true }
});

const TicketSchema = new mongoose.Schema({
  serialNumber: {
    type: Number,
    unique: true
  },
  clientName1: {
    type: String,
    required: true,
    trim: true
  },
  clientName2: {
    type: String,
    required: true,
    trim: true
  },
  gothram: {
    type: String,
    trim: true
  },
  mobileNumber: {
    type: String,
    trim: true
  },
  bookersDate: {
    type: Date,
    required: true
  },
  bookedDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Draft', 'Pending', 'Paid', 'Paid by PhonePe', 'Paid by Cash', 'Refunded'],
    default: 'Draft'
  },
  status: {
    type: String,
    enum: [
      'Draft',
      'Confirmed',
      'Waiting for Admin',
      'Processing',
      'Ticket Generated',
      'PDF Uploaded',
      'Completed',
      'Cancelled',
      'On Hold',
      'Rejected'
    ],
    default: 'Draft'
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pdfHistory: [PdfHistorySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', TicketSchema);
