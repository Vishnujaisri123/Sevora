const Availability = require('../models/Availability');

// Get all availability records (Admin)
exports.getAvailability = async (req, res) => {
  try {
    const records = await Availability.find()
      .populate('adminId', 'username email')
      .sort({ dateString: 1 });
    res.status(200).json({ success: true, availability: records });
  } catch (err) {
    console.error('Error fetching availability:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch availability records' });
  }
};

// Get only active future availability records (Employee Booking)
exports.getActiveAvailability = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const records = await Availability.find({ 
      active: true,
      dateString: { $gte: todayStr } 
    }).sort({ dateString: 1 });
    
    res.status(200).json({ success: true, availability: records });
  } catch (err) {
    console.error('Error fetching active availability:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active availability' });
  }
};

// Batch save or update availability slot configurations (Admin)
exports.saveAvailability = async (req, res) => {
  try {
    const { configs } = req.body; // Array of { dateString, slots: [{ time, active }] }
    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({ success: false, message: 'Invalid configurations array' });
    }

    const savedRecords = [];
    const adminId = req.user._id;

    for (const config of configs) {
      const { dateString, slots } = config;
      if (!dateString || !slots) continue;

      // Extract day of week and parsed Date
      const parsedDate = new Date(dateString);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[parsedDate.getDay()];

      // Upsert record
      const record = await Availability.findOneAndUpdate(
        { dateString },
        { 
          dateString,
          date: parsedDate,
          dayOfWeek,
          slots,
          adminId,
          active: slots.length > 0 // Deactivate day if there are no slots assigned
        },
        { new: true, upsert: true }
      );
      savedRecords.push(record);
    }

    // Broadcast update dynamically to all connected employees via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('availability_updated', { message: 'Slots updated by Admin' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Availability configurations saved successfully',
      records: savedRecords
    });
  } catch (err) {
    console.error('Error saving availability:', err);
    res.status(500).json({ success: false, message: 'Failed to save availability configurations' });
  }
};

// Delete availability configuration for a specific date (Admin)
exports.deleteAvailability = async (req, res) => {
  try {
    const { dateString } = req.params;
    const result = await Availability.findOneAndDelete({ dateString });
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'No availability configuration found for this date' });
    }

    // Broadcast socket update
    const io = req.app.get('io');
    if (io) {
      io.emit('availability_updated', { message: 'Slots deleted by Admin' });
    }

    res.status(200).json({ success: true, message: 'Availability configuration cleared successfully' });
  } catch (err) {
    console.error('Error deleting availability:', err);
    res.status(500).json({ success: false, message: 'Failed to clear availability configuration' });
  }
};
