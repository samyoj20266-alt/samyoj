const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// ═══════════════════════════════════════════════
// DATABASE FILES
// ═══════════════════════════════════════════════
const DB_PATH = path.join(__dirname, 'users.json');
const BOOKINGS_PATH = path.join(__dirname, 'bookings.json');

// Initialize local DB if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ customers: [], vendors: [] }, null, 2));
}
if (!fs.existsSync(BOOKINGS_PATH)) {
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify([], null, 2));
}

// In-memory OTP storage
const otpStore = {};

// ═══════════════════════════════════════════════
// EMAIL & SMS CONFIG
// ═══════════════════════════════════════════════
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: {
        user: process.env.GMAIL_USER || 'samyoj20266@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

transporter.verify().then(() => {
    console.log('SMTP transporter verified (Gmail connected).');
}).catch(err => {
    console.warn('Gmail connection failed. Check your App Password:', err.message);
});

// ═══════════════════════════════════════════════
// SMS CONFIG — Twilio
// ═══════════════════════════════════════════════
const twilioSid = process.env.TWILIO_SID || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
// IMPORTANT: This MUST be a Twilio active virtual number purchased in your console.
// You cannot use your personal mobile number here! Go to Twilio console -> Phone Numbers -> Get a Number.
const twilioPhone = 'YOUR_TWILIO_VIRTUAL_NUMBER';

let twilioClient;
if (twilioSid !== 'YOUR_TWILIO_SID' && twilioPhone !== 'YOUR_TWILIO_VIRTUAL_NUMBER') {
    twilioClient = require('twilio')(twilioSid, twilioAuthToken);
}

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getUsers = () => {
    if (!fs.existsSync(DB_PATH)) return { customers: [], vendors: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
};

const getBookings = () => {
    if (!fs.existsSync(BOOKINGS_PATH)) return [];
    return JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf-8'));
};

const saveUsers = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    if (supabase) {
        data.customers.forEach(async c => {
            const { error } = await supabase.from('customers').upsert({
                id: c.id, email: c.email || null, phone: c.phone || null, password: c.password,
                name: c.name, location: c.location, created_at: c.createdAt
            }, { onConflict: 'id' });
            if (error) console.error('SB Cust Sync Error:', error.message);
        });
        data.vendors.forEach(async v => {
            const { error } = await supabase.from('vendors').upsert({
                id: v.id, email: v.email || null, phone: v.phone || null, password: v.password,
                name: v.name, business_name: v.businessName, category: v.category,
                location: v.location, description: v.description, services: v.services,
                staff: v.staff, rating: v.rating, review_count: v.reviewCount,
                lat: v.lat, lon: v.lon, created_at: v.createdAt
            }, { onConflict: 'id' });
            if (error) console.error('SB Vend Sync Error:', error.message);
        });
    }
};

const saveBookings = (data) => {
    fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(data, null, 2));
    if (supabase) {
        data.forEach(async b => {
            const { error } = await supabase.from('bookings').upsert({
                id: b.id, contact: b.contact, customer_name: b.customerName,
                customer_mobile: b.customerMobile, event_type: b.eventType,
                services: b.services, total_cost: b.totalCost, booking_date: b.bookingDate,
                status: b.status, vendor_contact: b.vendorContact, vendor_name: b.vendorName
            }, { onConflict: 'id' });
            if (error) console.error('SB Booking Sync Error:', error.message);
        });
    }
};

// INITIAL SUPABASE RESTORE ON SERVER START
async function syncFromSupabase() {
    if (!supabase) return;
    try {
        console.log('Fetching live Database state from Supabase...');
        const custRes = await supabase.from('customers').select('*');
        const vendRes = await supabase.from('vendors').select('*');
        if (!custRes.error && !vendRes.error && (custRes.data.length > 0 || vendRes.data.length > 0)) {
            const memDb = { customers: [], vendors: [] };
            memDb.customers = custRes.data.map(c => ({
                id: c.id, email: c.email, phone: c.phone, password: c.password,
                name: c.name, location: c.location, createdAt: c.created_at
            }));
            memDb.vendors = vendRes.data.map(v => ({
                id: v.id, email: v.email, phone: v.phone, password: v.password,
                name: v.name, businessName: v.business_name, category: v.category,
                location: v.location, description: v.description, services: v.services,
                staff: v.staff, rating: v.rating, reviewCount: v.review_count,
                lat: v.lat, lon: v.lon, createdAt: v.created_at
            }));
            fs.writeFileSync(DB_PATH, JSON.stringify(memDb, null, 2));
            console.log(`[Supabase] Restored ${memDb.customers.length} Customers & ${memDb.vendors.length} Vendors.`);
        }

        const bookRes = await supabase.from('bookings').select('*');
        if (!bookRes.error && bookRes.data.length > 0) {
            const bks = bookRes.data.map(b => ({
                id: b.id, contact: b.contact, customerName: b.customer_name,
                customerMobile: b.customer_mobile, eventType: b.event_type,
                services: b.services, totalCost: b.total_cost, bookingDate: b.booking_date,
                status: b.status, vendorContact: b.vendor_contact, vendorName: b.vendor_name
            }));
            fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(bks, null, 2));
            console.log(`[Supabase] Restored ${bks.length} Bookings.`);
        }
    } catch (e) { console.error('Supabase Restore Failed. Falling back to files:', e.message); }
}
syncFromSupabase();

