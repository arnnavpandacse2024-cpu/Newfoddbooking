const express = require('express');
const router = express.Router();
const FoodBooking = require('../models/FoodBooking');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');

// GET /api/food-bookings — admin: get all food bookings
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await FoodBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/food-bookings — public: create a new food booking
router.post('/', async (req, res) => {
  try {
    // Check if food booking is open
    const statusSetting = await Settings.findOne({ key: 'foodBookingOpen' });
    const isOpen = statusSetting ? statusSetting.value : true;

    if (!isOpen) {
      return res.status(403).json({ success: false, message: 'Food booking is currently closed.' });
    }

    const { name, phone, address, km, mapUrl, items, subtotal, discount, delivery, total } = req.body;

    if (!name || !phone || !address || !km || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }
    if (km > 10) {
      return res.status(400).json({ success: false, message: 'Delivery not available beyond 10 KM.' });
    }

    const booking = await FoodBooking.create({
      name, phone, address, km, mapUrl, items, subtotal, discount, delivery, total,
    });

    res.status(201).json({ success: true, data: booking, message: 'Food booking confirmed!' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/food-bookings/:id — admin: delete a booking
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await FoodBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, message: 'Booking deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
