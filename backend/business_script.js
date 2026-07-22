const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

const API="https://script.google.com/macros/s/AKfycbzv6-zAB61O4n4-4ofGXUXns2lAx8JrJcvOZQ6YnvuW1z7n1KvB90VMahIm27Q6xBpYrQ/exec";
/*const email = localStorage.getItem("user_email");*/

/*const email = localStorage.getItem("user_email") || "testbusiness@gotravel.com";*/
let editingRow = null;
let email = null;
let selectedPhotoFiles = [];
let existingPhotos = [];
let removedPhotoPaths = [];
let map;
let marker;
let drivers = [];
let currentStep = 1;
const totalSteps = 3;

const photoIndex = {
  transport: 7,
  hotel: 7,
  restaurant: 10,
  guide: 6
};

document.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    location.href = "auth.html";
    return;
  }

  email = data.user.email;

  document.getElementById("profileLetter").textContent =
    email.charAt(0).toUpperCase();

  await loadAllServices();

  setupPhotoPreview(document.getElementById("servicePhotos"));
  setupPhotoPreview(document.getElementById("hotelServicePhotos"));
  setupPhotoPreview(document.getElementById("restPhotos"));
  setupPhotoPreview(document.getElementById("guidePhotos"));

  document.getElementById("modalOverlay").addEventListener("click", e=>{
  if(e.target.id === "modalOverlay") closeModal();
});
  document.getElementById("profileBtn").addEventListener("click", e => {
  e.stopPropagation();
  document.getElementById("profileMenu").classList.toggle("hidden");
});

document.addEventListener("click", () => {
  document.getElementById("profileMenu").classList.add("hidden");
});

document.getElementById("searchHotelLocationBtn").addEventListener("click", () => {
  searchServiceLocation("hotel");
});

document.getElementById("searchRestLocationBtn").addEventListener("click", () => {
  searchServiceLocation("restaurant");
});
document.getElementById("hotelLocationSearch").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchServiceLocation("hotel");
  }
});

document.getElementById("restLocationSearch").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchServiceLocation("restaurant");
  }
});
});
//document.getElementById("postedServices").innerHTML = "";

async function logout(){
  await supabaseClient.auth.signOut();
  localStorage.removeItem("userFName");
  localStorage.removeItem("userLName");
  location.href = "auth.html";
}

function toggleAddServices(event){
  event.stopPropagation();
  document.getElementById("addServicesMenu").classList.toggle("hidden");
}

//["transport","hotel","restaurant","guide"].forEach(loadServices);
function closeModal(){
  document.getElementById("modalOverlay").classList.add("hidden");
  editingRow = null;
}
const serviceConfigs = {
  transport: {
    table: "transport_service",
    label: "Transport",
    icon: "fa-car",
    color: "#38bdf8"
  },
  hotel: {
    table: "hotel_service",
    label: "Hotel",
    icon: "fa-hotel",
    color: "#22c55e"
  },
  restaurant: {
    table: "rest_service",
    label: "Restaurant",
    icon: "fa-utensils",
    color: "#f97316"
  },
  guide: {
    table: "guide_service",
    label: "Guide",
    icon: "fa-map-location-dot",
    color: "#a78bfa"
  }
};

