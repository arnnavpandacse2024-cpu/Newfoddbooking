const express = require('express');
const router = express.Router();
const HallBooking = require('../models/HallBooking');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');

// GET /api/hall-bookings — admin: get all hall bookings
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await HallBooking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/hall-bookings/availability?date=YYYY-MM-DD — public: check cabin availability
router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

    const bookings = await HallBooking.find({ date });
    const bookedCabins = bookings.map((b) => b.cabin);
    const availableCabins = [1, 2, 3].filter((c) => !bookedCabins.includes(c));

    res.json({
      success: true,
      data: {
        date,
        bookedCabins,
        availableCabins,
        totalBooked: bookedCabins.length,
        totalAvailable: availableCabins.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/hall-bookings — public: create a new hall booking
router.post('/', async (req, res) => {
  try {
    // Check if hall booking is open
    const statusSetting = await Settings.findOne({ key: 'hallBookingOpen' });
    const isOpen = statusSetting ? statusSetting.value : true;

    if (!isOpen) {
      return res.status(403).json({ success: false, message: 'Hall booking is currently closed.' });
    }

    const { name, phone, functionType, date, time, hours, members, total } = req.body;

    if (!name || !phone || !functionType || !date || !time || !hours || !members) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    // Find available cabin
    const existingBookings = await HallBooking.find({ date });
    const bookedCabins = existingBookings.map((b) => b.cabin);

    if (bookedCabins.length >= 3) {
      return res.status(400).json({ success: false, message: 'All cabins are fully booked for this date.' });
    }

    const availableCabin = [1, 2, 3].find((c) => !bookedCabins.includes(c));

    const booking = await HallBooking.create({
      name, phone, functionType, date, time, hours, members,
      cabin: availableCabin,
      total,
    });

    res.status(201).json({ success: true, data: booking, message: 'Hall booking confirmed!' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/hall-bookings/:id — admin: delete a booking
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await HallBooking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, message: 'Booking deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