// Normalize contact for comparison
function normalizeContact(c) {
    if (!c) return '';
    return c.trim().toLowerCase();
}

// Find user by contact in a role
function findUser(roleKey, contact) {
    const data = getUsers();
    const contactVal = normalizeContact(contact);
    return data[roleKey].find(u => {
        const uEmail = normalizeContact(u.email);
        const uPhone = normalizeContact(u.phone);
        return uEmail === contactVal || uPhone === contactVal;
    });
}

// ═══════════════════════════════════════════════
// AUTH — OTP, Register, Login, Reset
// ═══════════════════════════════════════════════

// Request OTP
app.post('/api/request-otp', async (req, res) => {
    const { contact, isPhone } = req.body;
    const otp = generateOTP();
    otpStore[contact] = otp;

    try {
        if (!isPhone) {
            if (!transporter) {
                console.log(`[DEV MODE] OTP for ${contact} is: ${otp}`);
                return res.status(200).json({ message: `Dev Mode: SMTP not configured. Your OTP is ${otp}.`, otp });
            }
            await transporter.sendMail({
                from: 'samyoj20266@gmail.com',
                to: contact,
                subject: 'Your samyoj Verification Code',
                text: `Your OTP for samyoj is: ${otp}. It will expire soon. Do not share it with anyone.`
            });
            console.log(`[SUCCESS] OTP email sent to ${contact}`);
            return res.status(200).json({ message: 'OTP sent to your email successfully.', otp });
        } else {
            // SMS OTP Handling
            if (twilioClient) {
                const formattedContact = contact.startsWith('+') ? contact : `+91${contact}`;
                await twilioClient.messages.create({
                    body: `Your samyoj OTP is: ${otp}`,
                    from: twilioPhone,
                    to: formattedContact
                });
                console.log(`[SUCCESS] OTP SMS sent successfully to ${formattedContact}`);
                return res.status(200).json({ message: 'OTP sent to your phone successfully via Twilio.', otp });
            } else {
                console.log(`\n===========================================`);
                console.log(`[DEV MODE SMS] 📲 Sending to Phone: ${contact}`);
                console.log(`[DEV MODE SMS] 🔢 Your OTP is: ${otp}`);
                console.log(`(Configure twilioPhone in server.js to receive real SMS)`);
                console.log(`===========================================\n`);
                return res.status(200).json({ message: `Dev mode SMS logged to server console.` });
            }
        }
    } catch (error) {
        console.error('\n[ERROR] Error sending SMS/OTP:', error.message);

        // Even if API fails (like unverified Twilio number error), log it to the backend console so standard dev mode works locally
        console.log(`\n=x=x=x= API FAILED, FALLBACK DEV MODE =x=x=x=`);
        console.log(`[DEV MODE OTP] Contact: ${contact} | Code: ${otp}`);
        console.log(`=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=x=\n`);

        return res.status(500).json({ message: `OTP delivery blocked by Render. Go to Render Logs to see your OTP code: ${otp}`, otp });
    }
});