let allPostedServices = [];

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatArrayValue(value) {
  if (!value) return "Not provided";

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not provided";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

async function loadAllServices() {
  const postedServices = document.getElementById("postedServices");
  const noServices = document.getElementById("noServices");

  postedServices.innerHTML = `
    <p style="opacity:.75">Loading services...</p>
  `;
  noServices.style.display = "none";

  allPostedServices = [];

  try {
    for (const type of Object.keys(serviceConfigs)) {
      const config = serviceConfigs[type];

      const { data, error } = await supabaseClient
        .from(config.table)
        .select("*")
        .eq("email", email)
        .order("id", { ascending: false });

      if (error) throw error;

      const mappedServices = (data || []).map(service => ({
        ...service,
        service_type: type,
        service_label: config.label
      }));

      allPostedServices.push(...mappedServices);
    }

    renderPostedServices();

  } catch (error) {
    console.error("Failed to load services:", error);
    postedServices.innerHTML = `
      <p style="opacity:.75;color:#fecaca">
        Failed to load posted services.
      </p>
    `;
  }
}

function renderPostedServices() {
  const postedServices = document.getElementById("postedServices");
  const noServices = document.getElementById("noServices");

  postedServices.innerHTML = "";

  if (!allPostedServices.length) {
    noServices.style.display = "block";
    return;
  }

  noServices.style.display = "none";

  allPostedServices.forEach((service, index) => {
    const config = serviceConfigs[service.service_type];
    const photoUrl = Array.isArray(service.photo_urls) && service.photo_urls.length
      ? service.photo_urls[0]
      : "";

    const card = document.createElement("div");
    card.className = "service-box";

    card.innerHTML = `
      ${
        photoUrl
          ? `<img src="${escapeHTML(photoUrl)}" 
                  alt="${escapeHTML(service.service_name || "Service photo")}"
                  style="width:100%;height:140px;object-fit:cover;border-radius:14px;margin-bottom:14px;">`
          : `<div style="height:140px;border-radius:14px;margin-bottom:14px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;">
                <i class="fa-solid ${config.icon}" style="font-size:34px;color:${config.color}"></i>
             </div>`
      }

      <span style="display:inline-flex;align-items:center;gap:7px;font-size:.75rem;color:${config.color};font-weight:700;margin-bottom:8px;">
        <i class="fa-solid ${config.icon}"></i>
        ${config.label}
      </span>

      <b style="font-size:1.05rem;margin-bottom:8px;">
        ${escapeHTML(service.service_name || "Unnamed Service")}
      </b>

      <p style="opacity:.75;margin:6px 0;font-size:.88rem;">
        ${escapeHTML(service.city || service.address || "Location not provided")}
      </p>

      <p style="opacity:.75;margin:6px 0;font-size:.88rem;">
        ${escapeHTML(service.contact || "Contact not provided")}
      </p>

      <button type="button" style="margin-top:12px;width:100%;">
        View Details
      </button>
    `;

    card.addEventListener("click", () => openServiceDetails(index));
    postedServices.appendChild(card);
  });
}

function openServiceDetails(index) {
  const service = allPostedServices[index];
  const config = serviceConfigs[service.service_type];

  const modal = document.getElementById("modalOverlay");
  const content = document.getElementById("modalContent");

  const photos = Array.isArray(service.photo_urls) ? service.photo_urls : [];

  content.innerHTML = `
    <h2 style="margin-top:0;">
      <i class="fa-solid ${config.icon}" style="color:${config.color}"></i>
      ${escapeHTML(service.service_name || "Service Details")}
    </h2>

    <p style="opacity:.8;margin-top:-6px;">
      ${config.label} Service
    </p>

    ${
      photos.length
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:18px 0;">
            ${photos.map(url => `
              <img src="${escapeHTML(url)}"
                   style="width:100%;height:120px;object-fit:cover;border-radius:14px;">
            `).join("")}
           </div>`
        : ""
    }

    <div class="form-grid">
      <div>
        <label>Email</label>
        <input value="${escapeHTML(service.email || "")}" disabled>
      </div>

      <div>
        <label>Contact</label>
        <input value="${escapeHTML(service.contact || "")}" disabled>
      </div>

      <div>
        <label>City</label>
        <input value="${escapeHTML(service.city || "")}" disabled>
      </div>

      <div>
        <label>Address</label>
        <input value="${escapeHTML(service.address || "")}" disabled>
      </div>
    </div>

    <div style="margin-top:16px;">
      <label>Description</label>
      <textarea disabled>${escapeHTML(service.description || "")}</textarea>
    </div>

    ${getExtraServiceDetails(service)}

    <div class="form-actions">
      <button type="button" onclick="closeModal()">Close</button>
    </div>
  `;

  modal.classList.remove("hidden");
}

function getExtraServiceDetails(service) {
  if (service.service_type === "hotel") {
    return `
      <div class="form-grid" style="margin-top:16px;">
        <div>
          <label>Property Type</label>
          <input value="${escapeHTML(service.property_type || "")}" disabled>
        </div>
        <div>
          <label>Star Rating</label>
          <input value="${escapeHTML(service.star_rating || "")}" disabled>
        </div>
        <div>
          <label>Total Rooms</label>
          <input value="${escapeHTML(service.total_rooms || "")}" disabled>
        </div>
        <div>
          <label>Price Basis</label>
          <input value="${escapeHTML(service.price_basis || "")}" disabled>
        </div>
        <div>
          <label>Facilities</label>
          <input value="${escapeHTML(formatArrayValue(service.facilities))}" disabled>
        </div>
        <div>
          <label>Parking</label>
          <input value="${escapeHTML(formatArrayValue(service.parkings))}" disabled>
        </div>
      </div>
    `;
  }

  if (service.service_type === "restaurant") {
    return `
      <div class="form-grid" style="margin-top:16px;">
        <div>
          <label>Breakfast</label>
          <input value="${escapeHTML(service.breakfast || "")}" disabled>
        </div>
        <div>
          <label>Lunch</label>
          <input value="${escapeHTML(service.lunch || "")}" disabled>
        </div>
        <div>
          <label>Dinner</label>
          <input value="${escapeHTML(service.dinner || "")}" disabled>
        </div>
        <div>
          <label>Last Order Time</label>
          <input value="${escapeHTML(service.last_order_time || "")}" disabled>
        </div>
        <div>
          <label>Seat Categories</label>
          <input value="${escapeHTML(formatArrayValue(service.seat_categories))}" disabled>
        </div>
        <div>
          <label>Payment Methods</label>
          <input value="${escapeHTML(formatArrayValue(service.payment_methods))}" disabled>
        </div>
      </div>

      <div style="margin-top:16px;">
        <label>Signature Dishes</label>
        <textarea disabled>${escapeHTML(service.signature_dishes || "")}</textarea>
      </div>
    `;
  }

  if (service.service_type === "guide") {
    return `
      <div class="form-grid" style="margin-top:16px;">
        <div>
          <label>Years of Experience</label>
          <input value="${escapeHTML(service.years_of_experience || "")}" disabled>
        </div>
        <div>
          <label>License Number</label>
          <input value="${escapeHTML(service.guide_license_number || "")}" disabled>
        </div>
        <div>
          <label>License Expiry Date</label>
          <input value="${escapeHTML(service.license_expiry_date || "")}" disabled>
        </div>
        <div>
          <label>Languages</label>
          <input value="${escapeHTML(formatArrayValue(service.languages))}" disabled>
        </div>
        <div>
          <label>Specializations</label>
          <input value="${escapeHTML(formatArrayValue(service.specializations))}" disabled>
        </div>
        <div>
          <label>Payment Methods</label>
          <input value="${escapeHTML(formatArrayValue(service.payment_methods))}" disabled>
        </div>
      </div>

      <div style="margin-top:16px;">
        <label>Pricing Details</label>
        <textarea disabled>${escapeHTML(service.pricing_details || "")}</textarea>
      </div>
    `;
  }

  return "";
}

function openProfileModal(){
  document.getElementById("profileMenu").classList.add("hidden");

  const modal = document.getElementById("modalOverlay");
  const content = document.getElementById("modalContent");

  const first_name = localStorage.getItem("userFName") || "";
  const last_name = localStorage.getItem("userLName") || "";
  const category = "Business";

  content.innerHTML = `
    <h3>My Profile</h3>

    <form>
      <div class="form-grid">
        <div>
          <label>First Name</label>
          <input value="${first_name}" disabled>
        </div>

        <div>
          <label>Last Name</label>
          <input value="${last_name}" disabled>
        </div>

        <div>
          <label>Email</label>
          <input value="${email}" disabled>
        </div>

        <div>
          <label>Account Type</label>
          <input value="${category}" disabled>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" onclick="closeModal()">Close</button>
      </div>
    </form>
  `;

  modal.classList.remove("hidden");
}
function toggleSidebar(){
  document.querySelector(".sidebar").classList.toggle("active");
}
function closeSidebar(){
  document.querySelector(".sidebar").classList.remove("active");
}

document.getElementById("addTransportServiceBtn").addEventListener("click", () => {
  document.getElementById("transportFormModal").classList.remove("hidden");
});

document.getElementById("closeTransportModal").addEventListener("click", () => {
  document.getElementById("transportFormModal").classList.add("hidden");
});

const driversContainer = document.getElementById("driversContainer");

document.getElementById("addDriverBtn").addEventListener("click", () => {
  const driverIndex = driversContainer.children.length;

  const driverForm = document.createElement("div");
  driverForm.className = "driver-form";

  driverForm.innerHTML = `
  <h4 class="dynamic-card-title">Driver Details</h4>

  <input type="text" name="driverName" placeholder="Driver name" required />
  <input type="text" name="driverContact" placeholder="Contact" required />
  <input type="text" name="driverNic" placeholder="NIC" required />
  <input type="date" name="joinedDate" />

  <input type="text" name="licenseNo" placeholder="License number" />
  <input type="date" name="issuedDate" />
  <input type="date" name="expiryDate" />

  <input type="file" name="driverPhotos" multiple accept="image/*" />

  <button type="button" onclick="removeChildCard(this, 'transport_drivers', 'driver-photos', 'driverId')">
  Remove Driver
  </button>
  `;

  driversContainer.appendChild(driverForm);
  setupPhotoPreview(driverForm.querySelector('[name="driverPhotos"]'));
});

const vehiclesContainer = document.getElementById("vehiclesContainer");

document.getElementById("addVehicleBtn").addEventListener("click", () => {
  const vehicleForm = document.createElement("div");
  vehicleForm.className = "vehicle-form";

  vehicleForm.innerHTML = `
    <h4 class="dynamic-card-title">Vehicle Details</h4>

    <input type="text" name="vehicleNumber" placeholder="Vehicle number" required />

    <select name="category" required>
      <option value="">Select category</option>
      <option value="Bus">Bus</option>
      <option value="Van">Van</option>
      <option value="Car">Car</option>
      <option value="SUV">SUV</option>
      <option value="Motobike">Motobike</option>
      <option value="Scooter">Scooter</option>
    </select>

    <input type="number" name="seatCount" placeholder="Seat count" />

    <select name="transmission">
      <option value="">Transmission</option>
      <option value="Auto">Auto</option>
      <option value="Manual">Manual</option>
    </select>

    <select name="driverOption">
      <option value="">Driver option</option>
      <option value="With Driver">With Driver</option>
      <option value="Without Driver">Without Driver</option>
    </select>

    <input type="text" name="luggageCapacity" placeholder="Luggage capacity" />

    <select name="airCondition">
      <option value="">Air condition</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>

    <select name="fuelType">
      <option value="">Fuel type</option>
      <option value="Petrol">Petrol</option>
      <option value="Diesel">Diesel</option>
      <option value="Hybrid">Hybrid</option>
      <option value="Electric">Electric</option>
    </select>

    <input type="number" name="price" placeholder="Price" required />

    <select name="priceCalculatedPer" required>
      <option value="">Price calculated per</option>
      <option value="Mileage">Mileage</option>
      <option value="Day">Day</option>
    </select>

    <input type="file" name="vehiclePhotos" multiple accept="image/*" />

    <button type="button" onclick="removeChildCard(this, 'transport_vehicles', 'vehicle-photos', 'vehicleId')">
    Remove Vehicle
    </button>
  `;

  vehiclesContainer.appendChild(vehicleForm);
  setupPhotoPreview(vehicleForm.querySelector('[name="vehiclePhotos"]'));

  const category = vehicleForm.querySelector('[name="category"]');
  const seatCount = vehicleForm.querySelector('[name="seatCount"]');
  const transmission = vehicleForm.querySelector('[name="transmission"]');
  const airCondition = vehicleForm.querySelector('[name="airCondition"]');

  category.addEventListener("change", () => {
    if (category.value === "Motobike") {
      seatCount.value = 2;
      airCondition.value = "No";
    }

    if (category.value === "Scooter") {
      seatCount.value = 2;
      transmission.value = "Auto";
      airCondition.value = "No";
    }
  });
});
async function uploadPhotos(files, bucketName, folderName) {
  const photoPaths = [];
  const photoUrls = [];

  for (const file of files) {
    const filePath = `${folderName}/${Date.now()}-${file.name}`;

    const { error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    photoPaths.push(filePath);
    photoUrls.push(data.publicUrl);
  }

  return {
    photoPaths,
    photoUrls
  };
}

/* ===== PHOTO PREVIEW + REMOVE SYSTEM ===== */
const photoInputStates = new WeakMap();

function setupPhotoPreview(input) {
  if (!input || photoInputStates.has(input)) return;

  const previewGrid = document.createElement("div");
  previewGrid.className = "photo-preview-grid";

  input.insertAdjacentElement("afterend", previewGrid);

  photoInputStates.set(input, {
    files: [],
    previewGrid
  });

  input.addEventListener("change", () => {
    const state = photoInputStates.get(input);

    const newlySelectedFiles = Array.from(input.files || []);

    state.files.push(...newlySelectedFiles);

    syncInputFiles(input);
    renderPhotoPreview(input);

    /*
      Allows selecting the same image again after removing it.
      The selected files are still safely stored in state.files.
    */
    input.value = "";
  });
}

function syncInputFiles(input) {
  const state = photoInputStates.get(input);
  const dataTransfer = new DataTransfer();

  state.files.forEach(file => {
    dataTransfer.items.add(file);
  });

  input.files = dataTransfer.files;
}

function renderPhotoPreview(input) {
  const state = photoInputStates.get(input);
  state.previewGrid.innerHTML = "";

  state.files.forEach((file, index) => {
    const imageUrl = URL.createObjectURL(file);

    const previewItem = document.createElement("div");
    previewItem.className = "photo-preview-item";

    previewItem.innerHTML = `
      <img src="${imageUrl}" alt="Selected photo">
      <button type="button" class="photo-preview-remove">&times;</button>
    `;

    previewItem.querySelector(".photo-preview-remove").addEventListener("click", () => {
      state.files.splice(index, 1);
      syncInputFiles(input);
      renderPhotoPreview(input);
    });

    state.previewGrid.appendChild(previewItem);
  });
}

function getPhotoFiles(input) {
  setupPhotoPreview(input);
  return photoInputStates.get(input).files;
}

function resetPhotoInput(input) {
  if (!input) return;

  setupPhotoPreview(input);

  const state = photoInputStates.get(input);
  state.files = [];
  state.previewGrid.innerHTML = "";

  input.value = "";
}

function resetPhotoInputsInside(container) {
  container.querySelectorAll('input[type="file"]').forEach(input => {
    resetPhotoInput(input);
  });
}


document.getElementById("transportForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }
    const servicePhotoFiles = getPhotoFiles(document.getElementById("servicePhotos"));
    
    const servicePhotos = await uploadPhotos(
      servicePhotoFiles,
      "transport-service-photo",
      `services/${user.id}`
    );

    const { data: service, error: serviceError } = await supabaseClient
      .from("transport_service")
      .insert({
        email: user.email,
        service_name: document.getElementById("serviceName").value,
        contact: document.getElementById("serviceContact").value,
        address: document.getElementById("serviceAddress").value,
        description: document.getElementById("serviceDescription").value,
        photo_paths: servicePhotos.photoPaths,
        photo_urls: servicePhotos.photoUrls
      })
      .select()
      .single();

    if (serviceError) throw serviceError;

    const driverForms = document.querySelectorAll(".driver-form");

    for (const driverForm of driverForms) {
      const driverPhotoFiles = getPhotoFiles(driverForm.querySelector('[name="driverPhotos"]'));

      const driverPhotos = await uploadPhotos(
        driverPhotoFiles,
        "driver-photos",
        `drivers/${service.id}`
      );

      const { error: driverError } = await supabaseClient
        .from("transport_drivers")
        .insert({
          service_id: service.id,
          name: driverForm.querySelector('[name="driverName"]').value,
          contact: driverForm.querySelector('[name="driverContact"]').value,
          nic: driverForm.querySelector('[name="driverNic"]').value,
          joined_date: driverForm.querySelector('[name="joinedDate"]').value || null,
          license_no: driverForm.querySelector('[name="licenseNo"]').value,
          issued_date: driverForm.querySelector('[name="issuedDate"]').value || null,
          expiry_date: driverForm.querySelector('[name="expiryDate"]').value || null,
          photo_paths: driverPhotos.photoPaths,
          photo_urls: driverPhotos.photoUrls
        });

      if (driverError) throw driverError;
    }

    const vehicleForms = document.querySelectorAll(".vehicle-form");

    for (const vehicleForm of vehicleForms) {
      const vehiclePhotoFiles = getPhotoFiles(vehicleForm.querySelector('[name="vehiclePhotos"]'));

      const vehiclePhotos = await uploadPhotos(
        vehiclePhotoFiles,
        "vehicle-photos",
        `vehicles/${service.id}`
      );

      const { error: vehicleError } = await supabaseClient
        .from("transport_vehicles")
        .insert({
          service_id: service.id,
          vehicle_number: vehicleForm.querySelector('[name="vehicleNumber"]').value,
          category: vehicleForm.querySelector('[name="category"]').value,
          seat_count: Number(vehicleForm.querySelector('[name="seatCount"]').value) || null,
          transmission: vehicleForm.querySelector('[name="transmission"]').value || null,
          driver_option: vehicleForm.querySelector('[name="driverOption"]').value || null,
          luggage_capacity: vehicleForm.querySelector('[name="luggageCapacity"]').value,
          air_condition: vehicleForm.querySelector('[name="airCondition"]').value || null,
          fuel_type: vehicleForm.querySelector('[name="fuelType"]').value || null,
          price: Number(vehicleForm.querySelector('[name="price"]').value),
          price_calculated_per: vehicleForm.querySelector('[name="priceCalculatedPer"]').value,
          photo_paths: vehiclePhotos.photoPaths,
          photo_urls: vehiclePhotos.photoUrls
        });

      if (vehicleError) throw vehicleError;
    }

    alert("Transport service saved successfully.");
    document.getElementById("transportForm").reset();
    resetPhotoInputsInside(document.getElementById("transportForm"));
    driversContainer.innerHTML = "";
    vehiclesContainer.innerHTML = "";
    document.getElementById("transportFormModal").classList.add("hidden");
    await loadAllServices();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save transport service.");
  }
});

document.getElementById("addHotelServiceBtn").addEventListener("click", () => {
  document.getElementById("hotelFormModal").classList.remove("hidden");
  initServiceLocationMap("hotel");
});

document.getElementById("closeHotelModal").addEventListener("click", () => {
  document.getElementById("hotelFormModal").classList.add("hidden");
});

const hotelRoomsContainer = document.getElementById("hotelRoomsContainer");

document.getElementById("addHotelRoomBtn").addEventListener("click", () => {
  const roomForm = document.createElement("div");
  roomForm.className = "hotel-room-form";

  roomForm.innerHTML = `
    <h4 class="dynamic-card-title">Room Details</h4>
    <input type="text" name="roomCategoryName" placeholder="Room category name" required />

    <select name="bedType" required>
      <option value="">Bed type</option>
      <option value="Single">Single</option>
      <option value="Double">Double</option>
      <option value="King">King</option>
      <option value="Queen">Queen</option>
      <option value="Twin Beds">Twin Beds</option>
      <option value="Bunk Beds">Bunk Beds</option>
    </select>

    <input type="number" name="numberOfBeds" placeholder="Number of beds" required />
    <input type="number" name="roomSize" placeholder="Room size" />

    <select name="roomSizeUnit">
      <option value="">Room size unit</option>
      <option value="mm^2">mm^2</option>
      <option value="sq ft">sq ft</option>
    </select>

    <input type="number" name="availableRooms" placeholder="Available rooms" required />
    <input type="number" name="roomPrice" placeholder="Price" required />

    <div class="checkbox-section">
      <h4 class="checkbox-section-title">Room Facilities</h4>

      <div class="checkbox-options">
        <label>
          <input type="checkbox" name="roomFacilities" value="AC" />
          Air Conditioning
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="Private Bathroom" />
          Private Bathroom
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="Hot Water" />
          Hot Water
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="Balcony" />
          Balcony
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="TV" />
          TV
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="Minibar" />
          Minibar
        </label>

        <label>
          <input type="checkbox" name="roomFacilities" value="Safe Box" />
          Safe Box
        </label>
      </div>
    </div>

    <input type="file" name="roomPhotos" multiple accept="image/*" />

    <button type="button" onclick="removeChildCard(this, 'hotel_rooms', 'room-photos', 'roomId')">
    Remove Room
    </button>
  `;

  hotelRoomsContainer.appendChild(roomForm);
  setupPhotoPreview(roomForm.querySelector('[name="roomPhotos"]'));
});

function getCheckedValues(selector) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(
    checkbox => checkbox.value
  );
}
/* ===== OPEN STREET MAP LOCATION PICKER ===== */
const serviceLocationMaps = {
  hotel: {
    map: null,
    marker: null
  },
  restaurant: {
    map: null,
    marker: null
  }
};

function initServiceLocationMap(type) {
  const config = {
    hotel: {
      mapId: "hotelMap",
      latId: "hotelLatitude",
      lngId: "hotelLongitude",
      searchId: "hotelLocationSearch",
      defaultPopup: "Hotel location"
    },
    restaurant: {
      mapId: "restMap",
      latId: "restLatitude",
      lngId: "restLongitude",
      searchId: "restLocationSearch",
      defaultPopup: "Restaurant location"
    }
  }[type];

  if (!config) return;

  const mapElement = document.getElementById(config.mapId);
  if (!mapElement) return;

  // Default center: Sri Lanka
  const defaultLat = 7.8731;
  const defaultLng = 80.7718;

  if (!serviceLocationMaps[type].map) {
    serviceLocationMaps[type].map = L.map(config.mapId).setView(
      [defaultLat, defaultLng],
      8
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(serviceLocationMaps[type].map);

    serviceLocationMaps[type].map.on("click", function (event) {
      setServiceLocation(
        type,
        event.latlng.lat,
        event.latlng.lng,
        config.defaultPopup
      );
    });
  }

  setTimeout(() => {
    serviceLocationMaps[type].map.invalidateSize();
  }, 250);
}

function setServiceLocation(type, lat, lng, popupText = "Selected location") {
  const config = {
    hotel: {
      latId: "hotelLatitude",
      lngId: "hotelLongitude"
    },
    restaurant: {
      latId: "restLatitude",
      lngId: "restLongitude"
    }
  }[type];

  if (!config) return;

  const mapData = serviceLocationMaps[type];

  document.getElementById(config.latId).value = Number(lat).toFixed(7);
  document.getElementById(config.lngId).value = Number(lng).toFixed(7);

  if (mapData.marker) {
    mapData.marker.setLatLng([lat, lng]);
  } else {
    mapData.marker = L.marker([lat, lng], {
      draggable: true
    }).addTo(mapData.map);

    mapData.marker.on("dragend", function () {
      const position = mapData.marker.getLatLng();
      setServiceLocation(type, position.lat, position.lng, popupText);
    });
  }

  mapData.marker.bindPopup(popupText).openPopup();
  mapData.map.setView([lat, lng], 15);
}

async function searchServiceLocation(type) {
  const config = {
    hotel: {
      searchId: "hotelLocationSearch",
      popupText: "Hotel location"
    },
    restaurant: {
      searchId: "restLocationSearch",
      popupText: "Restaurant location"
    }
  }[type];

  if (!config) return;

  const searchValue = document.getElementById(config.searchId).value.trim();

  if (!searchValue) {
    alert("Please enter a location to search.");
    return;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&limit=1`
    );

    const results = await response.json();

    if (!results.length) {
      alert("Location not found. Try a more specific address.");
      return;
    }

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);

    setServiceLocation(type, lat, lng, config.popupText);
  } catch (error) {
    console.error(error);
    alert("Failed to search location.");
  }
}

