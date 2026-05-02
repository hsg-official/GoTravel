const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allCabs = [];
let currentFilter = 'all';
let currentSort = 'default';
let currentUser = null;
let selectedCab = null;

// ---- TOAST ----
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
}

// ---- CLOCK ----
function updateClock() {
    const n = new Date();
    document.getElementById('time').textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').textContent = n.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---- FETCH CABS FROM SUPABASE ----
async function loadCabs() {
    document.getElementById('loader').style.display = 'block';
    document.getElementById('cabsGrid').innerHTML = '';

    const { data, error } = await _supabase
        .from('services')
        .select('*')
        .eq('service_type', 'transport');

    document.getElementById('loader').style.display = 'none';

    if (error) {
        console.error('Error fetching cabs:', error);
        showEmpty('Failed to load transport services. Please try again.');
        return;
    }

    allCabs = data || [];
    renderCabs(allCabs);
}

// ---- RENDER CARDS ----
function renderCabs(cabs) {
    const grid = document.getElementById('cabsGrid');
    const countEl = document.getElementById('resultsCount');
    grid.innerHTML = '';

    if (cabs.length === 0) {
        showEmpty('No transport services found.');
        countEl.textContent = '';
        return;
    }

    countEl.textContent = `${cabs.length} service${cabs.length !== 1 ? 's' : ''} found`;

    cabs.forEach(cab => {
        const card = document.createElement('div');
        card.className = 'cab-card';

        const photoUrl = cab.photo_urls && cab.photo_urls.length > 0 ? cab.photo_urls[0] : null;
        const photoHTML = photoUrl
            ? `<img src="${photoUrl}" class="cab-photo" alt="${cab.service_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="cab-photo-placeholder" style="display:none"><i class="fas fa-taxi"></i></div>`
            : `<div class="cab-photo-placeholder"><i class="fas fa-taxi"></i></div>`;

        const badgeClass = cab.transport_type === 'Private' ? 'badge-private' : 'badge-public';
        const price = cab.price ? `LKR ${cab.price} <span>/ km</span>` : '<span>Price on request</span>';
        const contact = cab.contact || 'N/A';
        const address = cab.address || 'Sri Lanka';
        const description = cab.description || '';

        card.innerHTML = `
            ${photoHTML}
            <div class="cab-info">
                <div class="cab-top">
                    <div class="cab-name">${cab.service_name}</div>
                    <div class="cab-type-badge ${badgeClass}">${cab.transport_type || 'Transport'}</div>
                </div>
                ${description ? `<p class="cab-description">${description}</p>` : ''}
                <div class="cab-meta">
                    <div class="cab-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${address}</span>
                    </div>
                    <div class="cab-meta-item">
                        <i class="fas fa-phone"></i>
                        <span>${contact}</span>
                    </div>
                </div>
                <div class="cab-price">${price}</div>
                <button class="contact-btn" onclick="openBookingModal('${cab.service_name}', '${contact}')">
                    <i class="fas fa-plus"></i> Add to My Trip
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ---- EMPTY STATE ----
function showEmpty(message) {
    const grid = document.getElementById('cabsGrid');
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-taxi"></i>
            <p>${message}</p>
        </div>
    `;
}

// ---- OPEN BOOKING MODAL ----
async function openBookingModal(cabName, cabContact) {
    selectedCab = { name: cabName, contact: cabContact };

    document.getElementById('modalCabName').innerText = `Cab: ${cabName}`;
    document.getElementById('bookingModal').style.display = 'flex';

    const selectBox = document.getElementById('tripSelect');
    const confirmBtn = document.getElementById('confirmBtn');
    selectBox.innerHTML = '<option value="">Loading your trips...</option>';
    confirmBtn.disabled = true;

    if (!currentUser) {
        showToast('Please log in to book a cab.', 'error');
        document.getElementById('bookingModal').style.display = 'none';
        setTimeout(() => window.location.href = 'auth.html', 2000);
        return;
    }

    const { data: trips, error } = await _supabase
        .from('trips')
        .select('id, title, travel_date')
        .eq('user_id', currentUser.id);

    if (error || !trips || trips.length === 0) {
        selectBox.innerHTML = '<option value="">No planned trips found. Create one first!</option>';
        return;
    }

    selectBox.innerHTML = '<option value="">-- Choose a trip --</option>';
    trips.forEach(trip => {
        selectBox.innerHTML += `<option value="${trip.id}">${trip.title} (${trip.travel_date || 'TBD'})</option>`;
    });

    confirmBtn.disabled = false;
}

// ---- CLOSE MODAL ----
function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    selectedCab = null;
}

// ---- CONFIRM BOOKING ----
async function confirmBooking() {
    const tripId = document.getElementById('tripSelect').value;
    const confirmBtn = document.getElementById('confirmBtn');

    if (!tripId) {
        showToast('Please select a trip.', 'error');
        return;
    }

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const { error } = await _supabase
        .from('trips')
        .update({
            cab_name: selectedCab.name,
            cab_contact: selectedCab.contact
        })
        .eq('id', tripId);

    if (error) {
        showToast('Failed to update trip: ' + error.message, 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-plus"></i> ADD TO MY TRIP';
        return;
    }

    showToast('Cab added to your trip!', 'success');
    setTimeout(() => {
        closeModal();
        window.location.href = 'personal.html';
    }, 1500);
}

// ---- FILTER ----
function filterCabs(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilterAndSort();
}

// ---- SORT ----
function sortCabs(value) {
    currentSort = value;
    applyFilterAndSort();
}

// ---- APPLY FILTER + SORT TOGETHER ----
function applyFilterAndSort() {
    let result = [...allCabs];

    if (currentFilter !== 'all') {
        result = result.filter(c => c.transport_type === currentFilter);
    }

    if (currentSort === 'price_asc') {
        result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (currentSort === 'price_desc') {
        result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (currentSort === 'name_asc') {
        result.sort((a, b) => a.service_name.localeCompare(b.service_name));
    }

    renderCabs(result);
}

// ---- ON PAGE LOAD ----
document.addEventListener('DOMContentLoaded', async () => {
    setInterval(updateClock, 1000);
    updateClock();

    // Get current user
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        currentUser = user;
    }

    loadCabs();
});