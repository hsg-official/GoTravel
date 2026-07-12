/* ═══════════════════════════════════════════════════════
   GoTravel — Trip Planner Wizard (personal_script.js)
   ═══════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aXQLF_zuk6pGmo4v0E1LPg_-TzUnQ0_';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Global state ── */
let currentStep = 1;
const TOTAL_STEPS = 6;
let currentUserProfile = null;
let editingTripId = null;
let tripIdToDelete = null;
let autosaveTimer = null;
let draggedDestinationCard = null;
let draggedItineraryItem = null;

/* ══════════════════════════════════════════════
   SECTION 1 — UTILITY HELPERS
   ══════════════════════════════════════════════ */

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    toast.innerHTML = '<i class="fas fa-' + (icons[type] || 'info-circle') + '"></i> ' + escapeHtml(message);
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start), e = new Date(end);
    const diff = Math.floor((e - s) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
}

function isDateInPast(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    return d < today;
}

function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

/* ══════════════════════════════════════════════
   SECTION 2 — NAVIGATION / SECTIONS
   ══════════════════════════════════════════════ */

function showSection(sectionId) {
    document.getElementById('trips-section').style.display = 'none';
    document.getElementById('planner-section').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';

    document.getElementById('nav-trips').classList.remove('active');
    document.getElementById('nav-planner').classList.remove('active');

    if (sectionId === 'trips-section') {
        document.getElementById('nav-trips').classList.add('active');
        document.getElementById('page-title').textContent = 'My Trips';
    } else {
        document.getElementById('nav-planner').classList.add('active');
        document.getElementById('page-title').textContent = 'Trip Planner';
    }
}

function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    menu.classList.toggle('show');
    if (menuId === 'fleet-menu') {
        const sm = document.getElementById('services-menu');
        sm.style.maxHeight = menu.classList.contains('show') ? '1200px' : '1000px';
    }
}

function toggleTransport() {
    document.getElementById('transportOptions')?.classList.toggle('show');
}

/* ══════════════════════════════════════════════
   SECTION 3 — WIZARD STEP NAVIGATION
   ══════════════════════════════════════════════ */

function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    // Only allow jumping to completed or next step
    if (step > currentStep + 1) return;

    // Save before moving
    savePlannerDraft();

    currentStep = step;
    renderWizardState();

    // Rebuild dynamic content for the target step
    if (step === 2) updateRouteTimeline();
    if (step === 3) renderTransportSegments();
    if (step === 4) renderHotelSelections();
    if (step === 5) generateItineraryDays();
    if (step === 6) renderReview();

    updateTripSummary();
    // Scroll to top of planner
    document.querySelector('.wizard-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextStep() {
    if (!validatePlannerStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) goToStep(currentStep - 1);
}

function renderWizardState() {
    // Steps
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    const activeStep = document.getElementById('step-' + currentStep);
    if (activeStep) activeStep.classList.add('active');

    // Stepper
    document.querySelectorAll('.stepper-step').forEach(s => {
        const sNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (sNum === currentStep) s.classList.add('active');
        else if (sNum < currentStep) s.classList.add('completed');
    });
    document.querySelectorAll('.stepper-line').forEach((line, i) => {
        line.classList.toggle('completed', i < currentStep - 1);
    });

    // Show completed check icons
    document.querySelectorAll('.stepper-step.completed .stepper-circle').forEach(c => {
        c.innerHTML = '<i class="fas fa-check" style="font-size:0.85rem;"></i>';
    });
    document.querySelectorAll('.stepper-step:not(.completed) .stepper-circle').forEach(c => {
        const step = parseInt(c.closest('.stepper-step').dataset.step);
        c.innerHTML = '<span>' + step + '</span>';
    });

    // Buttons
    document.getElementById('btnPrev').style.display = currentStep === 1 ? 'none' : 'flex';
    document.getElementById('btnNext').style.display = currentStep === TOTAL_STEPS ? 'none' : 'flex';
    document.getElementById('btnSave').style.display = currentStep === TOTAL_STEPS ? 'flex' : 'none';
}

/* ══════════════════════════════════════════════
   SECTION 4 — VALIDATION
   ══════════════════════════════════════════════ */

function validatePlannerStep(step) {
    clearAllErrors();
    let valid = true;

    if (step === 1) {
        const title = document.getElementById('trip-title').value.trim();
        const startDate = document.getElementById('trip-date-start').value;
        const endDate = document.getElementById('trip-date-end').value;

        if (!title) { showFieldError('err-title', 'Trip title is required.'); document.getElementById('trip-title').classList.add('invalid'); valid = false; }
        if (!startDate) { showFieldError('err-start-date', 'Start date is required.'); valid = false; }
        if (!endDate) { showFieldError('err-end-date', 'End date is required.'); valid = false; }
        if (startDate && isDateInPast(startDate)) { showFieldError('err-start-date', 'Start date cannot be in the past.'); valid = false; }
        if (endDate && isDateInPast(endDate)) { showFieldError('err-end-date', 'End date cannot be in the past.'); valid = false; }
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) { showFieldError('err-end-date', 'End date must be on or after start date.'); valid = false; }
    }

    if (step === 2) {
        const dests = getDestinations();
        if (dests.length === 0 || !dests.some(d => d.name)) {
            showFieldError('err-destinations', 'Add at least one destination.');
            valid = false;
        }
    }

    if (!valid) {
        const firstErr = document.querySelector('.field-error.show');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
}

function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
}

function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; e.classList.remove('show'); });
    document.querySelectorAll('.glass-input.invalid').forEach(e => e.classList.remove('invalid'));
}

/* ══════════════════════════════════════════════
   SECTION 5 — CHIP SELECTORS
   ══════════════════════════════════════════════ */

function initChips() {
    document.querySelectorAll('.chip-group').forEach(group => {
        const isSingle = group.classList.contains('single-select');
        group.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (isSingle) {
                    group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
                    chip.classList.add('selected');
                } else {
                    chip.classList.toggle('selected');
                }
                scheduleDraftSave();
                updateTripSummary();
            });
        });
    });
}

function getSelectedChips(groupId) {
    return Array.from(document.querySelectorAll('#' + groupId + ' .chip.selected')).map(c => c.dataset.value);
}

function setSelectedChips(groupId, values) {
    if (!values || !values.length) return;
    document.querySelectorAll('#' + groupId + ' .chip').forEach(c => {
        c.classList.toggle('selected', values.includes(c.dataset.value));
    });
}

/* ══════════════════════════════════════════════
   SECTION 6 — BUDGET
   ══════════════════════════════════════════════ */

