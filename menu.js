const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect } = require('../middleware/auth');

// GET /api/menu — public: get all menu items
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: 1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/menu — admin: add new menu item
router.post('/', protect, async (req, res) => {
  try {
    const { name, category, price, emoji, available, discount } = req.body;

    const count = await MenuItem.countDocuments();
    if (count >= 200) {
      return res.status(400).json({ success: false, message: 'Maximum 200 menu items reached.' });
    }

    const item = await MenuItem.create({ name, category, price, emoji, available, discount });
    res.status(201).json({ success: true, data: item, message: 'Menu item added successfully.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/menu/:id — admin: update a menu item
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: item, message: 'Item updated.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/menu/:id — admin: delete a menu item
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, message: 'Item deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
