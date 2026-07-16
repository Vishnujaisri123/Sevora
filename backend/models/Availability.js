const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  time: { 
    type: String, 
    required: true 
  },
  active: { 
    type: Boolean, 
    default: true 
  }
});

const AvailabilitySchema = new mongoose.Schema({
  dateString: {
    type: String,
    required: true,
    unique: true // YYYY-MM-DD
  },
  date: {
    type: Date,
    required: true
  },
  dayOfWeek: {
    type: String,
    required: true
  },
  slots: [SlotSchema],
  active: {
    type: Boolean,
    default: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Availability', AvailabilitySchema);
