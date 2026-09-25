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
            const name = guide.service_name || "Professional Guide";
            const location = guide.address || "Sri Lanka";
            const desc = guide.description || "Expert local guide ready to show you the best spots.";
            const price = guide.pricing_details || "Price strictly negotiable";
            
            let photo = guide.photo_urls;
            if (Array.isArray(photo) && photo.length > 0) photo = photo[0];
            photo = photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop";
            
            const guideEmail = guide.email || "guide@example.com"; 
            const contactNo = guide.contact || "Number not provided";
            const experience = guide.years_of_experience ? `${guide.years_of_experience} Yrs Experience` : "New Guide";
            const languages = guide.languages ? guide.languages : "English";

            // --- NEW FIELDS FOR THE MODAL ---
            const spec = guide.specializations || "General Area Tours & Sightseeing";
            const fac = guide.facilities || "Standard route planning and local guidance";
            const pay = guide.payment_methods || "Cash on arrival directly to the guide";

            const card = document.createElement('div');
            card.className = 'guide-card';
            card.style.cursor = 'pointer'; // Shows a pointer finger on hover
            
            // Clicking the card opens the details modal
            card.onclick = () => openGuideDetails(name, location, spec, fac, pay, guideEmail);

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
                    
                    <button class="book-btn" onclick="event.stopPropagation(); handleGuideSelection('${name}', '${guideEmail}')">
                        Select This Guide
                    </button>
                </div>
            `;
            GuideReviews.attach(card, guide); 
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

// --- GUIDE DETAILS MODAL LOGIC ---
function openGuideDetails(name, location, spec, fac, pay, email) {
    document.getElementById('detGuideName').innerText = name;
    document.getElementById('detGuideLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${location}`;
    document.getElementById('detGuideSpec').innerText = spec;
    document.getElementById('detGuideFac').innerText = fac;
    document.getElementById('detGuidePay').innerText = pay;

    // Connect the big Book button inside the details modal to the main booking logic
    const selectBtn = document.getElementById('modalSelectBtn');
    selectBtn.onclick = function() {
        closeGuideDetails();
        handleGuideSelection(name, email);
    };

    document.getElementById('guideDetailsModal').classList.add('active');
}

