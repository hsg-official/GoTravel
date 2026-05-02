const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allCabs = [];
let currentFilter = 'all';
let currentSort = 'default';

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
                <a href="tel:${contact}" class="contact-btn">
                    <i class="fas fa-phone"></i> Contact Now
                </a>
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

// ---- FILTER ----
function filterCabs(type, btn) {
    currentFilter = type;

    // Update active button
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

    // Filter
    if (currentFilter !== 'all') {
        result = result.filter(c => c.transport_type === currentFilter);
    }

    // Sort
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
document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateClock, 1000);
    updateClock();
    loadCabs();
});