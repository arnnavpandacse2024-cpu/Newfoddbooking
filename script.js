// ===================================================
//   BHAIYA RESTAURANT – script.js
//   API-connected version (MongoDB backend)
// ===================================================

const API = ''; // Same origin — backend serves frontend

// ─── TOKEN HELPERS ───────────────────────────────
function getToken()  { return localStorage.getItem('bhaiya_token'); }
function setToken(t) { localStorage.setItem('bhaiya_token', t); }
function clearToken(){ localStorage.removeItem('bhaiya_token'); }

// ─── HTTP HELPER ─────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── LOCAL STATE (UI / non-persisted) ────────────
const state = {
  menuItems: [],
  cart: {},
  settings: {
    foodBookingOpen: true,
    hallBookingOpen: true,
    hallPricingMode: 'hour',
    hallPriceAmount: 500,
    kmPrices: [
      { upTo: 2, price: 20 }, { upTo: 5, price: 25 },
      { upTo: 8, price: 30 }, { upTo: 10, price: 40 },
    ],
    payment: {
      upi: 'bhaiyarestaurant@upi',
      name: 'Bhaiya Restaurant',
      other: 'Cash accepted at delivery',
      adminContact: '+91 9876543210',
    },
  },
  currentBill: null,
  activeCat: 'All',
  adminLoggedIn: false,
};

// ─── BOOTSTRAP ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  const di = document.getElementById('hu-date');
  if (di) {
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    di.min = tom.toISOString().split('T')[0];
  }
  const pd = document.getElementById('hall-price-display');
  if (pd) pd.innerHTML = `<p>&#8377;<strong>${state.settings.hallPriceAmount}</strong> per ${state.settings.hallPricingMode === 'hour' ? 'hour' : 'person'}</p>`;
  if (getToken()) state.adminLoggedIn = true;
});

async function loadSettings() {
  try {
    const { data } = await apiFetch('/api/settings');
    state.settings = { ...state.settings, ...data };
  } catch (e) {
    console.warn('Using default settings:', e.message);
  }
}

// ─── SECTION ROUTING ─────────────────────────────
function showSection(id) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (id === 'food-user')                         initFoodUser();
  if (id === 'hall-user')                         initHallUser();
  if (id === 'admin-panel' && state.adminLoggedIn) initAdminPanel();
  if (id === 'admin-login')  document.getElementById('hero').style.display = 'none';
  if (id === 'home') {
    document.getElementById('hero').style.display = '';
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  }
}

function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}