// Register User
app.post('/api/register', (req, res) => {
    const { role, email, phone, password, otp } = req.body;
    let contact = email || phone;

    if (!otpStore[contact] || !otp || String(otpStore[contact]).trim() !== String(otp).trim()) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const data = getUsers();
    const roleKey = role === 'vendor' ? 'vendors' : 'customers';
    let emailValue = email ? email.trim().toLowerCase() : null;
    let phoneValue = phone ? phone.trim() : null;

    if (data[roleKey].find(u => (u.email && u.email.toLowerCase() === emailValue) || (u.phone && u.phone === phoneValue))) {
        return res.status(400).json({ message: 'User already exists with this email or phone.' });
    }

    // Create user with full profile fields
    const newUser = {
        id: crypto.randomUUID(),
        email: emailValue,
        phone: phoneValue,
        password,
        name: '',
        businessName: '',
        category: '',
        location: '',
        description: '',
        services: [],  // Array of { name, price, description }
        staff: [],      // Array of { name, role }
        rating: (4 + Math.random()).toFixed(1),
        reviewCount: Math.floor(Math.random() * 50) + 5,
        createdAt: new Date().toISOString()
    };

    data[roleKey].push(newUser);
    saveUsers(data);
    delete otpStore[contact];

    return res.status(200).json({ message: 'Registration successful!' });
});

// Login
app.post('/api/login', (req, res) => {
    const { role, contact, password } = req.body;
    const data = getUsers();
    const roleKey = role === 'vendor' ? 'vendors' : 'customers';
    const contactValue = normalizeContact(contact);

    const user = data[roleKey].find(u => {
        const uEmail = normalizeContact(u.email);
        const uPhone = normalizeContact(u.phone);
        return (uEmail === contactValue || uPhone === contactValue) && u.password === password;
    });

    if (user) {
        return res.status(200).json({
            message: 'Login successful!',
            user: {
                name: user.name || user.businessName || 'User',
                email: user.email,
                phone: user.phone,
                businessName: user.businessName || '',
                category: user.category || '',
                location: user.location || ''
            }
        });
    } else {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }
});

// Reset Password
app.post('/api/reset-password', (req, res) => {
    const { role, contact, newPassword, otp } = req.body;

    if (!otpStore[contact] || !otp || String(otpStore[contact]).trim() !== String(otp).trim()) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const data = getUsers();
    const roleKey = role === 'vendor' ? 'vendors' : 'customers';
    const userIndex = data[roleKey].findIndex(u => u.email === contact || u.phone === contact);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'No account found with this contact.' });
    }

    data[roleKey][userIndex].password = newPassword;
    saveUsers(data);
    delete otpStore[contact];
    return res.status(200).json({ message: 'Password reset successful!' });
});


// ═══════════════════════════════════════════════
// PROFILE — Get & Update (scoped by contact)
// ═══════════════════════════════════════════════

app.post('/api/get-profile', (req, res) => {
    const { role, contact } = req.body;
    const roleKey = role === 'vendor' ? 'vendors' : 'customers';
    const user = findUser(roleKey, contact);

    if (user) {
        return res.status(200).json({
            name: user.name || user.businessName || '',
            email: user.email,
            phone: user.phone,
            businessName: user.businessName || '',
            category: user.category || '',
            location: user.location || '',
            description: user.description || '',
            services: user.services || [],
            staff: user.staff || [],
            rating: user.rating || '4.5',
            reviewCount: user.reviewCount || 0
        });
    } else {
        return res.status(404).json({ message: 'User not found.' });
    }
});

app.put('/api/update-profile', (req, res) => {
    const { role, originalContact, name, email, phone, businessName, category, location, description, lat, lon } = req.body;
    const data = getUsers();
    const roleKey = role === 'vendor' ? 'vendors' : 'customers';
    const contactVal = normalizeContact(originalContact);

    const userIndex = data[roleKey].findIndex(u => {
        return normalizeContact(u.email) === contactVal || normalizeContact(u.phone) === contactVal;
    });

    if (userIndex !== -1) {
        data[roleKey][userIndex].name = name || data[roleKey][userIndex].name;
        if (email) data[roleKey][userIndex].email = email;
        if (phone) data[roleKey][userIndex].phone = phone;
        if (businessName !== undefined) data[roleKey][userIndex].businessName = businessName;
        if (category !== undefined) data[roleKey][userIndex].category = category;
        if (location !== undefined) data[roleKey][userIndex].location = location;
        if (description !== undefined) data[roleKey][userIndex].description = description;
        if (lat !== undefined) data[roleKey][userIndex].lat = lat;
        if (lon !== undefined) data[roleKey][userIndex].lon = lon;

        saveUsers(data);
        return res.status(200).json({ message: 'Profile updated successfully!' });
    } else {
        return res.status(404).json({ message: 'User not found.' });
    }
});


