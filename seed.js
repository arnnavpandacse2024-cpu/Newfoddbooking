// ===================================================
//  seed.js — Run once to populate default menu items
//  Usage: node seed.js
// ===================================================

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const MenuItem  = require('./models/MenuItem');
const Settings  = require('./models/Settings');

const defaultMenuItems = [
  { name: 'Paneer Butter Masala', category: 'Veg Main',          price: 220, emoji: '🍛', available: true,  discount: 0  },
  { name: 'Dal Makhani',          category: 'Veg Main',          price: 180, emoji: '🫕', available: true,  discount: 10 },
  { name: 'Chole Bhature',        category: 'Veg Snacks',        price: 130, emoji: '🫓', available: true,  discount: 0  },
  { name: 'Chicken Biryani',      category: 'Non-Veg Rice',      price: 280, emoji: '🍚', available: true,  discount: 15 },
  { name: 'Mutton Curry',         category: 'Non-Veg Main',      price: 350, emoji: '🍖', available: true,  discount: 0  },
  { name: 'Veg Fried Rice',       category: 'Veg Rice',          price: 160, emoji: '🍳', available: true,  discount: 0  },
  { name: 'Gulab Jamun',          category: 'Desserts',          price: 80,  emoji: '🍮', available: true,  discount: 0  },
  { name: 'Masala Chai',          category: 'Beverages',         price: 40,  emoji: '🍵', available: true,  discount: 0  },
  { name: 'Lassi',                category: 'Beverages',         price: 70,  emoji: '🥛', available: false, discount: 0  },
  { name: 'Naan (2 pcs)',         category: 'Breads',            price: 60,  emoji: '🫓', available: true,  discount: 0  },
  { name: 'Samosa (4 pcs)',       category: 'Veg Snacks',        price: 60,  emoji: '🔺', available: true,  discount: 0  },
  { name: 'Chicken Tikka',        category: 'Non-Veg Starters',  price: 260, emoji: '🍗', available: true,  discount: 20 },
];

const defaultSettings = [
  { key: 'foodBookingOpen',  value: true },
  { key: 'hallBookingOpen',  value: true },
  { key: 'hallPricingMode',  value: 'hour' },
  { key: 'hallPriceAmount',  value: 500 },
  { key: 'kmPrices', value: [
    { upTo: 2,  price: 20 },
    { upTo: 5,  price: 25 },
    { upTo: 8,  price: 30 },
    { upTo: 10, price: 40 },
  ]},
  { key: 'payment', value: {
    upi:          'bhaiyarestaurant@upi',
    name:         'Bhaiya Restaurant',
    other:        'Cash accepted at delivery',
    adminContact: '+91 9876543210',
  }},
];

async function seed() {
  await connectDB();

  // Seed menu items (only if empty)
  const existing = await MenuItem.countDocuments();
  if (existing === 0) {
    await MenuItem.insertMany(defaultMenuItems);
    console.log(`✅ Seeded ${defaultMenuItems.length} menu items`);
  } else {
    console.log(`⏭️  Menu items already exist (${existing}), skipping`);
  }

  // Seed settings (upsert each)
  for (const s of defaultSettings) {
    await Settings.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true, new: true });
  }
  console.log(`✅ Seeded ${defaultSettings.length} default settings`);

  console.log('\n🎉 Database seeded successfully!');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
