// =============================================
//  GoTravel — Buses Script
//  buses_script.js
// =============================================

// ---- Supabase Setup (same project as rest of app) ----
const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ---- State ----
let passengers = 1;
let tripType = 'one-way';
let selectedBus = null;
let selectedSeats = [];
let sortMode = 'price';
let currentResults = [];

// ---- Sri Lankan Cities ----
const cities = [
    'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Matara',
    'Anuradhapura', 'Polonnaruwa', 'Batticaloa', 'Trincomalee',
    'Badulla', 'Ratnapura', 'Kurunegala', 'Nuwara Eliya', 'Hambantota',
    'Vavuniya', 'Mannar', 'Puttalam', 'Ampara'
];

// ---- Mock Bus Data (used until DB is ready) ----
const mockBuses = [
    {
        id: 1, operator: 'CTB Express', type: 'Luxury',
        from: 'Colombo', to: 'Kandy',
        departure: '06:00', arrival: '09:30', duration: '3h 30m',
        stops: 2, price: 450, seats: 14,
        amenities: ['ac', 'wifi', 'usb'],
        totalSeats: 36, takenSeats: [3,7,12,15,22,28]
    },
    {
        id: 2, operator: 'Lanka Ashok Leyland', type: 'Semi Luxury',
        from: 'Colombo', to: 'Kandy',
        departure: '07:15', arrival: '11:00', duration: '3h 45m',
        stops: 4, price: 320, seats: 28,
        amenities: ['ac', 'usb'],
        totalSeats: 40, takenSeats: [1,5,9,19,31]
    },
    {
        id: 3, operator: 'Southern Express', type: 'Luxury',
        from: 'Colombo', to: 'Galle',
        departure: '08:00', arrival: '10:45', duration: '2h 45m',
        stops: 1, price: 380, seats: 6,
        amenities: ['ac', 'wifi', 'usb'],
        totalSeats: 36, takenSeats: [2,6,8,11,14,17,20,23,25,27,29,30,32,34,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]
    },
    {
        id: 4, operator: 'Perera & Sons', type: 'Normal',
        from: 'Kandy', to: 'Colombo',
        departure: '05:30', arrival: '09:15', duration: '3h 45m',
        stops: 6, price: 180, seats: 22,
        amenities: [],
        totalSeats: 50, takenSeats: [4,10,16,24]
    },
    {
        id: 5, operator: 'Intercity Express', type: 'Luxury',
        from: 'Colombo', to: 'Jaffna',
        departure: '20:30', arrival: '06:00', duration: '9h 30m',
        stops: 3, price: 1200, seats: 18,
        amenities: ['ac', 'wifi', 'usb', 'blanket'],
        totalSeats: 40, takenSeats: [1,3,5,9,15,21,33]
    },
    {
        id: 6, operator: 'Hill Country Tours', type: 'Semi Luxury',
        from: 'Kandy', to: 'Nuwara Eliya',
        departure: '09:00', arrival: '11:30', duration: '2h 30m',
        stops: 3, price: 280, seats: 30,
        amenities: ['ac'],
        totalSeats: 40, takenSeats: [7,13,19]
    },
    {
        id: 7, operator: 'South Coast Lines', type: 'Luxury',
        from: 'Galle', to: 'Matara',
        departure: '08:30', arrival: '09:45', duration: '1h 15m',
        stops: 2, price: 150, seats: 24,
        amenities: ['ac', 'wifi'],
        totalSeats: 36, takenSeats: [2,8,14]
    },
    {
        id: 8, operator: 'Northern Star', type: 'Semi Luxury',
        from: 'Colombo', to: 'Anuradhapura',
        departure: '07:00', arrival: '11:30', duration: '4h 30m',
        stops: 3, price: 520, seats: 9,
        amenities: ['ac', 'usb'],
        totalSeats: 44, takenSeats: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,43]
    },
];

const amenityIcons = {
    ac: { icon: 'fa-snowflake', label: 'A/C' },
    wifi: { icon: 'fa-wifi', label: 'WiFi' },
    usb: { icon: 'fa-plug', label: 'USB' },
    blanket: { icon: 'fa-bed', label: 'Blanket' }
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    populateCities();
    setMinDate();
    setupTransportDropdown();
});

function populateCities() {
    const fromSel = document.getElementById('fromCity');
    const toSel   = document.getElementById('toCity');
    cities.forEach(city => {
        fromSel.innerHTML += `<option value="${city}">${city}</option>`;
        toSel.innerHTML   += `<option value="${city}">${city}</option>`;
    });
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travelDate').min = today;
    document.getElementById('travelDate').value = today;
    document.getElementById('returnDate').min = today;
}

function setTripType(type) {
    tripType = type;
    document.getElementById('oneWayBtn').classList.toggle('active', type === 'one-way');
    document.getElementById('roundBtn').classList.toggle('active', type === 'round');
    document.getElementById('returnDateGroup').style.display = type === 'round' ? 'flex' : 'none';
}