function resetServiceLocation(type) {
  const config = {
    hotel: {
      latId: "hotelLatitude",
      lngId: "hotelLongitude",
      searchId: "hotelLocationSearch"
    },
    restaurant: {
      latId: "restLatitude",
      lngId: "restLongitude",
      searchId: "restLocationSearch"
    }
  }[type];

  if (!config) return;

  document.getElementById(config.latId).value = "";
  document.getElementById(config.lngId).value = "";
  document.getElementById(config.searchId).value = "";

  const mapData = serviceLocationMaps[type];

  if (mapData.marker) {
    mapData.map.removeLayer(mapData.marker);
    mapData.marker = null;
  }

  if (mapData.map) {
    mapData.map.setView([7.8731, 80.7718], 8);
  }
}

document.getElementById("hotelForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }
    const hotelServicePhotoFiles = getPhotoFiles(document.getElementById("hotelServicePhotos"));

    const hotelServicePhotos = await uploadPhotos(
      hotelServicePhotoFiles,
      "hotel-service-photo",
      `hotels/${user.id}`
    );
    
    const { data: hotelService, error: hotelServiceError } = await supabaseClient
      .from("hotel_service")
      .insert({
        email: user.email,
        service_name: document.getElementById("hotelServiceName").value,
        property_type: document.getElementById("hotelPropertyType").value,
        star_rating: document.getElementById("hotelStarRating").value,
        total_rooms: Number(document.getElementById("hotelTotalRooms").value),
        contact: document.getElementById("hotelContact").value,
        address: document.getElementById("hotelAddress").value,
        description: document.getElementById("hotelDescription").value,
        city: document.getElementById("hotelCity").value,
        latitude: document.getElementById("hotelLatitude").value
          ? Number(document.getElementById("hotelLatitude").value)
          : null,
        longitude: document.getElementById("hotelLongitude").value
          ? Number(document.getElementById("hotelLongitude").value)
          : null,
        price_basis: document.getElementById("hotelPriceBasis").value,
        tax_service_charge: document.getElementById("hotelTaxServiceCharge").value,
        cleaning_fees: Number(document.getElementById("hotelCleaningFees").value) || 0,
        facilities: getCheckedValues('input[name="hotelFacilities"]'),
        connectivity: document.getElementById("hotelConnectivity").value || null,
        parkings: getCheckedValues('input[name="hotelParkings"]'),
        pets_allowed: document.getElementById("hotelPetsAllowed").value || null,
        photo_paths: hotelServicePhotos.photoPaths,
        photo_urls: hotelServicePhotos.photoUrls
      })
      .select()
      .single();

    if (hotelServiceError) throw hotelServiceError;

    const roomForms = document.querySelectorAll(".hotel-room-form");

    for (const roomForm of roomForms) {
      const roomPhotoFiles = getPhotoFiles(roomForm.querySelector('[name="roomPhotos"]'));
      const roomPhotos = await uploadPhotos(
        roomPhotoFiles,
        "room-photos",
        `rooms/${hotelService.id}`
      );
    
    
      const roomFacilities = Array.from(
        roomForm.querySelectorAll('input[name="roomFacilities"]:checked')
      ).map(checkbox => checkbox.value);

      const { error: roomError } = await supabaseClient
        .from("hotel_rooms")
        .insert({
          service_id: hotelService.id,
          room_category_name: roomForm.querySelector('[name="roomCategoryName"]').value,
          bed_type: roomForm.querySelector('[name="bedType"]').value,
          number_of_beds: Number(roomForm.querySelector('[name="numberOfBeds"]').value),
          room_size: Number(roomForm.querySelector('[name="roomSize"]').value) || null,
          room_size_unit: roomForm.querySelector('[name="roomSizeUnit"]').value || null,
          available_rooms: Number(roomForm.querySelector('[name="availableRooms"]').value),
          price: Number(roomForm.querySelector('[name="roomPrice"]').value),
          facilities: roomFacilities,
          photo_paths: roomPhotos.photoPaths,
          photo_urls: roomPhotos.photoUrls
        });

      if (roomError) throw roomError;
    }

    alert("Hotel service saved successfully.");
    document.getElementById("hotelForm").reset();
    resetPhotoInputsInside(document.getElementById("hotelForm"));
    resetServiceLocation("hotel");
    hotelRoomsContainer.innerHTML = "";
    document.getElementById("hotelFormModal").classList.add("hidden");
    await loadAllServices();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save hotel service.");
  }
});

