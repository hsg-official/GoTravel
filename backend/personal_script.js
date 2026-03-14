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

function showTripDetails(title, dest, date, currency, amount, days, guideName) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('det-dest').innerText = dest;
    document.getElementById('det-date').innerText = date || "Not set";
    document.getElementById('det-budget').innerText = amount ? `${currency} ${amount}` : "Not specified";
    document.getElementById('det-days').innerText = days ? days + " Days" : "Not specified";
    document.getElementById('det-guide').innerText = guideName || "No Guide Booked";
    document.getElementById('detailsModal').style.display = 'flex';
}

function goToPlaces() {
    // Save current form drafts so they aren't lost on reload
    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        dest: document.getElementById('trip-destination').value,
        destImg: document.getElementById('trip-destination').dataset.img || '',
        
        // Save the Dates
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
    const destInput = document.getElementById('trip-destination');
    
    // Save current form drafts so they aren't lost
    const draftData = {
        title: document.getElementById('trip-title').value,
        budget: document.getElementById('trip-budget-amount').value,
        days: document.getElementById('trip-days').value,
        currency: document.getElementById('trip-currency').value,
        dest: document.getElementById('trip-destination').value,
        destImg: document.getElementById('trip-destination').dataset.img || '',
        
        // Save the Dates
        dateMode: currentDateMode,
        dateSingle: document.getElementById('trip-date').value,
        dateStart: document.getElementById('trip-date-start').value,
        dateEnd: document.getElementById('trip-date-end').value
    };
    localStorage.setItem('tripDraft', JSON.stringify(draftData));
    
    // Turn on planning mode and redirect
    localStorage.setItem('isSelectingGuide', 'true');
    window.location.href = 'guides.html';
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
    try {
        // Safely check if the user is actually logged in
        const { data: { user }, error: authError } = await _supabase.auth.getUser();
        
        if (authError || !user) {
            alert("Session error: You must be logged in to save a trip.");
            window.location.href = 'auth.html';
            return;
        }

        // 1. FETCH THE ACTUAL NAME FROM YOUR USERS TABLE
        const { data: userData, error: userError } = await _supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

        // Use the DB name if found, otherwise fallback to metadata, otherwise "A Traveler"
        const travelerName = userData 
            ? `${userData.first_name} ${userData.last_name}`.trim() 
            : (user.user_metadata.first_name || "A Traveler");
            
        // Get values from inputs safely
        const title = document.getElementById('trip-title').value;
        const dest = document.getElementById('trip-destination').value;
        const amount = document.getElementById('trip-budget-amount').value;
        const currency = document.getElementById('trip-currency').value;
        const days = document.getElementById('trip-days').value;
        const destImage = document.getElementById('trip-destination').dataset.img || '';

        if(!title || !dest) {
            alert("Please provide a Title and Destination!");
            return;
        }

        // Handle dates safely
        let date;
        if (currentDateMode === 'range') {
            const start = document.getElementById('trip-date-start').value;
            const end = document.getElementById('trip-date-end').value;
            date = (start && end) ? `${start} to ${end}` : (start || end || 'TBD');
        } else {
            date = document.getElementById('trip-date').value || 'TBD';
        }

        // Convert empty blanks to null to prevent Database crashes
        const safeAmount = amount ? parseFloat(amount) : null;
        const safeDays = days ? parseInt(days) : null;

        // Check if a guide was selected
        const guideBtn = document.getElementById('guide-booking-btn');
        const guideNameStr = guideBtn && guideBtn.dataset.guide ? guideBtn.dataset.guide : null;
        const guideEmailStr = guideBtn && guideBtn.dataset.email ? guideBtn.dataset.email : null; 

        // Send to Supabase
        const { error: dbError } = await _supabase
            .from('trips')
            .insert([{
                user_id: user.id,
                title: title,
                destination: dest,
                image_url: destImage,
                travel_date: date,           
                budget_amount: safeAmount,  
                currency: currency,
                duration_days: safeDays,    
                guide_name: guideNameStr,
                status: 'Planned'
            }]);

        // Handle Database Result
        if (dbError) {
            alert("Database Error: " + dbError.message);
            console.error("Supabase Error Details:", dbError);
        } else {
            
            // --- UPDATED EMAIL NOTIFICATION ---
        if (guideNameStr && guideEmailStr) {
            try {
                const travelerName = user.user_metadata.first_name || "A Traveler";
                
                // Define the parameters exactly as named in your new template
                const emailParams = {
                    to_name: guideNameStr,
                    to_email: guideEmailStr,
                    traveler_name: travelerName,
                    destination_name: dest,
                    travel_date: date,
                    trip_title: title
                };
                
                // REPLACE "template_new_id" with your actual new Template ID from EmailJS
                await emailjs.send("service_kix8fen", "template_wugveyi", emailParams);
                console.log("Guide notification sent successfully.");
            } catch (emailErr) {
                console.error("Email notification failed:", emailErr);
            }
        }

            // Success!
            document.getElementById('successModal').style.display = 'flex';
            clearPlannerForm();
            fetchUserTrips(); 
            showSection('trips-section');
        }

    } catch (err) {
        // THIS CATCHES SILENT CRASHES
        alert("A system error stopped the save: " + err.message);
        console.error("Critical Save Error:", err);
    }
}     