function swapCities() {
    const from = document.getElementById('fromCity');
    const to   = document.getElementById('toCity');
    const tmp = from.value;
    from.value = to.value;
    to.value = tmp;
}

function changePassengers(delta) {
    passengers = Math.max(1, Math.min(10, passengers + delta));
    document.getElementById('passengerCount').textContent = passengers;
}

// ---- Search ----
async function searchBuses() {
    const from = document.getElementById('fromCity').value;
    const to   = document.getElementById('toCity').value;
    const date = document.getElementById('travelDate').value;

    if (!from) { showToast('Please select departure city', false); return; }
    if (!to)   { showToast('Please select destination city', false); return; }
    if (from === to) { showToast('Origin and destination cannot be the same', false); return; }
    if (!date) { showToast('Please select a travel date', false); return; }

    // Try DB first, fall back to mock
    let results = [];
    try {
        const { data, error } = await supabaseClient
            .from('buses')
            .select('*')
            .ilike('from', from)
            .ilike('to', to);

        if (!error && data && data.length > 0) {
            results = data;
        } else {
            results = mockBuses.filter(b =>
                b.from.toLowerCase() === from.toLowerCase() &&
                b.to.toLowerCase() === to.toLowerCase()
            );
        }
    } catch (e) {
        results = mockBuses.filter(b =>
            b.from.toLowerCase() === from.toLowerCase() &&
            b.to.toLowerCase() === to.toLowerCase()
        );
    }

    currentResults = results;
    renderResults(from, to, date);
}

