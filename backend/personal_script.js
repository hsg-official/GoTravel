const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aXQLF_zuk6pGmo4v0E1LPg_-TzUnQ0_';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global state
let currentDateMode = 'single';
let tripIdToDelete = null;
let currentUserProfile = null;
let editingTripId = null;


// --- 1. HELPER FUNCTION TO ADD A DESTINATION ROW ---
// This centralizes row creation so we can use it for both the "+" button and page reloads
function addDestinationRow(value = '', imageUrl = '') {
    const list = document.getElementById('destinations-list');
    const newRow = document.createElement('div');
    newRow.className = 'destination-row';

    newRow.innerHTML = `
        <button type="button" class="drag-handle" draggable="true" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
        </button>

        <input type="text" class="glass-input trip-destination" 
               placeholder="Select destination..." 
               value="${value}" 
               data-img="${imageUrl}" readonly>

        <button type="button" class="glass-btn search-dest-btn" onclick="goToPlaces(this)">
            <i class="fas fa-location-dot"></i>
        </button>

        <button type="button" class="glass-btn remove-stop-btn" onclick="removeDestinationRow(this)" title="Remove this stop">
            <i class="fas fa-trash"></i>
        </button>
    `;

    list.appendChild(newRow);
    initializeDestinationRowDrag(newRow);
}

// Function to discard a target stop and recalculate indexes
function removeDestinationRow(btnElement) {
    // Select the parent .destination-row container block
    const rowToDelete = btnElement.parentElement;
    rowToDelete.remove();
    
    // Safety fallback check: verify if any inputs remain
    const remainingRows = document.querySelectorAll('.destination-row');
    if (remainingRows.length === 0) {
        addDestinationRow(); // Resets to one clean blank row instantly
    }
    
    // Re-index layout orders and duration properties
    updateDestinationStopNumbers();
    updateDaysFromDates();
}

let draggedDestinationRow = null;

function initializeDestinationRowDrag(row) {
    const handle = row.querySelector('.drag-handle');

    handle.addEventListener('dragstart', function () {
        draggedDestinationRow = row;
        row.classList.add('dragging');
    });

    handle.addEventListener('dragend', function () {
        row.classList.remove('dragging');
        draggedDestinationRow = null;
        updateDestinationStopNumbers();
    });
}

function setupDestinationDropArea() {
    const list = document.getElementById('destinations-list');

    list.addEventListener('dragover', function (event) {
        event.preventDefault();

        const rowAfterCursor = getRowAfterCursor(list, event.clientY);

        if (!draggedDestinationRow) return;

        if (rowAfterCursor == null) {
            list.appendChild(draggedDestinationRow);
        } else {
            list.insertBefore(draggedDestinationRow, rowAfterCursor);
        }
    });
}

