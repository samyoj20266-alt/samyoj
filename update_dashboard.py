import re

with open('vendor-dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Sidebar history menu
content = content.replace("""                <a href="#" class="menu-item" data-section="bookings-pending">
                    <svg class="svg-icon" style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-4m-4 0V9a2 2 0 1 1 4 0v2m-4 0H9m0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                    Pending Bookings
                </a>""", """                <a href="#" class="menu-item" data-section="bookings-pending">
                    <svg class="svg-icon" style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-4m-4 0V9a2 2 0 1 1 4 0v2m-4 0H9m0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                    Pending Bookings
                </a>
                <a href="#" class="menu-item" data-section="history">
                    <svg class="svg-icon" style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Approved / Rejected
                </a>""")

# 2. Section history
content = content.replace("""            </section>

        </main>""", """            </section>

            <!-- Approved / Rejected Bookings -->
            <section id="section-history" class="section hidden">
                <div class="content-section">
                    <div class="section-header">
                        <h2 style="font-size: 1.25rem;">Approved & Rejected Bookings</h2>
                        <span class="text-muted" style="font-size: 0.9rem;">History of customer bookings you have processed.</span>
                    </div>
                    <div id="history-bookings-list">
                        <!-- Loaded via JS -->
                    </div>
                </div>
            </section>

        </main>""")

# 3. sectionConfig
content = content.replace("""            'bookings-pending': {
                title: 'Pending Bookings',
                subtitle: 'Review and approve customer bookings.',
                action: {
                    visible: false
                }
            },
            profile: {""", """            'bookings-pending': {
                title: 'Pending Bookings',
                subtitle: 'Review and approve customer bookings.',
                action: {
                    visible: false
                }
            },
            history: {
                title: 'Processed Bookings',
                subtitle: 'Approved or rejected booking history.',
                action: {
                    visible: false
                }
            },
            profile: {""")

# Regex to empty dashboard requests list
content = re.sub(r'<tbody>\s*<tr>\s*<td>Rahul Sharma</td>.*?</tbody>', r'<tbody id="dashboard-requests-list">\n                            </tbody>', content, flags=re.DOTALL)

# Regex to empty my bookings list
content = re.sub(r'<tbody>\s*<tr>\s*<td>#B1042</td>.*?</tbody>', r'<tbody id="my-bookings-list">\n                            </tbody>', content, flags=re.DOTALL)

content = content.replace("loadPendingBookings();", "loadBookings();")

new_js = """        function loadBookings() {
            fetch('http://localhost:3000/api/get-vendor-bookings')
                .then(response => response.json())
                .then(data => {
                    const bookings = data.bookings;
                    
                    // 1. Pending Bookings (Dashboard & Pending Bookings section)
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
                                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="setActiveSection('bookings-pending')">Review</button>
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

                    // 2. Confirmed & Approved Bookings (My Bookings)
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
                                <div class="flex justify-between items-center pt-2">
                                    <span class="font-bold">Total: ₹${b.totalCost.toLocaleString('en-IN')}</span>
                                    <span>${b.customerName || b.contact}</span>
                                </div>
                            </div>
                        `).join('') || '<p class="text-muted">No history found.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error loading bookings:', error);
                });
        }

        function updateBookingStatus(bookingId, status) {
            fetch('http://localhost:3000/api/update-booking-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, status })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                loadBookings(); // Refresh the list
            })
            .catch(error => {
                console.error('Error updating booking status:', error);
                alert('Error updating booking status.');
            });
        }"""

content = re.sub(r'function loadPendingBookings\(\)\s*\{.*?function updateBookingStatus.*?catch\(error => \{.*?\alert.*?\}\);\s*\}', new_js, content, flags=re.DOTALL)

with open('vendor-dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates applied to vendor-dashboard.html.")
