import sys

with open('vendor-dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update HTML elements
old_stats = """                    <div class="stat-card">
                        <div class="stat-label">Total Revenue</div>
                        <div class="stat-value">₹2,45,000</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active Bookings</div>
                        <div class="stat-value">8</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Requests</div>
                        <div class="stat-value" style="color: var(--secondary);">3</div>
                    </div>"""
new_stats = """                    <div class="stat-card">
                        <div class="stat-label">Total Revenue</div>
                        <div class="stat-value" id="stat-total-revenue">₹0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Active Bookings</div>
                        <div class="stat-value" id="stat-active-bookings">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Requests</div>
                        <div class="stat-value" id="stat-new-requests" style="color: var(--secondary);">0</div>
                    </div>"""

content = content.replace(old_stats, new_stats)

old_js = """                    const bookings = data.bookings;
                    
                    // 1. Pending Bookings"""
new_js = """                    const bookings = data.bookings;
                    
                    // Compute stats
                    const pending = bookings.filter(b => b.status === 'Pending');
                    const confirmedAndApproved = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Approved');
                    const totalRevenue = confirmedAndApproved.reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);

                    const revEl = document.getElementById('stat-total-revenue');
                    if (revEl) revEl.textContent = '₹' + totalRevenue.toLocaleString('en-IN');

                    const actEl = document.getElementById('stat-active-bookings');
                    if (actEl) actEl.textContent = confirmedAndApproved.length;

                    const newReqEl = document.getElementById('stat-new-requests');
                    if (newReqEl) newReqEl.textContent = pending.length;
                    
                    // 1. Pending Bookings"""

content = content.replace(old_js, new_js)

with open('vendor-dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated stats')