document.getElementById("addRestaurantServiceBtn").addEventListener("click", () => {
  document.getElementById("restaurantFormModal").classList.remove("hidden");
  initServiceLocationMap("restaurant");
});

document.getElementById("closeRestaurantModal").addEventListener("click", () => {
  document.getElementById("restaurantFormModal").classList.add("hidden");
});

document.getElementById("addRestOperatingHourBtn").addEventListener("click", () => {
  const row = document.createElement("div");
  row.className = "rest-operating-hour-row";

  row.innerHTML = `
    <select name="restDay" required>
      <option value="">Day</option>
      <option value="Monday">Monday</option>
      <option value="Tuesday">Tuesday</option>
      <option value="Wednesday">Wednesday</option>
      <option value="Thursday">Thursday</option>
      <option value="Friday">Friday</option>
      <option value="Saturday">Saturday</option>
      <option value="Sunday">Sunday</option>
    </select>
    <input type="time" name="restOpeningTime" required />
    <input type="time" name="restCloseTime" required />
    <button type="button" onclick="this.parentElement.remove()">Remove</button>
  `;

  document.getElementById("restOperatingHoursContainer").appendChild(row);
});

function getCheckedValues(selector) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(
    checkbox => checkbox.value
  );
}

function getRestaurantOperatingHours() {
  return Array.from(document.querySelectorAll(".rest-operating-hour-row")).map(row => ({
    day: row.querySelector('[name="restDay"]').value,
    opening_time: row.querySelector('[name="restOpeningTime"]').value,
    close_time: row.querySelector('[name="restCloseTime"]').value
  }));
}


document.getElementById("restaurantForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }
    const restPhotoFiles = getPhotoFiles(document.getElementById("restPhotos"));
    const restPhotos = await uploadPhotos(
      restPhotoFiles,
      "rest-service-photo",
      `restaurants/${user.id}`
    );
    
    const { error } = await supabaseClient
      .from("rest_service")
      .insert({
        email: user.email,
        service_name: document.getElementById("restServiceName").value,
        contact: document.getElementById("restContact").value,
        address: document.getElementById("restAddress").value,
        description: document.getElementById("restDescription").value,
        city: document.getElementById("restCity").value,
        latitude: document.getElementById("restLatitude").value
          ? Number(document.getElementById("restLatitude").value)
          : null,
        longitude: document.getElementById("restLongitude").value
          ? Number(document.getElementById("restLongitude").value)
          : null,
        operating_hours: getRestaurantOperatingHours(),
        breakfast: document.getElementById("restBreakfast").value || null,
        lunch: document.getElementById("restLunch").value || null,
        dinner: document.getElementById("restDinner").value || null,
        last_order_time: document.getElementById("restLastOrderTime").value || null,
        seat_categories: getCheckedValues('input[name="restSeatCategories"]'),
        signature_dishes: document.getElementById("restSignatureDishes").value,
        vegetarian_options: document.getElementById("restVegetarianOptions").value || null,
        halal_options: document.getElementById("restHalalOptions").value || null,
        gluten_free_options: document.getElementById("restGlutenFreeOptions").value || null,
        kids_menu: document.getElementById("restKidsMenu").value || null,
        buffet_available: document.getElementById("restBuffetAvailable").value || null,
        buffet_time: document.getElementById("restBuffetTime").value || null,
        take_away: document.getElementById("restTakeAway").value || null,
        home_delivery: document.getElementById("restHomeDelivery").value || null,
        delivery_radius_km: Number(document.getElementById("restDeliveryRadiusKm").value) || null,
        taxes_included: document.getElementById("restTaxesIncluded").value || null,
        facilities: getCheckedValues('input[name="restFacilities"]'),
        payment_methods: getCheckedValues('input[name="restPaymentMethods"]'),
        photo_paths: restPhotos.photoPaths,
        photo_urls: restPhotos.photoUrls
      });

    if (error) throw error;

    alert("Restaurant service saved successfully.");
    document.getElementById("restaurantForm").reset();
    resetPhotoInputsInside(document.getElementById("restaurantForm"));
    resetServiceLocation("restaurant");
    document.getElementById("restOperatingHoursContainer").innerHTML = "";

    document.getElementById("restaurantFormModal").classList.add("hidden");
    await loadAllServices();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save restaurant service.");
  }
});

document.getElementById("addGuideServiceBtn").addEventListener("click", () => {
  document.getElementById("guideFormModal").classList.remove("hidden");
});

document.getElementById("closeGuideModal").addEventListener("click", () => {
  document.getElementById("guideFormModal").classList.add("hidden");
});

function getCheckedValues(selector) {
  return Array.from(document.querySelectorAll(selector + ":checked")).map(
    checkbox => checkbox.value
  );
}


document.getElementById("guideForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    const selectedLanguages = getCheckedValues('input[name="guideLanguages"]');
    const otherLanguageChecked = document.getElementById("guideOtherLanguageCheck").checked;
    const otherLanguage = document.getElementById("guideOtherLanguage").value.trim();

    if (otherLanguageChecked && otherLanguage) {
      selectedLanguages.push(otherLanguage);
    }
    const guidePhotoFiles = getPhotoFiles(document.getElementById("guidePhotos"));
    const guidePhotos = await uploadPhotos(
      guidePhotoFiles,
      "guide-service-photo",
      `guides/${user.id}`
    );
    
    const { error } = await supabaseClient
      .from("guide_service")
      .insert({
        email: user.email,
        service_name: document.getElementById("guideServiceName").value,
        contact: document.getElementById("guideContact").value,
        address: document.getElementById("guideAddress").value,
        description: document.getElementById("guideDescription").value,
        years_of_experience: Number(document.getElementById("guideYearsExperience").value) || null,
        guide_license_number: document.getElementById("guideLicenseNumber").value,
        license_expiry_date: document.getElementById("guideLicenseExpiryDate").value || null,
        languages: selectedLanguages,
        other_language: otherLanguage || null,
        specializations: getCheckedValues('input[name="guideSpecializations"]'),
        pricing_details: document.getElementById("guidePricingDetails").value,
        facilities: getCheckedValues('input[name="guideFacilities"]'),
        payment_methods: getCheckedValues('input[name="guidePaymentMethods"]'),
        photo_paths: guidePhotos.photoPaths,
        photo_urls: guidePhotos.photoUrls
      });

    if (error) throw error;

    alert("Guide service saved successfully.");
    document.getElementById("guideForm").reset();
    document.getElementById("guideFormModal").classList.add("hidden");
    resetPhotoInputsInside(document.getElementById("guideForm"));
    await loadAllServices();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save guide service.");
  }
});

/* =====================================================
   EDIT LOADED SERVICE PATCH
===================================================== */

let editingService = null;

const editFormInfo = {
  transport: {
    modalId: "transportFormModal",
    formId: "transportForm",
    title: "Edit Transport Service",
    saveText: "Update Transport Service",
    addTitle: "Add Transport Service",
    addText: "Save Transport Service",
    table: "transport_service",
    photoInputId: "servicePhotos",
    bucket: "transport-service-photo",
    folder: userId => `services/${userId}`
  },
  hotel: {
    modalId: "hotelFormModal",
    formId: "hotelForm",
    title: "Edit Hotel Service",
    saveText: "Update Hotel Service",
    addTitle: "Add Hotel Service",
    addText: "Save Hotel Service",
    table: "hotel_service",
    photoInputId: "hotelServicePhotos",
    bucket: "hotel-service-photo",
    folder: userId => `hotels/${userId}`
  },
  restaurant: {
    modalId: "restaurantFormModal",
    formId: "restaurantForm",
    title: "Edit Restaurant Service",
    saveText: "Update Restaurant Service",
    addTitle: "Add Restaurant Service",
    addText: "Save Restaurant Service",
    table: "rest_service",
    photoInputId: "restPhotos",
    bucket: "rest-service-photo",
    folder: userId => `restaurants/${userId}`
  },
  guide: {
    modalId: "guideFormModal",
    formId: "guideForm",
    title: "Edit Guide Service",
    saveText: "Update Guide Service",
    addTitle: "Add Guide Service",
    addText: "Save Guide Service",
    table: "guide_service",
    photoInputId: "guidePhotos",
    bucket: "guide-service-photo",
    folder: userId => `guides/${userId}`
  }
};

const existingPhotoStates = new WeakMap();

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

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function setCheckedValues(selector, values) {
  const selectedValues = toArray(values);

  document.querySelectorAll(selector).forEach(checkbox => {
    checkbox.checked = selectedValues.includes(checkbox.value);
  });
}

function getCheckedValuesInside(container, selector) {
  return Array.from(container.querySelectorAll(selector + ":checked"))
    .map(checkbox => checkbox.value);
}

function setFormMode(type, mode) {
  const info = editFormInfo[type];
  const form = document.getElementById(info.formId);

  form.querySelector("h2").textContent =
    mode === "edit" ? info.title : info.addTitle;

  form.querySelector('button[type="submit"]').textContent =
    mode === "edit" ? info.saveText : info.addText;
}

function renderExistingPhotos(input, photoUrls = [], photoPaths = []) {
  if (!input) return;

  let state = existingPhotoStates.get(input);

  if (!state) {
    const grid = document.createElement("div");
    grid.className = "photo-preview-grid";

    input.insertAdjacentElement("afterend", grid);

    state = {
      grid,
      urls: [],
      paths: [],
      originalPaths: []
    };

    existingPhotoStates.set(input, state);
  }

  state.urls = toArray(photoUrls);
  state.paths = toArray(photoPaths);
  state.originalPaths = [...state.paths];

  drawExistingPhotos(input);
}