async function logoutUser() {
    const { error } = await _supabase.auth.signOut();
    if (!error) {
        window.location.href = '../index.html';
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
        card.onclick = () => showTripDetails(trip.title, trip.destination, trip.travel_date, trip.currency, trip.budget_amount, trip.duration_days, trip.guide_name);

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
                <span><i class="fas fa-calendar"></i> ${trip.start_date || trip.travel_date}</span>
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
    
    // Reset the guide button
    const guideBtnText = document.getElementById('guide-btn-text');
    const guideBtn = document.getElementById('guide-booking-btn');
    if (guideBtnText && guideBtn) {
        guideBtnText.innerText = 'Guides';
        delete guideBtn.dataset.guide;
        delete guideBtn.dataset.email;
    }
    
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
        
        if (data.dest) {
            const destInput = document.getElementById('trip-destination');
            destInput.value = data.dest;
            destInput.dataset.img = data.destImg || '';
        }

        // Restore the Dates
        if (data.dateMode) {
            setDateMode(data.dateMode);
            document.getElementById('trip-date').value = data.dateSingle || '';
            document.getElementById('trip-date-start').value = data.dateStart || '';
            document.getElementById('trip-date-end').value = data.dateEnd || '';
        }
        
        localStorage.removeItem('tripDraft');
    }

    // --- CATCH RETURNING GUIDE ---
    const pickedGuide = localStorage.getItem('selectedGuideName');
    const pickedGuideEmail = localStorage.getItem('selectedGuideEmail');

    if (pickedGuide) {
        const guideBtnText = document.getElementById('guide-btn-text');
        const guideBtn = document.getElementById('guide-booking-btn');
        
        if (guideBtnText && guideBtn) {
            guideBtnText.innerHTML = `Guide:<br><span style="color:var(--neon-primary); font-size:0.8rem;">${pickedGuide}</span>`;
            guideBtn.dataset.guide = pickedGuide;
            if (pickedGuideEmail) guideBtn.dataset.email = pickedGuideEmail; // Secretly store email
        }
        showSection('planner-section');
        localStorage.removeItem('selectedGuideName');
        localStorage.removeItem('selectedGuideEmail');
    }

    // --- CATCH RETURNING DESTINATION ---
    const pickedDest = localStorage.getItem('selectedDestination');
    const pickedImage = localStorage.getItem('selectedDestImage');
    if (pickedDest) {
        document.getElementById('trip-destination').value = pickedDest;
        document.getElementById('trip-destination').dataset.img = pickedImage;
        showSection('planner-section');
        localStorage.removeItem('selectedDestination');
        localStorage.removeItem('selectedDestImage');
    }
};