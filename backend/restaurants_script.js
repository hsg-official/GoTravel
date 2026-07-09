// =========================================
// Supabase Connection
// =========================================
const supabaseUrl = "https://cdcolkoavowjjymzdzud.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let restaurants = [];
let userLocation = null;
const NEAR_ME_RADIUS_KM = 10;


const DEFAULT_RESTAURANT_IMAGE =
  "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg";

// =========================================
// Basic Helpers
// =========================================
function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function shortText(value, length = 95) {
  if (!value) return "No description provided.";
  const text = String(value).trim();

  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not provided";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function formatTime(value) {
  if (!value) return "Not provided";

  const parts = String(value).split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return value;
}

function setStatus(message) {
  const status = document.getElementById("restaurantStatus");
  if (status) status.textContent = message;
}

function makeChip(label) {
  return `<span class="detail-chip">${escapeHTML(label)}</span>`;
}

function makeCardTag(label) {
  return `<span class="tag-pill">${escapeHTML(label)}</span>`;
}

// =========================================
// Fetch Restaurants from Supabase
// =========================================
async function fetchRestaurants() {
  const container = document.getElementById("restaurantCardsContainer");

  if (!container) return;

  container.innerHTML = "";
  setStatus("Loading restaurants...");

  try {
    const { data, error } = await supabaseClient
      .from("rest_service")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    restaurants = data || [];

    displayRestaurants(restaurants);

    if (!restaurants.length) {
      setStatus("No restaurants have been posted yet.");
    } else {
      setStatus(`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} found.`);
    }
  } catch (error) {
    console.error("Error fetching restaurants:", error);

    setStatus("Failed to load restaurants. Check Supabase SELECT policy for rest_service.");
    container.innerHTML = "";
  }
}

