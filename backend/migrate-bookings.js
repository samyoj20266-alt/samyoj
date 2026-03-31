// Migration script to add vendorContact to existing bookings
const fs = require('fs');
const path = require('path');

const BOOKINGS_PATH = path.join(__dirname, 'bookings.json');
const USERS_PATH = path.join(__dirname, 'users.json');

const bookings = JSON.parse(fs.readFileSync(BOOKINGS_PATH, 'utf-8'));
const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));

// Get vendor emails for assignment
const vendors = users.vendors;

// Distribute existing bookings across vendors
// Since old bookings didn't track which vendor, we assign them based on service names
const serviceToVendor = {};

vendors.forEach(v => {
    (v.services || []).forEach(s => {
        serviceToVendor[s.name.toLowerCase()] = {
            contact: v.email || v.phone || '',
            name: v.businessName || v.name || 'Vendor'
        };
    });
});

let migrated = 0;
bookings.forEach(b => {
    if (!b.vendorContact) {
        // Try to match by service name
        let assigned = false;
        if (b.services && b.services.length > 0) {
            for (const svc of b.services) {
                const key = (svc.name || '').toLowerCase();
                // Check for partial matches
                for (const [svcKey, vendor] of Object.entries(serviceToVendor)) {
                    if (key.includes(svcKey.split(' ')[0]) || svcKey.includes(key.split(' ')[0])) {
                        b.vendorContact = vendor.contact;
                        b.vendorName = vendor.name;
                        assigned = true;
                        break;
                    }
                }
                if (assigned) break;
            }
        }

        // If still not assigned, distribute round-robin
        if (!assigned && vendors.length > 0) {
            const vendorIdx = migrated % vendors.length;
            const v = vendors[vendorIdx];
            b.vendorContact = v.email || v.phone || '';
            b.vendorName = v.businessName || v.name || 'Vendor';
        }

        // Also add missing fields
        if (!b.customerName) b.customerName = 'Guest User';
        if (!b.customerMobile) b.customerMobile = b.contact || 'Not provided';

        migrated++;
    }
});

fs.writeFileSync(BOOKINGS_PATH, JSON.stringify(bookings, null, 2));
console.log(`Migration complete. ${migrated} bookings updated with vendorContact.`);
console.log('Vendor distribution:');
const vendorCounts = {};
bookings.forEach(b => {
    const vc = b.vendorContact || 'unassigned';
    vendorCounts[vc] = (vendorCounts[vc] || 0) + 1;
});
Object.entries(vendorCounts).forEach(([vc, count]) => {
    console.log(`  ${vc}: ${count} bookings`);
});