function getRowAfterCursor(list, mouseY) {
    const rows = [...list.querySelectorAll('.destination-row:not(.dragging)')];

    return rows.reduce((closest, row) => {
        const box = row.getBoundingClientRect();
        const offset = mouseY - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return {
                offset: offset,
                element: row
            };
        }

        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateDestinationStopNumbers() {
    const rows = document.querySelectorAll('.destination-row');

    rows.forEach((row, index) => {
        row.dataset.stopNumber = index + 1;
    });
}

function goToHotels() {

    // 1. Collect current form data
    const rows = Array.from(document.querySelectorAll('.destination-row'));
    const destinationsData = rows.map(row => {
        const input = row.querySelector('.trip-destination');
        return { val: input.value, img: input.dataset.img || '' };
    });

    const hotelBtn = document.getElementById('hotel-booking-btn');
    const guideBtn = document.getElementById('guide-booking-btn');
    const draftData = {
        editingTripId: editingTripId,
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value,
        existingHotel: hotelBtn.dataset.hotel || null,
        existingGuide: guideBtn.dataset.guide || null,
        existingGuideEmail: guideBtn.dataset.email || null
    };

    // 2. Save to localStorage
    localStorage.setItem('tripDraft', JSON.stringify(draftData));
    localStorage.setItem('isSelectingHotel', 'true'); // Flag to return to planner
    
    // 3. Redirect
    window.location.href = 'hotels.html';
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    menu.classList.toggle('show');
    const servicesMenu = document.getElementById('services-menu');
    if (menuId === 'fleet-menu') {
        servicesMenu.style.maxHeight = menu.classList.contains('show') ? "1200px" : "1000px";
    }
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

function toggleTransport() {
    const opts = document.getElementById('transportOptions');
    opts.classList.toggle('show');
}

function setDateMode(mode) {
    currentDateMode = mode;
    const singleTab = document.getElementById('tab-single');
    const rangeTab = document.getElementById('tab-range');
    const singleInput = document.getElementById('input-single');
    const rangeInput = document.getElementById('input-range');

    if (mode === 'single') {
        singleTab.classList.add('active');
        rangeTab.classList.remove('active');
        singleInput.style.display = 'block';
        rangeInput.style.display = 'none';
    } else {
        rangeTab.classList.add('active');
        singleTab.classList.remove('active');
        singleInput.style.display = 'none';
        rangeInput.style.display = 'flex';
    }

    updateDaysFromDates();
}

function isDateInvalid(dateString) {
    if (!dateString) return false; 
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    
    // Reset "today" to midnight so we can still book trips for today
    today.setHours(0, 0, 0, 0);
    
    return selectedDate < today;
}

function showSection(sectionId) {
    document.getElementById('trips-section').style.display = 'none';
    document.getElementById('planner-section').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';
    
    document.getElementById('nav-trips').classList.remove('active');
    document.getElementById('nav-planner').classList.remove('active');
    
    if(sectionId === 'trips-section') {
        document.getElementById('nav-trips').classList.add('active');
        document.getElementById('page-title').innerText = 'My Trips';
    } else {
        document.getElementById('nav-planner').classList.add('active');
        document.getElementById('page-title').innerText = 'Trip Planner';
    }
}

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) { tabcontent[i].classList.remove("active"); }
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function showTripDetails(id, title, dest, date, currency, amount, days, guideName, hotelName, imageUrls) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('det-dest').innerText = dest;
    document.getElementById('det-date').innerText = date || "Not set";
    document.getElementById('det-budget').innerText = amount ? `${currency} ${amount}` : "Not specified";
    document.getElementById('det-days').innerText = days ? days + " Days" : "Not specified";
    document.getElementById('det-guide').innerText = guideName || "No Guide Booked";
    document.getElementById('det-hotel').innerText = hotelName || "No Hotel Booked";
    
    // Bind the edit behavior 
    document.getElementById('modalEditBtn').onclick = function() {
        closeTripDetails();
        prepareEditForm(id, title, dest, date, currency, amount, days, guideName, hotelName, imageUrls);
    };

    document.getElementById('detailsModal').style.display = 'flex';
}

function goToPlaces(btnElement) { 
    const rows = Array.from(document.querySelectorAll('.destination-row'));
    const index = rows.indexOf(btnElement.parentElement);
    
    localStorage.setItem('editingRowIndex', index);
    
    // SAVE ALL DESTINATIONS AS A LIST
    const destinationsData = rows.map(row => {
        const input = row.querySelector('.trip-destination');
        return {
            val: input.value,
            img: input.dataset.img || ''
        };
    });

    // --- GET THE CURRENT BOOKED TARGET DATA FROM BUTTON DATASETS ---
    const hotelBtn = document.getElementById('hotel-booking-btn');
    const guideBtn = document.getElementById('guide-booking-btn');

    const draftData = {
        editingTripId: editingTripId, 
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value,
        
        existingHotel: hotelBtn ? (hotelBtn.dataset.hotel || null) : null,
        existingGuide: guideBtn ? (guideBtn.dataset.guide || null) : null,
        existingGuideEmail: guideBtn ? (guideBtn.dataset.email || null) : null
    };
    
    localStorage.setItem('tripDraft', JSON.stringify(draftData));
    localStorage.setItem('isSelectingDestination', 'true');
    window.location.href = 'places.html';
}
function goToGuides() {
    // Similar to goToPlaces, save draft before leaving
    const rows = Array.from(document.querySelectorAll('.destination-row'));
    const destinationsData = rows.map(row => {
        const input = row.querySelector('.trip-destination');
        return { val: input.value, img: input.dataset.img || '' };
    });

    const hotelBtn = document.getElementById('hotel-booking-btn');
    const guideBtn = document.getElementById('guide-booking-btn');

    const draftData = {
        editingTripId: editingTripId,
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value,
        existingHotel: hotelBtn.dataset.hotel || null,
        existingGuide: guideBtn.dataset.guide || null,
        existingGuideEmail: guideBtn.dataset.email || null
    };
    localStorage.setItem('tripDraft', JSON.stringify(draftData));
    localStorage.setItem('isSelectingGuide', 'true');
    window.location.href = 'guides.html';
}

function closeTripDetails() {
    document.getElementById('detailsModal').style.display = 'none';
}

async function deleteTripFromDB(event, tripId) {
    event.stopPropagation();
    tripIdToDelete = tripId;
    document.getElementById('confirmModal').style.display = 'flex';
}

document.getElementById('confirmOk').onclick = async function() {
    if (tripIdToDelete) {
        const { error } = await _supabase.from('trips').delete().eq('id', tripIdToDelete);
        if (!error) fetchUserTrips();
        tripIdToDelete = null;
        document.getElementById('confirmModal').style.display = 'none';
    }
};

document.getElementById('confirmCancel').onclick = function() {
    tripIdToDelete = null;
    document.getElementById('confirmModal').style.display = 'none';
};

function updatePlaceholders() {
    const activeContainer = document.getElementById('saved-trips-container');
    const historyContainer = document.getElementById('history-trips-container');
    document.getElementById('ongoing-placeholder').style.display = activeContainer.children.length === 0 ? 'block' : 'none';
    document.getElementById('past-placeholder').style.display = historyContainer.children.length === 0 ? 'block' : 'none';
}

function updateDaysFromDates() {
    const daysInput = document.getElementById('trip-days');
    
    if (currentDateMode === 'single') {
        const singleDate = document.getElementById('trip-date').value;
        // If a date is picked, set days to 1, otherwise clear it
        daysInput.value = singleDate ? 1 : '';
    } else {
        const start = document.getElementById('trip-date-start').value;
        const end = document.getElementById('trip-date-end').value;

        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            
            // Calculate difference in milliseconds
            const diffInMs = endDate - startDate;
            // Convert milliseconds to days
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

            // We add 1 because if you stay from the 1st to the 2nd, it's a 2-day trip
            // Math.max ensures we don't show negative numbers if end is before start
            daysInput.value = diffInDays >= 0 ? Math.floor(diffInDays) + 1 : '';
        }
    }
}

