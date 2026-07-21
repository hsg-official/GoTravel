//GoTravel — Hotels Page Script
   
const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const WISHLIST_KEY = "gotravel_hotel_wishlist";

let allHotels = [];      // every hotel_service row (+ its rooms, + computed minPrice)
let currentHotels = [];  // whatever is currently on screen after filters/search


//Wishlist (stored locally per-browser)
   
function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

function isWishlisted(id) {
  return getWishlist().includes(String(id));
}

function toggleWishlist(id) {
  id = String(id);
  const list = getWishlist();
  const idx = list.indexOf(id);
  if (idx === -1) list.push(id);
  else list.splice(idx, 1);
  saveWishlist(list);
  return list.includes(id);
}

//Small helpers
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function formatPrice(value) {
  const num = Number(value) || 0;
  return `LKR ${num.toLocaleString("en-LK")}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// Loading hotels from Supabase
async function loadHotels() {
  showSkeletons();

  try {
    const { data: hotels, error: hotelsError } = await supabaseClient
      .from("hotel_service")
      .select("*");

    if (hotelsError) throw hotelsError;

    const { data: rooms, error: roomsError } = await supabaseClient
      .from("hotel_rooms")
      .select("*");

    if (roomsError) throw roomsError;

    allHotels = (hotels || []).map(hotel => {
      const hotelRooms = (rooms || []).filter(r => r.service_id === hotel.id);
      const prices = hotelRooms
        .map(r => Number(r.price))
        .filter(p => !isNaN(p) && p > 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;

      return { ...hotel, rooms: hotelRooms, minPrice };
    });

    populateCityFilter(allHotels);
    applyFilters();
  } catch (error) {
    console.error("Failed to load hotels:", error);
    document.getElementById("hotelCardsContainer").innerHTML =
      `<p style="text-align:center;width:100%;">Couldn't load hotels right now. Please try again later.</p>`;
  }
}

// Keep the "City" dropdown in sync with whatever cities actually exist,
// without clobbering the hardcoded options already in the HTML.
function populateCityFilter(hotels) {
  const select = document.getElementById("cityFilter");
  if (!select) return;

  const existing = new Set(
    Array.from(select.options).map(opt => opt.value.toLowerCase())
  );

  const cities = [...new Set(hotels.map(h => h.city).filter(Boolean))];

  cities.forEach(city => {
    if (!existing.has(city.toLowerCase())) {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
    }
  });
}

// Rendering
  
function showSkeletons(count = 6) {
  const container = document.getElementById("hotelCardsContainer");
  container.innerHTML = Array.from({ length: count })
    .map(() => `
      <div class="skeleton-card">
        <div class="skeleton-box skeleton-img"></div>
        <div class="skeleton-info">
          <div class="skeleton-box skeleton-title"></div>
          <div class="skeleton-box skeleton-text"></div>
          <div class="skeleton-box skeleton-btn"></div>
        </div>
      </div>
    `)
    .join("");
}

