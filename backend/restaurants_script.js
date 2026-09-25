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
  .eq("approval_status", "approved")
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
    RestaurantReviews.attach(card, restaurant);
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

  if (localStorage.getItem('isSelectingRestaurant') === 'true') {
    const selectButton = document.createElement('button');

    selectButton.type = 'button';
    selectButton.className = 'btn-explore';
    selectButton.textContent = 'Select Restaurant';

    selectButton.addEventListener('click', () => {
        selectRestaurant(restaurant.id);
    });

    modalInfoContainer.appendChild(selectButton);
}

  modal.style.display = "block";
}

function selectRestaurant(id) {
    const restaurant = restaurants.find(
        item => String(item.id) === String(id)
    );

    if (!restaurant) return;

    const draft = JSON.parse(
        localStorage.getItem('tripDraft') || '{}'
    );

    if (!Array.isArray(draft.restaurants)) {
        draft.restaurants = [];
    }

   draft.restaurants.push({
    id: String(restaurant.id).toLowerCase(),
    name: restaurant.service_name || '',
    destination: restaurant.city || '',
    date: '',
    meal: 'Breakfast',
    time: '',
    guests: '1'
});
    localStorage.setItem(
        'tripDraft',
        JSON.stringify(draft)
    );

    localStorage.setItem(
        'selectedRestaurantName',
        restaurant.service_name || 'Restaurant'
    );

    window.location.href = 'personal.html';
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
// ===== RESTAURANT REVIEWS =====
const RestaurantReviews = (() => {
    const summaries = new Map();
    let dialog;
    let activeRestaurant;
    let user;
    let ownReview;
    let eligible = false;
    let busy = false;
    let version = 0;
    let previousFocus;

    const el = id => document.getElementById(id);

    function make(tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function summary(rows) {
        if (!rows.length) return "No reviews yet";

        const total = rows.reduce(
            (sum, row) => sum + Number(row.rating), 0
        );

        return `★ ${(total / rows.length).toFixed(1)} / 5 · ${
            rows.length
        } review${rows.length === 1 ? "" : "s"}`;
    }

    async function readReviews(id, full = false) {
        const rows = [];

        for (let start = 0; ; start += 500) {
            const { data, error } = await supabaseClient
                .from("Reviews")
                .select(
                    full
                        ? "id,user_id,rating,comment,created_at"
                        : "id,rating"
                )
                .eq("restaurant_id", id)
                .order("id", { ascending: true })
                .range(start, start + 499);

            if (error) throw error;

            rows.push(...(data || []));
            if (!data || data.length < 500) return rows;
        }
    }

    function attach(card, restaurant) {
        const info = card.querySelector(".restaurant-info");
        if (!info || info.querySelector(".rr-button")) return;

        card.dataset.reviewRestaurantId = String(restaurant.id);

        const label = make("p", "Loading reviews…", "rr-summary");
        const button = make("button", "Reviews", "rr-button");
        button.type = "button";

        button.addEventListener("click", event => {
            event.stopPropagation();
            open(restaurant, button);
        });

        info.append(label, button);

        const id = String(restaurant.id);

        if (!summaries.has(id)) {
            summaries.set(id, readReviews(id));
        }

        const request = summaries.get(id);

        request.then(rows => {
            if (label.isConnected) label.textContent = summary(rows);
        }).catch(error => {
            if (summaries.get(id) === request) summaries.delete(id);
            label.textContent = "Rating unavailable";
            console.error("Restaurant rating:", error);
        });
    }

    function updateCards(id, rows) {
        summaries.set(String(id), Promise.resolve(rows));

        document.querySelectorAll(".restaurant-card").forEach(card => {
            if (card.dataset.reviewRestaurantId !== String(id)) return;
            const label = card.querySelector(".rr-summary");
            if (label) label.textContent = summary(rows);
        });
    }

    function buildDialog() {
        if (dialog) return;

        dialog = document.createElement("dialog");
        dialog.className = "rr-dialog";
        dialog.setAttribute("aria-labelledby", "rr-title");

        dialog.innerHTML = `
            <div class="rr-header">
                <h2 id="rr-title">Restaurant reviews</h2>
                <button id="rr-close" type="button"
                        class="rr-close"
                        aria-label="Close reviews">×</button>
            </div>

            <p id="rr-summary" class="rr-summary"></p>

            <p id="rr-message" class="rr-message"
               role="status" aria-live="polite"></p>

            <form id="rr-form" class="rr-form" hidden>
                <label for="rr-rating">Your rating</label>
                <select id="rr-rating" required>
                    <option value="">Choose a rating</option>
                    <option value="5">★★★★★ — 5 Excellent</option>
                    <option value="4">★★★★☆ — 4 Good</option>
                    <option value="3">★★★☆☆ — 3 Average</option>
                    <option value="2">★★☆☆☆ — 2 Poor</option>
                    <option value="1">★☆☆☆☆ — 1 Very poor</option>
                </select>

                <label for="rr-comment">
                    Comment (optional, maximum 1,000 characters)
                </label>
                <textarea id="rr-comment" maxlength="1000"
                          placeholder="Share your experience."></textarea>

                <button id="rr-save" type="submit" class="rr-action">
                    Submit review
                </button>
            </form>

            <button id="rr-delete" type="button"
                    class="rr-action rr-delete" hidden>
                Delete my review
            </button>

            <button id="rr-retry" type="button"
                    class="rr-action" hidden>
                Retry loading
            </button>

            <div id="rr-list"></div>
        `;

        document.body.appendChild(dialog);

        el("rr-close").addEventListener("click", () => {
            if (!busy) dialog.close();
        });

        dialog.addEventListener("cancel", event => {
            if (busy) event.preventDefault();
        });

        dialog.addEventListener("close", () => {
            version++;
            previousFocus?.focus();
        });

        el("rr-form").addEventListener("submit", save);
        el("rr-delete").addEventListener("click", remove);
        el("rr-retry").addEventListener("click", () => load());
    }

    function setBusy(value) {
        busy = value;
        [
            "rr-close", "rr-save", "rr-delete",
            "rr-retry", "rr-rating", "rr-comment"
        ].forEach(id => {
            el(id).disabled = value;
        });
    }

    function messageFor(error) {
        if (error.code === "23505") {
            return "You already reviewed this restaurant. Reopen Reviews to edit it.";
        }
        if (error.code === "42501") {
            return "Review not allowed. Make sure this restaurant is in your saved trip and you are signed in.";
        }
        if (error.code === "23514") {
            return "The review did not pass database validation. Please check the review setup.";
        }
        return "Could not complete the request. Please try again.";
    }

    async function open(restaurant, trigger) {
        if (busy) return;

        buildDialog();
        activeRestaurant = restaurant;
        previousFocus = trigger;

        el("rr-title").textContent =
            `${restaurant.service_name || "Restaurant"} — Reviews`;

        if (!dialog.open) dialog.showModal();
        await load();
    }

    function renderRows(rows) {
        const list = el("rr-list");
        list.replaceChildren();

        if (!rows.length) {
            list.append(make("p", "No reviews yet.", "rr-message"));
            return;
        }

        [...rows]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .forEach(row => {
                const article = make("article", undefined, "rr-review");
                const rating = Math.max(
                    1, Math.min(5, Math.trunc(Number(row.rating) || 1))
                );

                article.append(make(
                    "strong",
                    "★".repeat(rating) + "☆".repeat(5 - rating)
                ));

                const author = row.user_id === user?.id
                    ? "Your review"
                    : "Traveler";

                const date = new Date(row.created_at);
                const dateText = Number.isNaN(date.getTime())
                    ? ""
                    : date.toLocaleDateString();

                article.append(make(
                    "small",
                    [author, dateText].filter(Boolean).join(" · ")
                ));

                // textContent prevents comments from executing HTML.
                if (row.comment) article.append(make("p", row.comment));

                list.append(article);
            });
    }

    async function load(successMessage = "") {
        const currentVersion = ++version;
        const id = activeRestaurant.id;

        user = null;
        ownReview = null;
        eligible = false;

        el("rr-form").hidden = true;
        el("rr-delete").hidden = true;
        el("rr-retry").hidden = true;
        el("rr-list").replaceChildren();
        el("rr-summary").textContent = "";
        el("rr-message").textContent = "Loading reviews…";

        const stale = () =>
            currentVersion !== version || !dialog.open;

        try {
            const rows = await readReviews(id, true);
            if (stale()) return;

            updateCards(id, rows);
            el("rr-summary").textContent = summary(rows);
            renderRows(rows);

            const { data: sessionData, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (stale()) return;
            if (sessionError) throw sessionError;

            if (sessionData.session) {
                const { data, error } =
                    await supabaseClient.auth.getUser();

                if (stale()) return;
                if (error) throw error;
                user = data.user;
            }

            if (user) {
                ownReview = rows.find(
                    row => row.user_id === user.id
                ) || null;

                const { data, error } = await supabaseClient.rpc(
                    "can_review_restaurant",
                    { p_restaurant_id: id }
                );

                if (stale()) return;
                if (error) throw error;
                eligible = data === true;
            }

            renderRows(rows);
            el("rr-delete").hidden = !ownReview;

            if (eligible) {
                el("rr-form").hidden = false;
                el("rr-rating").value =
                    ownReview ? String(ownReview.rating) : "";
                el("rr-comment").value = ownReview?.comment || "";
                el("rr-save").textContent =
                    ownReview ? "Update review" : "Submit review";

                el("rr-message").textContent =
                    successMessage ||
                    "This restaurant is in your saved trip. You can write a review.";
            } else {
                const explanation = user
                    ? "Select this restaurant through your planner and save the trip to review it. For older trips, remove the old restaurant entry and select it again. Cancelled trips do not qualify. Owners cannot review their own restaurant."
                    : "Sign in to write a review. You can still read existing reviews.";

                el("rr-message").textContent =
                    [successMessage, explanation].filter(Boolean).join(" ");
            }
        } catch (error) {
            if (stale()) return;

            console.error("Load restaurant reviews:", error);
            el("rr-form").hidden = true;
            el("rr-delete").hidden = true;
            el("rr-retry").hidden = false;
            el("rr-message").textContent =
                "Could not load reviews or check eligibility. Please retry.";
        }
    }

    async function checkAccount() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) throw error;

        if (!data.user || data.user.id !== user?.id) {
            throw new Error("Sign-in changed. Reopen Reviews.");
        }
    }

    async function save(event) {
        event.preventDefault();
        if (busy || !eligible || !user) return;

        const rating = Number(el("rr-rating").value);
        const comment = el("rr-comment").value.trim();

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            el("rr-message").textContent = "Choose a rating from 1 to 5.";
            return;
        }

        if ([...comment].length > 1000) {
            el("rr-message").textContent =
                "Keep your comment within 1,000 characters.";
            return;
        }

        setBusy(true);
        el("rr-message").textContent = "Saving review…";

        try {
            await checkAccount();
            let query;

            if (ownReview) {
                query = supabaseClient
                    .from("Reviews")
                    .update({ rating, comment: comment || null })
                    .eq("id", ownReview.id)
                    .eq("user_id", user.id)
                    .eq("restaurant_id", activeRestaurant.id);
            } else {
                query = supabaseClient
                    .from("Reviews")
                    .insert({
                        user_id: user.id,
                        restaurant_id: activeRestaurant.id,
                        hotel_id: null,
                        guide_id: null,
                        transport_id: null,
                        rating,
                        comment: comment || null
                    });
            }

            const { data, error } = await query.select("id");
            if (error) throw error;
            if (!data?.length) throw new Error("Review was not saved.");

            await load("Your review was saved.");
        } catch (error) {
            console.error("Save restaurant review:", error);
            el("rr-message").textContent = messageFor(error);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (busy || !ownReview || !user) return;
        if (!window.confirm("Delete your review for this restaurant?")) return;

        setBusy(true);
        el("rr-message").textContent = "Deleting review…";

        try {
            await checkAccount();

            const { data, error } = await supabaseClient
                .from("Reviews")
                .delete()
                .eq("id", ownReview.id)
                .eq("user_id", user.id)
                .eq("restaurant_id", activeRestaurant.id)
                .select("id");

            if (error) throw error;
            if (!data?.length) throw new Error("Review was not deleted.");

            await load("Your review was deleted.");
        } catch (error) {
            console.error("Delete restaurant review:", error);
            el("rr-message").textContent = messageFor(error);
        } finally {
            setBusy(false);
        }
    }

    return { attach };
})();