// =========================================
// Display Restaurant Cards
// =========================================
function displayRestaurants(list) {
  const container = document.getElementById("restaurantCardsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!list.length) {
    setStatus("No matching restaurants found.");
    return;
  }

  list.forEach(restaurant => {
    const photos = toArray(restaurant.photo_urls);
    const imageUrl = photos.length ? photos[0] : DEFAULT_RESTAURANT_IMAGE;

    const tags = [];

    if (restaurant.breakfast === "Yes") tags.push("Breakfast");
    if (restaurant.lunch === "Yes") tags.push("Lunch");
    if (restaurant.dinner === "Yes") tags.push("Dinner");

    const facilities = toArray(restaurant.facilities);
    facilities.slice(0, 2).forEach(item => tags.push(item));

    const card = document.createElement("div");
    card.className = "restaurant-card";

    card.innerHTML = `
      <div class="restaurant-img-wrap">
        <img
          src="${escapeHTML(imageUrl)}"
          class="restaurant-img"
          alt="${escapeHTML(restaurant.service_name || "Restaurant")}"
        />
        <span class="restaurant-city-badge">
          ${escapeHTML(restaurant.city || "Sri Lanka")}
        </span>
      </div>

      <div class="restaurant-info">
        <h3>${escapeHTML(restaurant.service_name || "Unnamed Restaurant")}</h3>

        <p class="restaurant-description">
          ${escapeHTML(shortText(restaurant.description))}
        </p>

        <div class="card-tags">
          ${
            tags.length
              ? tags.slice(0, 4).map(makeCardTag).join("")
              : makeCardTag("Restaurant")
          }
        </div>

        <p style="opacity:.72;font-size:.88rem;">
          <b>Contact:</b> ${escapeHTML(restaurant.contact || "Not provided")}
        </p>
        ${
            restaurant.distance_km !== undefined
                ? `<div class="distance-badge">
                    <ion-icon name="navigate-outline"></ion-icon>
                    ${restaurant.distance_km.toFixed(2)} KM away
                </div>`
            : ""
        }
        <button class="btn-explore" type="button">View Details</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      visitRestaurant(restaurant.id);
    });

    container.appendChild(card);
  });
}

// =========================================
// Restaurant Details Modal
// =========================================
function visitRestaurant(id) {
  const restaurant = restaurants.find(item => String(item.id) === String(id));

  if (!restaurant) {
    console.error("Restaurant not found");
    return;
  }

  const modal = document.getElementById("detailsModal");
  const modalRestaurantName = document.getElementById("modalRestaurantName");
  const modalGallery = document.getElementById("modalGallery");
  const modalInfoContainer = document.getElementById("modalInfoContainer");

  modalRestaurantName.textContent =
    restaurant.service_name || "Restaurant Details";

  renderTeaserGallery(restaurant, modalGallery);
  renderRestaurantInfo(restaurant, modalInfoContainer);

  modal.style.display = "block";
}

function renderTeaserGallery(restaurant, modalGallery) {
  const photos = toArray(restaurant.photo_urls);

  modalGallery.innerHTML = "";

  if (!photos.length) {
    modalGallery.innerHTML = `
      <img
        src="${DEFAULT_RESTAURANT_IMAGE}"
        class="teaser-item"
        alt="Default restaurant image"
      />
    `;
    return;
  }

  const teaserPhotos = photos.slice(0, 3);

  teaserPhotos.forEach((url, index) => {
    if (photos.length > 3 && index === 2) {
      const seeMoreContainer = document.createElement("div");
      seeMoreContainer.className = "see-more-container";

      seeMoreContainer.innerHTML = `
        <img src="${escapeHTML(url)}" alt="More restaurant photos" />
        <div class="see-more-overlay">
          <span class="plus-sign">+${photos.length - 3}</span>
          <span>See More</span>
        </div>
      `;

      seeMoreContainer.addEventListener("click", () => {
        openFullGallery(restaurant.id);
      });

      modalGallery.appendChild(seeMoreContainer);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.alt = `${restaurant.service_name || "Restaurant"} photo`;
      img.className = "teaser-item";
      modalGallery.appendChild(img);
    }
  });
}

function renderRestaurantInfo(restaurant, container) {
  const seatCategories = toArray(restaurant.seat_categories);
  const facilities = toArray(restaurant.facilities);
  const paymentMethods = toArray(restaurant.payment_methods);
  const operatingHours = toArray(restaurant.operating_hours);

  const hasLocation = restaurant.latitude && restaurant.longitude;

  container.innerHTML = `
    <div class="details-section">
      <h3>Basic Information</h3>

      <div class="details-grid">
        <div class="info-card">
          <b>Description</b>
          <p>${escapeHTML(restaurant.description || "No description provided.")}</p>
        </div>

        <div class="info-card">
          <b>Address</b>
          <p>${escapeHTML(restaurant.address || "Address not provided")}</p>
        </div>

        <div class="info-card">
          <b>City</b>
          <p>${escapeHTML(restaurant.city || "Not provided")}</p>
        </div>

        <div class="info-card">
          <b>Contact</b>
          <p>${escapeHTML(restaurant.contact || "Not provided")}</p>
        </div>
      </div>

      ${
        hasLocation
          ? `
            <a
              class="map-link"
              href="https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}"
              target="_blank"
            >
              <ion-icon name="location-outline"></ion-icon>
              View Location on Map
            </a>
          `
          : ""
      }
    </div>

    <div class="details-section">
      <h3>Operating Hours</h3>
      ${renderOperatingHours(operatingHours)}
    </div>

    <div class="details-section">
      <h3>Meals & Food Options</h3>

      <div class="details-grid">
        <div class="info-card">
          <b>Breakfast</b>
          <p>${escapeHTML(formatValue(restaurant.breakfast))}</p>
        </div>

        <div class="info-card">
          <b>Lunch</b>
          <p>${escapeHTML(formatValue(restaurant.lunch))}</p>
        </div>

        <div class="info-card">
          <b>Dinner</b>
          <p>${escapeHTML(formatValue(restaurant.dinner))}</p>
        </div>

        <div class="info-card">
          <b>Last Order Time</b>
          <p>${escapeHTML(formatTime(restaurant.last_order_time))}</p>
        </div>

        <div class="info-card">
          <b>Vegetarian Options</b>
          <p>${escapeHTML(formatValue(restaurant.vegetarian_options))}</p>
        </div>

        <div class="info-card">
          <b>Halal Options</b>
          <p>${escapeHTML(formatValue(restaurant.halal_options))}</p>
        </div>

        <div class="info-card">
          <b>Gluten-free Options</b>
          <p>${escapeHTML(formatValue(restaurant.gluten_free_options))}</p>
        </div>

        <div class="info-card">
          <b>Kids Menu</b>
          <p>${escapeHTML(formatValue(restaurant.kids_menu))}</p>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h3>Signature Dishes</h3>
      <div class="info-card">
        <p>${escapeHTML(restaurant.signature_dishes || "Not provided")}</p>
      </div>
    </div>

    <div class="details-section">
      <h3>Restaurant Services</h3>

      <div class="details-grid">
        <div class="info-card">
          <b>Buffet Available</b>
          <p>${escapeHTML(formatValue(restaurant.buffet_available))}</p>
        </div>

        <div class="info-card">
          <b>Buffet Time</b>
          <p>${escapeHTML(formatTime(restaurant.buffet_time))}</p>
        </div>

        <div class="info-card">
          <b>Take Away</b>
          <p>${escapeHTML(formatValue(restaurant.take_away))}</p>
        </div>

        <div class="info-card">
          <b>Home Delivery</b>
          <p>${escapeHTML(formatValue(restaurant.home_delivery))}</p>
        </div>

        <div class="info-card">
          <b>Delivery Radius</b>
          <p>${
            restaurant.delivery_radius_km
              ? `${escapeHTML(restaurant.delivery_radius_km)} KM`
              : "Not provided"
          }</p>
        </div>

        <div class="info-card">
          <b>Taxes Included</b>
          <p>${escapeHTML(formatValue(restaurant.taxes_included))}</p>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h3>Seat Categories</h3>
      <div class="chip-list">
        ${
          seatCategories.length
            ? seatCategories.map(makeChip).join("")
            : makeChip("Not provided")
        }
      </div>
    </div>

    <div class="details-section">
      <h3>Facilities</h3>
      <div class="chip-list">
        ${
          facilities.length
            ? facilities.map(makeChip).join("")
            : makeChip("Not provided")
        }
      </div>
    </div>

    <div class="details-section">
      <h3>Payment Methods</h3>
      <div class="chip-list">
        ${
          paymentMethods.length
            ? paymentMethods.map(makeChip).join("")
            : makeChip("Not provided")
        }
      </div>
    </div>
  `;
}

function renderOperatingHours(hours) {
  if (!hours.length) {
    return `
      <div class="info-card">
        <p>Operating hours not provided.</p>
      </div>
    `;
  }

  return `
    <table class="hours-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Opening Time</th>
          <th>Closing Time</th>
        </tr>
      </thead>
      <tbody>
        ${hours
          .map(hour => {
            return `
              <tr>
                <td>${escapeHTML(hour.day || "Not provided")}</td>
                <td>${escapeHTML(formatTime(hour.opening_time))}</td>
                <td>${escapeHTML(formatTime(hour.close_time))}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

// =========================================
// Full Gallery Modal
// =========================================
function openFullGallery(id) {
  const restaurant = restaurants.find(item => String(item.id) === String(id));
  if (!restaurant) return;

  const photos = toArray(restaurant.photo_urls);
  const fullModal = document.getElementById("fullGalleryModal");
  const fullGrid = document.getElementById("fullGalleryGrid");
  const fullTitle = document.getElementById("fullGalleryTitle");

  fullTitle.textContent = `${restaurant.service_name || "Restaurant"} - All Photos`;
  fullGrid.innerHTML = "";

  if (!photos.length) {
    fullGrid.innerHTML = `
      <p style="opacity:.7;text-align:center;">No photos available.</p>
    `;
  } else {
    photos.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Restaurant photo";
      img.className = "full-gallery-img";
      fullGrid.appendChild(img);
    });
  }

  fullModal.style.display = "block";
}

function closeFullGallery() {
  document.getElementById("fullGalleryModal").style.display = "none";
}

function closeDetails() {
  document.getElementById("detailsModal").style.display = "none";
}

function closeSearchAlert() {
  document.getElementById("searchAlertModal").style.display = "none";
}

// Make functions available for inline HTML onclick
window.closeDetails = closeDetails;
window.closeFullGallery = closeFullGallery;
window.closeSearchAlert = closeSearchAlert;

// =========================================
// Search
// =========================================
function setupSearch() {
  const searchInput = document.getElementById("restaurantSearch");

  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
      displayRestaurants(restaurants);
      setStatus(`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} found.`);
      return;
    }

    const filteredRestaurants = restaurants.filter(restaurant => {
      const name = String(restaurant.service_name || "").toLowerCase();
      const city = String(restaurant.city || "").toLowerCase();
      const address = String(restaurant.address || "").toLowerCase();
      const dishes = String(restaurant.signature_dishes || "").toLowerCase();

      return (
        name.includes(searchTerm) ||
        city.includes(searchTerm) ||
        address.includes(searchTerm) ||
        dishes.includes(searchTerm)
      );
    });

    displayRestaurants(filteredRestaurants);

    if (!filteredRestaurants.length) {
      document.getElementById("searchAlertModal").style.display = "block";
    }
  });

  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("restaurantGrid").scrollIntoView({
        behavior: "smooth"
      });
    }
  });
}

// =========================================
// Navbar Dropdown
// =========================================
function setupDropdown() {
  const transportBtn = document.getElementById("transportBtn");
  const transportMenu = document.getElementById("transportMenu");

  if (!transportBtn || !transportMenu) return;

  transportBtn.addEventListener("click", event => {
    event.stopPropagation();
    transportMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    transportMenu.classList.remove("show");
  });
}

// =========================================
// Modal Outside Click Close
// =========================================
function setupModalCloseEvents() {
  window.addEventListener("click", event => {
    const detailsModal = document.getElementById("detailsModal");
    const fullGalleryModal = document.getElementById("fullGalleryModal");
    const searchAlertModal = document.getElementById("searchAlertModal");

    if (event.target === detailsModal) {
      detailsModal.style.display = "none";
    }

    if (event.target === fullGalleryModal) {
      fullGalleryModal.style.display = "none";
    }

    if (event.target === searchAlertModal) {
      searchAlertModal.style.display = "none";
    }
  });
}
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function getRestaurantsWithinRadius(userLat, userLng, radiusKm = 10) {
  return restaurants
    .filter(restaurant => restaurant.latitude && restaurant.longitude)
    .map(restaurant => {
      const distanceKm = calculateDistanceKm(
        userLat,
        userLng,
        Number(restaurant.latitude),
        Number(restaurant.longitude)
      );

      return {
        ...restaurant,
        distance_km: distanceKm
      };
    })
    .filter(restaurant => restaurant.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

function findRestaurantsNearMe() {
  if (!navigator.geolocation) {
    alert("Location is not supported by this browser.");
    return;
  }

  setStatus("Finding restaurants near your location...");

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      const nearbyRestaurants = getRestaurantsWithinRadius(
        userLocation.latitude,
        userLocation.longitude,
        NEAR_ME_RADIUS_KM
      );

      displayRestaurants(nearbyRestaurants);

      document.getElementById("clearNearMeBtn")?.classList.remove("hidden");

      if (nearbyRestaurants.length) {
        setStatus(
          `${nearbyRestaurants.length} restaurant${nearbyRestaurants.length === 1 ? "" : "s"} found within ${NEAR_ME_RADIUS_KM} KM of your location.`
        );
      } else {
        setStatus(`No restaurants found within ${NEAR_ME_RADIUS_KM} KM of your location.`);
      }

      document.getElementById("restaurantGrid").scrollIntoView({
        behavior: "smooth"
      });
    },
    error => {
      console.error(error);

      if (error.code === error.PERMISSION_DENIED) {
        alert("Please allow location access to use Restaurants Near Me.");
      } else {
        alert("Could not get your location. Please try again.");
      }

      setStatus(`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} found.`);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function clearNearMeFilter() {
  userLocation = null;

  displayRestaurants(restaurants);

  document.getElementById("clearNearMeBtn")?.classList.add("hidden");

  setStatus(`${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"} found.`);

  const searchInput = document.getElementById("restaurantSearch");
  if (searchInput) searchInput.value = "";
}

function setupNearMeFilter() {
  const nearMeBtn = document.getElementById("nearMeBtn");
  const clearNearMeBtn = document.getElementById("clearNearMeBtn");

  if (nearMeBtn) {
    nearMeBtn.addEventListener("click", findRestaurantsNearMe);
  }

  if (clearNearMeBtn) {
    clearNearMeBtn.addEventListener("click", clearNearMeFilter);
  }
}
// =========================================
// Initialize
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  setupDropdown();
  setupSearch();
  setupNearMeFilter();
  setupModalCloseEvents();
  fetchRestaurants();
});