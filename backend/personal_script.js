const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aXQLF_zuk6pGmo4v0E1LPg_-TzUnQ0_';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global state
let currentDateMode = 'single';
let tripIdToDelete = null;

// --- 1. HELPER FUNCTION TO ADD A DESTINATION ROW ---
// This centralizes row creation so we can use it for both the "+" button and page reloads
function addDestinationRow(value = '', imageUrl = '') {
    const list = document.getElementById('destinations-list');
    const newRow = document.createElement('div');
    newRow.className = 'destination-row';
    
    newRow.innerHTML = `
        <input type="text" class="glass-input trip-destination" 
               placeholder="Select destination..." 
               value="${value}" 
               data-img="${imageUrl}" readonly>
        <button type="button" class="glass-btn search-dest-btn" onclick="goToPlaces(this)">
            <i class="fas fa-location-dot"></i> </button>
    `;
    list.appendChild(newRow);
}

function goToHotels() {
    // 1. Collect current form data
    const rows = Array.from(document.querySelectorAll('.destination-row'));
    const destinationsData = rows.map(row => {
        const input = row.querySelector('.trip-destination');
        return { val: input.value, img: input.dataset.img || '' };
    });

    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value
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

function showTripDetails(title, dest, date, currency, amount, days, guideName) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('det-dest').innerText = dest;
    document.getElementById('det-date').innerText = date || "Not set";
    document.getElementById('det-budget').innerText = amount ? `${currency} ${amount}` : "Not specified";
    document.getElementById('det-days').innerText = days ? days + " Days" : "Not specified";
    document.getElementById('det-guide').innerText = guideName || "No Guide Booked";
    document.getElementById('detailsModal').style.display = 'flex';
}

// --- 2. MODIFIED GOTOPLACES ---
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

    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        // Save the full list of destinations
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value
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

    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        destinations: destinationsData,
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value
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
        
        const imagesArray = []; // Create an array for all images
        destInputs.forEach((input) => {
            if (input.value.trim() !== "") {
                destinationsArray.push(input.value.trim());
                // Add the image to our array, or a placeholder if empty
                imagesArray.push(input.dataset.img || 'default-placeholder.jpg');
    }
});

        // Convert the array of images into a single string separated by commas
        const allImagesString = imagesArray.join(',');

        if(!title || destinationsArray.length === 0) {
            alert("Please provide a Title and at least one Destination!");
            return;
        }

        const finalDestString = destinationsArray.join(', ');

        let date;
        if (currentDateMode === 'range') {
            const start = document.getElementById('trip-date-start').value;
            const end = document.getElementById('trip-date-end').value;
            date = (start && end) ? `${start} to ${end}` : (start || end || 'TBD');
        } else {
            date = document.getElementById('trip-date').value || 'TBD';
        }

        const safeAmount = amount ? parseFloat(amount) : null;
        const safeDays = days ? parseInt(days) : null;

        const hotelBtn = document.getElementById('hotel-booking-btn');
        const hotelNameStr = hotelBtn && hotelBtn.dataset.hotel ? hotelBtn.dataset.hotel : null;

        const guideBtn = document.getElementById('guide-booking-btn');
        const guideNameStr = guideBtn && guideBtn.dataset.guide ? guideBtn.dataset.guide : null;
        const guideEmailStr = guideBtn && guideBtn.dataset.email ? guideBtn.dataset.email : null; 

        const { error: dbError } = await _supabase.from('trips').insert([{
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
        }]);

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

    const { data: trips, error } = await _supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (error) return;

    trips.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'trip-card';
        card.onclick = () => showTripDetails(trip.title, trip.destination, trip.travel_date, trip.currency, trip.budget_amount, trip.duration_days, trip.guide_name);
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

function clearPlannerForm() {
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

function updateProfileAvatar(firstName, lastName, email) {
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=7000ff&color=fff`;
    document.getElementById('popupInitial').innerText = (firstName ? firstName[0] : "") + (lastName ? lastName[0] : "");
    document.getElementById('popupName').innerText = `${firstName} ${lastName}`;
    document.getElementById('popupEmail').innerText = email;
    avatarImg.onclick = (e) => { e.stopPropagation(); document.getElementById('profilePopup').classList.toggle('show'); };
}

// --- 3. MODIFIED WINDOW.ONLOAD ---
window.onload = async function() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        updateProfileAvatar(user.user_metadata.first_name, user.user_metadata.last_name, user.email);
        fetchUserTrips();
    } else { window.location.href = 'auth.html'; }

    // RESTORE DRAFT DATA
    const draft = localStorage.getItem('tripDraft');
    if (draft) {
        const data = JSON.parse(draft);
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

    // ... existing code for restoring draft and guides ...

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

// ADD BUTTON EVENT LISTENER
document.getElementById('add-destination-btn').addEventListener('click', function() {
    addDestinationRow();
});