// ─── ADMIN LOGIN / LOGOUT ─────────────────────────
async function adminLogin() {
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value.trim();
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    state.adminLoggedIn = true;
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    initAdminPanel();
  } catch (e) {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

function adminLogout() {
  clearToken();
  state.adminLoggedIn = false;
  showSection('home');
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
}

// ─── ADMIN PANEL INIT ─────────────────────────────
async function initAdminPanel() {
  await loadSettings();
  renderAdminToggles();
  renderKmTable();
  renderHallPricing();
  loadPaymentForm();
  await renderAdminMenu();
  await renderCabinAdmin();
  await renderBookings();
  // activate first tab button
  const firstBtn = document.querySelector('.tab-btn');
  if (firstBtn) { firstBtn.classList.add('active'); }
  document.querySelectorAll('.admin-tab-content').forEach((t, i) => {
    if (i === 0) t.classList.remove('hidden'); else t.classList.add('hidden');
  });
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.remove('hidden');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

function renderAdminToggles() {
  const ft   = document.getElementById('food-status-toggle');
  const ht   = document.getElementById('hall-status-toggle');
  const ftxt = document.getElementById('food-status-text');
  const htxt = document.getElementById('hall-status-text');
  if (ft)   ft.checked = state.settings.foodBookingOpen;
  if (ht)   ht.checked = state.settings.hallBookingOpen;
  if (ftxt) { ftxt.textContent = state.settings.foodBookingOpen ? 'OPEN' : 'CLOSED'; ftxt.className = 'status-text ' + (state.settings.foodBookingOpen ? 'open' : 'closed'); }
  if (htxt) { htxt.textContent = state.settings.hallBookingOpen ? 'OPEN' : 'CLOSED'; htxt.className = 'status-text ' + (state.settings.hallBookingOpen ? 'open' : 'closed'); }
}

// ─── BOOKING STATUS TOGGLES ──────────────────────
async function toggleFoodStatus() {
  const open = document.getElementById('food-status-toggle').checked;
  try {
    await apiFetch('/api/settings/food-status', { method: 'PUT', body: JSON.stringify({ open }) });
    state.settings.foodBookingOpen = open;
    renderAdminToggles();
    showToast('Food booking ' + (open ? 'opened ✅' : 'closed 🔒'));
  } catch (e) { showToast('Error: ' + e.message); }
}

async function toggleHallStatus() {
  const open = document.getElementById('hall-status-toggle').checked;
  try {
    await apiFetch('/api/settings/hall-status', { method: 'PUT', body: JSON.stringify({ open }) });
    state.settings.hallBookingOpen = open;
    renderAdminToggles();
    showToast('Hall booking ' + (open ? 'opened ✅' : 'closed 🔒'));
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── ADMIN MENU ───────────────────────────────────
async function addMenuItem() {
  const name  = document.getElementById('new-item-name').value.trim();
  const cat   = document.getElementById('new-item-cat').value.trim();
  const price = parseFloat(document.getElementById('new-item-price').value);
  const emoji = document.getElementById('new-item-emoji').value.trim() || '🍽️';
  const avail = document.getElementById('new-item-available').checked;
  if (!name || !cat || isNaN(price) || price <= 0) { showToast('Please fill all item fields'); return; }
  try {
    await apiFetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify({ name, category: cat, price, emoji, available: avail, discount: 0 }),
    });
    document.getElementById('new-item-name').value  = '';
    document.getElementById('new-item-cat').value   = '';
    document.getElementById('new-item-price').value = '';
    document.getElementById('new-item-emoji').value = '';
    await renderAdminMenu();
    showToast('Item added! ✅');
  } catch (e) { showToast('Error: ' + e.message); }
}

async function renderAdminMenu(filter = '') {
  try {
    const { data } = await apiFetch('/api/menu');
    state.menuItems = data;
  } catch (e) { /* use cached state */ }

  const list = document.getElementById('admin-menu-list');
  document.getElementById('menu-item-count').textContent = state.menuItems.length;

  const items = state.menuItems.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase()) ||
    i.category.toLowerCase().includes(filter.toLowerCase())
  );
  if (!items.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem">No items found</p>'; return; }

  let html = `<div class="admin-menu-header">
    <span>Item</span><span>Category</span><span>Price (&#8377;)</span><span>Discount (%)</span><span>Available</span><span></span>
  </div>`;
  items.forEach(item => {
    html += `
    <div class="admin-menu-row">
      <span class="item-name">${item.emoji} ${item.name}</span>
      <span style="color:var(--text-muted);font-size:0.8rem">${item.category}</span>
      <input type="number" value="${item.price}" min="1" onchange="updateItemPrice('${item._id}', this.value)" title="Price"/>
      <input type="number" value="${item.discount}" min="0" max="100" onchange="updateItemDiscount('${item._id}', this.value)" placeholder="%" title="Discount %"/>
      <div class="avail-toggle">
        <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleItemAvail('${item._id}', this.checked)" id="avail-${item._id}"/>
        <label for="avail-${item._id}" style="cursor:pointer">${item.available ? '✅' : '❌'}</label>
      </div>
      <button class="btn-delete" onclick="deleteMenuItem('${item._id}')" title="Delete"><i class="fas fa-trash"></i></button>
    </div>`;
  });
  list.innerHTML = html;
}

function filterAdminMenu() { renderAdminMenu(document.getElementById('admin-menu-search').value); }

async function updateItemPrice(id, val) {
  try { await apiFetch(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify({ price: parseFloat(val) }) }); }
  catch (e) { showToast('Error saving price'); }
}

async function updateItemDiscount(id, val) {
  const discount = Math.min(100, Math.max(0, parseFloat(val) || 0));
  try {
    await apiFetch(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify({ discount }) });
    showToast('Discount updated');
    await renderAdminMenu();
  } catch (e) { showToast('Error saving discount'); }
}

