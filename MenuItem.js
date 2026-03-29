const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least 1'],
  },
  emoji: {
    type: String,
    default: '🍽️',
  },
  available: {
    type: Boolean,
    default: true,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