function drawExistingPhotos(input) {
  const state = existingPhotoStates.get(input);
  if (!state) return;

  state.grid.innerHTML = "";

  state.urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "photo-preview-item";

    item.innerHTML = `
      <img src="${escapeHTML(url)}" alt="Existing photo">
      <button type="button" class="photo-preview-remove">&times;</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      state.urls.splice(index, 1);
      state.paths.splice(index, 1);
      drawExistingPhotos(input);
    });

    state.grid.appendChild(item);
  });
}

function resetExistingPhotosInside(container) {
  container.querySelectorAll('input[type="file"]').forEach(input => {
    renderExistingPhotos(input, [], []);
  });
}

async function buildPhotoPayload(input, bucketName, folderName) {
  setupPhotoPreview(input);

  const existingState = existingPhotoStates.get(input) || {
    urls: [],
    paths: [],
    originalPaths: []
  };

  const newFiles = getPhotoFiles(input);

  const uploaded = await uploadPhotos(
    newFiles,
    bucketName,
    folderName
  );

  const removedPaths = existingState.originalPaths.filter(
    oldPath => !existingState.paths.includes(oldPath)
  );

  if (removedPaths.length) {
    await supabaseClient.storage
      .from(bucketName)
      .remove(removedPaths);
  }

  return {
    photo_paths: [...existingState.paths, ...uploaded.photoPaths],
    photo_urls: [...existingState.urls, ...uploaded.photoUrls]
  };
}

function prepareAddMode(type) {
  editingService = null;

  const info = editFormInfo[type];
  const form = document.getElementById(info.formId);

  form.reset();
  resetPhotoInputsInside(form);
  resetExistingPhotosInside(form);
  setFormMode(type, "add");

  if (type === "transport") {
    driversContainer.innerHTML = "";
    vehiclesContainer.innerHTML = "";
  }

  if (type === "hotel") {
    hotelRoomsContainer.innerHTML = "";
    resetServiceLocation("hotel");
  }

  if (type === "restaurant") {
    document.getElementById("restOperatingHoursContainer").innerHTML = "";
    resetServiceLocation("restaurant");
  }
}

/* Make Add Service buttons always open clean blank forms */
document.getElementById("addTransportServiceBtn").addEventListener("click", () => {
  prepareAddMode("transport");
}, true);

document.getElementById("addHotelServiceBtn").addEventListener("click", () => {
  prepareAddMode("hotel");
}, true);

document.getElementById("addRestaurantServiceBtn").addEventListener("click", () => {
  prepareAddMode("restaurant");
}, true);

document.getElementById("addGuideServiceBtn").addEventListener("click", () => {
  prepareAddMode("guide");
}, true);

/* Reset edit mode when closing forms */
document.querySelectorAll(
  ".form-top-close, #closeTransportModal, #closeHotelModal, #closeRestaurantModal, #closeGuideModal"
).forEach(button => {
  button.addEventListener("click", () => {
    editingService = null;
  }, true);
});

/* Override old read-only View Details behavior */
window.openServiceDetails = async function(index) {
  const service = allPostedServices[index];
  if (!service) return;

  const type = service.service_type;
  const info = editFormInfo[type];

  editingService = {
    type,
    id: service.id,
    data: service
  };

  closeModal();

  const form = document.getElementById(info.formId);
  form.reset();
  resetPhotoInputsInside(form);
  resetExistingPhotosInside(form);
  setFormMode(type, "edit");

  if (type === "transport") {
    await fillTransportForm(service);
  }

  if (type === "hotel") {
    await fillHotelForm(service);
  }

  if (type === "restaurant") {
    fillRestaurantForm(service);
  }

  if (type === "guide") {
    fillGuideForm(service);
  }

  document.getElementById(info.modalId).classList.remove("hidden");
};

/* =========================
   FILL FORMS
========================= */

async function fillTransportForm(service) {
  setValue("serviceName", service.service_name);
  setValue("serviceContact", service.contact);
  setValue("serviceAddress", service.address);
  setValue("serviceDescription", service.description);

  renderExistingPhotos(
    document.getElementById("servicePhotos"),
    service.photo_urls,
    service.photo_paths
  );

  driversContainer.innerHTML = "";
  vehiclesContainer.innerHTML = "";

  const { data: driversData, error: driversError } = await supabaseClient
    .from("transport_drivers")
    .select("*")
    .eq("service_id", service.id);

  if (driversError) throw driversError;

  const { data: vehiclesData, error: vehiclesError } = await supabaseClient
    .from("transport_vehicles")
    .select("*")
    .eq("service_id", service.id);

  if (vehiclesError) throw vehiclesError;

  (driversData || []).forEach(driver => {
    document.getElementById("addDriverBtn").click();

    const form = driversContainer.lastElementChild;
    form.dataset.driverId = driver.id;

    form.querySelector('[name="driverName"]').value = driver.name || "";
    form.querySelector('[name="driverContact"]').value = driver.contact || "";
    form.querySelector('[name="driverNic"]').value = driver.nic || "";
    form.querySelector('[name="joinedDate"]').value = driver.joined_date || "";
    form.querySelector('[name="licenseNo"]').value = driver.license_no || "";
    form.querySelector('[name="issuedDate"]').value = driver.issued_date || "";
    form.querySelector('[name="expiryDate"]').value = driver.expiry_date || "";

    renderExistingPhotos(
      form.querySelector('[name="driverPhotos"]'),
      driver.photo_urls,
      driver.photo_paths
    );
  });

  (vehiclesData || []).forEach(vehicle => {
    document.getElementById("addVehicleBtn").click();

    const form = vehiclesContainer.lastElementChild;
    form.dataset.vehicleId = vehicle.id;

    form.querySelector('[name="vehicleNumber"]').value = vehicle.vehicle_number || "";
    form.querySelector('[name="category"]').value = vehicle.category || "";
    form.querySelector('[name="seatCount"]').value = vehicle.seat_count || "";
    form.querySelector('[name="transmission"]').value = vehicle.transmission || "";
    form.querySelector('[name="driverOption"]').value = vehicle.driver_option || "";
    form.querySelector('[name="luggageCapacity"]').value = vehicle.luggage_capacity || "";
    form.querySelector('[name="airCondition"]').value = vehicle.air_condition || "";
    form.querySelector('[name="fuelType"]').value = vehicle.fuel_type || "";
    form.querySelector('[name="price"]').value = vehicle.price || "";
    form.querySelector('[name="priceCalculatedPer"]').value = vehicle.price_calculated_per || "";

    renderExistingPhotos(
      form.querySelector('[name="vehiclePhotos"]'),
      vehicle.photo_urls,
      vehicle.photo_paths
    );
  });
}

async function fillHotelForm(service) {
  setValue("hotelServiceName", service.service_name);
  setValue("hotelPropertyType", service.property_type);
  setValue("hotelStarRating", service.star_rating);
  setValue("hotelTotalRooms", service.total_rooms);
  setValue("hotelContact", service.contact);
  setValue("hotelAddress", service.address);
  setValue("hotelDescription", service.description);
  setValue("hotelCity", service.city);
  setValue("hotelLatitude", service.latitude);
  setValue("hotelLongitude", service.longitude);
  setValue("hotelPriceBasis", service.price_basis);
  setValue("hotelTaxServiceCharge", service.tax_service_charge);
  setValue("hotelCleaningFees", service.cleaning_fees);
  setValue("hotelConnectivity", service.connectivity);
  setValue("hotelPetsAllowed", service.pets_allowed);

  setCheckedValues('input[name="hotelFacilities"]', service.facilities);
  setCheckedValues('input[name="hotelParkings"]', service.parkings);

  renderExistingPhotos(
    document.getElementById("hotelServicePhotos"),
    service.photo_urls,
    service.photo_paths
  );

  initServiceLocationMap("hotel");

  if (service.latitude && service.longitude) {
    setServiceLocation(
      "hotel",
      Number(service.latitude),
      Number(service.longitude),
      "Hotel location"
    );
  }

  hotelRoomsContainer.innerHTML = "";

  const { data: roomsData, error: roomsError } = await supabaseClient
    .from("hotel_rooms")
    .select("*")
    .eq("service_id", service.id);

  if (roomsError) throw roomsError;

  (roomsData || []).forEach(room => {
    document.getElementById("addHotelRoomBtn").click();

    const form = hotelRoomsContainer.lastElementChild;
    form.dataset.roomId = room.id;

    form.querySelector('[name="roomCategoryName"]').value = room.room_category_name || "";
    form.querySelector('[name="bedType"]').value = room.bed_type || "";
    form.querySelector('[name="numberOfBeds"]').value = room.number_of_beds || "";
    form.querySelector('[name="roomSize"]').value = room.room_size || "";
    form.querySelector('[name="roomSizeUnit"]').value = room.room_size_unit || "";
    form.querySelector('[name="availableRooms"]').value = room.available_rooms || "";
    form.querySelector('[name="roomPrice"]').value = room.price || "";

    const facilities = toArray(room.facilities);
    form.querySelectorAll('input[name="roomFacilities"]').forEach(checkbox => {
      checkbox.checked = facilities.includes(checkbox.value);
    });

    renderExistingPhotos(
      form.querySelector('[name="roomPhotos"]'),
      room.photo_urls,
      room.photo_paths
    );
  });
}

function fillRestaurantForm(service) {
  setValue("restServiceName", service.service_name);
  setValue("restContact", service.contact);
  setValue("restAddress", service.address);
  setValue("restDescription", service.description);
  setValue("restCity", service.city);
  setValue("restLatitude", service.latitude);
  setValue("restLongitude", service.longitude);

  initServiceLocationMap("restaurant");

  if (service.latitude && service.longitude) {
    setServiceLocation(
      "restaurant",
      Number(service.latitude),
      Number(service.longitude),
      "Restaurant location"
    );
  }

  document.getElementById("restOperatingHoursContainer").innerHTML = "";

  toArray(service.operating_hours).forEach(hour => {
    document.getElementById("addRestOperatingHourBtn").click();

    const row = document.getElementById("restOperatingHoursContainer").lastElementChild;

    row.querySelector('[name="restDay"]').value = hour.day || "";
    row.querySelector('[name="restOpeningTime"]').value = hour.opening_time || "";
    row.querySelector('[name="restCloseTime"]').value = hour.close_time || "";
  });

  setValue("restBreakfast", service.breakfast);
  setValue("restLunch", service.lunch);
  setValue("restDinner", service.dinner);
  setValue("restLastOrderTime", service.last_order_time);
  setValue("restSignatureDishes", service.signature_dishes);
  setValue("restVegetarianOptions", service.vegetarian_options);
  setValue("restHalalOptions", service.halal_options);
  setValue("restGlutenFreeOptions", service.gluten_free_options);
  setValue("restKidsMenu", service.kids_menu);
  setValue("restBuffetAvailable", service.buffet_available);
  setValue("restBuffetTime", service.buffet_time);
  setValue("restTakeAway", service.take_away);
  setValue("restHomeDelivery", service.home_delivery);
  setValue("restDeliveryRadiusKm", service.delivery_radius_km);
  setValue("restTaxesIncluded", service.taxes_included);

  setCheckedValues('input[name="restSeatCategories"]', service.seat_categories);
  setCheckedValues('input[name="restFacilities"]', service.facilities);
  setCheckedValues('input[name="restPaymentMethods"]', service.payment_methods);

  renderExistingPhotos(
    document.getElementById("restPhotos"),
    service.photo_urls,
    service.photo_paths
  );
}

function fillGuideForm(service) {
  setValue("guideServiceName", service.service_name);
  setValue("guideContact", service.contact);
  setValue("guideAddress", service.address);
  setValue("guideDescription", service.description);
  setValue("guideYearsExperience", service.years_of_experience);
  setValue("guideLicenseNumber", service.guide_license_number);
  setValue("guideLicenseExpiryDate", service.license_expiry_date);
  setValue("guidePricingDetails", service.pricing_details);

  const languages = toArray(service.languages);
  const normalLanguageValues = Array.from(
    document.querySelectorAll('input[name="guideLanguages"]')
  ).map(input => input.value);

  const otherLanguage =
    service.other_language ||
    languages.find(language => !normalLanguageValues.includes(language)) ||
    "";

  setCheckedValues('input[name="guideLanguages"]', languages);
  setCheckedValues('input[name="guideSpecializations"]', service.specializations);
  setCheckedValues('input[name="guideFacilities"]', service.facilities);
  setCheckedValues('input[name="guidePaymentMethods"]', service.payment_methods);

  document.getElementById("guideOtherLanguageCheck").checked = !!otherLanguage;
  setValue("guideOtherLanguage", otherLanguage);

  renderExistingPhotos(
    document.getElementById("guidePhotos"),
    service.photo_urls,
    service.photo_paths
  );
}

/* =========================
   SAVE / UPDATE FORMS
========================= */

async function saveMainService(type, payload) {
  const info = editFormInfo[type];

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    alert("Please login first.");
    return null;
  }

  if (editingService && editingService.type === type) {
    const { error } = await supabaseClient
      .from(info.table)
      .update(payload)
      .eq("id", editingService.id)
      .eq("email", user.email);

    if (error) throw error;

    return editingService.id;
  }

  const { data, error } = await supabaseClient
    .from(info.table)
    .insert({
      email: user.email,
      ...payload
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

async function finishServiceSave(type) {
  const info = editFormInfo[type];

  document.getElementById(info.formId).reset();
  resetPhotoInputsInside(document.getElementById(info.formId));
  resetExistingPhotosInside(document.getElementById(info.formId));
  document.getElementById(info.modalId).classList.add("hidden");

  if (type === "transport") {
    driversContainer.innerHTML = "";
    vehiclesContainer.innerHTML = "";
  }

  if (type === "hotel") {
    hotelRoomsContainer.innerHTML = "";
    resetServiceLocation("hotel");
  }

  if (type === "restaurant") {
    document.getElementById("restOperatingHoursContainer").innerHTML = "";
    resetServiceLocation("restaurant");
  }

  editingService = null;
  await loadAllServices();
}

async function removeChildCard(button, tableName, bucketName, datasetKey) {
  const card = button.closest(".driver-form, .vehicle-form, .hotel-room-form");

  if (!card) return;

  const rowId = card.dataset[datasetKey];

  /*
    If this is a newly added driver / vehicle / room,
    it has no database ID yet, so just remove it from the form.
  */
  if (!rowId || rowId === "undefined" || rowId === "null") {
    card.remove();
    return;
  }

  /*
    If not in edit mode, it is still only a temporary form card.
  */
  if (!editingService) {
    card.remove();
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to remove this item? This will delete it from the database."
  );

  if (!confirmed) return;

  try {
    const { data: existingRow, error: fetchError } = await supabaseClient
      .from(tableName)
      .select("id, photo_paths")
      .eq("id", rowId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingRow?.photo_paths) {
      await safeDeleteStorageFiles(bucketName, existingRow.photo_paths);
    }

    const { data: deletedRows, error: deleteError } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("id", rowId)
      .select("id");

    if (deleteError) throw deleteError;

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        `${tableName} row was not deleted. Check Supabase RLS delete policy or ID column.`
      );
    }

    card.remove();

  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to remove item.");
  }
}

/* =========================
   CHILD RECORD UPDATE / DELETE HELPERS
   Keeps existing driver / vehicle / room IDs instead of recreating them
========================= */

function getVisibleChildIds(container, datasetKey) {
  return Array.from(container.children)
    .map(card => card.dataset[datasetKey])
    .filter(Boolean);
}

async function deleteRemovedChildRows(tableName, bucketName, serviceId, visibleIds) {
  const { data: existingRows, error: fetchError } = await supabaseClient
    .from(tableName)
    .select("id, photo_paths")
    .eq("service_id", serviceId);

  if (fetchError) throw fetchError;

  const removedRows = (existingRows || []).filter(row =>
    !visibleIds.includes(String(row.id))
  );

  if (!removedRows.length) return;

  const removedPhotoPaths = removedRows.flatMap(row =>
    normalizeDeletePaths(row.photo_paths)
  );

  await safeDeleteStorageFiles(bucketName, removedPhotoPaths);

  const { error: deleteError } = await supabaseClient
    .from(tableName)
    .delete()
    .in("id", removedRows.map(row => row.id))
    .eq("service_id", serviceId);

  if (deleteError) throw deleteError;
}

function cleanChildRowId(rowId) {
  if (!rowId) return "";
  if (rowId === "undefined") return "";
  if (rowId === "null") return "";
  return rowId;
}

async function insertOrUpdateChildRow(tableName, rowId, serviceId, payload) {
  const cleanRowId = cleanChildRowId(rowId);

  if (cleanRowId) {
    /*
      First try update using both id and service_id.
      .select("id") is important because it tells us whether a row was really updated.
    */
    const { data: updatedRows, error: updateError } = await supabaseClient
      .from(tableName)
      .update(payload)
      .eq("id", cleanRowId)
      .eq("service_id", serviceId)
      .select("id");

    if (updateError) throw updateError;

    if (updatedRows && updatedRows.length > 0) {
      return;
    }

    /*
      Fallback: try update by id only.
      This helps if service_id is stored as a different type in Supabase.
    */
    const { data: fallbackRows, error: fallbackError } = await supabaseClient
      .from(tableName)
      .update(payload)
      .eq("id", cleanRowId)
      .select("id");

    if (fallbackError) throw fallbackError;

    if (!fallbackRows || fallbackRows.length === 0) {
      throw new Error(
        `${tableName} row ${cleanRowId} was not updated. Check the child table ID column or Supabase RLS update policy.`
      );
    }

    return;
  }

  /*
    No row ID means this is a newly added driver / vehicle / room.
  */
  const { error: insertError } = await supabaseClient
    .from(tableName)
    .insert({
      service_id: serviceId,
      ...payload
    });

  if (insertError) throw insertError;
}

async function saveTransportChildRecords(serviceId) {
  const driverForms = Array.from(
    driversContainer.querySelectorAll(".driver-form")
  );

  const vehicleForms = Array.from(
    vehiclesContainer.querySelectorAll(".vehicle-form")
  );

  for (const driverForm of driverForms) {
    const driverPhotos = await buildPhotoPayload(
      driverForm.querySelector('[name="driverPhotos"]'),
      "driver-photos",
      `drivers/${serviceId}`
    );

    await insertOrUpdateChildRow(
      "transport_drivers",
      driverForm.dataset.driverId,
      serviceId,
      {
        name: driverForm.querySelector('[name="driverName"]').value,
        contact: driverForm.querySelector('[name="driverContact"]').value,
        nic: driverForm.querySelector('[name="driverNic"]').value,
        joined_date: driverForm.querySelector('[name="joinedDate"]').value || null,
        license_no: driverForm.querySelector('[name="licenseNo"]').value,
        issued_date: driverForm.querySelector('[name="issuedDate"]').value || null,
        expiry_date: driverForm.querySelector('[name="expiryDate"]').value || null,
        photo_paths: driverPhotos.photo_paths,
        photo_urls: driverPhotos.photo_urls
      }
    );
  }

  for (const vehicleForm of vehicleForms) {
    const vehiclePhotos = await buildPhotoPayload(
      vehicleForm.querySelector('[name="vehiclePhotos"]'),
      "vehicle-photos",
      `vehicles/${serviceId}`
    );

    await insertOrUpdateChildRow(
      "transport_vehicles",
      vehicleForm.dataset.vehicleId,
      serviceId,
      {
        vehicle_number: vehicleForm.querySelector('[name="vehicleNumber"]').value,
        category: vehicleForm.querySelector('[name="category"]').value,
        seat_count: Number(vehicleForm.querySelector('[name="seatCount"]').value) || null,
        transmission: vehicleForm.querySelector('[name="transmission"]').value || null,
        driver_option: vehicleForm.querySelector('[name="driverOption"]').value || null,
        luggage_capacity: vehicleForm.querySelector('[name="luggageCapacity"]').value,
        air_condition: vehicleForm.querySelector('[name="airCondition"]').value || null,
        fuel_type: vehicleForm.querySelector('[name="fuelType"]').value || null,
        price: Number(vehicleForm.querySelector('[name="price"]').value),
        price_calculated_per: vehicleForm.querySelector('[name="priceCalculatedPer"]').value,
        photo_paths: vehiclePhotos.photo_paths,
        photo_urls: vehiclePhotos.photo_urls
      }
    );
  }
}

async function saveHotelRoomRecords(serviceId) {
  const roomForms = Array.from(
    hotelRoomsContainer.querySelectorAll(".hotel-room-form")
  );

  for (const roomForm of roomForms) {
    const roomPhotos = await buildPhotoPayload(
      roomForm.querySelector('[name="roomPhotos"]'),
      "room-photos",
      `rooms/${serviceId}`
    );

    await insertOrUpdateChildRow(
      "hotel_rooms",
      roomForm.dataset.roomId,
      serviceId,
      {
        room_category_name: roomForm.querySelector('[name="roomCategoryName"]').value,
        bed_type: roomForm.querySelector('[name="bedType"]').value,
        number_of_beds: Number(roomForm.querySelector('[name="numberOfBeds"]').value),
        room_size: Number(roomForm.querySelector('[name="roomSize"]').value) || null,
        room_size_unit: roomForm.querySelector('[name="roomSizeUnit"]').value || null,
        available_rooms: Number(roomForm.querySelector('[name="availableRooms"]').value),
        price: Number(roomForm.querySelector('[name="roomPrice"]').value),
        facilities: getCheckedValuesInside(roomForm, 'input[name="roomFacilities"]'),
        photo_paths: roomPhotos.photo_paths,
        photo_urls: roomPhotos.photo_urls
      }
    );
  }
}

/* Stop your old insert-only submit handlers and use update-aware handlers */
document.getElementById("transportForm").addEventListener("submit", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    const photos = await buildPhotoPayload(
      document.getElementById("servicePhotos"),
      "transport-service-photo",
      `services/${user.id}`
    );

    const serviceId = await saveMainService("transport", {
      service_name: document.getElementById("serviceName").value,
      contact: document.getElementById("serviceContact").value,
      address: document.getElementById("serviceAddress").value,
      description: document.getElementById("serviceDescription").value,
      photo_paths: photos.photo_paths,
      photo_urls: photos.photo_urls
    });

    if (!serviceId) return;
    await saveTransportChildRecords(serviceId);
    alert("Transport service saved successfully.");
    await finishServiceSave("transport");
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save transport service.");
  }
}, true);

document.getElementById("hotelForm").addEventListener("submit", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    const photos = await buildPhotoPayload(
      document.getElementById("hotelServicePhotos"),
      "hotel-service-photo",
      `hotels/${user.id}`
    );

    const serviceId = await saveMainService("hotel", {
      service_name: document.getElementById("hotelServiceName").value,
      property_type: document.getElementById("hotelPropertyType").value,
      star_rating: document.getElementById("hotelStarRating").value,
      total_rooms: Number(document.getElementById("hotelTotalRooms").value),
      contact: document.getElementById("hotelContact").value,
      address: document.getElementById("hotelAddress").value,
      description: document.getElementById("hotelDescription").value,
      city: document.getElementById("hotelCity").value,
      latitude: document.getElementById("hotelLatitude").value
        ? Number(document.getElementById("hotelLatitude").value)
        : null,
      longitude: document.getElementById("hotelLongitude").value
        ? Number(document.getElementById("hotelLongitude").value)
        : null,
      price_basis: document.getElementById("hotelPriceBasis").value,
      tax_service_charge: document.getElementById("hotelTaxServiceCharge").value,
      cleaning_fees: Number(document.getElementById("hotelCleaningFees").value) || 0,
      facilities: getCheckedValues('input[name="hotelFacilities"]'),
      connectivity: document.getElementById("hotelConnectivity").value || null,
      parkings: getCheckedValues('input[name="hotelParkings"]'),
      pets_allowed: document.getElementById("hotelPetsAllowed").value || null,
      photo_paths: photos.photo_paths,
      photo_urls: photos.photo_urls
    });

    if (!serviceId) return;
    /*
    if (editingService && editingService.type === "hotel") {
      await supabaseClient.from("hotel_rooms").delete().eq("service_id", serviceId);
    }

    for (const roomForm of document.querySelectorAll(".hotel-room-form")) {
      const roomPhotos = await buildPhotoPayload(
        roomForm.querySelector('[name="roomPhotos"]'),
        "room-photos",
        `rooms/${serviceId}`
      );

      const { error } = await supabaseClient.from("hotel_rooms").insert({
        service_id: serviceId,
        room_category_name: roomForm.querySelector('[name="roomCategoryName"]').value,
        bed_type: roomForm.querySelector('[name="bedType"]').value,
        number_of_beds: Number(roomForm.querySelector('[name="numberOfBeds"]').value),
        room_size: Number(roomForm.querySelector('[name="roomSize"]').value) || null,
        room_size_unit: roomForm.querySelector('[name="roomSizeUnit"]').value || null,
        available_rooms: Number(roomForm.querySelector('[name="availableRooms"]').value),
        price: Number(roomForm.querySelector('[name="roomPrice"]').value),
        facilities: getCheckedValuesInside(roomForm, 'input[name="roomFacilities"]'),
        photo_paths: roomPhotos.photo_paths,
        photo_urls: roomPhotos.photo_urls
      });

      if (error) throw error;
    }
    */
    await saveHotelRoomRecords(serviceId);
    alert("Hotel service saved successfully.");
    await finishServiceSave("hotel");
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save hotel service.");
  }
}, true);

document.getElementById("restaurantForm").addEventListener("submit", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    const photos = await buildPhotoPayload(
      document.getElementById("restPhotos"),
      "rest-service-photo",
      `restaurants/${user.id}`
    );

    await saveMainService("restaurant", {
      service_name: document.getElementById("restServiceName").value,
      contact: document.getElementById("restContact").value,
      address: document.getElementById("restAddress").value,
      description: document.getElementById("restDescription").value,
      city: document.getElementById("restCity").value,
      latitude: document.getElementById("restLatitude").value
        ? Number(document.getElementById("restLatitude").value)
        : null,
      longitude: document.getElementById("restLongitude").value
        ? Number(document.getElementById("restLongitude").value)
        : null,
      operating_hours: getRestaurantOperatingHours(),
      breakfast: document.getElementById("restBreakfast").value || null,
      lunch: document.getElementById("restLunch").value || null,
      dinner: document.getElementById("restDinner").value || null,
      last_order_time: document.getElementById("restLastOrderTime").value || null,
      seat_categories: getCheckedValues('input[name="restSeatCategories"]'),
      signature_dishes: document.getElementById("restSignatureDishes").value,
      vegetarian_options: document.getElementById("restVegetarianOptions").value || null,
      halal_options: document.getElementById("restHalalOptions").value || null,
      gluten_free_options: document.getElementById("restGlutenFreeOptions").value || null,
      kids_menu: document.getElementById("restKidsMenu").value || null,
      buffet_available: document.getElementById("restBuffetAvailable").value || null,
      buffet_time: document.getElementById("restBuffetTime").value || null,
      take_away: document.getElementById("restTakeAway").value || null,
      home_delivery: document.getElementById("restHomeDelivery").value || null,
      delivery_radius_km: Number(document.getElementById("restDeliveryRadiusKm").value) || null,
      taxes_included: document.getElementById("restTaxesIncluded").value || null,
      facilities: getCheckedValues('input[name="restFacilities"]'),
      payment_methods: getCheckedValues('input[name="restPaymentMethods"]'),
      photo_paths: photos.photo_paths,
      photo_urls: photos.photo_urls
    });

    alert("Restaurant service saved successfully.");
    await finishServiceSave("restaurant");
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save restaurant service.");
  }
}, true);

document.getElementById("guideForm").addEventListener("submit", async event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    const selectedLanguages = getCheckedValues('input[name="guideLanguages"]');
    const otherLanguageChecked = document.getElementById("guideOtherLanguageCheck").checked;
    const otherLanguage = document.getElementById("guideOtherLanguage").value.trim();

    if (otherLanguageChecked && otherLanguage && !selectedLanguages.includes(otherLanguage)) {
      selectedLanguages.push(otherLanguage);
    }

    const photos = await buildPhotoPayload(
      document.getElementById("guidePhotos"),
      "guide-service-photo",
      `guides/${user.id}`
    );

    await saveMainService("guide", {
      service_name: document.getElementById("guideServiceName").value,
      contact: document.getElementById("guideContact").value,
      address: document.getElementById("guideAddress").value,
      description: document.getElementById("guideDescription").value,
      years_of_experience: Number(document.getElementById("guideYearsExperience").value) || null,
      guide_license_number: document.getElementById("guideLicenseNumber").value,
      license_expiry_date: document.getElementById("guideLicenseExpiryDate").value || null,
      languages: selectedLanguages,
      other_language: otherLanguage || null,
      specializations: getCheckedValues('input[name="guideSpecializations"]'),
      pricing_details: document.getElementById("guidePricingDetails").value,
      facilities: getCheckedValues('input[name="guideFacilities"]'),
      payment_methods: getCheckedValues('input[name="guidePaymentMethods"]'),
      photo_paths: photos.photo_paths,
      photo_urls: photos.photo_urls
    });

    alert("Guide service saved successfully.");
    await finishServiceSave("guide");
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to save guide service.");
  }
}, true);

/* =====================================================
   DELETE LOADED SERVICE PATCH
   Add this BEFORE script, after the edit/update patch
===================================================== */

/* 1 )Add red Delete Service buttons to all service forms */
function addDeleteButtonsToForms() {
  Object.keys(editFormInfo).forEach(type => {
    const info = editFormInfo[type];
    const form = document.getElementById(info.formId);

    if (!form || form.querySelector(".delete-service-btn")) return;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-service-btn hidden";
    deleteBtn.textContent = "Delete Service";

    deleteBtn.style.background = "linear-gradient(135deg, #dc2626, #ef4444)";
    deleteBtn.style.color = "#ffffff";
    deleteBtn.style.margin = "8px 10px 26px 26px";
    deleteBtn.style.display = "none";

    deleteBtn.addEventListener("click", async () => {
      await deleteCurrentEditingService();
    });

    const cancelButton = form.querySelector(
      "#closeTransportModal, #closeHotelModal, #closeRestaurantModal, #closeGuideModal"
    );

    if (cancelButton) {
      cancelButton.insertAdjacentElement("beforebegin", deleteBtn);
    } else {
      form.appendChild(deleteBtn);
    }
  });
}

/* 2) Show delete button only in edit mode */
function toggleDeleteButtons(activeType = null) {
  Object.keys(editFormInfo).forEach(type => {
    const form = document.getElementById(editFormInfo[type].formId);
    if (!form) return;

    const deleteBtn = form.querySelector(".delete-service-btn");
    if (!deleteBtn) return;

    const shouldShow =
      activeType === type &&
      editingService &&
      editingService.type === type;

    deleteBtn.classList.toggle("hidden", !shouldShow);
    deleteBtn.style.display = shouldShow ? "inline-flex" : "none";
  });
}

/* 3) Extend your existing setFormMode() to control delete button */
const originalSetFormModeForDelete = setFormMode;

setFormMode = function(type, mode) {
  originalSetFormModeForDelete(type, mode);

  if (mode === "edit") {
    toggleDeleteButtons(type);
  } else {
    toggleDeleteButtons(null);
  }
};

/* 4) Convert Supabase array/string photo paths safely */
function normalizeDeletePaths(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

/* 5) Delete files from Supabase Storage safely */
async function safeDeleteStorageFiles(bucketName, paths) {
  const cleanPaths = normalizeDeletePaths(paths);

  if (!cleanPaths.length) return;

  const { error } = await supabaseClient.storage
    .from(bucketName)
    .remove(cleanPaths);

  if (error) {
    console.warn(`Could not delete some files from ${bucketName}:`, error);
  }
}

/* 6) Delete the selected service and its related child data */
async function deleteCurrentEditingService() {
  if (!editingService || !editingService.id || !editingService.type) {
    alert("Please open a saved service first.");
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this service? This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    const type = editingService.type;
    const serviceId = editingService.id;
    const serviceData = editingService.data || {};
    const info = editFormInfo[type];

    /* Delete related child records and child photos */
    if (type === "transport") {
      const { data: driversData, error: driversFetchError } = await supabaseClient
        .from("transport_drivers")
        .select("photo_paths")
        .eq("service_id", serviceId);

      if (driversFetchError) throw driversFetchError;

      const { data: vehiclesData, error: vehiclesFetchError } = await supabaseClient
        .from("transport_vehicles")
        .select("photo_paths")
        .eq("service_id", serviceId);

      if (vehiclesFetchError) throw vehiclesFetchError;

      const driverPhotoPaths = (driversData || []).flatMap(driver =>
        normalizeDeletePaths(driver.photo_paths)
      );

      const vehiclePhotoPaths = (vehiclesData || []).flatMap(vehicle =>
        normalizeDeletePaths(vehicle.photo_paths)
      );

      await safeDeleteStorageFiles("driver-photos", driverPhotoPaths);
      await safeDeleteStorageFiles("vehicle-photos", vehiclePhotoPaths);

      const { error: deleteDriversError } = await supabaseClient
        .from("transport_drivers")
        .delete()
        .eq("service_id", serviceId);

      if (deleteDriversError) throw deleteDriversError;

      const { error: deleteVehiclesError } = await supabaseClient
        .from("transport_vehicles")
        .delete()
        .eq("service_id", serviceId);

      if (deleteVehiclesError) throw deleteVehiclesError;
    }

    if (type === "hotel") {
      const { data: roomsData, error: roomsFetchError } = await supabaseClient
        .from("hotel_rooms")
        .select("photo_paths")
        .eq("service_id", serviceId);

      if (roomsFetchError) throw roomsFetchError;

      const roomPhotoPaths = (roomsData || []).flatMap(room =>
        normalizeDeletePaths(room.photo_paths)
      );

      await safeDeleteStorageFiles("room-photos", roomPhotoPaths);

      const { error: deleteRoomsError } = await supabaseClient
        .from("hotel_rooms")
        .delete()
        .eq("service_id", serviceId);

      if (deleteRoomsError) throw deleteRoomsError;
    }

    /* Delete main service photos */
    await safeDeleteStorageFiles(
      info.bucket,
      normalizeDeletePaths(serviceData.photo_paths)
    );

    /* Delete main service row */
    const { error: deleteServiceError } = await supabaseClient
      .from(info.table)
      .delete()
      .eq("id", serviceId)
      .eq("email", user.email);

    if (deleteServiceError) throw deleteServiceError;

    alert("Service deleted successfully.");

    toggleDeleteButtons(null);

    await finishServiceSave(type);

  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to delete service.");
  }
}

/* 7) Hide delete button when closing/cancelling form */
document.querySelectorAll(
  ".form-top-close, #closeTransportModal, #closeHotelModal, #closeRestaurantModal, #closeGuideModal"
).forEach(button => {
  button.addEventListener("click", () => {
    toggleDeleteButtons(null);
  }, true);
});

/* 8) Initialize delete buttons */
addDeleteButtonsToForms();
toggleDeleteButtons(null);


/* =====================================================
   FIELD TITLES WITH REAL NAMES
===================================================== */

const formFieldSelector = `
  .form-modal input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),
  .form-modal textarea,
  .form-modal select
