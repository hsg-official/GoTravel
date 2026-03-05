const SUPABASE_URL = 'https://cdcolkoavowjjymzdzud.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aXQLF_zuk6pGmo4v0E1LPg_-TzUnQ0_';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// Global state for date mode
let currentDateMode = 'single';
let tripIdToDelete = null;

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

function showTripDetails(title, dest, date, currency, amount, days) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('det-dest').innerText = dest;
    document.getElementById('det-date').innerText = date || "Not set";
    document.getElementById('det-budget').innerText = amount ? `${currency} ${amount}` : "Not specified";
    document.getElementById('det-days').innerText = days ? days + " Days" : "Not specified";
    document.getElementById('detailsModal').style.display = 'flex';
}

function goToPlaces() {
    // Save current form drafts so they aren't lost on reload
    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value
    };
    localStorage.setItem('tripDraft', JSON.stringify(draftData));
    
    localStorage.setItem('isSelectingDestination', 'true');
    window.location.href = 'places.html';
} 

function closeTripDetails() {
    document.getElementById('detailsModal').style.display = 'none';
}

// --- CUSTOM DELETE TRIP LOGIC ---
async function deleteTripFromDB(event, tripId) {
    event.stopPropagation();
    tripIdToDelete = tripId; // Store the ID
    document.getElementById('confirmModal').style.display = 'flex';
}

document.getElementById('confirmOk').onclick = async function() {
    if (tripIdToDelete) {
        const { error } = await _supabase
            .from('trips')
            .delete()
            .eq('id', tripIdToDelete);

        if (!error) {
            fetchUserTrips(); // Refresh the UI
        }
        
        tripIdToDelete = null; // Reset
        document.getElementById('confirmModal').style.display = 'none'; // Hide modal
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
    const { data: { user } } = await _supabase.auth.getUser();
    
    // Get values from inputs
    const title = document.getElementById('trip-title').value;
    const dest = document.getElementById('trip-destination').value;
    const amount = document.getElementById('trip-budget-amount').value;
    const currency = document.getElementById('trip-currency').value;
    const days = document.getElementById('trip-days').value;
    const destImage = document.getElementById('trip-destination').dataset.img || '';

    let date;
    if (currentDateMode === 'range') {
        const start = document.getElementById('trip-date-start').value;
        const end = document.getElementById('trip-date-end').value;
        date = (start && end) ? `${start} to ${end}` : (start || end || 'TBD');
    } else {
        date = document.getElementById('trip-date').value || 'TBD';
    }

    if(!title || !dest) {
        alert("Please provide a Title and Destination!");
        return;
    }

    // --- NEW: Insert into Supabase ---
    const { error } = await _supabase
        .from('trips')
        .insert([{
            user_id: user.id,
            title: title,
            destination: dest,
            image_url: destImage,
            travel_date: date,
            budget_amount: amount,
            currency: currency,
            duration_days: days,
            status: 'Planned'
        }]);

    if (error) {
        alert("Error saving trip: " + error.message);
    } else {
        document.getElementById('successModal').style.display = 'flex';
        clearPlannerForm();
        // Refresh the list and switch view
        fetchUserTrips(); 
        showSection('trips-section');
    }
}       

async function logoutUser() {
    const { error } = await _supabase.auth.signOut();
    if (!error) {
        // Move to the home or login page after successful logout
        window.location.href = 'index.html';
    } else {
        alert("Error logging out: " + error.message);
    }
}

async function fetchUserTrips() {
    const activeContainer = document.getElementById('saved-trips-container');
    const historyContainer = document.getElementById('history-trips-container');

    // Clear current UI to prevent duplicates
    activeContainer.innerHTML = '';
    historyContainer.innerHTML = '';

    const { data: trips, error } = await _supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching trips:", error);
        return;
    }

    trips.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'trip-card';
        card.onclick = () => showTripDetails(trip.title, trip.destination, trip.travel_date, trip.currency, trip.budget_amount, trip.duration_days);

        // Logic for which tab it belongs to
        const isHistory = trip.status === 'Visited';
        const tagClass = isHistory ? 'trip-tag history' : 'trip-tag';
        
        card.innerHTML = `
    <div style="display: flex; gap: 15px; align-items: center;">
        <img src="${trip.image_url || 'default-placeholder.jpg'}" 
             style="width: 80px; height: 60px; border-radius: 12px; object-fit: cover;">
        <div class="trip-card-info">
            <h3>${trip.title}</h3>
            <p>
                <span><i class="fas fa-map-marker-alt"></i> ${trip.destination}</span>
                <span><i class="fas fa-calendar"></i> ${trip.travel_date}</span>
            </p>
        </div>
    </div>
    <div class="trip-actions">
        <i class="fas fa-trash delete-trip-btn" onclick="deleteTripFromDB(event, '${trip.id}')"></i>
        <div class="${tagClass}">${trip.status}</div>
    </div>
    `;

        if (isHistory) historyContainer.appendChild(card);
        else activeContainer.appendChild(card);
    });

    updatePlaceholders();
}

