const mongoose = require('mongoose');

const hallBookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  functionType: {
    type: String,
    required: [true, 'Function type is required'],
  },
  date: {
    type: String,
    required: [true, 'Event date is required'],
  },
  time: {
    type: String,
    required: [true, 'Event time is required'],
  },
  hours: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  members: {
    type: Number,
    required: true,
    min: 1,
  },
  cabin: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
  },
  total: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('HallBooking', hallBookingSchema);