function renderResults(from, to, date) {
    const section = document.getElementById('resultsSection');
    const grid    = document.getElementById('busResults');
    const title   = document.getElementById('resultsTitle');

    const sorted = sortBuses([...currentResults]);

    const dateStr = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    title.textContent = sorted.length
        ? `${sorted.length} bus${sorted.length > 1 ? 'es' : ''} found — ${from} → ${to} · ${dateStr}`
        : `No buses found — ${from} → ${to}`;

    if (sorted.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-bus-slash"></i>
                <h3>No buses available for this route</h3>
                <p>Try a different date or check nearby cities</p>
            </div>`;
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    grid.innerHTML = sorted.map((bus, i) => buildBusCard(bus, i)).join('');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildBusCard(bus, index) {
    const typeClass = bus.type === 'Luxury' ? 'luxury' : bus.type === 'Semi Luxury' ? 'semi-luxury' : '';
    const typeIcon  = bus.type === 'Luxury' ? 'fa-star' : bus.type === 'Semi Luxury' ? 'fa-circle-half-stroke' : 'fa-bus';
    const amenHtml  = (bus.amenities || []).map(a => {
        const icon = amenityIcons[a];
        return icon ? `<span class="amenity-tag"><i class="fas ${icon.icon}"></i>${icon.label}</span>` : '';
    }).join('');

    const seatsColor = bus.seats <= 5 ? '' : 'many';
    const seatsText  = bus.seats <= 5 ? `Only ${bus.seats} seats left!` : `${bus.seats} seats available`;

    return `
        <div class="bus-card" style="animation-delay:${index * 0.07}s">
            <div class="bus-operator">
                <span class="operator-name">${bus.operator}</span>
                <span class="bus-type-badge ${typeClass}">
                    <i class="fas ${typeIcon}"></i> ${bus.type}
                </span>
            </div>

            <div class="bus-timing">
                <div class="time-block">
                    <div class="time-main">${bus.departure}</div>
                    <div class="time-city">${bus.from}</div>
                </div>
                <div class="route-arrow">
                    <div class="arrow-line"></div>
                    <span class="duration-text">${bus.duration}</span>
                    <span class="stops-text">${bus.stops} stop${bus.stops !== 1 ? 's' : ''}</span>
                </div>
                <div class="time-block">
                    <div class="time-main">${bus.arrival}</div>
                    <div class="time-city">${bus.to}</div>
                </div>
            </div>

            <div class="bus-amenities">${amenHtml || '<span class="amenity-tag">Standard</span>'}</div>

            <div class="bus-price-block">
                <span class="seats-left ${seatsColor}">${seatsText}</span>
                <div class="price-main">LKR ${(bus.price * passengers).toLocaleString()}</div>
                <div class="price-per">${passengers > 1 ? `LKR ${bus.price} × ${passengers}` : 'per person'}</div>
                <button class="book-btn" onclick="openBooking(${bus.id})">Book Now</button>
            </div>
        </div>
    `;
}

// ---- Sort ----
function sortResults(mode) {
    sortMode = mode;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    const from = document.getElementById('fromCity').value;
    const to   = document.getElementById('toCity').value;
    const date = document.getElementById('travelDate').value;
    renderResults(from, to, date);
}

function sortBuses(arr) {
    if (sortMode === 'price')     return arr.sort((a, b) => a.price - b.price);
    if (sortMode === 'duration')  return arr.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
    if (sortMode === 'departure') return arr.sort((a, b) => a.departure.localeCompare(b.departure));
    return arr;
}

function parseDuration(str) {
    const [h, m] = str.replace('h', '').replace('m', '').trim().split(' ').map(Number);
    return (h || 0) * 60 + (m || 0);
}

// ---- Booking Modal ----
function openBooking(busId) {
    selectedBus = [...currentResults].find(b => b.id === busId);
    if (!selectedBus) return;

    selectedSeats = [];
    renderBookingSummary();
    renderSeatMap();
    updateTotal();

    document.getElementById('bookingModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.body.style.overflow = '';
}

function renderBookingSummary() {
    const dateVal = document.getElementById('travelDate').value;
    const dateStr = new Date(dateVal).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('bookingSummary').innerHTML = `
        <strong>${selectedBus.from}</strong> → <strong>${selectedBus.to}</strong><br>
        ${selectedBus.operator} · ${selectedBus.type}<br>
        ${selectedBus.departure} → ${selectedBus.arrival} · ${selectedBus.duration}<br>
        Date: ${dateStr} · ${passengers} passenger${passengers > 1 ? 's' : ''}
    `;
}

function renderSeatMap() {
    const map = document.getElementById('seatMap');
    map.innerHTML = '';
    const taken = selectedBus.takenSeats || [];
    for (let i = 1; i <= selectedBus.totalSeats; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat' + (taken.includes(i) ? ' taken' : '');
        seat.textContent = i;
        seat.dataset.seat = i;
        if (!taken.includes(i)) {
            seat.onclick = () => toggleSeat(seat, i);
        }
        map.appendChild(seat);
    }
}

function toggleSeat(el, num) {
    const idx = selectedSeats.indexOf(num);
    if (idx > -1) {
        selectedSeats.splice(idx, 1);
        el.classList.remove('selected');
    } else {
        if (selectedSeats.length >= passengers) {
            showToast(`You need ${passengers} seat${passengers > 1 ? 's' : ''}. Deselect one first.`, false);
            return;
        }
        selectedSeats.push(num);
        el.classList.add('selected');
    }
    updateTotal();
}

function updateTotal() {
    const total = selectedBus.price * passengers;
    document.getElementById('totalPrice').textContent = `LKR ${total.toLocaleString()}`;
}

// ---- Confirm Booking ----
async function confirmBooking() {
    const name  = document.getElementById('passengerName').value.trim();
    const phone = document.getElementById('passengerPhone').value.trim();
    const email = document.getElementById('passengerEmail').value.trim();
    const nic   = document.getElementById('passengerNIC').value.trim();

    if (!name)  { showToast('Please enter your name', false); return; }
    if (!phone) { showToast('Please enter your phone number', false); return; }
    if (!email) { showToast('Please enter your email', false); return; }
    if (!nic)   { showToast('Please enter your NIC / Passport number', false); return; }
    if (selectedSeats.length < passengers) {
        showToast(`Please select ${passengers} seat${passengers > 1 ? 's' : ''}`, false);
        return;
    }

    const booking = {
        bus_id: selectedBus.id,
        operator: selectedBus.operator,
        from: selectedBus.from,
        to: selectedBus.to,
        departure: selectedBus.departure,
        travel_date: document.getElementById('travelDate').value,
        passengers,
        seats: selectedSeats,
        name, phone, email, nic,
        total: selectedBus.price * passengers,
        booked_at: new Date().toISOString()
    };

    // Try to save to Supabase
    try {
        await supabaseClient.from('bus_bookings').insert([booking]);
    } catch (e) {
        // Silently continue — booking still confirmed for user
    }

    closeModal();

    const ref = 'GT-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    document.getElementById('toastMsg').textContent =
        `Ref: ${ref} · Seats ${selectedSeats.join(', ')} · ${selectedBus.from} → ${selectedBus.to}`;
    showToast('', true);
}

function showToast(msg, success) {
    const toast = document.getElementById('successToast');
    if (!success) {
        toast.style.borderColor = 'rgba(255,80,80,0.35)';
        toast.querySelector('i').style.color = '#ff6b6b';
        toast.querySelector('strong').textContent = msg;
        document.getElementById('toastMsg').textContent = '';
    } else {
        toast.style.borderColor = 'rgba(0,230,118,0.35)';
        toast.querySelector('i').style.color = '#00e676';
        toast.querySelector('strong').textContent = 'Booking Confirmed!';
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ---- Nav Transport Dropdown ----
function setupTransportDropdown() {
    const btn  = document.getElementById('transportBtn');
    const menu = document.getElementById('transportMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', e => {
        e.preventDefault();
        menu.classList.toggle('show');
    });
    window.addEventListener('click', e => {
        if (!btn.contains(e.target)) menu.classList.remove('show');
    });
}

// Close modal on overlay click
document.addEventListener('click', e => {
    const modal = document.getElementById('bookingModal');
    if (e.target === modal) closeModal();
});