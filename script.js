document.addEventListener('DOMContentLoaded', () => {
  // Common interactive logic goes here
  console.log('Event Platform JS loaded');
  
  // Total cost estimation logic for event-services.html
  const totalCostElement = document.getElementById('total-cost');
  const selectedServicesList = document.getElementById('selected-services-list');

  function getServiceCheckboxes() {
    return Array.from(document.querySelectorAll('.service-checkbox'));
  }

  function updateTotalCost() {
    const serviceCheckboxes = getServiceCheckboxes();
    let total = 0;
    selectedServicesList.innerHTML = '';
    let hasSelections = false;

    serviceCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        hasSelections = true;
        const price = parseFloat(checkbox.dataset.price);
        const name = checkbox.dataset.name;
        total += price;

        const li = document.createElement('li');
        li.className = 'flex justify-between text-sm mb-2';
        li.innerHTML = `<span>${name}</span> <span>₹${price.toLocaleString('en-IN')}</span>`;
        selectedServicesList.appendChild(li);
      }
    });

    if (!hasSelections) {
      selectedServicesList.innerHTML = '<li class="text-sm text-muted">No services selected</li>';
    }

    totalCostElement.textContent = `₹${total.toLocaleString('en-IN')}`;
  }

  document.addEventListener('change', (event) => {
    if (event.target.matches('.service-checkbox')) {
      updateTotalCost();
    }
  });

  // Initial render for cost panel
  updateTotalCost();

  // Handle Booking Submission
  const bookBtn = document.querySelector('.cost-panel .btn-primary');
  if (bookBtn) {
    bookBtn.addEventListener('click', async () => {
      const selectedCheckboxes = Array.from(document.querySelectorAll('.service-checkbox:checked'));
      
      if (selectedCheckboxes.length === 0) {
        alert('Please select at least one service to book.');
        return;
      }

      const userContact = localStorage.getItem('userContact');
      if (!userContact) {
        alert('Please login to book services.');
        window.location.href = 'customer-login.html';
        return;
      }

      // Get customer profile
      const profile = JSON.parse(localStorage.getItem('customerProfile') || '{}');
      const customerName = profile.name || 'Unknown';
      const customerMobile = profile.mobile || 'Not provided';

      const services = selectedCheckboxes.map(cb => ({
        name: cb.dataset.name,
        price: parseFloat(cb.dataset.price)
      }));

      const totalCost = services.reduce((sum, s) => sum + s.price, 0);
      const urlParams = new URLSearchParams(window.location.search);
      const eventType = urlParams.get('type') || 'Custom Event';

      try {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Processing...';

        const response = await fetch('/api/book-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: userContact,
            customerName,
            customerMobile,
            eventType,
            services,
            totalCost
          })
        });

        const data = await response.json();
        if (response.ok) {
          alert(data.message);
          window.location.href = 'my-bookings.html';
        } else {
          alert(data.message || 'Booking failed.');
          bookBtn.disabled = false;
          bookBtn.textContent = 'Proceed to Book';
        }
      } catch (error) {
        console.error('Booking error:', error);
        alert('Something went wrong. Please try again.');
        bookBtn.disabled = false;
        bookBtn.textContent = 'Proceed to Book';
      }
    });
  }
});