function updateBudgetBar() {
    const total = parseFloat(document.getElementById('trip-budget-total')?.value) || 0;
    const container = document.getElementById('budgetBarContainer');
    if (total <= 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';

    const fields = [
        { id: 'budget-accommodation', label: 'Accommodation', color: '#00f2ff' },
        { id: 'budget-transport', label: 'Transport', color: '#7000ff' },
        { id: 'budget-food', label: 'Food', color: '#ff9800' },
        { id: 'budget-activities', label: 'Activities', color: '#00e676' },
        { id: 'budget-emergency', label: 'Emergency', color: '#ff4d4d' }
    ];

    let allocated = 0;
    const legend = document.getElementById('budgetLegend');
    legend.innerHTML = '';

    fields.forEach((f, i) => {
        const val = parseFloat(document.getElementById(f.id)?.value) || 0;
        allocated += val;
        const pct = Math.min((val / total) * 100, 100);
        const seg = document.getElementById(['seg-accommodation','seg-transport','seg-food','seg-activities','seg-emergency'][i]);
        if (seg) seg.style.width = pct + '%';
        if (val > 0) {
            legend.innerHTML += '<div class="budget-legend-item"><div class="budget-legend-dot" style="background:' + f.color + '"></div>' + f.label + ' (' + Math.round(pct) + '%)</div>';
        }
    });

    const remaining = total - allocated;
    const remEl = document.getElementById('budgetRemaining');
    const currency = document.getElementById('trip-currency')?.value || 'LKR';
    if (remaining < 0) {
        remEl.innerHTML = '<span style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i> Over budget by ' + currency + ' ' + Math.abs(remaining).toLocaleString() + '</span>';
    } else {
        remEl.innerHTML = '<span style="color:var(--success);">Unallocated: ' + currency + ' ' + remaining.toLocaleString() + '</span>';
    }
}

function calculateTripBudget() {
    const total = parseFloat(document.getElementById('trip-budget-total')?.value) || 0;
    const fields = ['budget-accommodation','budget-transport','budget-food','budget-activities','budget-emergency'];
    let spent = 0;
    fields.forEach(id => { spent += parseFloat(document.getElementById(id)?.value) || 0; });
    return { total, spent, remaining: total - spent };
}

/* ══════════════════════════════════════════════
   SECTION 7 — DESTINATIONS (Step 2)
   ══════════════════════════════════════════════ */

function addDestinationRow(name = '', imageUrl = '', arrivalDate = '', departureDate = '', notes = '') {
    const list = document.getElementById('destinations-list');
    const index = list.children.length;
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.draggable = false;

    const imgSrc = imageUrl || '';
    const imgHtml = imgSrc ? '<img src="' + escapeHtml(imgSrc) + '" class="dest-card-img" alt="destination">' : '<div class="dest-card-img" style="background:var(--glass-bg);display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:var(--glass-border);"></i></div>';

    card.innerHTML =
        '<div class="dest-card-header">' +
            '<button type="button" class="drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></button>' +
            '<div class="dest-stop-number">' + (index + 1) + '</div>' +
            imgHtml +
            '<div class="dest-card-name">' + (escapeHtml(name) || 'Select a destination') + '</div>' +
            '<button type="button" class="search-dest-btn" title="Search destination"><i class="fas fa-location-dot"></i></button>' +
            '<button type="button" class="remove-stop-btn" title="Remove"><i class="fas fa-trash"></i></button>' +
        '</div>' +
        '<div class="dest-card-fields">' +
            '<div class="input-group"><label>Arrival</label><input type="date" class="glass-input dest-arrival" value="' + escapeHtml(arrivalDate) + '"></div>' +
            '<div class="input-group"><label>Departure</label><input type="date" class="glass-input dest-departure" value="' + escapeHtml(departureDate) + '"></div>' +
            '<div class="input-group"><label>Nights</label><div class="computed-value dest-nights">—</div></div>' +
        '</div>' +
        '<div class="input-group"><label>Notes</label><textarea class="glass-input glass-textarea dest-notes" rows="1" placeholder="Activities, preferences...">' + escapeHtml(notes) + '</textarea></div>';

    // Store data
    card.dataset.name = name;
    card.dataset.img = imageUrl;

    list.appendChild(card);
    initDestinationCardEvents(card);
    updateDestinationStopNumbers();
    updateRouteTimeline();
    calculateDestNights(card);
    scheduleDraftSave();
    updateTripSummary();
}

function initDestinationCardEvents(card) {
    const handle = card.querySelector('.drag-handle');
    const searchBtn = card.querySelector('.search-dest-btn');
    const removeBtn = card.querySelector('.remove-stop-btn');

    handle.addEventListener('mousedown', () => { card.draggable = true; });
    card.addEventListener('dragstart', () => { draggedDestinationCard = card; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); card.draggable = false; draggedDestinationCard = null; updateDestinationStopNumbers(); updateRouteTimeline(); scheduleDraftSave(); });

    searchBtn.addEventListener('click', () => goToPlaces(card));
    removeBtn.addEventListener('click', () => {
        card.remove();
        const remaining = document.querySelectorAll('.destination-card');
        if (remaining.length === 0) addDestinationRow();
        updateDestinationStopNumbers();
        updateRouteTimeline();
        scheduleDraftSave();
        updateTripSummary();
    });

    // Date change -> recalculate nights
    card.querySelectorAll('.dest-arrival, .dest-departure').forEach(inp => {
        inp.addEventListener('change', () => { calculateDestNights(card); scheduleDraftSave(); updateTripSummary(); });
    });
    card.querySelectorAll('.dest-notes').forEach(inp => {
        inp.addEventListener('input', () => scheduleDraftSave());
    });
}

function calculateDestNights(card) {
    const arrival = card.querySelector('.dest-arrival')?.value;
    const departure = card.querySelector('.dest-departure')?.value;
    const nightsEl = card.querySelector('.dest-nights');
    if (arrival && departure) {
        const nights = daysBetween(arrival, departure) - 1;
        nightsEl.textContent = nights >= 0 ? nights + ' night' + (nights !== 1 ? 's' : '') : 'Invalid';
    } else {
        nightsEl.textContent = '—';
    }
}

function setupDestinationDropArea() {
    const list = document.getElementById('destinations-list');
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedDestinationCard) return;
        const afterEl = getDragAfterElement(list, e.clientY, '.destination-card:not(.dragging)');
        if (afterEl == null) list.appendChild(draggedDestinationCard);
        else list.insertBefore(draggedDestinationCard, afterEl);
    });
}

function getDragAfterElement(container, y, selector) {
    const elements = [...container.querySelectorAll(selector)];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateDestinationStopNumbers() {
    document.querySelectorAll('.destination-card').forEach((card, i) => {
        const numEl = card.querySelector('.dest-stop-number');
        if (numEl) numEl.textContent = i + 1;
    });
}

function updateRouteTimeline() {
    const timeline = document.getElementById('routeTimeline');
    if (!timeline) return;
    const dests = getDestinations().filter(d => d.name);
    const startLoc = document.getElementById('trip-start-location')?.value?.trim();

    if (dests.length === 0 && !startLoc) {
        timeline.style.display = 'none';
        return;
    }
    timeline.style.display = 'flex';
    let html = '';
    if (startLoc) {
        html += '<div class="route-dot">' + escapeHtml(startLoc) + '</div>';
        if (dests.length > 0) html += '<i class="fas fa-arrow-right route-arrow"></i>';
    }
    dests.forEach((d, i) => {
        html += '<div class="route-dot">' + escapeHtml(d.name) + '</div>';
        if (i < dests.length - 1) html += '<i class="fas fa-arrow-right route-arrow"></i>';
    });
    timeline.innerHTML = html;
}

function getDestinations() {
    const cards = document.querySelectorAll('.destination-card');
    return Array.from(cards).map(card => ({
        name: card.dataset.name || '',
        img: card.dataset.img || '',
        arrival: card.querySelector('.dest-arrival')?.value || '',
        departure: card.querySelector('.dest-departure')?.value || '',
        notes: card.querySelector('.dest-notes')?.value || ''
    }));
}

function goToPlaces(card) {
    const cards = Array.from(document.querySelectorAll('.destination-card'));
    const index = cards.indexOf(card);
    localStorage.setItem('editingRowIndex', index);
    localStorage.setItem('isSelectingDestination', 'true');
    savePlannerDraft();
    window.location.href = 'places.html';
}

/* ══════════════════════════════════════════════
   SECTION 8 — TRANSPORTATION (Step 3)
   ══════════════════════════════════════════════ */

function renderTransportSegments() {
    const container = document.getElementById('transportSegments');
    const dests = getDestinations().filter(d => d.name);
    const startLoc = document.getElementById('trip-start-location')?.value?.trim();

    const stops = [];
    if (startLoc) stops.push(startLoc);
    dests.forEach(d => stops.push(d.name));

    if (stops.length < 2) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-route"></i><p>Add at least two destinations in Step 2 to plan transport between them.</p></div>';
        return;
    }

    // Retrieve saved transport data
    const saved = collectPlannerState().transportSegments || [];

    let html = '';
    for (let i = 0; i < stops.length - 1; i++) {
        const from = stops[i], to = stops[i + 1];
        const savedSeg = saved.find(s => s.from === from && s.to === to) || {};
        const selectedType = savedSeg.type || '';

        html += '<div class="transport-segment-card" data-from="' + escapeHtml(from) + '" data-to="' + escapeHtml(to) + '">' +
            '<div class="segment-header"><div class="segment-route">' +
                '<span class="segment-location">' + escapeHtml(from) + '</span>' +
                '<i class="fas fa-arrow-right segment-arrow"></i>' +
                '<span class="segment-location">' + escapeHtml(to) + '</span>' +
            '</div></div>' +
            '<div class="transport-type-chips">' +
                buildTransportChip('Train', 'fa-train', selectedType) +
                buildTransportChip('Bus', 'fa-bus', selectedType) +
                buildTransportChip('Private Vehicle', 'fa-car', selectedType) +
                buildTransportChip('Taxi/Cab', 'fa-taxi', selectedType) +
                buildTransportChip('Hotel Transfer', 'fa-shuttle-van', selectedType) +
                buildTransportChip('Self-drive', 'fa-steering-wheel', selectedType) +
                buildTransportChip('Not Required', 'fa-times-circle', selectedType) +
            '</div>' +
            '<div class="transport-booking-fields" style="display:' + (selectedType && selectedType !== 'Not Required' ? 'grid' : 'none') + ';">' +
                '<div class="input-group"><label>Travel Date</label><input type="date" class="glass-input seg-date" value="' + escapeHtml(savedSeg.date || '') + '"></div>' +
                '<div class="input-group"><label>Departure Time</label><input type="time" class="glass-input seg-time" value="' + escapeHtml(savedSeg.time || '') + '"></div>' +
                '<div class="input-group"><label>Passengers</label><input type="number" class="glass-input seg-passengers" value="' + (savedSeg.passengers || 1) + '" min="1"></div>' +
                '<div class="input-group"><label>Seat Class</label><select class="glass-select seg-class">' +
                    '<option value="">Select</option><option value="First Class">First Class</option><option value="Second Class">Second Class</option><option value="Third Class">Third Class</option><option value="AC">Air-conditioned</option><option value="Luxury">Luxury</option>' +
                '</select></div>' +
                '<div class="input-group"><label>Est. Price</label><input type="number" class="glass-input seg-price" value="' + (savedSeg.price || '') + '" min="0" placeholder="0"></div>' +
                '<div class="input-group"><label>Notes</label><input type="text" class="glass-input seg-notes" value="' + escapeHtml(savedSeg.notes || '') + '" placeholder="e.g. Luggage needs"></div>' +
            '</div>';

        // Search button for bus/train
        if (selectedType === 'Bus' || selectedType === 'Train') {
            html += '<div style="margin-top:12px;"><a href="' + (selectedType === 'Bus' ? 'buses.html' : 'buses.html') + '" class="service-search-btn" style="display:inline-flex;width:auto;text-decoration:none;"><i class="fas fa-search"></i> Search Available ' + selectedType + '</a></div>';
        }
        if (selectedType === 'Taxi/Cab' || selectedType === 'Private Vehicle') {
            html += '<div style="margin-top:12px;"><a href="cabs.html" class="service-search-btn" style="display:inline-flex;width:auto;text-decoration:none;"><i class="fas fa-search"></i> Search Available Transport</a></div>';
        }

        html += '</div>';
    }
    container.innerHTML = html;

    // Restore select values
    container.querySelectorAll('.seg-class').forEach((sel, i) => {
        if (saved[i]?.seatClass) sel.value = saved[i].seatClass;
    });

    // Chip click handlers
    container.querySelectorAll('.transport-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            const parent = this.closest('.transport-segment-card');
            parent.querySelectorAll('.transport-chip').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            const fields = parent.querySelector('.transport-booking-fields');
            fields.style.display = this.dataset.value !== 'Not Required' ? 'grid' : 'none';
            scheduleDraftSave();
            updateTripSummary();
        });
    });

    // Field change handlers
    container.querySelectorAll('input, select').forEach(inp => {
        inp.addEventListener('change', () => { scheduleDraftSave(); updateTripSummary(); });
    });
}

