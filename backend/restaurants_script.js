// =========================================
// 1. Supabase Connection Setup (Existing)
// =========================================
const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Global variable to hold our data
let restaurants = [];

// =========================================
// 2. Fetch & Display Logic (Existing/Updated)
// =========================================
async function fetchrestaurants() {
    const { data, error } = await supabaseClient
        .from('services')
        .select('*')
        .eq('service_type', 'restaurant');

    if (error) {
        console.error('Error fetching restaurants:', error);
        return;
    }
    
    // Save the data to our global list
    restaurants = data; 
    displayRestaurants(data);
}

function displayRestaurants(list) {
    const container = document.getElementById('restaurantCardsContainer');
    if (!container) return; // Prevent error if elements don't exist yet
    container.innerHTML = ""; 

    list.forEach(item => {
        // Restaurant Card logic (Already handles showing only the first image)
        const imageUrl = (item.photo_urls && item.photo_urls.length > 0) 
                         ? item.photo_urls[0] 
                         : 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg';

        const card = document.createElement('div');
        card.className = 'restaurant-card';

        card.innerHTML = `
            <img src="${imageUrl}" class="restaurant-img" alt="${item.service_name}">
            <div class="restaurant-info">
                <h3>${item.service_name}</h3>
                <p style="opacity: 0.7; font-size: 0.9rem;">${item.city || 'Sri Lanka'}</p>
                <button class="btn-explore" onclick="visitRestaurant('${item.id}')">View Details</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// =========================================
// 3. Details Modal Logic (CRITICAL REWRITE)
// =========================================
async function visitRestaurant(Id) {
    const restaurant = restaurants.find(h => String(h.id) == String(Id));
    if (!restaurant) { console.error("Restaurant not found!"); return; }

    // Define the elements we will need
    const modal = document.getElementById('detailsModal');
    const modalRestaurantName = document.getElementById('modalRestaurantName');
    const modalGallery = document.getElementById('modalGallery'); // Ensure this ID exists in restaurants.html
    const modalInfoContainer = document.getElementById('modalInfoContainer'); // Ensure this ID exists

    // 1. Set the Modal Title
    modalRestaurantName.innerText = restaurant.service_name;

    // 2. Teaser Gallery Logic
    modalGallery.innerHTML = ''; // Always clear first
    
    const photos = restaurant.photo_urls || [];
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
                seeMoreContainer.onclick = () => openFullGallery(Id); // Opens 2nd modal

                seeMoreContainer.innerHTML = `
                    <img src="${url}" alt="More Photos Teaser">
                    <div class="see-more-overlay">
                        <span class="plus-sign">+${numPhotos - 3}</span>
                        <span>See More</span>
                    </div>
                `;
                modalGallery.appendChild(seeMoreContainer);
            } 
            // Normal Case: Photo items 1, 2, 3 (or standard photos for restauraants with < 5 images)
            else {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `${restaurant.service_name} teaser`;
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
            <p>${restaurant.description || 'No description provided.'}</p>
        </div>
        <div class="modal-info-item">
            <b>Location & Address</b>
            <p>${restaurant.address || 'Address not listed'}, ${restaurant.city}</p>
        </div>
        <div class="modal-info-item">
            <b>Contact Number</b>
            <p>${restaurant.contact || 'Not available'}</p>
        </div>
        <div class="modal-info-item">
            <b>Price Range</b>
            <p>LKR ${restaurant.price || 'N/A'}</p>
        </div>
    `;

    // 4. Open the primary modal
    modal.style.display = "block";
}

// Add this to restaurants_script.js
document.getElementById('restaurantSearch').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = restaurants.filter(h => 
        h.service_name.toLowerCase().includes(searchTerm) || 
        h.city.toLowerCase().includes(searchTerm)
    );
    displayRestaurants(filtered);
});

// Function to close the main details modal
window.closeDetails = function() {
    document.getElementById('detailsModal').style.display = "none";
}

// =========================================
// 4. Full Gallery Modal Logic (The 2nd Modal)
// =========================================
function openFullGallery(Id) {
    const restaurant = restaurants.find(h => h.id == Id);
    if (!restaurant) return;

    const fullModal = document.getElementById('fullGalleryModal');
    const fullGrid = document.getElementById('fullGalleryGrid');
    const fullTitle = document.getElementById('fullGalleryTitle');

    // 1. Set Title
    fullTitle.innerText = `${restaurant.service_name} - All Photos`;

    // 2. Clear old grid and populate with ALL photos
    fullGrid.innerHTML = '';
    
    if (restaurant.photo_urls && restaurant.photo_urls.length > 0) {
        restaurant.photo_urls.forEach((url) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Restaurant Photo Full View";
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
const searchInput = document.getElementById('restaurantSearch');

// 2. Listen for the 'Enter' key to trigger the search
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // 3. Filter the global restaurants array
        const filteredrestaurants = restaurants.filter(restaurant => 
            restaurant.service_name.toLowerCase().includes(searchTerm)
        );

        // 4. Check if results were found
        if (filteredRestaurants.length > 0) {
            // Display only the matching restaurants
            displayRestaurants(filteredRestaurants);
            
            // Optional: Smoothly scroll to the results section
            document.getElementById('restaurantGrid').scrollIntoView({ behavior: 'smooth' });
        } else {
            // Show the popup if no restaurant exists
            document.getElementById('searchAlertModal').style.display = "block";
            
            // Reset to show all restaurants again
            displayRestaurants(restaurants);
        }
    }
});

searchInput.addEventListener('input', function () {
    if (searchInput.value === "") {
        displayRestaurants(restaurants); // Show everything again if the box is empty
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

document.addEventListener('DOMContentLoaded', fetchrestaurants);
