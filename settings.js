const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');

// Helper: upsert a setting
const upsertSetting = async (key, value) => {
  return Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true, runValidators: true }
  );
};

// GET /api/settings — public: get all public settings (status, pricing, payment, km)
router.get('/', async (req, res) => {
  try {
    const keys = [
      'foodBookingOpen',
      'hallBookingOpen',
      'hallPricingMode',
      'hallPriceAmount',
      'kmPrices',
      'payment',
    ];
    const settings = await Settings.find({ key: { $in: keys } });
    const result = {};
    settings.forEach((s) => { result[s.key] = s.value; });

    // Defaults if not set
    if (result.foodBookingOpen === undefined) result.foodBookingOpen = true;
    if (result.hallBookingOpen === undefined) result.hallBookingOpen = true;
    if (!result.hallPricingMode) result.hallPricingMode = 'hour';
    if (!result.hallPriceAmount) result.hallPriceAmount = 500;
    if (!result.kmPrices) result.kmPrices = [
      { upTo: 2, price: 20 },
      { upTo: 5, price: 25 },
      { upTo: 8, price: 30 },
      { upTo: 10, price: 40 },
    ];
    if (!result.payment) result.payment = {
      upi: 'bhaiyarestaurant@upi',
      name: 'Bhaiya Restaurant',
      other: 'Cash accepted at delivery',
      adminContact: '+91 9876543210',
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/food-status — admin: toggle food booking
router.put('/food-status', protect, async (req, res) => {
  try {
    const { open } = req.body;
    await upsertSetting('foodBookingOpen', open);
    res.json({ success: true, message: `Food booking ${open ? 'opened' : 'closed'}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/hall-status — admin: toggle hall booking
router.put('/hall-status', protect, async (req, res) => {
  try {
    const { open } = req.body;
    await upsertSetting('hallBookingOpen', open);
    res.json({ success: true, message: `Hall booking ${open ? 'opened' : 'closed'}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/hall-pricing — admin: update hall pricing
router.put('/hall-pricing', protect, async (req, res) => {
  try {
    const { mode, amount } = req.body;
    await upsertSetting('hallPricingMode', mode);
    await upsertSetting('hallPriceAmount', amount);
    res.json({ success: true, message: 'Hall pricing updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/km-prices — admin: update km delivery pricing
router.put('/km-prices', protect, async (req, res) => {
  try {
    const { kmPrices } = req.body;
    if (!Array.isArray(kmPrices)) {
      return res.status(400).json({ success: false, message: 'kmPrices must be an array.' });
    }
    await upsertSetting('kmPrices', kmPrices);
    res.json({ success: true, message: 'KM prices updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/payment — admin: update payment info
router.put('/payment', protect, async (req, res) => {
  try {
    const { upi, name, other, adminContact } = req.body;
    await upsertSetting('payment', { upi, name, other, adminContact });
    res.json({ success: true, message: 'Payment info saved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