function buildTransportChip(label, icon, selectedType) {
    const sel = selectedType === label ? ' selected' : '';
    return '<button type="button" class="transport-chip' + sel + '" data-value="' + label + '"><i class="fas ' + icon + '"></i> ' + label + '</button>';
}

function getTransportSegments() {
    const segments = [];
    document.querySelectorAll('.transport-segment-card').forEach(card => {
        const selected = card.querySelector('.transport-chip.selected');
        segments.push({
            from: card.dataset.from,
            to: card.dataset.to,
            type: selected ? selected.dataset.value : '',
            date: card.querySelector('.seg-date')?.value || '',
            time: card.querySelector('.seg-time')?.value || '',
            passengers: card.querySelector('.seg-passengers')?.value || '1',
            seatClass: card.querySelector('.seg-class')?.value || '',
            price: card.querySelector('.seg-price')?.value || '',
            notes: card.querySelector('.seg-notes')?.value || ''
        });
    });
    return segments;
}

/* ══════════════════════════════════════════════
   SECTION 9 — HOTELS & SERVICES (Step 4)
   ══════════════════════════════════════════════ */

function renderHotelSelections() {
    const container = document.getElementById('hotelSelections');
    const dests = getDestinations().filter(d => d.name);
    const saved = collectPlannerState();

    if (dests.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-hotel"></i><p>Add destinations first, then select hotels for each stop.</p></div>';
        return;
    }

    let html = '';
    dests.forEach((dest, i) => {
        const hotelData = (saved.hotels || [])[i] || {};
        const hotelName = hotelData.name || '';
        const hasHotel = !!hotelName;

        html += '<div class="hotel-dest-card" data-dest-index="' + i + '">' +
            '<div class="hotel-dest-header"><h4><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(dest.name) + '</h4>' +
                (hasHotel ? '<span class="status-badge badge-planned">Selected</span>' : '<span class="status-badge badge-not-selected">Not Selected</span>') +
            '</div>';

        if (hasHotel) {
            html += '<div class="hotel-details-grid">' +
                '<div class="hotel-detail-item"><span>Hotel: </span><span>' + escapeHtml(hotelName) + '</span></div>' +
                '<div class="hotel-detail-item"><span>Check-in: </span><span>' + (dest.arrival || '—') + '</span></div>' +
                '<div class="hotel-detail-item"><span>Check-out: </span><span>' + (dest.departure || '—') + '</span></div>' +
                '<div class="hotel-detail-item"><span>Nights: </span><span>' + (daysBetween(dest.arrival, dest.departure) - 1 || '—') + '</span></div>' +
            '</div>' +
            '<div class="service-card-actions">' +
                '<button type="button" class="btn-sm btn-outline" onclick="goToHotels()"><i class="fas fa-exchange-alt"></i> Change Hotel</button>' +
                '<button type="button" class="btn-sm btn-danger-outline" onclick="removeHotelAt(' + i + ')"><i class="fas fa-times"></i> Remove</button>' +
            '</div>';
        } else {
            html += '<button type="button" class="service-search-btn" onclick="goToHotels()" style="margin-top:10px;"><i class="fas fa-search"></i> Find a Hotel for ' + escapeHtml(dest.name) + '</button>';
        }
        html += '</div>';
    });
    container.innerHTML = html;

    // Guide card update
    updateGuideCard(saved);
}

function goToHotels() {
    savePlannerDraft();
    localStorage.setItem('isSelectingHotel', 'true');
    window.location.href = 'hotels.html';
}

function goToGuides() {
    savePlannerDraft();
    localStorage.setItem('isSelectingGuide', 'true');
    window.location.href = 'guides.html';
}

function removeHotelAt(index) {
    const state = collectPlannerState();
    if (state.hotels && state.hotels[index]) {
        state.hotels[index] = {};
    }
    // Save and re-render
    localStorage.setItem('tripDraft', JSON.stringify(state));
    renderHotelSelections();
    updateTripSummary();
    showToast('Hotel removed', 'info');
}

function removeGuide() {
    const state = collectPlannerState();
    state.guideName = null;
    state.guideEmail = null;
    localStorage.setItem('tripDraft', JSON.stringify(state));

    document.getElementById('selectedGuideCard').style.display = 'none';
    document.getElementById('findGuideBtn').style.display = 'flex';
    updateTripSummary();
    showToast('Guide removed', 'info');
}

function updateGuideCard(state) {
    const guideName = state?.guideName;
    const card = document.getElementById('selectedGuideCard');
    const btn = document.getElementById('findGuideBtn');

    if (guideName) {
        card.style.display = 'block';
        btn.style.display = 'none';
        document.getElementById('guideCardName').textContent = guideName;
        document.getElementById('guideCardDetails').textContent = state.guideEmail || '';
    } else {
        card.style.display = 'none';
        btn.style.display = 'flex';
    }
}