// ═══════════════════════════════════════════════
// VENDOR SERVICES — CRUD (server-side, per vendor)
// ═══════════════════════════════════════════════

// Get services for a vendor
app.post('/api/get-vendor-services', (req, res) => {
    const { contact } = req.body;
    const user = findUser('vendors', contact);
    if (!user) return res.status(404).json({ message: 'Vendor not found.' });
    return res.status(200).json({ services: user.services || [] });
});

// Add a service
app.post('/api/add-vendor-service', (req, res) => {
    const { contact, name, price, description } = req.body;
    const data = getUsers();
    const contactVal = normalizeContact(contact);
    const idx = data.vendors.findIndex(u => normalizeContact(u.email) === contactVal || normalizeContact(u.phone) === contactVal);

    if (idx === -1) return res.status(404).json({ message: 'Vendor not found.' });

    if (!data.vendors[idx].services) data.vendors[idx].services = [];
    data.vendors[idx].services.push({ name, price: parseInt(price), description: description || '' });
    saveUsers(data);
    return res.status(200).json({ message: 'Service added.', services: data.vendors[idx].services });
});

// Remove a service
app.post('/api/remove-vendor-service', (req, res) => {
    const { contact, index } = req.body;
    const data = getUsers();
    const contactVal = normalizeContact(contact);
    const idx = data.vendors.findIndex(u => normalizeContact(u.email) === contactVal || normalizeContact(u.phone) === contactVal);

    if (idx === -1) return res.status(404).json({ message: 'Vendor not found.' });

    if (data.vendors[idx].services && data.vendors[idx].services[index]) {
        data.vendors[idx].services.splice(index, 1);
        saveUsers(data);
    }
    return res.status(200).json({ message: 'Service removed.', services: data.vendors[idx].services || [] });
});


// ═══════════════════════════════════════════════
// VENDOR STAFF — CRUD (server-side, per vendor)
// ═══════════════════════════════════════════════

app.post('/api/get-vendor-staff', (req, res) => {
    const { contact } = req.body;
    const user = findUser('vendors', contact);
    if (!user) return res.status(404).json({ message: 'Vendor not found.' });
    return res.status(200).json({ staff: user.staff || [] });
});

app.post('/api/add-vendor-staff', (req, res) => {
    const { contact, name, role } = req.body;
    const data = getUsers();
    const contactVal = normalizeContact(contact);
    const idx = data.vendors.findIndex(u => normalizeContact(u.email) === contactVal || normalizeContact(u.phone) === contactVal);

    if (idx === -1) return res.status(404).json({ message: 'Vendor not found.' });

    if (!data.vendors[idx].staff) data.vendors[idx].staff = [];
    data.vendors[idx].staff.push({ name, role });
    saveUsers(data);
    return res.status(200).json({ message: 'Staff added.', staff: data.vendors[idx].staff });
});

app.post('/api/remove-vendor-staff', (req, res) => {
    const { contact, index } = req.body;
    const data = getUsers();
    const contactVal = normalizeContact(contact);
    const idx = data.vendors.findIndex(u => normalizeContact(u.email) === contactVal || normalizeContact(u.phone) === contactVal);

    if (idx === -1) return res.status(404).json({ message: 'Vendor not found.' });

    if (data.vendors[idx].staff && data.vendors[idx].staff[index]) {
        data.vendors[idx].staff.splice(index, 1);
        saveUsers(data);
    }
    return res.status(200).json({ message: 'Staff removed.', staff: data.vendors[idx].staff || [] });
});


// ═══════════════════════════════════════════════
// VENDOR DIRECTORY — List all vendors (public)
// ═══════════════════════════════════════════════

app.get('/api/vendors', (req, res) => {
    const data = getUsers();
    const vendors = data.vendors.map(v => ({
        name: v.businessName || v.name || 'Unnamed Vendor',
        email: v.email,
        phone: v.phone,
        category: v.category || 'General',
        location: v.location || 'Not specified',
        description: v.description || '',
        services: (v.services || []).map(s => ({ name: s.name, price: s.price, description: s.description || '' })),
        rating: v.rating || '4.5',
        reviewCount: v.reviewCount || 0
    }));

    return res.status(200).json({ vendors });
});

