        let currentUser = null;

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3000);
        }

        window.onload = async function() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                currentUser = user;
                currentUser.firstName = localStorage.getItem('userFName') || "A Traveler";
            } else {
                showToast("Please log in to book a guide.", "error");
                setTimeout(() => window.location.href = "auth.html", 2000);
                return;
            }
            fetchGuides();
        };

        // --- FETCH GUIDES FROM SUPABASE ---
async function fetchGuides() {
    const container = document.getElementById('guidesContainer');
    const loader = document.getElementById('loader');

    try {
        // Fetching directly from the new guide_service table
        const { data: guides, error } = await supabaseClient
            .from('guide_service')
            .select('*'); 

        loader.style.display = 'none';

        if (error) throw error;

        if (!guides || guides.length === 0) {
            container.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted);">No guides are currently available. Check back soon!</p>`;
            return;
        }

        guides.forEach(guide => {
            // Extracting data based on your new table structure
            const name = guide.service_name || "Professional Guide";
            const location = guide.address || "Sri Lanka";
            const desc = guide.description || "Expert local guide ready to show you the best spots.";
            const price = guide.pricing_details || "Price strictly negotiable";
            
            // Handling photo_urls (safely checks if it's an array or a single string)
            let photo = guide.photo_urls;
            if (Array.isArray(photo) && photo.length > 0) {
                photo = photo[0];
            }
            photo = photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop";
            
            const guideEmail = guide.email || "guide@example.com"; 
            const contactNo = guide.contact || "Number not provided";

            // Extracting extra data for the badges
            const experience = guide.years_of_experience ? `${guide.years_of_experience} Yrs Experience` : "New Guide";
            const languages = guide.languages ? guide.languages : "English";

            const card = document.createElement('div');
            card.className = 'guide-card';
            
            // Building the HTML card structure
            card.innerHTML = `
                <img src="${photo}" alt="${name}" class="guide-photo" onerror="this.src='https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop'">
                <div class="guide-info">
                    <h3 class="guide-name">${name}</h3>
                    <div class="guide-location"><i class="fas fa-map-marker-alt"></i> ${location}</div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <span style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: var(--accent); padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">
                            <i class="fas fa-briefcase"></i> ${experience}
                        </span>
                        <span style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: var(--accent); padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;">
                            <i class="fas fa-language"></i> ${languages}
                        </span>
                    </div>

                    <p class="guide-desc">${desc.substring(0, 75)}...</p>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="color: #fff; font-weight: 600; font-size: 0.9rem; margin-bottom: 3px;">
                            <i class="fas fa-phone-alt" style="color: var(--success); margin-right: 5px;"></i> ${contactNo}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); font-style: italic;">
                            * Call for availability and inquiries.
                        </div>
                    </div>
                    
                    <div class="guide-meta">
                        <div style="color: var(--neon-primary); font-weight: 700;">
                            <i class="fas fa-money-bill-wave" style="margin-right: 5px;"></i> ${price}
                        </div>
                        <div><i class="fas fa-star" style="color: #f59e0b;"></i> 4.9</div>
                    </div>
                    
                    <button class="book-btn" onclick="handleGuideSelection('${name}', '${guideEmail}')">
                        Select This Guide
                    </button>
                </div>
            `;
            
            container.appendChild(card);
        });

    } catch (err) {
        loader.style.display = 'none';
        showToast("Failed to load guides: " + err.message, "error");
        console.error(err);
    }
}
        // --- OPEN MODAL & LOAD TRIPS ---
        async function openBookingModal(name, email) {
            document.getElementById('bookingModal').classList.add('active');
            document.getElementById('modalGuideName').innerText = `Guide: ${name}`;
            
            document.getElementById('guideNameStr').value = name;
            document.getElementById('guideEmail').value = email;

            const selectBox = document.getElementById('tripSelect');
            const confirmBtn = document.getElementById('confirmBtn');
            selectBox.innerHTML = '<option value="">Searching for your trips...</option>';
            confirmBtn.disabled = true;

            try {
                // Fetch the user's trips from Supabase (Requires trip_id column based on your ER diagram)
                const { data: trips, error } = await supabaseClient
                    .from('trips')
                    .select('trip_id, title, start_date')
                    .eq('user_id', currentUser.id);

                if (error) throw error;

                if (!trips || trips.length === 0) {
                    selectBox.innerHTML = '<option value="">No planned trips found. Create one in your dashboard first!</option>';
                } else {
                    selectBox.innerHTML = '<option value="">-- Choose a trip --</option>';
                    trips.forEach(trip => {
                        selectBox.innerHTML += `<option value="${trip.trip_id}">${trip.title} (Date: ${trip.start_date || 'TBD'})</option>`;
                    });
                    confirmBtn.disabled = false;
                }
            } catch (err) {
                selectBox.innerHTML = '<option value="">Error loading trips.</option>';
                console.error(err);
            }
        }

        function closeModal() {
            document.getElementById('bookingModal').classList.remove('active');
            document.getElementById('bookingForm').reset();
        }

        // --- UPDATE EXISTING TRIP IN SUPABASE ---
        async function confirmBooking(e) {
            e.preventDefault();
            const btn = document.getElementById('confirmBtn');
            btn.innerText = "UPDATING TRIP...";
            btn.disabled = true;

            const tripSelectBox = document.getElementById('tripSelect');
            const tripId = tripSelectBox.value;
            const tripTitleText = tripSelectBox.options[tripSelectBox.selectedIndex].text;
            
            const guideName = document.getElementById('guideNameStr').value;
            const guideEmail = document.getElementById('guideEmail').value;

            if (!tripId) {
                showToast("Please select a valid trip.", "error");
                btn.innerText = "ADD TO MY TRIP";
                btn.disabled = false;
                return;
            }

            try {
                // UPDATE command: Adds the guide to the existing row instead of creating a new row
                const { error: dbError } = await supabaseClient
                    .from('trips')
                    .update({
                        guide_name: guideName, 
                        guide_email: guideEmail
                    })
                    .eq('trip_id', tripId); // Uses 'trip_id' matching your ER diagram

                if (dbError) throw dbError;

                // Send email to guide
                const emailParams = {
                    to_name: guideName,
                    to_email: guideEmail, 
                    code: `NEW TRIP ASSIGNMENT! ${currentUser.firstName} has added you as the guide for their planned trip: "${tripTitleText}". Log in to view details.`
                };
                
                await emailjs.send("service_kix8fen", "template_vij2vyj", emailParams);

                showToast("Guide added to your trip! Guide Notified.", "success");
                
                setTimeout(() => {
                    closeModal();
                    window.location.href = "personal.html";
                }, 1500);

            } catch (err) {
                showToast("Failed to update trip: " + err.message, "error");
                btn.innerText = "ADD TO MY TRIP";
                btn.disabled = false;
                console.error(err);
            }
        }

        function handleGuideSelection(guideName, guideEmail) {
    // 1. Check if the user came here from the Dashboard Planner
    const isPlanning = localStorage.getItem('isSelectingGuide');

    if (isPlanning === 'true') {
        // Save the guide details to local storage
        localStorage.setItem('selectedGuideName', guideName);
        localStorage.setItem('selectedGuideEmail', guideEmail);
        
        // Turn off planning mode
        localStorage.removeItem('isSelectingGuide');

        // Redirect back to the dashboard
        window.location.href = 'personal.html'; 
    } else {
        // If they aren't planning a new trip, open the modal to attach to an old trip
        openBookingModal(guideName, guideEmail);
    }
}