/* Restaurants */
function addRestaurantEntry() {
    const container = document.getElementById('restaurantSelections');
    const entry = document.createElement('div');
    entry.className = 'restaurant-entry';

    const dests = getDestinations().filter(d => d.name);
    let destOptions = '<option value="">Select destination</option>';
    dests.forEach(d => { destOptions += '<option value="' + escapeHtml(d.name) + '">' + escapeHtml(d.name) + '</option>'; });

    entry.innerHTML =
        '<div class="form-grid cols-2">' +
            '<div class="input-group"><label>Restaurant Name</label><input type="text" class="glass-input rest-name" placeholder="Restaurant name"></div>' +
            '<div class="input-group"><label>Destination</label><select class="glass-select rest-dest">' + destOptions + '</select></div>' +
            '<div class="input-group"><label>Date</label><input type="date" class="glass-input rest-date"></div>' +
            '<div class="input-group"><label>Meal</label><select class="glass-select rest-meal"><option value="Breakfast">Breakfast</option><option value="Lunch">Lunch</option><option value="Dinner">Dinner</option><option value="Snack">Snack</option><option value="Special">Special Meal</option></select></div>' +
            '<div class="input-group"><label>Time</label><input type="time" class="glass-input rest-time"></div>' +
            '<div class="input-group"><label>Guests</label><input type="number" class="glass-input rest-guests" value="1" min="1"></div>' +
        '</div>' +
        '<div style="margin-top:10px;"><button type="button" class="btn-sm btn-danger-outline" onclick="this.closest(\'.restaurant-entry\').remove(); scheduleDraftSave(); updateTripSummary();"><i class="fas fa-times"></i> Remove</button></div>';

    container.appendChild(entry);
    entry.querySelectorAll('input, select').forEach(inp => {
        inp.addEventListener('change', () => { scheduleDraftSave(); updateTripSummary(); });
    });
}

function getRestaurants() {
    return Array.from(document.querySelectorAll('.restaurant-entry')).map(entry => ({
        name: entry.querySelector('.rest-name')?.value || '',
        destination: entry.querySelector('.rest-dest')?.value || '',
        date: entry.querySelector('.rest-date')?.value || '',
        meal: entry.querySelector('.rest-meal')?.value || '',
        time: entry.querySelector('.rest-time')?.value || '',
        guests: entry.querySelector('.rest-guests')?.value || '1'
    }));
}

/* ══════════════════════════════════════════════
   SECTION 10 — DAILY ITINERARY (Step 5)
   ══════════════════════════════════════════════ */

function generateItineraryDays() {
    const container = document.getElementById('itineraryContainer');
    const startDate = document.getElementById('trip-date-start')?.value;
    const endDate = document.getElementById('trip-date-end')?.value;

    if (!startDate || !endDate) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>Set your travel dates in Step 1 to generate the daily itinerary.</p></div>';
        return;
    }

    const totalDays = daysBetween(startDate, endDate);
    if (totalDays <= 0) return;

    const dests = getDestinations().filter(d => d.name);
    const savedItems = collectPlannerState().itineraryItems || {};

    let html = '';
    for (let day = 0; day < totalDays; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        const dayNum = day + 1;

        // Determine destination for this day
        let destForDay = '';
        dests.forEach(d => {
            if (d.arrival && d.departure) {
                if (dateStr >= d.arrival && dateStr <= d.departure) destForDay = d.name;
            } else if (d.arrival && dateStr >= d.arrival) {
                destForDay = d.name;
            }
        });
        if (!destForDay && dests.length > 0) destForDay = dests[Math.min(day, dests.length - 1)].name;

        const dayItems = savedItems['day-' + dayNum] || [];

        html += '<div class="itinerary-day" data-day="' + dayNum + '" data-date="' + dateStr + '">' +
            '<div class="itinerary-day-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">' +
                '<h4><i class="fas fa-calendar-day"></i> Day ' + dayNum + ' — ' + formatDate(dateStr) + (destForDay ? ' <span class="day-dest">(' + escapeHtml(destForDay) + ')</span>' : '') + '</h4>' +
                '<i class="fas fa-chevron-down day-toggle-icon"></i>' +
            '</div>' +
            '<div class="itinerary-day-body">' +
                '<div class="itinerary-items" data-day="' + dayNum + '">';

        if (dayItems.length > 0) {
            dayItems.forEach((item, idx) => {
                html += buildItineraryItemHTML(item, dayNum, idx);
            });
        }

        html += '</div>' +
                '<button type="button" class="add-itinerary-btn" onclick="addItineraryItem(' + dayNum + ')"><i class="fas fa-plus"></i> Add Activity</button>' +
            '</div></div>';
    }

    container.innerHTML = html;

    // If no saved items, auto-populate from selections
    if (Object.keys(savedItems).length === 0) autoPopulateItinerary();
}

function buildItineraryItemHTML(item, dayNum, idx) {
    const typeClass = 'type-' + (item.type || 'custom').toLowerCase().replace(/[^a-z]/g, '');
    return '<div class="itinerary-item" data-idx="' + idx + '">' +
        '<div class="drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>' +
        '<div class="itinerary-item-time">' + escapeHtml(item.startTime || '') + (item.endTime ? ' - ' + escapeHtml(item.endTime) : '') + '</div>' +
        '<div><div class="itinerary-item-title">' + escapeHtml(item.title || 'Untitled') + '</div>' +
            (item.location ? '<div class="text-muted" style="font-size:0.75rem;">' + escapeHtml(item.location) + '</div>' : '') +
        '</div>' +
        '<span class="itinerary-item-type ' + typeClass + '">' + escapeHtml(item.type || 'Custom') + '</span>' +
        '<button type="button" class="remove-stop-btn" style="width:30px;height:30px;" onclick="removeItineraryItem(' + dayNum + ',' + idx + ')"><i class="fas fa-times" style="font-size:0.8rem;"></i></button>' +
    '</div>';
}

function addItineraryItem(dayNum) {
    const state = collectPlannerState();
    if (!state.itineraryItems) state.itineraryItems = {};
    if (!state.itineraryItems['day-' + dayNum]) state.itineraryItems['day-' + dayNum] = [];

    state.itineraryItems['day-' + dayNum].push({
        startTime: '09:00',
        endTime: '10:00',
        type: 'Custom Activity',
        title: 'New Activity',
        location: '',
        notes: '',
        status: 'Planned'
    });

    localStorage.setItem('tripDraft', JSON.stringify(state));
    generateItineraryDays();
    updateTripSummary();
}

function removeItineraryItem(dayNum, idx) {
    const state = collectPlannerState();
    if (state.itineraryItems && state.itineraryItems['day-' + dayNum]) {
        state.itineraryItems['day-' + dayNum].splice(idx, 1);
    }
    localStorage.setItem('tripDraft', JSON.stringify(state));
    generateItineraryDays();
    updateTripSummary();
}

function autoPopulateItinerary() {
    // Auto-add destinations and transport to itinerary
    const state = collectPlannerState();
    const dests = getDestinations().filter(d => d.name);
    const transport = getTransportSegments().filter(s => s.type && s.type !== 'Not Required');

    if (!state.itineraryItems) state.itineraryItems = {};

    const startDate = document.getElementById('trip-date-start')?.value;
    if (!startDate) return;

    const totalDays = daysBetween(startDate, document.getElementById('trip-date-end')?.value);

    for (let day = 0; day < totalDays; day++) {
        const dayKey = 'day-' + (day + 1);
        if (!state.itineraryItems[dayKey]) state.itineraryItems[dayKey] = [];
        if (state.itineraryItems[dayKey].length > 0) continue;

        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        // Add destination visits
        dests.forEach(d => {
            if (d.arrival === dateStr) {
                state.itineraryItems[dayKey].push({ startTime: '10:00', endTime: '18:00', type: 'Destination Visit', title: 'Explore ' + d.name, location: d.name, status: 'Planned' });
            }
        });

        // Add transport
        transport.forEach(t => {
            if (t.date === dateStr) {
                state.itineraryItems[dayKey].push({ startTime: t.time || '08:00', endTime: '', type: t.type, title: t.from + ' to ' + t.to, location: '', status: 'Planned' });
            }
        });
    }

    localStorage.setItem('tripDraft', JSON.stringify(state));
    generateItineraryDays();
}

/* ══════════════════════════════════════════════
   SECTION 11 — REVIEW (Step 6)
   ══════════════════════════════════════════════ */

