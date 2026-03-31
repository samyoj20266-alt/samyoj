import re

with open('vendor-dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update init() to include fetchAccountDetails
js_fetch = """        async function fetchAccountDetails() {
            const role = localStorage.getItem('userRole') || 'vendor';
            const contact = localStorage.getItem('userContact');
            if (contact) {
                try {
                    const res = await fetch('http://localhost:3000/api/get-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role, contact })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const vendorName = data.name || 'Vendor';
                        
                        // Update UI globally
                        sectionConfig.dashboard.title = 'Welcome back, ' + vendorName + '!';
                        const navName = document.querySelector('.nav-links .text-main');
                        if (navName) navName.textContent = vendorName;
                        if (window.location.hash === '' || window.location.hash === '#dashboard') {
                            document.getElementById('page-title').textContent = sectionConfig.dashboard.title;
                        }

                        // Update inputs if they are default
                        const nameInput = document.getElementById('business-name');
                        const emailInput = document.getElementById('business-email');
                        const contactInput = document.getElementById('business-contact');
                        
                        if (nameInput.value === 'Spice Symphony Catering' || !nameInput.value) nameInput.value = data.name || '';
                        if (emailInput.value === 'contact@spicesymphony.com' || !emailInput.value) emailInput.value = data.email || '';
                        if (contactInput.value === '+91 98765 43210' || !contactInput.value) contactInput.value = data.phone || '';
                    }
                } catch (err) {
                    console.error('Error fetching account details:', err);
                }
            }
        }

        function initProfile() {"""

content = content.replace("        function initProfile() {", js_fetch)

# Call fetchAccountDetails in init()
content = content.replace("            initProfile();", "            initProfile();\n            fetchAccountDetails();")

with open('vendor-dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated vendor-dashboard.html")
