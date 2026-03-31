import sys

with open('vendor-dashboard.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Verify where loadPendingBookings starts and ends.
start = None
end = None
for i, l in enumerate(lines):
    if l.strip() == 'function loadPendingBookings() {':
        start = i
    if start is not None and l.strip() == 'function updateBookingStatus(bookingId, status) {':
        end = i - 2
        break

if start is None or end is None:
    print('Could not find bounds')
    sys.exit(1)

new_code = """        function loadBookings() {
            fetch('http://localhost:3000/api/get-vendor-bookings')
                .then(response => response.json())
                .then(data => {
                    const bookings = data.bookings;
                    
                    // 1. Pending Bookings
                    const pending = bookings.filter(b => b.status === 'Pending');
                    const dashboardTbody = document.getElementById('dashboard-requests-list');
                    const pendingList = document.getElementById('pending-bookings-list');
                    
                    if (dashboardTbody) {
                        dashboardTbody.innerHTML = pending.map(b => `
                            <tr>
                                <td>${b.customerName || 'Unknown'}</td>
                                <td>${b.eventType ? b.eventType.charAt(0).toUpperCase() + b.eventType.slice(1) : '-'}</td>
                                <td>${b.bookingDate}</td>
                                <td>${b.services.map(s=>s.name).join(', ')}</td>
                                <td>₹${b.totalCost.toLocaleString('en-IN')}</td>
                                <td><span class="badge badge-pending">Pending</span></td>
                                <td>
                                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="setActiveSection('bookings-pending'); window.scrollTo(0,0);">Review</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7" class="text-center text-muted">No pending requests.</td></tr>';
                    }

                    if (pendingList) {
                        pendingList.innerHTML = pending.map(booking => `
                            <div class="content-section" style="margin-bottom: 1rem;">
                                <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom: 1px solid var(--border-color);">
                                    <div>
                                        <span class="text-xs text-muted">ORDER ID: ${booking.id}</span>
                                        <h3 class="mt-1">${booking.eventType ? booking.eventType.charAt(0).toUpperCase() + booking.eventType.slice(1) : ''} Event</h3>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                                            ${booking.status}
                                        </span>
                                        <div class="text-sm text-muted mt-2">Date: ${booking.bookingDate}</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <h4 class="text-sm font-semibold mb-2">Customer Details:</h4>
                                    <div class="text-sm">
                                        <div>Name: ${booking.customerName || 'Unknown'}</div>
                                        <div>Mobile: ${booking.customerMobile || 'Not provided'}</div>
                                        <div>Email: ${booking.contact}</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <h4 class="text-sm font-semibold mb-2">Booked Services:</h4>
                                    ${booking.services.map(s => `<div class="flex justify-between text-sm py-1"><span>${s.name}</span><span class="text-muted">₹${s.price.toLocaleString('en-IN')}</span></div>`).join('')}
                                </div>
                                <div class="flex justify-between items-center pt-4" style="border-top: 1px solid var(--border-color);">
                                    <span class="font-bold">Total</span>
                                    <span class="text-xl font-bold text-primary">₹${booking.totalCost.toLocaleString('en-IN')}</span>
                                </div>
                                <div class="flex gap-2 mt-4">
                                    <button class="btn btn-primary" onclick="updateBookingStatus('${booking.id}', 'Approved')">Approve</button>
                                    <button class="btn btn-outline" onclick="updateBookingStatus('${booking.id}', 'Rejected')">Reject</button>
                                </div>
                            </div>
                        `).join('') || '<p class="text-muted">No pending bookings.</p>';
                    }

                    // 2. Confirmed & Approved Bookings
                    const confirmed = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Approved');
                    const myBookingsTbody = document.getElementById('my-bookings-list');
                    if (myBookingsTbody) {
                        myBookingsTbody.innerHTML = confirmed.map(b => `
                            <tr>
                                <td>#${b.id.slice(-6)}</td>
                                <td>${b.customerName || 'Unknown'}</td>
                                <td>${b.bookingDate}</td>
                                <td>${b.eventType ? b.eventType.charAt(0).toUpperCase() + b.eventType.slice(1) : '-'}</td>
                                <td>${b.services.map(s=>s.name).join(', ')}</td>
                                <td>₹${b.totalCost.toLocaleString('en-IN')}</td>
                                <td><span class="badge ${b.status === 'Confirmed' ? 'badge-confirmed' : 'badge-completed'}">${b.status}</span></td>
                                <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Manage</button></td>
                            </tr>
                        `).join('') || '<tr><td colspan="8" class="text-center text-muted">No confirmed bookings.</td></tr>';
                    }

                    // 3. Approved & Rejected Bookings (History)
                    const history = bookings.filter(b => b.status === 'Approved' || b.status === 'Rejected');
                    const historyList = document.getElementById('history-bookings-list');
                    if (historyList) {
                        historyList.innerHTML = history.map(b => `
                            <div class="content-section" style="margin-bottom: 1rem; opacity: ${b.status === 'Rejected' ? '0.7' : '1'};">
                                <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom: 1px solid var(--border-color);">
                                    <div>
                                        <span class="text-xs text-muted">ORDER ID: ${b.id}</span>
                                        <h3 class="mt-1">${b.eventType ? b.eventType.charAt(0).toUpperCase() + b.eventType.slice(1) : ''} Event</h3>
                                    </div>
                                    <div style="text-align: right;">
                                        <span style="background: ${b.status === 'Approved' ? '#dcfce3' : '#fee2e2'}; color: ${b.status === 'Approved' ? '#16a34a' : '#ef4444'}; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">${b.status}</span>
                                        <div class="text-sm text-muted mt-2">Date: ${b.bookingDate}</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <div class="text-sm">
                                        <div>Name: ${b.customerName || 'Unknown'}</div>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center pt-2" style="border-top: 1px solid var(--border-color);">
                                    <span class="font-bold mt-2">Total: ₹${b.totalCost.toLocaleString('en-IN')}</span>
                                    <span>${b.contact}</span>
                                </div>
                            </div>
                        `).join('') || '<p class="text-muted">No history found.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error loading bookings:', error);
                });
        }
"""

lines = lines[:start] + [new_code] + lines[end + 1:]

with open('vendor-dashboard.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Replacement successful")