function closeGuideDetails() {
    document.getElementById('guideDetailsModal').classList.remove('active');
}
// ===== GUIDE REVIEWS ONLY =====
const GuideReviews = (() => {
    const cards = new Map();

    let dialog;
    let activeGuide = null;
    let activeUser = null;
    let ownReview = null;
    let eligible = false;
    let busy = false;
    let requestVersion = 0;
    let returnFocus = null;

    const el = id => document.getElementById(id);

    function makeElement(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function summaryText(rows) {
        if (!rows.length) return "No reviews yet";

        const total = rows.reduce(
            (sum, row) => sum + Number(row.rating),
            0
        );

        return `★ ${(total / rows.length).toFixed(1)} / 5 · ${
            rows.length
        } review${rows.length === 1 ? "" : "s"}`;
    }

    // Read all pages so the average includes every review.
    async function readReviews(guideId, full = false) {
        const rows = [];
        const pageSize = 500;

        for (let start = 0; ; start += pageSize) {
            const columns = full
                ? "id,user_id,rating,comment,created_at"
                : "id,rating";

            const { data, error } = await supabaseClient
                .from("Reviews")
                .select(columns)
                .eq("guide_id", guideId)
                .order("id", { ascending: true })
                .range(start, start + pageSize - 1);

            if (error) throw error;

            rows.push(...(data || []));

            if (!data || data.length < pageSize) break;
        }

        return rows;
    }

    function updateCard(guideId, rows) {
        const entry = cards.get(guideId);
        if (entry) entry.rating.textContent = summaryText(rows);
    }

    function attach(card, guide) {
        if (card.dataset.reviewsAttached) return;
        card.dataset.reviewsAttached = "true";

        const info = card.querySelector(".guide-info");
        const meta = card.querySelector(".guide-meta");
        if (!info || !meta) return;

        // Replace your existing fixed 4.9 display.
        let rating = meta.lastElementChild;

        if (!rating) {
            rating = makeElement("div");
            meta.appendChild(rating);
        }

        rating.textContent = "Loading rating…";

        const button = makeElement(
            "button",
            "Reviews",
            "guide-review-button"
        );

        button.type = "button";

        button.addEventListener("click", event => {
            event.stopPropagation();
            open(guide, button);
        });

        info.appendChild(button);
        cards.set(guide.id, { rating });

        readReviews(guide.id)
            .then(rows => updateCard(guide.id, rows))
            .catch(error => {
                rating.textContent = "Rating unavailable";
                console.error("Guide rating:", error);
            });
    }

    function buildDialog() {
        if (dialog) return;

        dialog = document.createElement("dialog");
        dialog.className = "gr-dialog";
        dialog.setAttribute("aria-labelledby", "gr-title");

        // Static markup only. User comments are rendered with textContent.
        dialog.innerHTML = `
            <div class="gr-header">
                <h2 id="gr-title">Guide reviews</h2>
                <button type="button"
                        class="gr-close"
                        id="gr-close"
                        aria-label="Close reviews">×</button>
            </div>

            <p id="gr-summary" class="gr-summary"></p>

            <p id="gr-message"
               class="gr-message"
               role="status"
               aria-live="polite"></p>

            <form id="gr-form" class="gr-form" hidden>
                <label for="gr-rating">Your rating</label>

                <select id="gr-rating" required>
                    <option value="">Choose a rating</option>
                    <option value="5">★★★★★ — 5 Excellent</option>
                    <option value="4">★★★★☆ — 4 Good</option>
                    <option value="3">★★★☆☆ — 3 Average</option>
                    <option value="2">★★☆☆☆ — 2 Poor</option>
                    <option value="1">★☆☆☆☆ — 1 Very poor</option>
                </select>

                <label for="gr-comment">
                    Your comment (optional, maximum 1,000 characters)
                </label>

                <textarea id="gr-comment"
                          maxlength="1000"
                          placeholder="Share your experience with this guide.">
                </textarea>

                <div class="gr-actions">
                    <button type="submit" id="gr-save">
                        Submit review
                    </button>
                </div>
            </form>

            <div class="gr-actions">
                <button type="button"
                        id="gr-delete"
                        class="gr-delete"
                        hidden>
                    Delete my review
                </button>

                <button type="button" id="gr-retry" hidden>
                    Retry loading
                </button>
            </div>

            <div id="gr-list"></div>
        `;

        document.body.appendChild(dialog);

        el("gr-close").addEventListener("click", () => {
            if (!busy) dialog.close();
        });

        dialog.addEventListener("cancel", event => {
            if (busy) event.preventDefault();
        });

        dialog.addEventListener("close", () => {
            requestVersion++;
            returnFocus?.focus();
        });

        el("gr-form").addEventListener("submit", saveReview);
        el("gr-delete").addEventListener("click", deleteReview);
        el("gr-retry").addEventListener("click", () => load());
    }

    function setBusy(value) {
        busy = value;

        [
            "gr-close",
            "gr-save",
            "gr-delete",
            "gr-retry",
            "gr-rating",
            "gr-comment"
        ].forEach(id => {
            el(id).disabled = value;
        });
    }

    function friendlyError(error) {
        if (error.code === "23505") {
            return "You already reviewed this guide. Close and reopen Reviews to edit it.";
        }

        if (error.code === "42501") {
            return "Review not allowed. Make sure this guide is saved in your trip and you are signed in.";
        }

        return "Could not complete the request. Please try again.";
    }

    async function open(guide, trigger) {
        if (busy) return;

        buildDialog();

        activeGuide = guide;
        returnFocus = trigger;

        el("gr-title").textContent =
            `${guide.service_name || "Guide"} — Reviews`;

        if (!dialog.open) dialog.showModal();

        await load();
    }

    async function load(successMessage = "") {
        const version = ++requestVersion;
        const guideId = activeGuide.id;

        activeUser = null;
        ownReview = null;
        eligible = false;

        el("gr-form").hidden = true;
        el("gr-delete").hidden = true;
        el("gr-retry").hidden = true;
        el("gr-list").replaceChildren();
        el("gr-summary").textContent = "";
        el("gr-message").textContent = "Loading reviews…";

        try {
            const [rows, authResult] = await Promise.all([
                readReviews(guideId, true),
                supabaseClient.auth.getUser()
            ]);

            if (version !== requestVersion || !dialog.open) return;

            if (authResult.error) throw authResult.error;

            activeUser = authResult.data.user;

            if (activeUser) {
                const { data, error } = await supabaseClient.rpc(
                    "can_review_guide",
                    { p_guide_id: guideId }
                );

                if (version !== requestVersion || !dialog.open) return;
                if (error) throw error;

                eligible = data === true;

                ownReview = rows.find(
                    row => row.user_id === activeUser.id
                ) || null;
            }

            updateCard(guideId, rows);
            el("gr-summary").textContent = summaryText(rows);

            renderReviews(rows);

            if (eligible) {
                el("gr-form").hidden = false;

                el("gr-rating").value = ownReview
                    ? String(ownReview.rating)
                    : "";

                el("gr-comment").value = ownReview?.comment || "";

                el("gr-save").textContent = ownReview
                    ? "Update review"
                    : "Submit review";

                el("gr-message").textContent =
                    successMessage ||
                    "You can review this guide because they are saved in your trip.";
            } else {
                const explanation = activeUser
                    ? "To review, add this guide to a trip and save that trip. Cancelled trips do not qualify. You cannot review your own guide listing."
                    : "Sign in to write a review.";

                el("gr-message").textContent =
                    [successMessage, explanation].filter(Boolean).join(" ");
            }

            el("gr-delete").hidden = !ownReview;
        } catch (error) {
            if (version !== requestVersion || !dialog.open) return;

            console.error("Load guide reviews:", error);

            el("gr-form").hidden = true;
            el("gr-delete").hidden = true;
            el("gr-retry").hidden = false;
            el("gr-message").textContent =
                "Could not load reviews or check eligibility. Please retry.";
        }
    }

    function renderReviews(rows) {
        const list = el("gr-list");
        list.replaceChildren();

        if (!rows.length) {
            list.appendChild(
                makeElement("p", "No reviews yet.", "gr-message")
            );
            return;
        }

        const ordered = [...rows].sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
        );

        ordered.forEach(row => {
            const article = makeElement("article", undefined, "gr-review");
            const rating = Number(row.rating);

            article.appendChild(
                makeElement(
                    "strong",
                    `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`
                )
            );

            const author = row.user_id === activeUser?.id
                ? "Your review"
                : "Traveler";

            const date = new Date(row.created_at);
            const dateLabel = Number.isNaN(date.getTime())
                ? ""
                : date.toLocaleDateString();

            article.appendChild(
                makeElement(
                    "small",
                    [author, dateLabel].filter(Boolean).join(" · ")
                )
            );

            if (row.comment) {
                article.appendChild(makeElement("p", row.comment));
            }

            list.appendChild(article);
        });
    }

    async function saveReview(event) {
        event.preventDefault();

        if (busy || !eligible || !activeUser) return;

        const rating = Number(el("gr-rating").value);
        const comment = el("gr-comment").value.trim();

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            el("gr-message").textContent = "Choose a rating from 1 to 5.";
            return;
        }

        if ([...comment].length > 1000) {
            el("gr-message").textContent =
                "Keep your comment within 1,000 characters.";
            return;
        }

        setBusy(true);
        el("gr-message").textContent = "Saving review…";

        try {
            // Confirm the current account before writing.
            const { data: authData, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError) throw authError;

            if (!authData.user || authData.user.id !== activeUser.id) {
                throw new Error("Your sign-in changed. Reopen Reviews.");
            }

            let query;

            if (ownReview) {
                query = supabaseClient
                    .from("Reviews")
                    .update({
                        rating,
                        comment: comment || null
                    })
                    .eq("id", ownReview.id)
                    .eq("user_id", activeUser.id)
                    .eq("guide_id", activeGuide.id);
            } else {
                query = supabaseClient
                    .from("Reviews")
                    .insert({
                        user_id: activeUser.id,
                        guide_id: activeGuide.id,
                        rating,
                        comment: comment || null
                    });
            }

            const { data, error } = await query.select("id");

            if (error) throw error;
            if (!data?.length) {
                throw new Error("The review was not saved.");
            }

            await load("Your review was saved.");
        } catch (error) {
            console.error("Save guide review:", error);
            el("gr-message").textContent = friendlyError(error);
        } finally {
            setBusy(false);
        }
    }

    async function deleteReview() {
        if (busy || !ownReview || !activeUser) return;
        if (!window.confirm("Delete your review for this guide?")) return;

        setBusy(true);
        el("gr-message").textContent = "Deleting review…";

        try {
            const { data, error } = await supabaseClient
                .from("Reviews")
                .delete()
                .eq("id", ownReview.id)
                .eq("user_id", activeUser.id)
                .eq("guide_id", activeGuide.id)
                .select("id");

            if (error) throw error;
            if (!data?.length) {
                throw new Error("The review was not deleted.");
            }

            await load("Your review was deleted.");
        } catch (error) {
            console.error("Delete guide review:", error);
            el("gr-message").textContent = friendlyError(error);
        } finally {
            setBusy(false);
        }
    }

    return { attach };
})();