function renderReview() {
    const state = collectPlannerState();
    const dests = getDestinations().filter(d => d.name);
    const transport = getTransportSegments().filter(s => s.type);
    const restaurants = getRestaurants().filter(r => r.name);
    const budget = calculateTripBudget();
    const currency = document.getElementById('trip-currency')?.value || 'LKR';
    const totalTravelers = (parseInt(state.adults) || 1) + (parseInt(state.children) || 0) + (parseInt(state.infants) || 0);

    let warnings = [];
    if (!state.title) warnings.push('Trip title is missing.');
    if (dests.length === 0) warnings.push('No destinations selected.');
    if (!state.startDate || !state.endDate) warnings.push('Travel dates not set.');
    if (transport.length === 0 && dests.length > 1) warnings.push('No transport selected between destinations.');
    const noHotels = !state.hotels || state.hotels.every(h => !h.name);
    if (noHotels && dests.length > 0) warnings.push('No hotels selected for any destination.');

    let html = '<div class="review-section"><h4><i class="fas fa-info-circle"></i> Trip Information</h4>' +
        '<div class="review-grid">' +
            '<div class="review-item"><span class="review-item-label">Title</span><span class="review-item-value">' + escapeHtml(state.title || '—') + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Dates</span><span class="review-item-value">' + formatDate(state.startDate) + ' — ' + formatDate(state.endDate) + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Duration</span><span class="review-item-value">' + (state.startDate && state.endDate ? daysBetween(state.startDate, state.endDate) + ' days' : '—') + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Travelers</span><span class="review-item-value">' + totalTravelers + ' (' + (state.adults || 1) + ' adults' + (parseInt(state.children) > 0 ? ', ' + state.children + ' children' : '') + (parseInt(state.infants) > 0 ? ', ' + state.infants + ' infants' : '') + ')</span></div>' +
            '<div class="review-item"><span class="review-item-label">Pace</span><span class="review-item-value">' + escapeHtml(state.pace || '—') + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Trip Types</span><span class="review-item-value">' + (state.tripTypes?.join(', ') || '—') + '</span></div>' +
        '</div></div>';

    // Route
    if (dests.length > 0) {
        html += '<div class="review-section"><h4><i class="fas fa-route"></i> Route</h4><div class="review-route">';
        if (state.startLocation) html += '<div class="route-dot">' + escapeHtml(state.startLocation) + '</div><i class="fas fa-arrow-right route-arrow"></i>';
        dests.forEach((d, i) => {
            html += '<div class="route-dot">' + escapeHtml(d.name) + '</div>';
            if (i < dests.length - 1) html += '<i class="fas fa-arrow-right route-arrow"></i>';
        });
        html += '</div></div>';
    }

    // Transport
    if (transport.length > 0) {
        html += '<div class="review-section"><h4><i class="fas fa-car"></i> Transportation</h4>';
        transport.forEach(t => {
            html += '<div class="detail-row"><span class="detail-label">' + escapeHtml(t.from) + ' → ' + escapeHtml(t.to) + '</span><span class="detail-val">' + escapeHtml(t.type) + (t.date ? ' (' + formatDate(t.date) + ')' : '') + '</span></div>';
        });
        html += '</div>';
    }

    // Hotels
    const hotels = (state.hotels || []).filter(h => h.name);
    if (hotels.length > 0) {
        html += '<div class="review-section"><h4><i class="fas fa-hotel"></i> Hotels</h4>';
        hotels.forEach(h => {
            html += '<div class="detail-row"><span class="detail-label">' + escapeHtml(h.name) + '</span><span class="detail-val"><span class="status-badge badge-planned">Planned</span></span></div>';
        });
        html += '</div>';
    }

    // Guide
    if (state.guideName) {
        html += '<div class="review-section"><h4><i class="fas fa-user-tie"></i> Tour Guide</h4>' +
            '<div class="detail-row"><span class="detail-label">' + escapeHtml(state.guideName) + '</span><span class="detail-val"><span class="status-badge badge-planned">Planned</span></span></div></div>';
    }

    // Restaurants
    if (restaurants.length > 0) {
        html += '<div class="review-section"><h4><i class="fas fa-utensils"></i> Restaurants</h4>';
        restaurants.forEach(r => {
            html += '<div class="detail-row"><span class="detail-label">' + escapeHtml(r.name) + ' (' + escapeHtml(r.meal) + ')</span><span class="detail-val">' + escapeHtml(r.destination) + (r.date ? ' — ' + formatDate(r.date) : '') + '</span></div>';
        });
        html += '</div>';
    }

    // Budget
    html += '<div class="review-section"><h4><i class="fas fa-wallet"></i> Budget</h4>' +
        '<div class="review-grid">' +
            '<div class="review-item"><span class="review-item-label">Total Budget</span><span class="review-item-value">' + currency + ' ' + (budget.total ? budget.total.toLocaleString() : '—') + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Allocated</span><span class="review-item-value">' + currency + ' ' + budget.spent.toLocaleString() + '</span></div>' +
            '<div class="review-item"><span class="review-item-label">Remaining</span><span class="review-item-value" style="color:' + (budget.remaining >= 0 ? 'var(--success)' : 'var(--danger)') + ';">' + currency + ' ' + budget.remaining.toLocaleString() + '</span></div>' +
        '</div></div>';

    // Warnings
    if (warnings.length > 0) {
        html += '<div class="review-section">';
        warnings.forEach(w => {
            html += '<div class="review-warning"><i class="fas fa-exclamation-triangle"></i><span>' + escapeHtml(w) + '</span></div>';
        });
        html += '</div>';
    }

    document.getElementById('reviewContent').innerHTML = html;

    // Enable/disable save button based on checkbox
    const checkbox = document.getElementById('confirmCheckbox');
    const saveBtn = document.getElementById('btnSave');
    saveBtn.disabled = !checkbox.checked;
    checkbox.onchange = () => { saveBtn.disabled = !checkbox.checked; };
}

/* ══════════════════════════════════════════════
   SECTION 12 — LIVE TRIP SUMMARY
   ══════════════════════════════════════════════ */

function updateTripSummary() {
    const title = document.getElementById('trip-title')?.value || '';
    const startDate = document.getElementById('trip-date-start')?.value || '';
    const endDate = document.getElementById('trip-date-end')?.value || '';
    const adults = parseInt(document.getElementById('trip-adults')?.value) || 1;
    const children = parseInt(document.getElementById('trip-children')?.value) || 0;
    const infants = parseInt(document.getElementById('trip-infants')?.value) || 0;
    const currency = document.getElementById('trip-currency')?.value || 'LKR';
    const budget = calculateTripBudget();
    const dests = getDestinations().filter(d => d.name);
    const state = collectPlannerState();
    const transport = (state.transportSegments || []).filter(s => s.type && s.type !== 'Not Required');
    const hotels = (state.hotels || []).filter(h => h.name);

    document.getElementById('sum-title').textContent = title || 'Not set';
    document.getElementById('sum-dates').textContent = startDate ? formatDate(startDate) + ' — ' + formatDate(endDate) : 'Not set';
    document.getElementById('sum-duration').textContent = startDate && endDate ? daysBetween(startDate, endDate) + ' days' : '—';
    document.getElementById('sum-travelers').textContent = (adults + children + infants) + ' traveler' + (adults + children + infants !== 1 ? 's' : '');
    document.getElementById('sum-destinations').textContent = dests.length > 0 ? dests.map(d => d.name).join(' → ') : 'None';
    document.getElementById('sum-transport').textContent = transport.length > 0 ? transport.length + ' segment' + (transport.length !== 1 ? 's' : '') : 'None';
    document.getElementById('sum-hotels').textContent = hotels.length > 0 ? hotels.map(h => h.name).join(', ') : 'None';
    document.getElementById('sum-guide').textContent = state.guideName || 'None';
    document.getElementById('sum-budget').textContent = budget.total > 0 ? currency + ' ' + budget.total.toLocaleString() : 'Not set';
    document.getElementById('sum-remaining').textContent = budget.total > 0 ? currency + ' ' + budget.remaining.toLocaleString() : '—';
    document.getElementById('sum-remaining').style.color = budget.remaining >= 0 ? 'var(--success)' : 'var(--danger)';

    // Completion percentage
    let completion = 0;
    if (title) completion += 15;
    if (startDate && endDate) completion += 15;
    if (dests.length > 0) completion += 20;
    if (transport.length > 0) completion += 15;
    if (hotels.length > 0) completion += 15;
    if (state.guideName) completion += 10;
    if (budget.total > 0) completion += 10;
    completion = Math.min(completion, 100);

    document.getElementById('completionBar').style.width = completion + '%';
    document.getElementById('completionText').textContent = completion + '% Complete';

    // Update trip duration display
    const durationDisplay = document.getElementById('trip-duration-display');
    if (durationDisplay) {
        if (startDate && endDate) {
            const days = daysBetween(startDate, endDate);
            durationDisplay.textContent = days + ' day' + (days !== 1 ? 's' : '') + ' / ' + (days - 1) + ' night' + (days - 1 !== 1 ? 's' : '');
            durationDisplay.style.color = 'var(--neon-primary)';
        } else {
            durationDisplay.textContent = 'Select dates to calculate';
            durationDisplay.style.color = 'var(--text-muted)';
        }
    }
}