function renderHotels(list) {
  const container = document.getElementById("hotelCardsContainer");

  if (!list.length) {
    container.innerHTML = `<p style="text-align:center;width:100%;">No hotels match your filters.</p>`;
    return;
  }

  container.innerHTML = list.map(hotel => {
    const photos = toArray(hotel.photo_urls);
    const photo = photos[0] || "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg";
    const liked = isWishlisted(hotel.id);
    const ratingText = hotel.star_rating ? ` &middot; ${escapeHtml(hotel.star_rating)}&#9733;` : "";

    return `
      <div class="hotel-card" data-id="${hotel.id}">
        <span class="wishlist-btn ${liked ? "active" : ""}" data-id="${hotel.id}">
          <ion-icon name="${liked ? "heart" : "heart-outline"}"></ion-icon>
        </span>
        <img src="${photo}" alt="${escapeHtml(hotel.service_name)}" class="hotel-img">
        <div class="hotel-info">
          <h3>${escapeHtml(hotel.service_name)}</h3>
          <p>${escapeHtml(hotel.city || "")}${hotel.property_type ? " &middot; " + escapeHtml(hotel.property_type) : ""}${ratingText}</p>
          <p class="hotel-price">${hotel.minPrice ? "From " + formatPrice(hotel.minPrice) : "Contact for price"}</p>
          <button type="button" class="btn-explore view-details-btn" data-id="${hotel.id}">View Details</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".view-details-btn").forEach(btn => {
    btn.addEventListener("click", () => openDetails(btn.dataset.id));
  });

  container.querySelectorAll(".wishlist-btn").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      const id = btn.dataset.id;
      const liked = toggleWishlist(id);

      btn.classList.toggle("active", liked);
      const icon = btn.querySelector("ion-icon");
      if (icon) icon.setAttribute("name", liked ? "heart" : "heart-outline");

      const wishlistBtn = document.getElementById("wishlistFilter");
      if (wishlistBtn && wishlistBtn.classList.contains("active-filter")) {
        applyFilters();
      }
    });
  });
}

// Filtering / sorting / searching

function applyFilters() {
  const city = document.getElementById("cityFilter").value;
  const sort = document.getElementById("sortFilter").value;
  const maxPrice = Number(document.getElementById("priceFilter").value);
  const wishlistOnly = document.getElementById("wishlistFilter").classList.contains("active-filter");
  const searchTerm = document.getElementById("hotelSearch").value.trim().toLowerCase();

  let list = [...allHotels];

  if (city !== "all") {
    list = list.filter(h => (h.city || "").toLowerCase() === city.toLowerCase());
  }

  list = list.filter(h => !h.minPrice || h.minPrice <= maxPrice);

  if (wishlistOnly) {
    list = list.filter(h => isWishlisted(h.id));
  }

  if (searchTerm) {
    list = list.filter(h =>
      (h.service_name || "").toLowerCase().includes(searchTerm) ||
      (h.city || "").toLowerCase().includes(searchTerm)
    );
  }

  if (sort === "lowHigh") list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
  if (sort === "highLow") list.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));

  currentHotels = list;
  renderHotels(list);
}

// Details modal (badges + teaser gallery + tabs)

function openDetails(id) {
  const hotel = allHotels.find(h => String(h.id) === String(id));
  if (!hotel) return;

  document.getElementById("modalHotelName").textContent = hotel.service_name;

  renderModalBadges(hotel);
  renderModalGallery(hotel);
  renderModalTabs(hotel);
  resetModalTabs();

  const bookBtn = document.getElementById("bookNowBtn");
  bookBtn.onclick = () => bookNow(hotel.id);

  document.getElementById("detailsModal").style.display = "block";
}
window.openDetails = openDetails;

function bookNow(id) {
  // Came from the trip planner? Send the hotel back instead of booking.
  if (localStorage.getItem('isSelectingHotel') === 'true') {
    const hotel = allHotels.find(h => String(h.id) === String(id));
    if (hotel) localStorage.setItem('selectedHotelName', hotel.service_name);
    window.location.href = 'personal.html';
    return;
  }
  // Normal visitor: show the coming-soon popup
  document.getElementById("bookingAlertModal").style.display = "block";
}

function closeBookingAlert() {
  document.getElementById("bookingAlertModal").style.display = "none";
}
window.closeBookingAlert = closeBookingAlert;
function renderModalBadges(hotel) {
  const badges = [];

  if (hotel.property_type) badges.push(`<span class="badge badge-type">${escapeHtml(hotel.property_type)}</span>`);
  if (hotel.star_rating) badges.push(`<span class="badge badge-rating">&#9733; ${escapeHtml(hotel.star_rating)} Star</span>`);
  if (hotel.city) badges.push(`<span class="badge badge-type">${escapeHtml(hotel.city)}</span>`);
  if (hotel.minPrice) badges.push(`<span class="badge badge-price">From ${formatPrice(hotel.minPrice)}</span>`);

  document.getElementById("modalBadges").innerHTML = badges.join("");
}

function renderModalGallery(hotel) {
  const photos = toArray(hotel.photo_urls);
  const gallery = document.getElementById("modalGallery");

  if (!photos.length) {
    gallery.innerHTML = `<p>No photos available.</p>`;
    return;
  }

  const visible = photos.slice(0, 4);
  const remaining = photos.length - visible.length;

  gallery.innerHTML = visible.map((url, i) => {
    if (i === visible.length - 1 && remaining > 0) {
      return `
        <div class="see-more-container" data-full-gallery>
          <img src="${url}" alt="More photos">
          <div class="see-more-overlay">
            <span class="plus-sign">+${remaining}</span>
          </div>
        </div>`;
    }
    return `<img src="${url}" class="teaser-item" alt="${escapeHtml(hotel.service_name)}">`;
  }).join("");

  gallery.querySelectorAll(".teaser-item, .see-more-container").forEach(el => {
    el.addEventListener("click", () => openFullGallery(hotel));
  });
}

function renderModalTabs(hotel) {
  const overviewHtml = `
    <div class="info-grid">
      <div class="info-card">
        <ion-icon name="location-outline"></ion-icon>
        <div class="info-label">Address</div>
        <div class="info-value">${escapeHtml(hotel.address || "-")}, ${escapeHtml(hotel.city || "-")}</div>
      </div>
      <div class="info-card">
        <ion-icon name="call-outline"></ion-icon>
        <div class="info-label">Contact</div>
        <div class="info-value">${escapeHtml(hotel.contact || "-")}</div>
      </div>
      <div class="info-card">
        <ion-icon name="pricetag-outline"></ion-icon>
        <div class="info-label">Price Basis</div>
        <div class="info-value">${escapeHtml(hotel.price_basis || "-")}</div>
      </div>
      <div class="info-card">
        <ion-icon name="receipt-outline"></ion-icon>
        <div class="info-label">Tax / Service Charge</div>
        <div class="info-value">${escapeHtml(hotel.tax_service_charge || "-")}</div>
      </div>
      <div class="info-card">
        <ion-icon name="sparkles-outline"></ion-icon>
        <div class="info-label">Cleaning Fee</div>
        <div class="info-value">${formatPrice(hotel.cleaning_fees || 0)}</div>
      </div>
      <div class="info-card">
        <ion-icon name="bed-outline"></ion-icon>
        <div class="info-label">Total Rooms</div>
        <div class="info-value">${hotel.total_rooms ?? "-"}</div>
      </div>
    </div>
    <div class="modal-info-item">
      <b>Description</b>
      ${escapeHtml(hotel.description || "No description provided.")}
    </div>
  `;

  const amenitiesHtml = `
    <div class="modal-info-item"><b>Facilities</b></div>
    <div class="chip-group">
      ${toArray(hotel.facilities).map(f => `<span class="chip">${escapeHtml(f)}</span>`).join("") || `<span class="chip">None listed</span>`}
    </div>

    <div class="modal-info-item" style="margin-top:20px;"><b>Parking</b></div>
    <div class="chip-group">
      ${toArray(hotel.parkings).map(p => `<span class="chip">${escapeHtml(p)}</span>`).join("") || `<span class="chip">None listed</span>`}
    </div>

    <div class="info-grid" style="margin-top:20px;">
      <div class="info-card">
        <ion-icon name="wifi-outline"></ion-icon>
        <div class="info-label">Connectivity</div>
        <div class="info-value">${escapeHtml(hotel.connectivity || "-")}</div>
      </div>
      <div class="info-card">
        <ion-icon name="paw-outline"></ion-icon>
        <div class="info-label">Pets Allowed</div>
        <div class="info-value">${escapeHtml(hotel.pets_allowed || "-")}</div>
      </div>
    </div>
  `;

  const rooms = toArray(hotel.rooms);
  const roomsHtml = rooms.length
    ? rooms.map(r => `
      <div class="room-card">
        <div>
          <h4>${escapeHtml(r.room_category_name || "Room")}</h4>
          <div class="room-meta">${escapeHtml(r.bed_type || "-")} &middot; ${r.number_of_beds || 0} bed(s)${r.room_size ? " &middot; " + r.room_size + " " + escapeHtml(r.room_size_unit || "") : ""}</div>
          <div class="room-meta">${r.available_rooms ?? 0} room(s) available</div>
          ${toArray(r.facilities).length ? `<div class="chip-group" style="margin-top:8px;">${r.facilities.map(f => `<span class="chip">${escapeHtml(f)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="room-price-tag">${formatPrice(r.price)}</div>
      </div>
    `).join("")
    : `<div class="modal-info-item">No room details added yet.</div>`;

  document.getElementById("modalInfoContainer").innerHTML = `
    <div class="modal-tab-panel active" data-panel="overview">${overviewHtml}</div>
    <div class="modal-tab-panel" data-panel="amenities">${amenitiesHtml}</div>
    <div class="modal-tab-panel" data-panel="rooms">${roomsHtml}</div>
  `;
}

function resetModalTabs() {
  document.querySelectorAll("#modalTabs .modal-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === "overview");
  });
  document.querySelectorAll("#modalInfoContainer .modal-tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === "overview");
  });
}

function wireModalTabs() {
  const tabs = document.getElementById("modalTabs");
  if (!tabs) return;

  tabs.addEventListener("click", event => {
    const btn = event.target.closest(".modal-tab-btn");
    if (!btn) return;

    const target = btn.dataset.tab;
    tabs.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll("#modalInfoContainer .modal-tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  });
}

function closeDetails() {
  document.getElementById("detailsModal").style.display = "none";
}
window.closeDetails = closeDetails;

function openFullGallery(hotel) {
  document.getElementById("fullGalleryTitle").textContent = `${hotel.service_name} — All Photos`;
  const grid = document.getElementById("fullGalleryGrid");
  const photos = toArray(hotel.photo_urls);

  grid.innerHTML = photos.length
    ? photos.map(url => `<img src="${url}" class="full-gallery-img" alt="${escapeHtml(hotel.service_name)}">`).join("")
    : "<p>No photos available.</p>";

  document.getElementById("fullGalleryModal").style.display = "block";
}

function closeFullGallery() {
  document.getElementById("fullGalleryModal").style.display = "none";
}
window.closeFullGallery = closeFullGallery;

function closeSearchAlert() {
  document.getElementById("searchAlertModal").style.display = "none";
}
window.closeSearchAlert = closeSearchAlert;

//Event wiring

function wireFilterControls() {
  document.getElementById("hotelSearch").addEventListener("input", applyFilters);
  document.getElementById("hotelSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      applyFilters();
      if (currentHotels.length === 0) {
        document.getElementById("searchAlertModal").style.display = "block";
      }
    }
  });

  document.getElementById("cityFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);

  document.getElementById("priceFilter").addEventListener("input", event => {
    document.getElementById("priceValue").textContent = formatPrice(event.target.value);
    applyFilters();
  });

  document.getElementById("wishlistFilter").addEventListener("click", () => {
    const btn = document.getElementById("wishlistFilter");
    btn.classList.toggle("active-filter");
    applyFilters();
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("cityFilter").value = "all";
    document.getElementById("sortFilter").value = "default";
    document.getElementById("priceFilter").value = 100000;
    document.getElementById("priceValue").textContent = formatPrice(100000);
    document.getElementById("hotelSearch").value = "";
    document.getElementById("wishlistFilter").classList.remove("active-filter");
    applyFilters();
  });
}

function wireMobileSidebar() {
  const toggle = document.getElementById("mobileFilterToggle");
  const sidebar = document.getElementById("sidebarFilter");
  const closeBtn = document.getElementById("closeSidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.add("open"));
  }
  if (closeBtn && sidebar) {
    closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));
  }
}

function wireTransportDropdown() {
  const transportBtn = document.getElementById("transportBtn");
  const transportMenu = document.getElementById("transportMenu");

  if (!transportBtn || !transportMenu) return;

  transportBtn.addEventListener("click", event => {
    event.stopPropagation();
    transportMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => transportMenu.classList.remove("show"));
}

function wireModalBackdropClicks() {
  window.addEventListener("click", event => {
    if (event.target === document.getElementById("detailsModal")) closeDetails();
    if (event.target === document.getElementById("fullGalleryModal")) closeFullGallery();
    if (event.target === document.getElementById("bookingAlertModal")) closeBookingAlert();
    if (event.target === document.getElementById("searchAlertModal")) closeSearchAlert();
  });
}

// Init
  
document.addEventListener("DOMContentLoaded", () => {
  wireFilterControls();
  wireMobileSidebar();
  wireTransportDropdown();
  wireModalBackdropClicks();
  wireModalTabs();
  loadHotels();
});