async function toggleItemAvail(id, val) {
  try {
    await apiFetch(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify({ available: val }) });
    showToast(`Item ${val ? 'enabled' : 'disabled'}`);
    await renderAdminMenu();
  } catch (e) { showToast('Error updating item'); }
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this item?')) return;
  try {
    await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
    await renderAdminMenu();
    showToast('Item deleted');
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── KM PRICES ────────────────────────────────────
function renderKmTable() {
  const el = document.getElementById('km-price-table');
  if (!el) return;
  let html = '';
  state.settings.kmPrices.forEach((k, i) => {
    html += `<div class="km-row">
      <div><label>Up to KM</label><input type="number" value="${k.upTo}" min="1" max="10" onchange="state.settings.kmPrices[${i}].upTo=parseFloat(this.value)"/></div>
      <div><label>Price (&#8377;/km)</label><input type="number" value="${k.price}" min="1" onchange="state.settings.kmPrices[${i}].price=parseFloat(this.value)"/></div>
      <button class="btn-delete" onclick="removeKmRow(${i})" style="margin-top:1.2rem"><i class="fas fa-trash"></i></button>
    </div>`;
  });
  el.innerHTML = html;
}

function addKmRow()      { state.settings.kmPrices.push({ upTo: 10, price: 50 }); renderKmTable(); }
function removeKmRow(i)  { state.settings.kmPrices.splice(i, 1); renderKmTable(); }

async function saveKmPrices() {
  try {
    await apiFetch('/api/settings/km-prices', { method: 'PUT', body: JSON.stringify({ kmPrices: state.settings.kmPrices }) });
    showToast('KM prices saved ✅');
  } catch (e) { showToast('Error: ' + e.message); }
}

function getDeliveryPrice(km) {
  const sorted = [...state.settings.kmPrices].sort((a, b) => a.upTo - b.upTo);
  for (const k of sorted) { if (km <= k.upTo) return k.price * km; }
  return null;
}

// ─── HALL PRICING ─────────────────────────────────
function renderHallPricing() {
  const mode = document.getElementById('hall-pricing-mode');
  const amt  = document.getElementById('hall-price-amount');
  if (mode) mode.value = state.settings.hallPricingMode;
  if (amt)  amt.value  = state.settings.hallPriceAmount;
  updateHallPricingPreview();
}

async function updateHallPricing() {
  const mode = document.getElementById('hall-pricing-mode');
  const amt  = document.getElementById('hall-price-amount');
  if (mode) state.settings.hallPricingMode = mode.value;
  if (amt)  state.settings.hallPriceAmount = parseFloat(amt.value) || 500;
  updateHallPricingPreview();
  try {
    await apiFetch('/api/settings/hall-pricing', {
      method: 'PUT',
      body: JSON.stringify({ mode: state.settings.hallPricingMode, amount: state.settings.hallPriceAmount }),
    });
  } catch (e) { /* silent */ }
}

function updateHallPricingPreview() {
  const el = document.getElementById('hall-price-display');
  if (el) el.innerHTML = state.settings.hallPricingMode === 'hour'
    ? `<p><strong>&#8377;${state.settings.hallPriceAmount}</strong> per hour</p>`
    : `<p><strong>&#8377;${state.settings.hallPriceAmount}</strong> per person</p>`;
}

// ─── CABIN ADMIN ─────────────────────────────────
async function renderCabinAdmin() {
  const el = document.getElementById('admin-cabin-list');
  if (!el) return;
  try {
    const { data } = await apiFetch('/api/hall-bookings');
    let html = '';
    [1, 2, 3].forEach(n => {
      const booked = data.filter(b => b.cabin === n).length;
      html += `<div class="cabin-admin-row">
        <div>
          <div class="cabin-admin-name">Cabin ${n}</div>
          <div class="cabin-bookings-today">${booked} total booking(s)</div>
        </div>
        <span class="cabin-badge ${booked > 0 ? 'booked' : 'available'}">${booked > 0 ? 'Has Bookings' : 'Free'}</span>
      </div>`;
    });
    el.innerHTML = html;
  } catch (e) { el.innerHTML = '<p style="color:var(--text-muted)">Unable to load cabin data.</p>'; }
}

// ─── PAYMENT INFO ────────────────────────────────
function loadPaymentForm() {
  const p = state.settings.payment;
  if (!p) return;
  document.getElementById('pay-upi').value       = p.upi || '';
  document.getElementById('pay-name').value      = p.name || '';
  document.getElementById('pay-other').value     = p.other || '';
  document.getElementById('admin-contact').value = p.adminContact || '';
}

async function savePaymentInfo() {
  const upi          = document.getElementById('pay-upi').value;
  const name         = document.getElementById('pay-name').value;
  const other        = document.getElementById('pay-other').value;
  const adminContact = document.getElementById('admin-contact').value;
  try {
    await apiFetch('/api/settings/payment', { method: 'PUT', body: JSON.stringify({ upi, name, other, adminContact }) });
    state.settings.payment = { upi, name, other, adminContact };
    const msg = document.getElementById('pay-save-msg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2500);
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── BOOKINGS VIEW ───────────────────────────────
async function renderBookings() {
  const fl = document.getElementById('food-bookings-list');
  const hl = document.getElementById('hall-bookings-list');
  if (!fl || !hl) return;

  try {
    const { data } = await apiFetch('/api/food-bookings');
    fl.innerHTML = data.length
      ? data.map(b => `<div class="booking-entry">
          <strong>${b.name}</strong> — ${b.phone}<br/>
          <span>${b.address}</span><br/>
          <span>Items: ${b.items.map(i => i.name).join(', ')}</span><br/>
          <span>Total: &#8377;${b.total}</span>
          <div class="b-date">${new Date(b.createdAt).toLocaleString()}</div>
          <button class="btn-delete" style="margin-top:0.5rem;font-size:0.75rem;padding:0.3rem 0.7rem" onclick="deleteFoodBooking('${b._id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:0.85rem">No food bookings yet.</p>';
  } catch (e) { fl.innerHTML = '<p style="color:var(--text-muted)">Unable to load food bookings.</p>'; }

  try {
    const { data } = await apiFetch('/api/hall-bookings');
    hl.innerHTML = data.length
      ? data.map(b => `<div class="booking-entry">
          <strong>${b.name}</strong> — ${b.phone}<br/>
          <span>Function: ${b.functionType}</span><br/>
          <span>Date: ${b.date} | Time: ${b.time} | Cabin: ${b.cabin}</span><br/>
          <span>Members: ${b.members} | Duration: ${b.hours}h</span><br/>
          <span>Total: &#8377;${b.total}</span>
          <div class="b-date">${new Date(b.createdAt).toLocaleString()}</div>
          <button class="btn-delete" style="margin-top:0.5rem;font-size:0.75rem;padding:0.3rem 0.7rem" onclick="deleteHallBooking('${b._id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:0.85rem">No hall bookings yet.</p>';
  } catch (e) { hl.innerHTML = '<p style="color:var(--text-muted)">Unable to load hall bookings.</p>'; }
}

async function deleteFoodBooking(id) {
  if (!confirm('Delete this booking?')) return;
  try { await apiFetch(`/api/food-bookings/${id}`, { method: 'DELETE' }); await renderBookings(); showToast('Booking deleted'); }
  catch (e) { showToast('Error: ' + e.message); }
}

async function deleteHallBooking(id) {
  if (!confirm('Delete this booking?')) return;
  try { await apiFetch(`/api/hall-bookings/${id}`, { method: 'DELETE' }); await renderBookings(); showToast('Booking deleted'); }
  catch (e) { showToast('Error: ' + e.message); }
}

// ─── FOOD USER ───────────────────────────────────
async function initFoodUser() {
  await loadSettings();
  const closed = document.getElementById('food-booking-closed');
  const wrap   = document.getElementById('food-form-wrap');
  if (!state.settings.foodBookingOpen) {
    closed.classList.remove('hidden');
    wrap.style.opacity = '0.4'; wrap.style.pointerEvents = 'none';
  } else {
    closed.classList.add('hidden');
    wrap.style.opacity = '1'; wrap.style.pointerEvents = '';
  }
  await renderMenuUser();
  renderCart();
}

function checkDistance() {
  const val = parseFloat(document.getElementById('fu-distance').value);
  const err = document.getElementById('distance-error');
  if (val > 10) err.classList.remove('hidden'); else err.classList.add('hidden');
  updateCartBill();
}

async function renderMenuUser(filter = '', activeCat = state.activeCat) {
  try {
    const { data } = await apiFetch('/api/menu');
    state.menuItems = data;
  } catch (e) { /* use cached */ }

  const cats   = ['All', ...new Set(state.menuItems.map(i => i.category))];
  const tabsEl = document.getElementById('cat-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = cats.map(c =>
      `<button class="cat-tab ${c === activeCat ? 'active' : ''}" onclick="setActiveCat('${c}')">${c}</button>`
    ).join('');
  }

  const items = state.menuItems.filter(i => {
    const matchCat  = activeCat === 'All' || i.category === activeCat;
    const matchSrch = i.name.toLowerCase().includes(filter.toLowerCase());
    return matchCat && matchSrch;
  });

  const el = document.getElementById('menu-list');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem">No items found</p>'; return; }

  el.innerHTML = items.map(item => {
    const qty      = state.cart[item._id]?.qty || 0;
    const discPrice = item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;
    return `
    <div class="menu-item ${!item.available ? 'unavailable' : ''}">
      <div class="menu-item-left">
        <span class="menu-emoji">${item.emoji}</span>
        <div>
          <div class="menu-name">${item.name} ${!item.available ? '<span class="menu-unavail-tag">Unavailable</span>' : ''}</div>
          <div class="menu-cat">${item.category}</div>
        </div>
      </div>
      <div class="menu-item-right">
        <div>
          <span class="menu-price">&#8377;${discPrice}</span>
          ${item.discount > 0 ? `<span class="discount-tag">${item.discount}% off</span>` : ''}
          ${item.discount > 0 ? `<div style="font-size:0.72rem;color:var(--text-muted);text-decoration:line-through">&#8377;${item.price}</div>` : ''}
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="updateCart('${item._id}', -1)">&#8722;</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" onclick="updateCart('${item._id}', 1)">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function setActiveCat(cat) {
  state.activeCat = cat;
  renderMenuUser(document.getElementById('menu-search')?.value || '', cat);
}

function filterMenu() {
  renderMenuUser(document.getElementById('menu-search').value, state.activeCat);
}

function updateCart(itemId, delta) {
  const item = state.menuItems.find(i => i._id === itemId);
  if (!item || !item.available) return;
  if (!state.cart[itemId]) state.cart[itemId] = { item, qty: 0 };
  state.cart[itemId].qty = Math.max(0, state.cart[itemId].qty + delta);
  if (state.cart[itemId].qty === 0) delete state.cart[itemId];
  renderMenuUser(document.getElementById('menu-search')?.value || '', state.activeCat);
  renderCart();
}

function renderCart() {
  const cartItems = Object.values(state.cart);
  const countEl   = document.getElementById('cart-count');
  if (countEl) countEl.textContent = cartItems.reduce((a, c) => a + c.qty, 0);

  const listEl = document.getElementById('cart-items-list');
  if (!listEl) return;
  if (!cartItems.length) {
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:0.5rem">No items selected yet</p>';
    document.getElementById('bill-totals').style.display = 'none';
    return;
  }

  listEl.innerHTML = cartItems.map(({ item, qty }) => {
    const dp = item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;
    return `<div class="cart-item-row">
      <div>
        <div class="cart-item-name">${item.emoji} ${item.name}</div>
        <div class="cart-item-detail">&#8377;${dp} &times; ${qty}</div>
      </div>
      <span class="cart-item-price">&#8377;${dp * qty}</span>
    </div>`;
  }).join('');

  updateCartBill();
}

function updateCartBill() {
  const cartItems = Object.values(state.cart);
  if (!cartItems.length) { document.getElementById('bill-totals').style.display = 'none'; return; }

  const subtotal = cartItems.reduce((a, { item, qty }) => {
    const dp = item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;
    return a + dp * qty;
  }, 0);
  const discount = cartItems.reduce((a, { item, qty }) => {
    return a + (item.discount > 0 ? Math.round(item.price * item.discount / 100) * qty : 0);
  }, 0);

  const km  = parseFloat(document.getElementById('fu-distance')?.value) || 0;
  const del = km > 0 && km <= 10 ? (getDeliveryPrice(km) || 0) : 0;
  const rateUsed = km > 0 ? ((del / km) || 0).toFixed(0) : 20;
  const total = subtotal + del;

  document.getElementById('bill-totals').style.display = '';
  document.getElementById('b-subtotal').textContent = `&#8377;${subtotal}`;
  document.getElementById('b-km').textContent       = km || 0;
  document.getElementById('b-rate').textContent     = rateUsed;
  document.getElementById('b-delivery').textContent = `&#8377;${del}`;
  document.getElementById('b-discount').textContent = `-&#8377;${discount}`;
  document.getElementById('b-total').textContent    = `&#8377;${total}`;

  const p = state.settings.payment;
  const unavailItems = cartItems.filter(({ item }) => !item.available);
  let payHtml = `<strong><i class="fas fa-credit-card"></i> Payment Options</strong><br/>
    UPI: <strong>${p.upi}</strong> (${p.name})<br/>${p.other}`;
  if (unavailItems.length) {
    payHtml += `<br/><br/>&#9888;&#65039; Some items may be unavailable. Admin will contact you within <strong>30 mins</strong>: <strong>${p.adminContact}</strong>`;
  }
  document.getElementById('payment-info').innerHTML = payHtml;
}

async function confirmFoodBooking() {
  if (!state.settings.foodBookingOpen) { showToast('Food booking is currently closed'); return; }
  const name   = document.getElementById('fu-name').value.trim();
  const phone  = document.getElementById('fu-phone').value.trim();
  const addr   = document.getElementById('fu-address').value.trim();
  const km     = parseFloat(document.getElementById('fu-distance').value);
  const mapUrl = document.getElementById('fu-map').value.trim();

  if (!name || !phone || !addr)          { showToast('Please fill all required fields'); return; }
  if (!km || km <= 0)                    { showToast('Please enter a valid distance'); return; }
  if (km > 10)                           { showToast('Delivery not available beyond 10 KM'); return; }
  if (!Object.keys(state.cart).length)   { showToast('Please select at least one item'); return; }

  const cartItems = Object.values(state.cart);
  const subtotal  = cartItems.reduce((a, { item, qty }) => {
    const dp = item.discount > 0 ? Math.round(item.price * (1 - item.discount / 100)) : item.price;
    return a + dp * qty;
  }, 0);
  const discount = cartItems.reduce((a, { item, qty }) => {
    return a + (item.discount > 0 ? Math.round(item.price * item.discount / 100) * qty : 0);
  }, 0);
  const del   = getDeliveryPrice(km) || 0;
  const total = subtotal + del;

  const payload = {
    name, phone, address: addr, km, mapUrl,
    items: cartItems.map(c => ({
      name: c.item.name, qty: c.qty,
      price: c.item.discount > 0 ? Math.round(c.item.price * (1 - c.item.discount / 100)) : c.item.price,
    })),
    subtotal, discount, delivery: del, total,
  };

  try {
    const { data } = await apiFetch('/api/food-bookings', { method: 'POST', body: JSON.stringify(payload) });
    state.currentBill = { type: 'food', ...payload, date: new Date(data.createdAt).toLocaleString() };
    state.cart = {};
    await renderMenuUser();
    renderCart();
    showBillModal();
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── HALL USER ───────────────────────────────────
async function initHallUser() {
  await loadSettings();
  const closed = document.getElementById('hall-booking-closed');
  const wrap   = document.getElementById('hall-form-wrap');
  if (!state.settings.hallBookingOpen) {
    closed.classList.remove('hidden');
    wrap.style.opacity = '0.4'; wrap.style.pointerEvents = 'none';
  } else {
    closed.classList.add('hidden');
    wrap.style.opacity = '1'; wrap.style.pointerEvents = '';
  }
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('hu-date').min = tomorrow.toISOString().split('T')[0];
  const pd = document.getElementById('hall-price-display');
  if (pd) pd.innerHTML = state.settings.hallPricingMode === 'hour'
    ? `<p>&#8377;<strong>${state.settings.hallPriceAmount}</strong> per hour</p>`
    : `<p>&#8377;<strong>${state.settings.hallPriceAmount}</strong> per person</p>`;
}

async function checkCabinAvailability() {
  const date = document.getElementById('hu-date').value;
  if (!date) return;
  try {
    const { data } = await apiFetch(`/api/hall-bookings/availability?date=${date}`);
    const slots = document.querySelectorAll('[id^="cabin-slot-"]');
    slots.forEach((sl, i) => {
      const n = i + 1;
      const badge = sl.querySelector('.cabin-badge');
      if (data.bookedCabins.includes(n)) {
        badge.className = 'cabin-badge booked'; badge.textContent = 'Booked';
      } else {
        badge.className = 'cabin-badge available'; badge.textContent = 'Available';
      }
    });
    const msg = document.getElementById('cabin-status-msg');
    if (data.totalAvailable === 0) {
      msg.innerHTML = '<div class="alert-box warning"><i class="fas fa-exclamation-triangle"></i> All 3 cabins are fully booked on this date! Please choose a different date.</div>';
    } else {
      msg.innerHTML = `<div class="alert-box info"><i class="fas fa-check-circle"></i> ${data.totalAvailable} cabin(s) available on this date.</div>`;
    }
  } catch (e) { showToast('Could not check availability'); }
}

async function confirmHallBooking() {
  if (!state.settings.hallBookingOpen) { showToast('Hall booking is currently closed'); return; }
  const name     = document.getElementById('hu-name').value.trim();
  const phone    = document.getElementById('hu-phone').value.trim();
  const funcType = document.getElementById('hu-function').value;
  const date     = document.getElementById('hu-date').value;
  const time     = document.getElementById('hu-time').value;
  const hours    = parseInt(document.getElementById('hu-hours').value);
  const members  = parseInt(document.getElementById('hu-members').value);

  if (!name || !phone || !funcType || !date || !time || !hours || !members) {
    showToast('Please fill all required fields'); return;
  }

  let total = 0;
  if (state.settings.hallPricingMode === 'hour')   total = state.settings.hallPriceAmount * hours;
  if (state.settings.hallPricingMode === 'person') total = state.settings.hallPriceAmount * members;

  try {
    const { data } = await apiFetch('/api/hall-bookings', {
      method: 'POST',
      body: JSON.stringify({ name, phone, functionType: funcType, date, time, hours, members, total }),
    });
    state.currentBill = {
      type: 'hall', name, phone, functionType: funcType, date, time, hours, members,
      cabin: data.cabin, total, bookedAt: new Date(data.createdAt).toLocaleString(),
    };
    await checkCabinAvailability();
    showBillModal();
  } catch (e) { showToast('Error: ' + e.message); }
}

// ─── BILL MODAL ───────────────────────────────────
function showBillModal() {
  const b = state.currentBill;
  const p = state.settings.payment;
  let html = '';

  if (b.type === 'food') {
    html = `
    <div class="bill-header">
      <h2>&#127869;&#65039; Bhaiya Restaurant</h2>
      <p>Food Order Bill</p>
      <p style="font-size:0.78rem;margin-top:0.3rem">${b.date}</p>
    </div>
    <div class="bill-section">
      <h4>Customer Details</h4>
      <div class="bill-item-row"><span>Name</span><span><strong>${b.name}</strong></span></div>
      <div class="bill-item-row"><span>Phone</span><span>${b.phone}</span></div>
      <div class="bill-item-row"><span>Address</span><span>${b.address}</span></div>
      <div class="bill-item-row"><span>Distance</span><span>${b.km} KM</span></div>
      ${b.mapUrl ? `<div class="bill-item-row"><span>Map</span><span style="word-break:break-all;font-size:0.75rem">${b.mapUrl}</span></div>` : ''}
    </div>
    <div class="bill-section">
      <h4>Order Items</h4>
      ${b.items.map(i => `<div class="bill-item-row"><span>${i.name} &times; ${i.qty}</span><span>&#8377;${i.price * i.qty}</span></div>`).join('')}
    </div>
    <div class="bill-total-box">
      <div class="bill-item-row"><span>Subtotal</span><span>&#8377;${b.subtotal}</span></div>
      <div class="bill-item-row" style="color:var(--success)"><span>Discount</span><span>-&#8377;${b.discount}</span></div>
      <div class="bill-item-row"><span>Delivery (${b.km} KM)</span><span>&#8377;${b.delivery}</span></div>
      <div class="bill-grand-total" style="margin-top:0.5rem;padding-top:0.5rem;border-top:2px solid var(--gold)">
        <span>GRAND TOTAL</span><span>&#8377;${b.total}</span>
      </div>
    </div>
    <div class="bill-pay-info">
      <strong>Payment Details</strong><br/>
      UPI: ${p.upi} (${p.name})<br/>${p.other}
    </div>
    <div class="bill-notice">&#9888;&#65039; Once booking is confirmed, it CANNOT be cancelled. 100% payment is mandatory.</div>`;
  }

  if (b.type === 'hall') {
    html = `
    <div class="bill-header">
      <h2>&#127881; Bhaiya Restaurant</h2>
      <p>Hall / Cabin Booking Bill</p>
      <p style="font-size:0.78rem;margin-top:0.3rem">${b.bookedAt}</p>
    </div>
    <div class="bill-section">
      <h4>Booking Details</h4>
      <div class="bill-item-row"><span>Name</span><span><strong>${b.name}</strong></span></div>
      <div class="bill-item-row"><span>Phone</span><span>${b.phone}</span></div>
      <div class="bill-item-row"><span>Function</span><span>${b.functionType}</span></div>
      <div class="bill-item-row"><span>Date</span><span>${b.date}</span></div>
      <div class="bill-item-row"><span>Time</span><span>${b.time}</span></div>
      <div class="bill-item-row"><span>Duration</span><span>${b.hours} hour(s)</span></div>
      <div class="bill-item-row"><span>Total Members</span><span>${b.members}</span></div>
      <div class="bill-item-row"><span>Cabin Assigned</span><span><strong>Cabin ${b.cabin}</strong></span></div>
    </div>
    <div class="bill-total-box">
      <div class="bill-item-row">
        <span>${state.settings.hallPricingMode === 'hour' ? `&#8377;${state.settings.hallPriceAmount} &times; ${b.hours} hrs` : `&#8377;${state.settings.hallPriceAmount} &times; ${b.members} persons`}</span>
        <span>&#8377;${b.total}</span>
      </div>
      <div class="bill-grand-total" style="margin-top:0.5rem;padding-top:0.5rem;border-top:2px solid var(--gold)">
        <span>TOTAL AMOUNT</span><span>&#8377;${b.total}</span>
      </div>
    </div>
    <div class="bill-pay-info" style="margin-top:0.75rem">
      &#9888;&#65039; Extra time charges will be applied manually by admin.<br/>
      Payment: ${p.upi} | ${p.other}
    </div>
    <div class="bill-notice">&#9888;&#65039; Book your cabin at least 24 hours in advance. Booking is non-refundable once confirmed.</div>`;
  }

  document.getElementById('bill-printable').innerHTML = html;
  document.getElementById('bill-modal').classList.remove('hidden');
}

function closeBillModal() { document.getElementById('bill-modal').classList.add('hidden'); }
function printBill()      { window.print(); }

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const b   = state.currentBill;
  const p   = state.settings.payment;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(139, 26, 26);
  doc.text('Bhaiya Restaurant', 105, 20, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(100, 60, 20);
  doc.text(b.type === 'food' ? 'Food Order Bill' : 'Hall / Cabin Booking Bill', 105, 28, { align: 'center' });
  doc.setDrawColor(201, 150, 43); doc.setLineWidth(0.7); doc.line(15, 32, 195, 32);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 20, 0);
  let y = 40;

  if (b.type === 'food') {
    doc.setFont('helvetica', 'bold'); doc.text('Customer Details', 15, y); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${b.name}`, 15, y); y += 6;
    doc.text(`Phone: ${b.phone}`, 15, y); y += 6;
    doc.text(`Address: ${b.address}`, 15, y); y += 6;
    doc.text(`Distance: ${b.km} KM`, 15, y); y += 10;
    doc.setFont('helvetica', 'bold'); doc.text('Order Items', 15, y); y += 7;
    doc.setFont('helvetica', 'normal');
    b.items.forEach(i => { doc.text(`${i.name} x${i.qty}`, 15, y); doc.text(`Rs.${i.price * i.qty}`, 170, y, { align: 'right' }); y += 6; });
    y += 4; doc.setDrawColor(201, 150, 43); doc.line(15, y, 195, y); y += 6;
    doc.text('Subtotal:', 15, y); doc.text(`Rs.${b.subtotal}`, 170, y, { align: 'right' }); y += 6;
    doc.text('Discount:', 15, y); doc.text(`-Rs.${b.discount}`, 170, y, { align: 'right' }); y += 6;
    doc.text('Delivery:', 15, y); doc.text(`Rs.${b.delivery}`, 170, y, { align: 'right' }); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 15, y); doc.text(`Rs.${b.total}`, 170, y, { align: 'right' }); y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`UPI: ${p.upi} | ${p.other}`, 15, y); y += 8;
    doc.setTextColor(139, 26, 26);
    doc.text('NOTE: Once confirmed, booking CANNOT be cancelled. 100% payment is mandatory.', 15, y);
  }

  if (b.type === 'hall') {
    doc.setFont('helvetica', 'bold'); doc.text('Hall Booking Details', 15, y); y += 7;
    doc.setFont('helvetica', 'normal');
    [['Name', b.name], ['Phone', b.phone], ['Function', b.functionType], ['Date', b.date],
     ['Time', b.time], ['Duration', `${b.hours} hour(s)`], ['Members', b.members], ['Cabin', `Cabin ${b.cabin}`]
    ].forEach(([k, v]) => { doc.text(`${k}: ${v}`, 15, y); y += 6; });
    y += 4; doc.setDrawColor(201, 150, 43); doc.line(15, y, 195, y); y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT:', 15, y); doc.text(`Rs.${b.total}`, 170, y, { align: 'right' }); y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(139, 26, 26);
    doc.text('NOTE: Extra time charges applied manually. Booking is non-refundable.', 15, y);
  }

  doc.save(`bhaiya-restaurant-bill-${Date.now()}.pdf`);
  showToast('PDF downloaded! 📄');
}

// ─── TOAST ───────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