// Get a single vendor's services (for customer booking flow)
app.get('/api/vendor-services/:vendorEmail', (req, res) => {
    const email = decodeURIComponent(req.params.vendorEmail);
    const user = findUser('vendors', email);
    if (!user) return res.status(404).json({ message: 'Vendor not found.' });
    return res.status(200).json({
        vendor: {
            name: user.businessName || user.name || 'Vendor',
            email: user.email,
            phone: user.phone,
            location: user.location || '',
            category: user.category || ''
        },
        services: user.services || []
    });
});


// ═══════════════════════════════════════════════
// BOOKINGS — Now scoped by vendor
// ═══════════════════════════════════════════════

// Book an Event (now includes vendorContact)
app.post('/api/book-event', (req, res) => {
    const { contact, vendorContact, vendorName, eventType, services, totalCost, bookingDate, customerName, customerMobile } = req.body;

    if (!contact || !services || services.length === 0) {
        return res.status(400).json({ message: 'Incomplete booking details.' });
    }

    const bookings = getBookings();
    const newBooking = {
        id: 'EVT' + Date.now(),
        contact,                                    // customer's email/phone
        vendorContact: vendorContact || '',          // vendor's email/phone
        vendorName: vendorName || '',                // vendor's business name
        customerName: customerName || 'Unknown',
        customerMobile: customerMobile || 'Not provided',
        eventType,
        services,
        totalCost,
        bookingDate: bookingDate || new Date().toISOString().split('T')[0],
        status: 'Pending'
    };

    bookings.push(newBooking);
    saveBookings(bookings);

    return res.status(200).json({ message: 'Booking submitted! Awaiting vendor approval.', bookingId: newBooking.id });
});

// Get MY bookings (for customers — filter by customer contact)
app.post('/api/get-my-bookings', (req, res) => {
    const { contact, altContacts } = req.body;
    const bookings = getBookings();

    const contactCandidates = new Set();
    if (contact) contactCandidates.add(normalizeContact(contact));
    if (Array.isArray(altContacts)) {
        altContacts.forEach(c => { if (c) contactCandidates.add(normalizeContact(c)); });
    }

    const myBookings = bookings.filter(b => {
        if (!b.contact) return false;
        if (contactCandidates.has(normalizeContact(b.contact))) return true;
        if (b.customerMobile && contactCandidates.has(normalizeContact(b.customerMobile))) return true;
        return false;
    });

    return res.status(200).json({ bookings: myBookings });
});

// ═══ VENDOR BOOKINGS — scoped to the requesting vendor ═══
app.post('/api/get-vendor-bookings', (req, res) => {
    const { contact } = req.body;
    const bookings = getBookings();
    const contactVal = normalizeContact(contact);

    // Find all bookings that belong to this vendor
    const vendorBookings = bookings.filter(b => {
        // Match by vendorContact field
        if (b.vendorContact && normalizeContact(b.vendorContact) === contactVal) return true;
        return false;
    });

    return res.status(200).json({ bookings: vendorBookings });
});

// Legacy: GET version (returns ALL bookings — for backward compat, will be deprecated)
app.get('/api/get-vendor-bookings', (req, res) => {
    const bookings = getBookings();
    return res.status(200).json({ bookings });
});

// Also keep old /api/get-bookings as alias (backward compat)
app.get('/api/get-bookings', (req, res) => {
    const bookings = getBookings();
    return res.status(200).json({ bookings });
});

// POST version of get-bookings (vendor-scoped)
app.post('/api/get-bookings', (req, res) => {
    const { contact } = req.body;
    if (!contact) {
        // Fallback: return all for backward compat
        const bookings = getBookings();
        return res.status(200).json({ bookings });
    }
    const bookings = getBookings();
    const contactVal = normalizeContact(contact);
    const vendorBookings = bookings.filter(b => {
        if (b.vendorContact && normalizeContact(b.vendorContact) === contactVal) return true;
        return false;
    });
    return res.status(200).json({ bookings: vendorBookings });
});

// Update Booking Status (with method support for both PUT and POST)
function handleUpdateStatus(req, res) {
    const { bookingId, status } = req.body;

    if (!bookingId || !['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid request.' });
    }

    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
        return res.status(404).json({ message: 'Booking not found.' });
    }

    booking.status = status;
    saveBookings(bookings);

    return res.status(200).json({ message: `Booking ${status.toLowerCase()} successfully.` });
}

app.post('/api/update-booking-status', handleUpdateStatus);
app.put('/api/update-booking-status', handleUpdateStatus);


// ═══════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`samyoj API running at http://localhost:${PORT}`);
    console.log(`Multi-vendor support enabled.`);
});