async function saveTrip() {
    try {
        const { data: { user }, error: authError } = await _supabase.auth.getUser();
        if (authError || !user) {
            alert("Session error: You must be logged in.");
            window.location.href = 'auth.html';
            return;
        }

        const { data: userData } = await _supabase
            .from('users').select('first_name, last_name').eq('id', user.id).single();

        const travelerName = userData ? `${userData.first_name} ${userData.last_name}`.trim() : (user.user_metadata.first_name || "A Traveler");
            
        const title = document.getElementById('trip-title').value;
        const currency = document.getElementById('trip-currency').value;
        const days = document.getElementById('trip-days').value;
        const amount = document.getElementById('trip-budget-amount').value;

        const destInputs = document.querySelectorAll('.trip-destination');
        const destinationsArray = [];
        const imagesArray = []; 
        
        destInputs.forEach((input) => {
            if (input.value.trim() !== "") {
                destinationsArray.push(input.value.trim());
                imagesArray.push(input.dataset.img || 'default-placeholder.jpg');
            }
        });

        const allImagesString = imagesArray.join(',');

        if(!title || destinationsArray.length === 0) {
            alert("Please provide a Title and at least one Destination!");
            return;
        }

        const finalDestString = destinationsArray.join(', ');

        const errorSpan = document.getElementById('date-error');
        const startInput = document.getElementById('trip-date-start');
        const endInput = document.getElementById('trip-date-end');
        const singleInput = document.getElementById('trip-date');

        [startInput, endInput, singleInput].forEach(el => el.style.borderColor = '');
        errorSpan.style.display = 'none';

        let date;
        let invalidFound = false;
        let errorMessage = "";
        if (currentDateMode === 'range') {
            const start = document.getElementById('trip-date-start').value;
            const end = document.getElementById('trip-date-end').value;
            
            if (isDateInvalid(start) || isDateInvalid(end)) {
                invalidFound = true;
                errorMessage = "Dates cannot be in the past.";
            } 
            else if (start && end && new Date(end) < new Date(start)) {
                invalidFound = true;
                errorMessage = "Departure date cannot be before arrival date.";
            }

            date = (start && end) ? `${start} to ${end}` : (start || end || 'TBD');
        } else {
            const singleDate = document.getElementById('trip-date').value;
            if (isDateInvalid(singleDate)) invalidFound = true;
            date = singleDate || 'TBD';
        }

        if (invalidFound) {
            errorSpan.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
            errorSpan.style.display = 'block';
    
            if (currentDateMode === 'range') {
                document.getElementById('trip-date-start').style.borderColor = '#ff4d4d';
                document.getElementById('trip-date-end').style.borderColor = '#ff4d4d';
            }
    
            errorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return; 
        }

        const safeAmount = amount ? parseFloat(amount) : null;
        const safeDays = days ? parseInt(days) : null;

        const hotelBtn = document.getElementById('hotel-booking-btn');
        const hotelNameStr = hotelBtn && hotelBtn.dataset.hotel ? hotelBtn.dataset.hotel : null;

        const guideBtn = document.getElementById('guide-booking-btn');
        const guideNameStr = guideBtn && guideBtn.dataset.guide ? guideBtn.dataset.guide : null;
        const guideEmailStr = guideBtn && guideBtn.dataset.email ? guideBtn.dataset.email : null; 

        // --- NEW DUAL ROUTING LOGIC (UPDATE VS INSERT) ---
        let result;
        const tripPayload = {
            user_id: user.id,
            title: title,
            destination: finalDestString,
            image_url: allImagesString,
            travel_date: date,           
            budget_amount: safeAmount,  
            currency: currency,
            duration_days: safeDays,    
            guide_name: guideNameStr,
            hotel_name: hotelNameStr,
            status: 'Planned'
        };

        if (editingTripId) {
            // Update the existing trip record matching our global state ID hook
            result = await _supabase.from('trips').update(tripPayload).eq('id', editingTripId);
        } else {
            // Otherwise create a completely new trip entry blueprint
            result = await _supabase.from('trips').insert([tripPayload]);
        }

        const dbError = result.error;
        // --------------------------------------------------

        if (dbError) {
            alert("Database Error: " + dbError.message);
        } else {
            if (guideNameStr && guideEmailStr) {
                try {
                    const emailParams = {
                        to_name: guideNameStr,
                        to_email: guideEmailStr,
                        traveler_name: travelerName,
                        destination_name: finalDestString,
                        travel_date: date,
                        trip_title: title
                    };
                    await emailjs.send("service_kix8fen", "template_wugveyi", emailParams);
                } catch (emailErr) { console.error("Email failed:", emailErr); }
            }
            document.getElementById('successModal').style.display = 'flex';
            clearPlannerForm();
            fetchUserTrips(); 
            showSection('trips-section');
        }
    } catch (err) { alert("Error: " + err.message); }
}