function clearPlannerForm() {
    // Clear text and number inputs
    document.getElementById('trip-title').value = '';
    document.getElementById('trip-destination').value = '';
    document.getElementById('trip-budget-amount').value = '';
    document.getElementById('trip-days').value = '';

    localStorage.removeItem('tripDraft');
    
    // Clear date inputs
    document.getElementById('trip-date').value = '';
    document.getElementById('trip-date-start').value = '';
    document.getElementById('trip-date-end').value = '';

    // Reset the currency dropdown to the first option (LKR)
    document.getElementById('trip-currency').selectedIndex = 0;

    // Reset the Date Mode back to 'single' for a fresh start
    setDateMode('single');
    
    // Hide transport options if they were left open
    document.getElementById('transportOptions').classList.remove('show');
}

function updateProfileAvatar(firstName, lastName, email) {
    const fullName = `${firstName} ${lastName}`.trim();
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    const combinedInitials = firstInitial + lastInitial;
    
    const avatarImg = document.getElementById('userAvatar');
    const popupInitial = document.getElementById('popupInitial');
    const popupName = document.getElementById('popupName');
    const popupEmail = document.getElementById('popupEmail');
    const profilePopup = document.getElementById('profilePopup');
    
    avatarImg.src = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=7000ff&color=fff`;
    
    popupInitial.innerText = combinedInitials;
    popupName.innerText = fullName; 
    popupEmail.innerText = email;
    
    avatarImg.onclick = function(e) {
        e.stopPropagation();
        profilePopup.classList.toggle('show');
    };

    document.addEventListener('click', function() {
        profilePopup.classList.remove('show');
    });
    profilePopup.onclick = function(e) { e.stopPropagation(); };
}

window.onload = async function() {
    const { data: { user }, error } = await _supabase.auth.getUser();

    if (user) {
        const fName = user.user_metadata.first_name || "Traveler";
        const lName = user.user_metadata.last_name || "";
        const email = user.email;

        updateProfileAvatar(fName, lName, email);
        fetchUserTrips();
    } else {
        window.location.href = 'auth.html'; 
    }

    // --- RESTORE DRAFT DATA ---
    const draft = localStorage.getItem('tripDraft');
    if (draft) {
        const data = JSON.parse(draft);
        document.getElementById('trip-title').value = data.title || '';
        document.getElementById('trip-budget-amount').value = data.budget || '';
        document.getElementById('trip-days').value = data.days || '';
        document.getElementById('trip-currency').value = data.currency || 'LKR';
        // Keep the draft until the user successfully saves the trip

        localStorage.removeItem('tripDraft');
    }

    const pickedDest = localStorage.getItem('selectedDestination');
    const pickedImage = localStorage.getItem('selectedDestImage');
    if (pickedDest) {
        document.getElementById('trip-destination').value = pickedDest;
        // We store the image in a temporary variable or hidden attribute
        document.getElementById('trip-destination').dataset.img = pickedImage;
        showSection('planner-section');
        localStorage.removeItem('selectedDestination');
        localStorage.removeItem('selectedDestImage');
    }
};