function toggleMobileSummary() {
    const card = document.querySelector('.summary-card');
    card.classList.toggle('mobile-show');
}

/* ══════════════════════════════════════════════
   SECTION 13 — AUTOSAVE & DRAFT
   ══════════════════════════════════════════════ */

function collectPlannerState() {
    const existing = JSON.parse(localStorage.getItem('tripDraft') || '{}');

    return {
        editingTripId: editingTripId,
        currentStep: currentStep,
        title: document.getElementById('trip-title')?.value || '',
        startLocation: document.getElementById('trip-start-location')?.value || '',
        startDate: document.getElementById('trip-date-start')?.value || '',
        endDate: document.getElementById('trip-date-end')?.value || '',
        adults: document.getElementById('trip-adults')?.value || '1',
        children: document.getElementById('trip-children')?.value || '0',
        infants: document.getElementById('trip-infants')?.value || '0',
        currency: document.getElementById('trip-currency')?.value || 'LKR',
        budgetTotal: document.getElementById('trip-budget-total')?.value || '',
        budgetAccommodation: document.getElementById('budget-accommodation')?.value || '',
        budgetTransport: document.getElementById('budget-transport')?.value || '',
        budgetFood: document.getElementById('budget-food')?.value || '',
        budgetActivities: document.getElementById('budget-activities')?.value || '',
        budgetEmergency: document.getElementById('budget-emergency')?.value || '',
        tripTypes: getSelectedChips('tripTypeChips'),
        interests: getSelectedChips('interestChips'),
        pace: getSelectedChips('paceChips')[0] || '',
        requirements: getSelectedChips('requirementChips'),
        specialNotes: document.getElementById('trip-special-notes')?.value || '',
        destinations: getDestinations(),
        transportSegments: getTransportSegments(),
        hotels: existing.hotels || [],
        guideName: existing.guideName || null,
        guideEmail: existing.guideEmail || null,
        guideType: document.getElementById('guide-type')?.value || 'none',
        restaurants: getRestaurants(),
        itineraryItems: existing.itineraryItems || {}
    };
}

function savePlannerDraft() {
    const state = collectPlannerState();
    localStorage.setItem('tripDraft', JSON.stringify(state));
    updateAutosaveIndicator('saved');
}

function scheduleDraftSave() {
    clearTimeout(autosaveTimer);
    updateAutosaveIndicator('saving');
    autosaveTimer = setTimeout(() => {
        savePlannerDraft();
    }, 800);
}

function updateAutosaveIndicator(status) {
    const indicator = document.getElementById('autosaveIndicator');
    const text = document.getElementById('autosaveText');
    indicator.classList.remove('saving', 'saved');

    if (status === 'saving') {
        indicator.classList.add('saving');
        text.textContent = 'Saving draft...';
    } else if (status === 'saved') {
        indicator.classList.add('saved');
        const now = new Date();
        text.textContent = 'Draft saved at ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function manualSaveDraft() {
    savePlannerDraft();
    showToast('Draft saved successfully', 'success');
}

function confirmDiscardDraft() {
    document.getElementById('discardDraftModal').style.display = 'flex';
}

function restorePlannerDraft() {
    const draft = localStorage.getItem('tripDraft');
    if (!draft) return false;

    const data = JSON.parse(draft);

    if (data.editingTripId) {
        editingTripId = data.editingTripId;
    }
    if (data.currentStep) currentStep = data.currentStep;

    // Step 1 fields
    if (document.getElementById('trip-title')) document.getElementById('trip-title').value = data.title || '';
    if (document.getElementById('trip-start-location')) document.getElementById('trip-start-location').value = data.startLocation || '';
    if (document.getElementById('trip-date-start')) document.getElementById('trip-date-start').value = data.startDate || '';
    if (document.getElementById('trip-date-end')) document.getElementById('trip-date-end').value = data.endDate || '';
    if (document.getElementById('trip-adults')) document.getElementById('trip-adults').value = data.adults || '1';
    if (document.getElementById('trip-children')) document.getElementById('trip-children').value = data.children || '0';
    if (document.getElementById('trip-infants')) document.getElementById('trip-infants').value = data.infants || '0';
    if (document.getElementById('trip-currency')) document.getElementById('trip-currency').value = data.currency || 'LKR';
    if (document.getElementById('trip-budget-total')) document.getElementById('trip-budget-total').value = data.budgetTotal || '';
    if (document.getElementById('budget-accommodation')) document.getElementById('budget-accommodation').value = data.budgetAccommodation || '';
    if (document.getElementById('budget-transport')) document.getElementById('budget-transport').value = data.budgetTransport || '';
    if (document.getElementById('budget-food')) document.getElementById('budget-food').value = data.budgetFood || '';
    if (document.getElementById('budget-activities')) document.getElementById('budget-activities').value = data.budgetActivities || '';
    if (document.getElementById('budget-emergency')) document.getElementById('budget-emergency').value = data.budgetEmergency || '';
    if (document.getElementById('trip-special-notes')) document.getElementById('trip-special-notes').value = data.specialNotes || '';
    if (document.getElementById('guide-type')) document.getElementById('guide-type').value = data.guideType || 'none';

    // Chips
    setSelectedChips('tripTypeChips', data.tripTypes || []);
    setSelectedChips('interestChips', data.interests || []);
    setSelectedChips('paceChips', data.pace ? [data.pace] : []);
    setSelectedChips('requirementChips', data.requirements || []);

    // Destinations
    const destList = document.getElementById('destinations-list');
    destList.innerHTML = '';
    if (data.destinations && data.destinations.length > 0) {
        data.destinations.forEach(d => {
            // Support both old format {val,img} and new format {name,img,arrival,...}
            const name = d.name || d.val || '';
            const img = d.img || '';
            addDestinationRow(name, img, d.arrival || '', d.departure || '', d.notes || '');
        });
    } else {
        addDestinationRow();
    }

    updateBudgetBar();
    updateTripSummary();
    renderWizardState();

    return true;
}

function clearPlannerForm() {
    editingTripId = null;
    currentStep = 1;
    document.getElementById('trip-title').value = '';
    document.getElementById('trip-start-location').value = '';
    document.getElementById('trip-date-start').value = '';
    document.getElementById('trip-date-end').value = '';
    document.getElementById('trip-adults').value = '1';
    document.getElementById('trip-children').value = '0';
    document.getElementById('trip-infants').value = '0';
    document.getElementById('trip-budget-total').value = '';
    document.getElementById('trip-currency').selectedIndex = 0;
    ['budget-accommodation','budget-transport','budget-food','budget-activities','budget-emergency'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('trip-special-notes').value = '';
    document.getElementById('guide-type').value = 'none';
    document.getElementById('confirmCheckbox').checked = false;

    document.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));

    const destList = document.getElementById('destinations-list');
    destList.innerHTML = '';
    addDestinationRow();

    document.getElementById('restaurantSelections').innerHTML = '';

    localStorage.removeItem('tripDraft');
    renderWizardState();
    updateBudgetBar();
    updateTripSummary();
}

/* ══════════════════════════════════════════════
   SECTION 14 — SAVE TRIP TO SUPABASE
   ══════════════════════════════════════════════ */