async function logoutUser() {
    const { error } = await _supabase.auth.signOut();
    if (!error) window.location.href = '../index.html';
}

async function fetchUserTrips() {
    const activeContainer = document.getElementById('saved-trips-container');
    const historyContainer = document.getElementById('history-trips-container');

    activeContainer.innerHTML = '';
    historyContainer.innerHTML = '';

    const { data: trips, error } = await _supabase
    .from('trips')
    .select('*')
    .eq('user_id', currentUserProfile.id)
    .order('created_at', { ascending: false });

    if (error) return;
    updateWelcomeSection(currentUserProfile, trips || []);

    trips.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'trip-card';
        // Inside fetchUserTrips loop
    card.onclick = () => showTripDetails(
       trip.id,
       trip.title, 
       trip.destination, 
       trip.travel_date, 
       trip.currency, 
       trip.budget_amount, 
       trip.duration_days, 
       trip.guide_name,
       trip.hotel_name,
       trip.image_url
    );
        const isHistory = trip.status === 'Visited';
        const tagClass = isHistory ? 'trip-tag history' : 'trip-tag';
        // Split the saved string back into an array
        const images = trip.image_url ? trip.image_url.split(',') : ['default-placeholder.jpg'];

        // Create the HTML for all images
        const imagesHTML = images.map(img => `
            <img src="${img}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--glass-border);">
        `).join('');

        card.innerHTML = `
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="display: flex; gap: 5px; flex-wrap: wrap; width: 90px;">
                    ${imagesHTML} 
                </div>
                <div class="trip-card-info">
                    <h3>${trip.title}</h3>
                    <p><span><i class="fas fa-map-marker-alt"></i> ${trip.destination}</span></p>
                </div>
            </div>
            <div class="trip-actions">
                <i class="fas fa-trash delete-trip-btn" onclick="deleteTripFromDB(event, '${trip.id}')"></i>
                <div class="${tagClass}">${trip.status}</div>
            </div>`;
        if (isHistory) historyContainer.appendChild(card);
        else activeContainer.appendChild(card);
    });
    updatePlaceholders();
}

