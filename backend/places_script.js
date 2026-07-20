document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.gradient-bg').style.backgroundImage =
        "linear-gradient(rgba(10,10,20,0.75), rgba(10,10,20,0.85)), url('../src/images/sri-lanka.jpg')";
});
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwHltBHkWqBNrk67zieDRl9xr1hscq3ZlnJu7aHv6njFxhL0vt6tyWg0hJYeTxLz5liPA/exec';

// Store selected destinations
let selectedDestinations = JSON.parse(localStorage.getItem('selectedDestinations') || '[]');
let currentDestination = null;

// Update badge count
function updateBadge() {
    const badge = document.getElementById('selectedBadge');
    const count = document.getElementById('badgeCount');
    count.textContent = selectedDestinations.length;

    if (selectedDestinations.length > 0) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Check if destination is already selected
function isSelected(destination) {
    return selectedDestinations.some(d => d.name === destination);
}

// Toggle destination selection
function toggleSelection() {
    if (!currentDestination) return;

    const btn = document.getElementById('selectDestBtn');

    if (isSelected(currentDestination.name)) {
        selectedDestinations = selectedDestinations.filter(d => d.name !== currentDestination.name);
        btn.innerHTML = '<i class="fas fa-plus"></i><span>Select Destination</span>';
        btn.classList.remove('selected');
    } else {
        selectedDestinations.push({
            name: currentDestination.name,
            rating: currentDestination.rating,
            imageUrl: currentDestination.imageUrl,
            addedAt: new Date().toISOString()
        });
        btn.innerHTML = '<i class="fas fa-check"></i><span>Selected</span>';
        btn.classList.add('selected');
    }

    localStorage.setItem('selectedDestinations', JSON.stringify(selectedDestinations));
    updateBadge();
}

// Update select button state
function updateSelectButton() {
    if (!currentDestination) return;

    const btn = document.getElementById('selectDestBtn');
    if (isSelected(currentDestination.name)) {
        btn.innerHTML = '<i class="fas fa-check"></i><span>Selected</span>';
        btn.classList.add('selected');
    } else {
        btn.innerHTML = '<i class="fas fa-plus"></i><span>Select Destination</span>';
        btn.classList.remove('selected');
    }
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
// Show selected destinations modal
function showSelectedModal() {
    const modal = document.getElementById('selectedModal');
    const list = document.getElementById('selectedList');

    if (selectedDestinations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marked-alt"></i>
                <p>No destinations selected yet</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Search for destinations and click "Select Destination" to build your trip!</p>
            </div>
        `;
    } else {
        list.innerHTML = selectedDestinations.map(dest => `
            <div class="selected-item">
                <div class="selected-item-info">
                    <h3>${dest.name}</h3>
                    <p>⭐ ${dest.rating || '4.5'} • Added ${new Date(dest.addedAt).toLocaleDateString()}</p>
                </div>
                <button class="remove-btn" onclick="removeDestination('${dest.name}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `).join('');
    }

    modal.style.display = 'block';
}

// Remove destination
function removeDestination(name) {
    selectedDestinations = selectedDestinations.filter(d => d.name !== name);
    localStorage.setItem('selectedDestinations', JSON.stringify(selectedDestinations));
    updateBadge();
    showSelectedModal();
    updateSelectButton();
}

async function getAIInfo(destination) {
    const cache = JSON.parse(localStorage.getItem('travelCache') || '{}');
    if (cache[destination]) {
        console.log('Using cached data for', destination);
        return cache[destination];
    }

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?destination=${encodeURIComponent(destination)}`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.error && data.fallback) {
            console.log('Using fallback data:', data.error);
            return data.fallback;
        }

        cache[destination] = data;
        localStorage.setItem('travelCache', JSON.stringify(cache));

        return data;

    } catch (e) {
        console.error('Error fetching from Google Script:', e);
        return getLocalFallback(destination);
    }
}

function getLocalFallback(destination) {
    const fallbacks = {
        "Sigiriya": {
            description: "Sigiriya, also known as Lion Rock, is an ancient rock fortress and UNESCO World Heritage Site in Sri Lanka, famous for its stunning views and historical frescoes.",
            history: "Built in the 5th century by King Kasyapa as a royal palace and fortress. The site features ancient water gardens, mirror walls, and lion paw staircases.",
            thingsToDo: ["Climb 1200 steps to summit", "See ancient Sigiriya frescoes", "Visit water gardens", "Explore archaeological museum", "Photograph panoramic views"],
            ticketPrice: "$30 USD",
            openingHours: "7:00 AM - 5:30 PM",
            bestTime: "December to April",
            visitDuration: "3-4 hours",
            rating: 4.8,
            imageUrl: "https://images.unsplash.com/photo-1564507592333-cb6f2f40d3b9?auto=format&fit=crop&q=80"
        },
        "Ella": {
            description: "Ella is a scenic hill town in Sri Lanka's tea country, known for cool weather, waterfalls, hiking trails, and the famous Nine Arches Bridge.",
            history: "Ella became prominent during British colonial era for tea plantations. The name means 'waterfall' in Sinhala, reflecting the area's natural beauty.",
            thingsToDo: ["Hike Ella Rock at sunrise", "Walk Nine Arches Bridge", "Visit Rawana Ella Falls", "Tour tea factories", "Take scenic train ride"],
            ticketPrice: "Free (activities extra)",
            openingHours: "Always accessible",
            bestTime: "January to March",
            visitDuration: "2-3 days",
            rating: 4.6,
            imageUrl: "https://images.unsplash.com/photo-1564507592333-cb6f2f40d3b9?auto=format&fit=crop&q=80"
        },
        "Galle Fort": {
            description: "Galle Fort is a UNESCO World Heritage Site featuring historic Portuguese and Dutch fortifications by the sea, with charming streets and colonial architecture.",
            history: "Built starting in 1588 by Portuguese, expanded by Dutch in 1649. Survived the 2004 tsunami. A living fort with residents and businesses.",
            thingsToDo: ["Walk fort walls at sunset", "See Galle Lighthouse", "Shop for souvenirs", "Try seafood restaurants", "Visit Historical Museum"],
            ticketPrice: "Free entry",
            openingHours: "24 hours",
            bestTime: "November to April",
            visitDuration: "1 full day",
            rating: 4.7,
            imageUrl: "https://images.unsplash.com/photo-1564507592333-cb6f2f40d3b9?auto=format&fit=crop&q=80"
        }
    };

    return fallbacks[destination] || {
        description: `${destination} is a beautiful destination in Sri Lanka.`,
        history: "Rich cultural and natural history.",
        thingsToDo: ["Explore", "Photograph", "Relax"],
        ticketPrice: "Varies",
        openingHours: "Open daily",
        bestTime: "Dec-Apr",
        visitDuration: "2-4 hours",
        rating: 4.5,
        imageUrl: "https://images.unsplash.com/photo-1564507592333-cb6f2f40d3b9?auto=format&fit=crop&q=80"
    };
}

async function loadDestination(destination) {
    document.getElementById('loader').style.display = 'block';
    document.getElementById('destinationSection').style.display = 'none';

    const aiData = await getAIInfo(destination);

    currentDestination = {
        name: destination,
        rating: aiData.rating || '4.5',
        imageUrl: aiData.imageUrl
    };

    document.getElementById('destName').textContent = destination.toUpperCase();
    document.getElementById('rating').textContent = aiData.rating || '4.5';
    document.getElementById('description').textContent = aiData.description || 'No description available.';
    document.getElementById('history').textContent = aiData.history || 'No history available.';
    document.getElementById('ticketPrice').textContent = aiData.ticketPrice || 'N/A';
    document.getElementById('openingHours').textContent = aiData.openingHours || 'N/A';
    document.getElementById('bestTime').textContent = aiData.bestTime || 'N/A';
    document.getElementById('visitDuration').textContent = aiData.visitDuration || 'N/A';

    const list = document.getElementById('thingsToDo');
    list.innerHTML = '';
    (aiData.thingsToDo || []).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check-circle"></i> ${item}`;
        list.appendChild(li);
    });

    const bg = document.getElementById('destImageBg');
    bg.style.backgroundImage = aiData.imageUrl ? `url(${aiData.imageUrl})` : 'none';
    document.querySelector('.gradient-bg').style.backgroundImage =
    aiData.imageUrl
    ?
    `linear-gradient(rgba(10,10,20,0.55), rgba(10,10,20,0.65)), url(${aiData.imageUrl})`
    :
    "linear-gradient(rgba(10,10,20,0.75), rgba(10,10,20,0.85)), url('../src/images/sri-lanka.jpg')";
    updateSelectButton();

    document.getElementById('loader').style.display = 'none';
    document.getElementById('destinationSection').style.display = 'block';

    setTimeout(() => {
        document.getElementById('destinationSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
}

function handlePlannerSelection() {
    if (!currentDestination) {
        alert("Please search and load a destination first!");
        return;
    }

    const isPlanning = localStorage.getItem('isSelectingDestination');

    if (isPlanning === 'true') {
        localStorage.setItem('selectedDestination', currentDestination.name);
        localStorage.setItem('selectedDestImage', currentDestination.imageUrl);
        localStorage.removeItem('isSelectingDestination');
        window.location.href = 'personal.html';
    } else {
        toggleSelection();
    }
}

function updateClock() {
    const n = new Date();
    document.getElementById('time').textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('date').textContent = n.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('selectedModal').style.display = 'none';
    });

    document.getElementById('selectedModal').addEventListener('click', (e) => {
        if (e.target.id === 'selectedModal') {
            document.getElementById('selectedModal').style.display = 'none';
        }
    });

    document.getElementById('selectedBadge').addEventListener('click', showSelectedModal);
    document.getElementById('selectDestBtn').addEventListener('click', handlePlannerSelection);

    document.getElementById('searchBtn').addEventListener('click', () => {
        const q = document.getElementById('searchInput').value.trim();
        if (q) loadDestination(q);
        else alert('Please enter a destination name');
    });

    document.getElementById('searchInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('searchBtn').click();
    });

    document.querySelectorAll('.suggestion-card').forEach(card => {
        card.addEventListener('click', () => {
            document.getElementById('searchInput').value = card.querySelector('h3').textContent;
            loadDestination(card.getAttribute('data-destination'));
        });
    });

    setInterval(updateClock, 1000);
    updateClock();
    setTimeout(() => document.getElementById('searchInput').focus(), 600);
    updateBadge();
});