`;

let generatedFieldId = 1;

/*
  Titles for fields identified by their ID.
*/
const fieldTitlesById = {
  /* Transport service */
  serviceName: "Service Name",
  serviceContact: "Contact Number",
  serviceAddress: "Address",
  serviceDescription: "Description",
  servicePhotos: "Transport Service Photos",

  /* Hotel service */
  hotelServiceName: "Hotel Name",
  hotelPropertyType: "Property Type",
  hotelStarRating: "Star Rating",
  hotelTotalRooms: "Total Number of Rooms",
  hotelContact: "Contact Number",
  hotelAddress: "Address",
  hotelDescription: "Description",
  hotelCity: "City",
  hotelLocationSearch: "Search Hotel Location",
  hotelPriceBasis: "Price Basis",
  hotelTaxServiceCharge: "Tax and Service Charge",
  hotelCleaningFees: "Cleaning Fees",
  hotelConnectivity: "Internet Connectivity",
  hotelPetsAllowed: "Pets Allowed",
  hotelServicePhotos: "Hotel Photos",

  /* Restaurant service */
  restServiceName: "Restaurant Name",
  restContact: "Contact Number",
  restAddress: "Address",
  restDescription: "Description",
  restCity: "City",
  restLocationSearch: "Search Restaurant Location",
  restBreakfast: "Breakfast Available",
  restLunch: "Lunch Available",
  restDinner: "Dinner Available",
  restLastOrderTime: "Last Order Time",
  restSignatureDishes: "Signature Dishes",
  restVegetarianOptions: "Vegetarian Options",
  restHalalOptions: "Halal Options",
  restGlutenFreeOptions: "Gluten-Free Options",
  restKidsMenu: "Kids Menu",
  restBuffetAvailable: "Buffet Available",
  restBuffetTime: "Buffet Time",
  restTakeAway: "Take Away Available",
  restHomeDelivery: "Home Delivery Available",
  restDeliveryRadiusKm: "Delivery Radius in KM",
  restTaxesIncluded: "Taxes Included",
  restPhotos: "Restaurant Photos",

  /* Guide service */
  guideServiceName: "Guide Service Name",
  guideContact: "Contact Number",
  guideAddress: "Address",
  guideDescription: "Description",
  guideYearsExperience: "Years of Experience",
  guideLicenseNumber: "Guide License Number",
  guideLicenseExpiryDate: "License Expiry Date",
  guideOtherLanguage: "Other Language",
  guidePricingDetails: "Pricing Details",
  guidePhotos: "Guide Photos"
};

/*
  Titles for dynamically created fields identified by name.
*/
const fieldTitlesByName = {
  /* Driver fields */
  driverName: "Driver Name",
  driverContact: "Driver Contact Number",
  driverNic: "Driver NIC",
  joinedDate: "Joined Date",
  licenseNo: "License Number",
  issuedDate: "License Issued Date",
  expiryDate: "License Expiry Date",
  driverPhotos: "Driver Photos",

  /* Vehicle fields */
  vehicleNumber: "Vehicle Number",
  category: "Vehicle Category",
  seatCount: "Seat Count",
  transmission: "Transmission Type",
  driverOption: "Driver Option",
  luggageCapacity: "Luggage Capacity",
  airCondition: "Air Conditioning",
  fuelType: "Fuel Type",
  price: "Price",
  priceCalculatedPer: "Price Calculated Per",
  vehiclePhotos: "Vehicle Photos",

  /* Hotel room fields */
  roomCategoryName: "Room Category Name",
  bedType: "Bed Type",
  numberOfBeds: "Number of Beds",
  roomSize: "Room Size",
  roomSizeUnit: "Room Size Unit",
  availableRooms: "Available Rooms",
  roomPrice: "Room Price",
  roomPhotos: "Room Photos",

  /* Restaurant operating-hour fields */
  restDay: "Day",
  restOpeningTime: "Opening Time",
  restCloseTime: "Closing Time"
};

/*
  Convert camelCase or underscore names into readable titles.
*/
function convertToReadableTitle(value) {
  if (!value) return "";

  return value
    .replace(/^(hotel|rest|guide|service)/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}

/*
  Remove unnecessary words from placeholders or select options.
*/
function cleanFieldTitle(value) {
  if (!value) return "";

  return value
    .trim()
    .replace(/^Select\s+/i, "")
    .replace(/\s*-\s*(Yes|No)$/i, "");
}

/*
  Get a real title before generating an internal field ID.
*/
function getFieldTitle(field) {
  const originalId = field.id || "";
  const fieldName = field.name || "";

  /* First use titles defined using field IDs */
  if (originalId && fieldTitlesById[originalId]) {
    return fieldTitlesById[originalId];
  }

  /* Then use titles defined using field names */
  if (fieldName && fieldTitlesByName[fieldName]) {
    return fieldTitlesByName[fieldName];
  }

  /* Then use the placeholder */
  const placeholder = field.getAttribute("placeholder");

  if (placeholder) {
    return cleanFieldTitle(placeholder);
  }

  /* For select boxes, use the empty first option */
  if (field.tagName === "SELECT") {
    const defaultOption =
      Array.from(field.options).find(option => option.value === "") ||
      field.options[0];

    if (defaultOption && defaultOption.textContent.trim()) {
      return cleanFieldTitle(defaultOption.textContent);
    }
  }

  /* Use the original name or ID only—not the generated automatic ID */
  if (fieldName) {
    return convertToReadableTitle(fieldName);
  }

  if (originalId) {
    return convertToReadableTitle(originalId);
  }

  /* Final useful fallback based on input type */
  const fallbackTitles = {
    text: "Text",
    number: "Number",
    date: "Date",
    time: "Time",
    file: "Upload Photos",
    email: "Email Address",
    tel: "Contact Number"
  };

  return fallbackTitles[field.type] || "Details";
}

/*
  Add one title above a field.
*/
function addTitleToField(field) {
  if (field.dataset.fieldTitleAdded === "true") {
    return;
  }

  field.dataset.fieldTitleAdded = "true";

  /*
    Get the title before adding an automatically generated ID.
    This prevents titles such as "Automatic Form Field 1".
  */
  const fieldTitle = getFieldTitle(field);

  if (!field.id) {
    field.id = `formField${generatedFieldId++}`;
  }

  const previousElement = field.previousElementSibling;

  /*
    Reuse an existing standalone label when one is already present.
  */
  const existingLabel =
    previousElement &&
    previousElement.tagName === "LABEL" &&
    !previousElement.querySelector("input")
      ? previousElement
      : null;

  const wrapper = document.createElement("div");
  wrapper.className = "form-field";

  if (field.tagName === "TEXTAREA" || field.type === "file") {
    wrapper.classList.add("full-width");
  }

  const label = existingLabel || document.createElement("label");

  label.classList.add("field-title");
  label.htmlFor = field.id;

  if (!existingLabel) {
    label.textContent = fieldTitle;
  }

  if (field.required && !label.querySelector(".required-star")) {
    const star = document.createElement("span");
    star.className = "required-star";
    star.textContent = " *";
    label.appendChild(star);
  }

  const insertionPoint = existingLabel || field;

  insertionPoint.parentNode.insertBefore(wrapper, insertionPoint);

  wrapper.appendChild(label);
  wrapper.appendChild(field);
}

/*
  Add titles to all fields within a container.
*/
function addTitlesToFormFields(container = document) {
  const fields = [];

  if (container.matches && container.matches(formFieldSelector)) {
    fields.push(container);
  }

  if (container.querySelectorAll) {
    fields.push(...container.querySelectorAll(formFieldSelector));
  }

  fields.forEach(addTitleToField);
}

/*
  Add titles to existing and dynamically created fields.
*/
document.addEventListener("DOMContentLoaded", () => {
  addTitlesToFormFields(document);

  const fieldObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          addTitlesToFormFields(node);
        }
      });
    });
  });

  fieldObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
});
