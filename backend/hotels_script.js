// =========================================
// 1. Supabase Connection Setup (Existing)
// =========================================
const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global variable to hold our data
let hotels = [];

// =========================================
// 2. Fetch & Display Logic (Existing/Updated)
// =========================================
async function fetchHotels() {
    const { data, error } = await supabaseClient
        .from('services')
        .select('*')
        .eq('service_type', 'hotel');

    if (error) {
        console.error('Error fetching hotels:', error);
        return;
    }
    
    // Save the data to our global list
    hotels = data; 
    displayHotels(data);
}

window.onload = async function() {
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (user) {
        const fName = user.user_metadata.first_name || "Traveler";
        const lName = user.user_metadata.last_name || "";
        const email = user.email;
        updateProfileAvatar(fName, lName, email);
    } else {
        window.location.href = 'auth.html'; 
    }
}

function displayHotels(hotelList) {
    const container = document.getElementById('hotelCardsContainer');
    if (!container) return; // Prevent error if elements don't exist yet
    container.innerHTML = ""; 

    hotelList.forEach(hotel => {
        // Hotel Card logic (Already handles showing only the first image)
        const imageUrl = (hotel.photo_urls && hotel.photo_urls.length > 0) 
                         ? hotel.photo_urls[0] 
                         : 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg';

        const card = document.createElement('div');
        card.className = 'hotel-card';

        card.innerHTML = `
            <img src="${imageUrl}" class="hotel-img" alt="${hotel.service_name}">
            <div class="hotel-info">
                <h3>${hotel.service_name}</h3>
                <p style="opacity: 0.7; font-size: 0.9rem;">${hotel.city || 'Sri Lanka'}</p>
                <button class="btn-explore" onclick="visitHotel('${hotel.id}')">View Details</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// =========================================
// 3. Details Modal Logic (CRITICAL REWRITE)
// =========================================
async function visitHotel(hotelId) {
    const hotel = hotels.find(h => String(h.id) == String(hotelId));
    if (!hotel) { console.error("Hotel not found!"); return; }

    // Define the elements we will need
    const modal = document.getElementById('detailsModal');
    const modalHotelName = document.getElementById('modalHotelName');
    const modalGallery = document.getElementById('modalGallery'); // Ensure this ID exists in hotels.html
    const modalInfoContainer = document.getElementById('modalInfoContainer'); // Ensure this ID exists

    // 1. Set the Modal Title
    modalHotelName.innerText = hotel.service_name;

    // 2. Teaser Gallery Logic
    modalGallery.innerHTML = ''; // Always clear first
    
    const photos = hotel.photo_urls || [];
    const numPhotos = photos.length;

    if (numPhotos > 0) {
        // We will show max 4 items (3 standard, 1 special 'See More' if needed)
        // Array.slice(0, 4) gets items 0, 1, 2, and 3
        const teaserPhotos = photos.slice(0, 3);

        teaserPhotos.forEach((url, index) => {
            // Special Case: The 4th item (index 3) when there are > 4 photos total
            if (numPhotos > 3 && index === 2) {
                const seeMoreContainer = document.createElement('div');
                seeMoreContainer.className = 'see-more-container';
                seeMoreContainer.onclick = () => openFullGallery(hotelId); // Opens 2nd modal

                seeMoreContainer.innerHTML = `
                    <img src="${url}" alt="More Photos Teaser">
                    <div class="see-more-overlay">
                        <span class="plus-sign">+${numPhotos - 3}</span>
                        <span>See More</span>
                    </div>
                `;
                modalGallery.appendChild(seeMoreContainer);
            } 
            // Normal Case: Photo items 1, 2, 3 (or standard photos for hotels with < 5 images)
            else {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `${hotel.service_name} teaser`;
                img.className = 'teaser-item';
                modalGallery.appendChild(img);
            }
        });
    } else {
        modalGallery.innerHTML = '<p style="opacity:0.6;">No photos available.</p>';
    }

    // 3. Set Text Info
    modalInfoContainer.innerHTML = `
        <div class="modal-info-item">
            <b>Description</b>
            <p>${hotel.description || 'No description provided.'}</p>
        </div>
        <div class="modal-info-item">
            <b>Location & Address</b>
            <p>${hotel.address || 'Address not listed'}, ${hotel.city}</p>
        </div>
        <div class="modal-info-item">
            <b>Contact Number</b>
            <p>${hotel.contact || 'Not available'}</p>
        </div>
        <div class="modal-info-item">
            <b>Price Range</b>
            <p>LKR ${hotel.price || 'N/A'}</p>
        </div>
    `;

    // 4. Open the primary modal
    modal.style.display = "block";
}

// Add this to hotels_script.js
document.getElementById('hotelSearch').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = hotels.filter(h => 
        h.service_name.toLowerCase().includes(searchTerm) || 
        h.city.toLowerCase().includes(searchTerm)
    );
    displayHotels(filtered);
});

// Function to close the main details modal
window.closeDetails = function() {
    document.getElementById('detailsModal').style.display = "none";
}

// =========================================
// 4. Full Gallery Modal Logic (The 2nd Modal)
// =========================================
function openFullGallery(hotelId) {
    const hotel = hotels.find(h => h.id == hotelId);
    if (!hotel) return;

    const fullModal = document.getElementById('fullGalleryModal');
    const fullGrid = document.getElementById('fullGalleryGrid');
    const fullTitle = document.getElementById('fullGalleryTitle');

    // 1. Set Title
    fullTitle.innerText = `${hotel.service_name} - All Photos`;

    // 2. Clear old grid and populate with ALL photos
    fullGrid.innerHTML = '';
    
    if (hotel.photo_urls && hotel.photo_urls.length > 0) {
        hotel.photo_urls.forEach((url) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Hotel Photo Full View";
            img.className = 'full-gallery-img';
            fullGrid.appendChild(img);
        });
    }

    // 3. Open the second modal
    fullModal.style.display = "block";
}

function closeFullGallery() {
    document.getElementById('fullGalleryModal').style.display = "none";
}

// 1. Get the search input element
const searchInput = document.getElementById('hotelSearch');

// 2. Listen for the 'Enter' key to trigger the search
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // 3. Filter the global hotels array
        const filteredHotels = hotels.filter(hotel => 
            hotel.service_name.toLowerCase().includes(searchTerm)
        );

        // 4. Check if results were found
        if (filteredHotels.length > 0) {
            // Display only the matching hotels
            displayHotels(filteredHotels);
            
            // Optional: Smoothly scroll to the results section
            document.getElementById('hotelGrid').scrollIntoView({ behavior: 'smooth' });
        } else {
            // Show the popup if no hotel exists
            document.getElementById('searchAlertModal').style.display = "block";
            
            // Reset to show all hotels again
            displayHotels(hotels);
        }
    }
});

searchInput.addEventListener('input', function () {
    if (searchInput.value === "") {
        displayHotels(hotels); // Show everything again if the box is empty
    }
});

function closeSearchAlert() {
    document.getElementById('searchAlertModal').style.display = "none";
}

// =========================================
// 5. Global Cleanup and Initialization
// =========================================
window.onclick = function(event) {
    const detailsModal = document.getElementById('detailsModal');
    const galleryModal = document.getElementById('fullGalleryModal');
    
    if (event.target == detailsModal) {
        detailsModal.style.display = "none";
    }
    
    if (event.target == galleryModal) {
        galleryModal.style.display = "none";
    }
}

document.addEventListener('DOMContentLoaded', fetchHotels);