function prepareEditForm(id, title, dest, date, currency, amount, days, guideName, hotelName, imageUrls) {
    editingTripId = id; // Lock global editing state
    
    // Switch main panel view
    showSection('planner-section');
    
    // Populate simple inputs
    document.getElementById('trip-title').value = title || '';
    document.getElementById('trip-budget-amount').value = amount || '';
    document.getElementById('trip-days').value = days || '';
    document.getElementById('trip-currency').value = currency || 'LKR';
    
    // Reconstruct Multiple Destinations Rows
    const destList = document.getElementById('destinations-list');
    destList.innerHTML = ''; // Clear default rows
    
    const individualDestinations = dest ? dest.split(', ') : [];
    const individualImages = imageUrls ? imageUrls.split(',') : [];
    
    if (individualDestinations.length > 0) {
        individualDestinations.forEach((dName, idx) => {
            const imgUrl = individualImages[idx] || '';
            addDestinationRow(dName, imgUrl);
        });
    } else {
        addDestinationRow();
    }
    
    // Parse Date configuration
    if (date && date !== 'TBD') {
        if (date.includes(' to ')) {
            setDateMode('range');
            const parts = date.split(' to ');
            document.getElementById('trip-date-start').value = parts[0] || '';
            document.getElementById('trip-date-end').value = parts[1] || '';
        } else {
            setDateMode('single');
            document.getElementById('trip-date').value = date;
        }
    } else {
        setDateMode('single');
        document.getElementById('trip-date').value = '';
    }

    // Restore Booked Services metadata attributes
    const hotelBtn = document.getElementById('hotel-booking-btn');
    const hotelBtnText = document.getElementById('hotel-btn-text');
    if (hotelName) {
        hotelBtn.dataset.hotel = hotelName;
        hotelBtnText.innerHTML = `Hotel:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${hotelName}</span>`;
    } else {
        delete hotelBtn.dataset.hotel;
        hotelBtnText.innerText = 'Hotels';
    }

    const guideBtn = document.getElementById('guide-booking-btn');
    const guideBtnText = document.getElementById('guide-btn-text');
    if (guideName) {
        guideBtn.dataset.guide = guideName;
        guideBtnText.innerHTML = `Guide:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${guideName}</span>`;
    } else {
        delete guideBtn.dataset.guide;
        guideBtnText.innerText = 'Guides';
    }
    
    // Change submission button title dynamically
    document.querySelector('.planner-form-container .plan-btn').innerText = "Update Trip Blueprint";
}

function clearPlannerForm() {

    editingTripId = null; // <-- CLEAR EDITING TARGET LOCK
    document.querySelector('.planner-form-container .plan-btn').innerText = "Save Trip Blueprint"; // <-- RESET BUTTON TEXT
    
    document.getElementById('trip-title').value = '';
    document.getElementById('destinations-list').innerHTML = '';
    addDestinationRow(); // Reset to one empty row
    document.getElementById('trip-budget-amount').value = '';
    document.getElementById('trip-days').value = '';
    localStorage.removeItem('tripDraft');
    const guideBtnText = document.getElementById('guide-btn-text');
    const guideBtn = document.getElementById('guide-booking-btn');
    if (guideBtnText && guideBtn) {
        guideBtnText.innerText = 'Guides';
        delete guideBtn.dataset.guide;
        delete guideBtn.dataset.email;
    }
    document.getElementById('trip-date').value = '';
    document.getElementById('trip-date-start').value = '';
    document.getElementById('trip-date-end').value = '';
    document.getElementById('trip-currency').selectedIndex = 0;
    setDateMode('single');
}

function getTimeGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function getTripStartDate(travelDate) {
    if (!travelDate || travelDate === 'TBD') return null;

    const firstDate = travelDate.split(' to ')[0];
    const parsedDate = new Date(firstDate);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function updateWelcomeSection(userProfile, trips) {
    const firstName = userProfile?.firstName || 'Traveler';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTrips = trips
        .filter(trip => trip.status !== 'Visited')
        .map(trip => ({
            ...trip,
            startDate: getTripStartDate(trip.travel_date)
        }))
        .filter(trip => trip.startDate && trip.startDate >= today)
        .sort((a, b) => a.startDate - b.startDate);

    document.getElementById('dashboardGreeting').innerText = `${getTimeGreeting()}, ${firstName}.`;
    document.getElementById('dashboardUserName').innerText = 'Welcome back to GoTravel';
    document.getElementById('dashboardTripCount').innerText = upcomingTrips.length;

    if (upcomingTrips.length === 0) {
        document.getElementById('dashboardNextTrip').innerText = 'You do not have any upcoming trips yet. Start planning your next journey.';
        return;
    }

    const nextTrip = upcomingTrips[0];
    const daysUntilTrip = Math.ceil((nextTrip.startDate - today) / (1000 * 60 * 60 * 24));

    const countdownText = daysUntilTrip === 0
        ? 'today'
        : `in ${daysUntilTrip} day${daysUntilTrip === 1 ? '' : 's'}`;

    document.getElementById('dashboardNextTrip').innerText =
        `Your next trip to ${nextTrip.destination} is ${countdownText}.`;
}

function updateProfileAvatar(firstName, lastName, email) {
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=7000ff&color=fff`;
    document.getElementById('popupInitial').innerText = (firstName ? firstName[0] : "") + (lastName ? lastName[0] : "");
    document.getElementById('popupName').innerText = `${firstName} ${lastName}`;
    document.getElementById('popupEmail').innerText = email;
    avatarImg.onclick = (e) => { e.stopPropagation(); document.getElementById('profilePopup').classList.toggle('show'); };
}


window.onload = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
    currentUserProfile = {
        id: user.id,
        firstName: user.user_metadata.first_name || 'Traveler',
        lastName: user.user_metadata.last_name || '',
        email: user.email
    };

    updateProfileAvatar(
        currentUserProfile.firstName,
        currentUserProfile.lastName,
        currentUserProfile.email
    );

    updateWelcomeSection(currentUserProfile, []);
    fetchUserTrips();
} else { 
    window.location.href = 'auth.html'; 
}

    // RESTORE DRAFT DATA
    const draft = localStorage.getItem('tripDraft');
    if (draft) {
        const data = JSON.parse(draft);

        // RESTORE THE EDITING ID LOCK AND UPDATE BUTTON TEXT IF IT EXISTS
        if (data.editingTripId) {
            editingTripId = data.editingTripId;
            document.querySelector('.planner-form-container .plan-btn').innerText = "Update Trip Blueprint";
        }

        document.getElementById('trip-title').value = data.title || '';
        document.getElementById('trip-budget-amount').value = data.budget || '';
        document.getElementById('trip-days').value = data.days || '';
        document.getElementById('trip-currency').value = data.currency || 'LKR';
        
        // RECONSTRUCT MULTIPLE DESTINATION ROWS
        if (data.destinations && data.destinations.length > 0) {
            document.getElementById('destinations-list').innerHTML = ''; // Clear defaults
            data.destinations.forEach(d => addDestinationRow(d.val, d.img));
        }

        if (data.dateMode) {
            setDateMode(data.dateMode);
            document.getElementById('trip-date').value = data.dateSingle || '';
            document.getElementById('trip-date-start').value = data.dateStart || '';
            document.getElementById('trip-date-end').value = data.dateEnd || '';
        }
        // Restore previously selected Hotel from the draft
        if (data.existingHotel) {
            const hotelBtn = document.getElementById('hotel-booking-btn');
            const hotelBtnText = document.getElementById('hotel-btn-text');
            if (hotelBtn && hotelBtnText) {
                hotelBtn.dataset.hotel = data.existingHotel;
                hotelBtnText.innerHTML = `Hotel:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${data.existingHotel}</span>`;
            }
        }

        // Restore previously selected Guide from the draft
        if (data.existingGuide) {
            const guideBtn = document.getElementById('guide-booking-btn');
            const guideBtnText = document.getElementById('guide-btn-text');
            if (guideBtn && guideBtnText) {
                guideBtn.dataset.guide = data.existingGuide;
                guideBtn.dataset.email = data.existingGuideEmail;
                guideBtnText.innerHTML = `Guide:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${data.existingGuide}</span>`;
            }
        }
        localStorage.removeItem('tripDraft');
    }

    // CATCH RETURNING DESTINATION
    const pickedDest = localStorage.getItem('selectedDestination');
    const pickedImage = localStorage.getItem('selectedDestImage');
    const editingIndex = localStorage.getItem('editingRowIndex');

    if (pickedDest && editingIndex !== null) {
        const rows = document.querySelectorAll('.destination-row');
        if (rows[editingIndex]) {
            const input = rows[editingIndex].querySelector('.trip-destination');
            input.value = pickedDest;
            input.dataset.img = pickedImage;
        }
        showSection('planner-section');
        localStorage.removeItem('selectedDestination');
        localStorage.removeItem('selectedDestImage');
        localStorage.removeItem('editingRowIndex');
    }

    
    
    const dateInputs = ['trip-date', 'trip-date-start', 'trip-date-end'];

    dateInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const errorSpan = document.getElementById('date-error');
            const startInput = document.getElementById('trip-date-start');
            const endInput = document.getElementById('trip-date-end');
            const singleInput = document.getElementById('trip-date');

            const startVal = startInput.value;
            const endVal = endInput.value;

            // 1. ALWAYS RESET EVERYTHING FIRST
            [startInput, endInput, singleInput].forEach(el => el.style.borderColor = '');
            errorSpan.style.display = 'none';

            // 2. CHECK FOR INDIVIDUAL DATE ERRORS (PAST DATES)
            if (isDateInvalid(this.value)) {
                errorSpan.innerHTML = `<i class="fas fa-exclamation-circle"></i> This date has already passed.`;
                errorSpan.style.display = 'block';
                this.style.borderColor = '#ff4d4d';
            } 
            // 3. CHECK FOR RANGE LOGIC ERRORS
            else if (currentDateMode === 'range' && startVal && endVal && new Date(endVal) < new Date(startVal)) {
                errorSpan.innerHTML = `<i class="fas fa-exclamation-circle"></i> Departure cannot be before arrival.`;
                errorSpan.style.display = 'block';
                startInput.style.borderColor = '#ff4d4d';
                endInput.style.borderColor = '#ff4d4d';
            }
        // If it passes both checks, the code above already cleared the borders!
            updateDaysFromDates();
    });
});

    // CATCH RETURNING HOTEL
    const pickedHotel = localStorage.getItem('selectedHotelName');
    if (pickedHotel) {
        const hotelBtnText = document.getElementById('hotel-btn-text');
        if (hotelBtnText) {
            hotelBtnText.innerHTML = `Hotel:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${pickedHotel}</span>`;
            // Save the name into a dataset so the saveTrip() function can see it
            document.getElementById('hotel-booking-btn').dataset.hotel = pickedHotel;
    }
        showSection('planner-section'); // Ensure they go back to the form
        localStorage.removeItem('selectedHotelName'); // Clean up
    }

    // CATCH RETURNING GUIDE
    const pickedGuide = localStorage.getItem('selectedGuideName');
    if (pickedGuide) {
        const guideBtnText = document.getElementById('guide-btn-text');
        guideBtnText.innerHTML = `Guide:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${pickedGuide}</span>`;
        document.getElementById('guide-booking-btn').dataset.guide = pickedGuide;
        document.getElementById('guide-booking-btn').dataset.email = localStorage.getItem('selectedGuideEmail');
        showSection('planner-section');
        localStorage.removeItem('selectedGuideName');
        localStorage.removeItem('selectedGuideEmail');
    }
};

// SETUP DRAG-AND-DROP FOR DESTINATION ORDERING
setupDestinationDropArea();

document.querySelectorAll('.destination-row').forEach(row => {
    initializeDestinationRowDrag(row);
});

updateDestinationStopNumbers();

// ADD BUTTON EVENT LISTENER
document.getElementById('add-destination-btn').addEventListener('click', function() {
    addDestinationRow();
});