async function saveTrip() {
    try {
        const { data: { user }, error: authError } = await _supabase.auth.getUser();
        if (authError || !user) {
            showToast('You must be logged in.', 'error');
            window.location.href = 'auth.html';
            return;
        }

        const { data: userData } = await _supabase.from('users').select('first_name, last_name').eq('id', user.id).single();
        const travelerName = userData ? (userData.first_name + ' ' + userData.last_name).trim() : (user.user_metadata?.first_name || 'A Traveler');

        const state = collectPlannerState();
        const dests = getDestinations().filter(d => d.name);
        const transport = getTransportSegments().filter(s => s.type && s.type !== 'Not Required');

        if (!state.title || dests.length === 0) {
            showToast('Title and at least one destination are required.', 'error');
            return;
        }

        const finalDestString = dests.map(d => d.name).join(', ');
        const allImagesString = dests.map(d => d.img || 'default-placeholder.jpg').join(',');

        const dateStr = state.startDate && state.endDate ? state.startDate + ' to ' + state.endDate : 'TBD';
        const safeAmount = state.budgetTotal ? parseFloat(state.budgetTotal) : null;
        const safeDays = state.startDate && state.endDate ? daysBetween(state.startDate, state.endDate) : null;

        const hotelNames = (state.hotels || []).filter(h => h.name).map(h => h.name);
        const hotelNameStr = hotelNames.length > 0 ? hotelNames.join(', ') : null;
        const guideNameStr = state.guideName || null;
        const guideEmailStr = state.guideEmail || null;

        // Determine status
        let status = 'Draft';
        if (dests.length > 0 && state.startDate && state.endDate) status = 'Planned';

        const tripPayload = {
            user_id: user.id,
            title: state.title,
            destination: finalDestString,
            image_url: allImagesString,
            travel_date: dateStr,
            budget_amount: safeAmount,
            currency: state.currency,
            duration_days: safeDays,
            guide_name: guideNameStr,
            hotel_name: hotelNameStr,
            status: status
        };

        let result;
        if (editingTripId) {
            result = await _supabase.from('trips').update(tripPayload).eq('id', editingTripId);
        } else {
            result = await _supabase.from('trips').insert([tripPayload]);
        }

        if (result.error) {
            showToast('Database Error: ' + result.error.message, 'error');
            return;
        }

        // Send guide email only on final save (not draft)
        if (guideNameStr && guideEmailStr) {
            try {
                await emailjs.send("service_kix8fen", "template_wugveyi", {
                    to_name: guideNameStr,
                    to_email: guideEmailStr,
                    traveler_name: travelerName,
                    destination_name: finalDestString,
                    travel_date: dateStr,
                    trip_title: state.title
                });
            } catch (emailErr) { console.error("Email failed:", emailErr); }
        }

        document.getElementById('successModal').style.display = 'flex';
        clearPlannerForm();
        fetchUserTrips();
        showSection('trips-section');

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

/* ══════════════════════════════════════════════
   SECTION 15 — TRIP DASHBOARD
   ══════════════════════════════════════════════ */

async function fetchUserTrips() {
    const activeContainer = document.getElementById('saved-trips-container');
    const historyContainer = document.getElementById('history-trips-container');
    activeContainer.innerHTML = '';
    historyContainer.innerHTML = '';

    const { data: trips, error } = await _supabase
        .from('trips').select('*')
        .eq('user_id', currentUserProfile.id)
        .order('created_at', { ascending: false });

    if (error) return;
    updateWelcomeSection(currentUserProfile, trips || []);

    trips.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'trip-card';
        card.onclick = () => showTripDetails(trip);

        const isHistory = trip.status === 'Visited' || trip.status === 'Completed';
        const isCancelled = trip.status === 'Cancelled';
        let tagClass = 'trip-tag';
        if (isHistory) tagClass += ' history';
        else if (trip.status === 'Draft') tagClass += ' draft';
        else if (trip.status === 'Confirmed') tagClass += ' confirmed';

        const images = trip.image_url ? trip.image_url.split(',') : [];
        const imagesHTML = images.slice(0, 3).map(img =>
            '<img src="' + escapeHtml(img) + '" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid var(--glass-border);">'
        ).join('');

        // Calculate countdown
        let countdownHtml = '';
        const startDate = getTripStartDate(trip.travel_date);
        if (startDate && !isHistory && !isCancelled) {
            const today = new Date(); today.setHours(0,0,0,0);
            const daysLeft = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
            if (daysLeft > 0) countdownHtml = '<span><i class="fas fa-clock"></i> ' + daysLeft + 'd left</span>';
            else if (daysLeft === 0) countdownHtml = '<span><i class="fas fa-plane-departure"></i> Today!</span>';
        }

        card.innerHTML =
            '<div style="display:flex;gap:15px;align-items:center;flex:1;min-width:0;">' +
                (imagesHTML ? '<div style="display:flex;gap:5px;flex-wrap:wrap;width:90px;">' + imagesHTML + '</div>' : '') +
                '<div class="trip-card-info">' +
                    '<h3>' + escapeHtml(trip.title) + '</h3>' +
                    '<p><span><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(trip.destination) + '</span></p>' +
                    '<div class="trip-card-meta">' +
                        (trip.travel_date && trip.travel_date !== 'TBD' ? '<span><i class="fas fa-calendar"></i> ' + escapeHtml(trip.travel_date) + '</span>' : '') +
                        (trip.duration_days ? '<span><i class="fas fa-clock"></i> ' + trip.duration_days + ' days</span>' : '') +
                        (trip.budget_amount ? '<span><i class="fas fa-wallet"></i> ' + (trip.currency || 'LKR') + ' ' + parseFloat(trip.budget_amount).toLocaleString() + '</span>' : '') +
                        countdownHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="trip-actions">' +
                '<i class="fas fa-trash delete-trip-btn" onclick="deleteTripFromDB(event, \'' + trip.id + '\')"></i>' +
                '<div class="' + tagClass + '">' + escapeHtml(trip.status) + '</div>' +
            '</div>';

        if (isHistory) historyContainer.appendChild(card);
        else if (!isCancelled) activeContainer.appendChild(card);
    });

    updatePlaceholders();
}

function showTripDetails(trip) {
    document.getElementById('modalTitle').textContent = trip.title;

    let html = '<div class="detail-row"><span class="detail-label"><i class="fas fa-map-marker-alt"></i> Destinations</span><span class="detail-val">' + escapeHtml(trip.destination) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-calendar-day"></i> Travel Date</span><span class="detail-val">' + escapeHtml(trip.travel_date || 'Not set') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-wallet"></i> Budget</span><span class="detail-val">' + (trip.budget_amount ? (trip.currency || 'LKR') + ' ' + parseFloat(trip.budget_amount).toLocaleString() : 'Not specified') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-clock"></i> Duration</span><span class="detail-val">' + (trip.duration_days ? trip.duration_days + ' Days' : 'Not specified') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-user-tie"></i> Tour Guide</span><span class="detail-val" style="color:var(--neon-primary);">' + escapeHtml(trip.guide_name || 'No guide booked') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label"><i class="fas fa-hotel"></i> Hotels</span><span class="detail-val" style="color:var(--neon-primary);">' + escapeHtml(trip.hotel_name || 'No hotel booked') + '</span></div>';

    document.getElementById('modalContent').innerHTML = html;

    document.getElementById('modalEditBtn').onclick = () => {
        closeTripDetails();
        prepareEditForm(trip);
    };

    document.getElementById('detailsModal').style.display = 'flex';
}

function closeTripDetails() {
    document.getElementById('detailsModal').style.display = 'none';
}

