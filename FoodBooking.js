const mongoose = require('mongoose');

const foodBookingSchema = new mongoose.Schema({
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
  address: {
    type: String,
    required: [true, 'Delivery address is required'],
  },
  km: {
    type: Number,
    required: true,
    min: 0.1,
    max: 10,
  },
  mapUrl: {
    type: String,
    default: '',
  },
  items: [
    {
      name: String,
      qty: Number,
      price: Number,
    },
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  delivery: { type: Number, default: 0 },
  total: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FoodBooking', foodBookingSchema);