function prepareEditForm(trip) {
    editingTripId = trip.id;
    showSection('planner-section');

    document.getElementById('trip-title').value = trip.title || '';

    // Parse destinations
    const destList = document.getElementById('destinations-list');
    destList.innerHTML = '';
    const individualDests = trip.destination ? trip.destination.split(', ') : [];
    const individualImages = trip.image_url ? trip.image_url.split(',') : [];

    if (individualDests.length > 0) {
        individualDests.forEach((name, idx) => {
            addDestinationRow(name, individualImages[idx] || '');
        });
    } else {
        addDestinationRow();
    }

    // Parse dates
    if (trip.travel_date && trip.travel_date !== 'TBD') {
        if (trip.travel_date.includes(' to ')) {
            const parts = trip.travel_date.split(' to ');
            document.getElementById('trip-date-start').value = parts[0] || '';
            document.getElementById('trip-date-end').value = parts[1] || '';
        } else {
            document.getElementById('trip-date-start').value = trip.travel_date;
            document.getElementById('trip-date-end').value = trip.travel_date;
        }
    }

    document.getElementById('trip-currency').value = trip.currency || 'LKR';
    document.getElementById('trip-budget-total').value = trip.budget_amount || '';

    // Restore hotel/guide to draft
    const state = collectPlannerState();
    if (trip.hotel_name) {
        state.hotels = [{ name: trip.hotel_name }];
    }
    if (trip.guide_name) {
        state.guideName = trip.guide_name;
    }
    localStorage.setItem('tripDraft', JSON.stringify(state));

    currentStep = 1;
    renderWizardState();
    updateBudgetBar();
    updateTripSummary();
    showToast('Trip loaded for editing', 'info');
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

async function deleteTripFromDB(event, tripId) {
    event.stopPropagation();
    tripIdToDelete = tripId;
    document.getElementById('confirmModal').style.display = 'flex';
}

function updatePlaceholders() {
    const activeContainer = document.getElementById('saved-trips-container');
    const historyContainer = document.getElementById('history-trips-container');
    document.getElementById('ongoing-placeholder').style.display = activeContainer.children.length === 0 ? 'block' : 'none';
    document.getElementById('past-placeholder').style.display = historyContainer.children.length === 0 ? 'block' : 'none';
}

function getTripStartDate(travelDate) {
    if (!travelDate || travelDate === 'TBD') return null;
    const firstDate = travelDate.split(' to ')[0];
    const d = new Date(firstDate);
    return isNaN(d.getTime()) ? null : d;
}

function updateWelcomeSection(userProfile, trips) {
    const firstName = userProfile?.firstName || 'Traveler';
    const today = new Date(); today.setHours(0,0,0,0);

    const upcomingTrips = trips
        .filter(t => t.status !== 'Visited' && t.status !== 'Completed' && t.status !== 'Cancelled')
        .map(t => ({ ...t, startDate: getTripStartDate(t.travel_date) }))
        .filter(t => t.startDate && t.startDate >= today)
        .sort((a, b) => a.startDate - b.startDate);

    document.getElementById('dashboardGreeting').textContent = getTimeGreeting() + ', ' + firstName + '.';
    document.getElementById('dashboardUserName').textContent = 'Welcome back to GoTravel';
    document.getElementById('dashboardTripCount').textContent = upcomingTrips.length;

    if (upcomingTrips.length === 0) {
        document.getElementById('dashboardNextTrip').textContent = 'You do not have any upcoming trips yet. Start planning your next journey.';
        return;
    }

    const next = upcomingTrips[0];
    const daysUntil = Math.ceil((next.startDate - today) / (1000 * 60 * 60 * 24));
    const countdownText = daysUntil === 0 ? 'today' : 'in ' + daysUntil + ' day' + (daysUntil === 1 ? '' : 's');
    document.getElementById('dashboardNextTrip').textContent = 'Your next trip to ' + next.destination + ' is ' + countdownText + '.';
}

/* ══════════════════════════════════════════════
   SECTION 16 — PROFILE & AUTH
   ══════════════════════════════════════════════ */

function updateProfileAvatar(firstName, lastName, email) {
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(firstName) + '+' + encodeURIComponent(lastName) + '&background=7000ff&color=fff';
    document.getElementById('popupInitial').textContent = (firstName ? firstName[0] : '') + (lastName ? lastName[0] : '');
    document.getElementById('popupName').textContent = firstName + ' ' + lastName;
    document.getElementById('popupEmail').textContent = email;
    avatarImg.onclick = (e) => { e.stopPropagation(); document.getElementById('profilePopup').classList.toggle('show'); };
}

async function logoutUser() {
    const { error } = await _supabase.auth.signOut();
    if (!error) window.location.href = '../index.html';
}

/* ══════════════════════════════════════════════
   SECTION 17 — INITIALIZATION
   ══════════════════════════════════════════════ */

window.onload = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        currentUserProfile = {
            id: user.id,
            firstName: user.user_metadata.first_name || 'Traveler',
            lastName: user.user_metadata.last_name || '',
            email: user.email
        };
        updateProfileAvatar(currentUserProfile.firstName, currentUserProfile.lastName, currentUserProfile.email);
        updateWelcomeSection(currentUserProfile, []);
        fetchUserTrips();
    } else {
        window.location.href = 'auth.html';
    }

    // Initialize chips
    initChips();

    // Setup destination drag area
    setupDestinationDropArea();

    // Add destination button
    document.getElementById('add-destination-btn').addEventListener('click', () => addDestinationRow());

    // Restore draft
    const hasDraft = restorePlannerDraft();

    // Handle returning from Places page
    const pickedDest = localStorage.getItem('selectedDestination');
    const pickedImage = localStorage.getItem('selectedDestImage');
    const editingIndex = localStorage.getItem('editingRowIndex');

    if (pickedDest && editingIndex !== null) {
        const cards = document.querySelectorAll('.destination-card');
        const idx = parseInt(editingIndex);
        if (cards[idx]) {
            cards[idx].dataset.name = pickedDest;
            cards[idx].dataset.img = pickedImage || '';
            const nameEl = cards[idx].querySelector('.dest-card-name');
            if (nameEl) nameEl.textContent = pickedDest;
            const imgEl = cards[idx].querySelector('.dest-card-img');
            if (imgEl && pickedImage) {
                imgEl.src = pickedImage;
                imgEl.alt = pickedDest;
            }
        }
        showSection('planner-section');
        localStorage.removeItem('selectedDestination');
        localStorage.removeItem('selectedDestImage');
        localStorage.removeItem('editingRowIndex');
        localStorage.removeItem('isSelectingDestination');
        updateRouteTimeline();
        savePlannerDraft();
    }

    // Handle returning from Hotels page
    const pickedHotel = localStorage.getItem('selectedHotelName');
    if (pickedHotel) {
        const state = collectPlannerState();
        if (!state.hotels) state.hotels = [];
        // Add to first destination without a hotel
        const dests = getDestinations().filter(d => d.name);
        let placed = false;
        for (let i = 0; i < dests.length; i++) {
            if (!state.hotels[i] || !state.hotels[i].name) {
                state.hotels[i] = { name: pickedHotel };
                placed = true;
                break;
            }
        }
        if (!placed && dests.length > 0) {
            state.hotels[0] = { name: pickedHotel };
        }
        localStorage.setItem('tripDraft', JSON.stringify(state));
        showSection('planner-section');
        currentStep = 4;
        renderWizardState();
        renderHotelSelections();
        localStorage.removeItem('selectedHotelName');
        localStorage.removeItem('isSelectingHotel');
        updateTripSummary();
        showToast('Hotel selected: ' + pickedHotel, 'success');
    }

    // Handle returning from Guides page
    const pickedGuide = localStorage.getItem('selectedGuideName');
    if (pickedGuide) {
        const state = collectPlannerState();
        state.guideName = pickedGuide;
        state.guideEmail = localStorage.getItem('selectedGuideEmail') || '';
        localStorage.setItem('tripDraft', JSON.stringify(state));
        showSection('planner-section');
        currentStep = 4;
        renderWizardState();
        updateGuideCard(state);
        localStorage.removeItem('selectedGuideName');
        localStorage.removeItem('selectedGuideEmail');
        localStorage.removeItem('isSelectingGuide');
        updateTripSummary();
        showToast('Guide selected: ' + pickedGuide, 'success');
    }

    // If returning from any service page with draft, show planner
    if (hasDraft && (localStorage.getItem('isSelectingDestination') || localStorage.getItem('isSelectingHotel') || localStorage.getItem('isSelectingGuide'))) {
        showSection('planner-section');
    }

    // Add one default destination row if none exist
    if (document.querySelectorAll('.destination-card').length === 0) {
        addDestinationRow();
    }

    // Bind date change listeners
    ['trip-date-start', 'trip-date-end'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            updateTripSummary();
            scheduleDraftSave();
        });
    });

    // Bind all input fields for autosave
    document.querySelectorAll('#step-1 input, #step-1 select, #step-1 textarea').forEach(el => {
        el.addEventListener('input', () => { scheduleDraftSave(); updateTripSummary(); updateBudgetBar(); });
        el.addEventListener('change', () => { scheduleDraftSave(); updateTripSummary(); updateBudgetBar(); });
    });

    // Confirm/discard modals
    document.getElementById('confirmOk').onclick = async function() {
        if (tripIdToDelete) {
            const { error } = await _supabase.from('trips').delete().eq('id', tripIdToDelete);
            if (!error) { fetchUserTrips(); showToast('Trip deleted', 'info'); }
            tripIdToDelete = null;
            document.getElementById('confirmModal').style.display = 'none';
        }
    };
    document.getElementById('confirmCancel').onclick = function() {
        tripIdToDelete = null;
        document.getElementById('confirmModal').style.display = 'none';
    };

    document.getElementById('discardDraftOk').onclick = function() {
        clearPlannerForm();
        document.getElementById('discardDraftModal').style.display = 'none';
        showToast('Draft discarded', 'info');
    };
    document.getElementById('discardDraftCancel').onclick = function() {
        document.getElementById('discardDraftModal').style.display = 'none';
    };

    // Close profile popup on click outside
    document.addEventListener('click', () => {
        document.getElementById('profilePopup')?.classList.remove('show');
    });

    // Initial render
    renderWizardState();
    updateBudgetBar();
    updateTripSummary();
    updateRouteTimeline();
};
