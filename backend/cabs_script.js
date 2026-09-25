"use strict";

const SUPABASE_URL =
    "https://cdcolkoavowjjymzdzud.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM";

const _supabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let allCabs = [];
let selectedCab = null;
let saving = false;
let detailsVersion = 0;

const $ = id => document.getElementById(id);

/* ---------- SAFE DISPLAY HELPERS ---------- */

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}

function photos(value) {
    let list = value;

    if (typeof list === "string") {
        try {
            list = JSON.parse(list);
        } catch {
            list = [list];
        }
    }

    if (!Array.isArray(list)) {
        return [];
    }

    return list.filter(url => {
        try {
            return ["https:", "http:"].includes(
                new URL(url).protocol
            );
        } catch {
            return false;
        }
    });
}

function gallery(value, name) {
    const images = photos(value);

    if (!images.length) {
        return "";
    }

    return `
        <div class="gallery">
            ${images.map(url => `
                <a
                    href="${escapeHtml(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        src="${escapeHtml(url)}"
                        alt="${escapeHtml(name)}"
                        loading="lazy"
                    >
                </a>
            `).join("")}
        </div>
    `;
}

function specification(label, value) {
    const displayValue =
        value === null ||
        value === undefined ||
        value === ""
            ? "Not provided"
            : value;

    return `
        <div class="spec">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(displayValue)}</strong>
        </div>
    `;
}

function showToast(message) {
    const element = document.createElement("div");

    element.className = "toast";
    element.textContent = message;

    $("toast-container").append(element);

    setTimeout(() => element.remove(), 6000);
}

/* ---------- PRICES ---------- */

function vehicleRate(vehicle) {
    const value = vehicle?.price;

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
    ) {
        return null;
    }

    return Number(value);
}

function priceHTML(vehicle) {
    const rate = vehicleRate(vehicle);

    if (rate === null) {
        return "Price on request";
    }

    const unit = vehicle.price_calculated_per;

    const unitText = unit
        ? "/ " + escapeHtml(unit)
        : "· charging unit not provided";

    return `
        LKR ${rate.toLocaleString("en-LK")}
        <small>${unitText}</small>
    `;
}

function summaryPrice(vehicles) {
    const pricedVehicles = vehicles.filter(
        vehicle => vehicleRate(vehicle) !== null
    );

    if (!pricedVehicles.length) {
        return "Price on request";
    }

    const units = new Set(
        pricedVehicles.map(vehicle =>
            String(vehicle.price_calculated_per || "")
                .trim()
                .toLowerCase()
        )
    );

    // Do not compare a daily price against a per-km price.
    if (units.size > 1) {
        return "<small>View vehicle rates</small>";
    }

    const cheapest = [...pricedVehicles].sort(
        (a, b) => vehicleRate(a) - vehicleRate(b)
    )[0];

    const prefix = vehicles.length > 1
        ? "<small>From </small>"
        : "";

    return prefix + priceHTML(cheapest);
}

/* ---------- LOAD SERVICES AND VEHICLES ---------- */

const vehicleColumns = [
    "id",
    "service_id",
    "category",
    "seat_count",
    "transmission",
    "driver_option",
    "luggage_capacity",
    "air_condition",
    "fuel_type",
    "price",
    "price_calculated_per",
    "photo_urls"
].join(",");

function showEmpty(message, allowRetry = false) {
    $("cabsGrid").innerHTML = `
        <div class="empty-state">
            <p>${escapeHtml(message)}</p>

            ${allowRetry ? `
                <button
                    class="primary-btn"
                    type="button"
                    id="retryLoad"
                >
                    Try again
                </button>
            ` : ""}
        </div>
    `;

    $("retryLoad")?.addEventListener(
        "click",
        loadCabs
    );
}

async function loadCabs() {
    $("loader").hidden = false;
    $("cabsGrid").replaceChildren();
    $("resultsCount").textContent = "";

    try {
        const [servicesResult, vehiclesResult] =
            await Promise.all([
               _supabase
                    .from("transport_service")
                    .select(
                        "id,service_name,contact,address," +
                        "description,photo_urls"
                    )
                    .eq("approval_status", "approved"),

                _supabase
                    .from("transport_vehicles")
                    .select(vehicleColumns)
            ]);

        if (servicesResult.error) {
            throw servicesResult.error;
        }

        if (vehiclesResult.error) {
            throw vehiclesResult.error;
        }

        const vehicles = vehiclesResult.data || [];

        allCabs = (servicesResult.data || []).map(
            service => ({
                ...service,

                vehicles: vehicles.filter(
                    vehicle =>
                        String(vehicle.service_id) ===
                        String(service.id)
                )
            })
        );

        populateCategoryFilter(vehicles);
        applyFilters();

    } catch (error) {
        console.error("Transport loading failed:", error);

        showEmpty(
            "Unable to load transport services. " +
            "Please try again. If this continues, " +
            "check read permissions for transport_service " +
            "and transport_vehicles.",
            true
        );

    } finally {
        $("loader").hidden = true;
    }
}

function populateCategoryFilter(vehicles) {
    const previousValue = $("categoryFilter").value;

    $("categoryFilter").innerHTML =
        '<option value="all">All vehicles</option>';

    const categories = [
        ...new Set(
            vehicles
                .map(vehicle => vehicle.category)
                .filter(Boolean)
        )
    ].sort();

    categories.forEach(category => {
        $("categoryFilter").add(
            new Option(category, category)
        );
    });

    const previousValueExists = [
        ...$("categoryFilter").options
    ].some(option => option.value === previousValue);

    if (previousValueExists) {
        $("categoryFilter").value = previousValue;
    }
}

/* ---------- SEARCH AND FILTER ---------- */

function applyFilters() {
    const query = $("searchInput")
        .value
        .trim()
        .toLowerCase();

    const category = $("categoryFilter").value;

    const filteredServices = allCabs.filter(service => {
        const searchableText = `
            ${service.service_name || ""}
            ${service.address || ""}
        `.toLowerCase();

        const matchesSearch =
            searchableText.includes(query);

        const matchesCategory =
            category === "all" ||
            service.vehicles.some(
                vehicle => vehicle.category === category
            );

        return matchesSearch && matchesCategory;
    });

    if ($("sortSelect").value === "name_asc") {
        filteredServices.sort((a, b) =>
            String(a.service_name || "").localeCompare(
                String(b.service_name || "")
            )
        );
    }

    $("resultsCount").textContent =
        `${filteredServices.length} ` +
        `service${filteredServices.length === 1 ? "" : "s"} found`;

    renderCabs(filteredServices);
}

/* ---------- SUMMARY CARDS ---------- */

function renderCabs(services) {
    $("cabsGrid").replaceChildren();

    if (!services.length) {
        showEmpty(
            "No transport services match your search."
        );
        return;
    }

    services.forEach(service => {
        const cover =
            photos(service.photo_urls)[0] ||
            photos(service.vehicles[0]?.photo_urls)[0];

        const categories = [
            ...new Set(
                service.vehicles
                    .map(vehicle => vehicle.category)
                    .filter(Boolean)
            )
        ];

        const badge =
            categories.length === 1
                ? categories[0]
                : "Transport";

        const card = document.createElement("article");
        card.className = "cab-card";

        card.innerHTML = `
            ${cover ? `
                <img
                    class="cab-photo"
                    src="${escapeHtml(cover)}"
                    alt="${escapeHtml(service.service_name)}"
                    loading="lazy"
                >
            ` : `
                <div class="photo-placeholder">
                    <i
                        class="fas fa-car"
                        aria-hidden="true"
                    ></i>
                </div>
            `}

            <div class="cab-info">
                <div class="cab-top">
                    <h2>
                        ${escapeHtml(
                            service.service_name ||
                            "Transport service"
                        )}
                    </h2>

                    <span class="badge">
                        ${escapeHtml(badge)}
                    </span>
                </div>

                <p class="cab-description">
                    ${escapeHtml(
                        service.description ||
                        "Explore vehicles and service details."
                    )}
                </p>

                <p class="meta">
                    <i
                        class="fas fa-location-dot"
                        aria-hidden="true"
                    ></i>

                    ${escapeHtml(
                        service.address ||
                        "Address not provided"
                    )}
                </p>

                <p class="meta">
                    <i class="fas fa-lock" aria-hidden="true"></i>
                    Contact available after confirmation
                </p>

                <div class="cab-price">
                    ${summaryPrice(service.vehicles)}
                </div>

                <button
                    class="primary-btn"
                    type="button"
                >
                    See more →
                </button>
            </div>
        `;

        card.querySelector("button").addEventListener(
            "click",
            () => openDetails(service)
        );

        $("cabsGrid").append(card);
        TransportReviews.attach(card, service);
    });
}

/* ---------- SERVICE DETAILS ---------- */

async function openDetails(service) {
    const version = ++detailsVersion;

    $("detailsContent").innerHTML = `
        <h2 id="detailsTitle">
            ${escapeHtml(service.service_name)}
        </h2>

        ${gallery(
            service.photo_urls,
            service.service_name
        )}

        <p class="meta">
            ${escapeHtml(
                service.address ||
                "Address not provided"
            )}
        </p>

        <p class="meta">
            <i class="fas fa-lock" aria-hidden="true"></i>
            Contact available after confirmation
        </p>

        <p class="detail-description">${escapeHtml(
            service.description ||
            "No description provided."
        )}</p>

        <h3 class="section-heading">
            Choose your vehicle
        </h3>

        <p class="muted">
            Prices are listed as provided by the service.
            Confirm availability and the total fare
            before travelling.
        </p>

        <div id="vehicleList"></div>

        <h3 class="section-heading">
            Meet the drivers
        </h3>

        <div id="driverList" class="driver-list">
            <p class="loading">Loading drivers…</p>
        </div>
    `;

    service.vehicles.forEach(vehicle => {
        const element = document.createElement("article");

        element.className = "vehicle-card";

        element.innerHTML = `
            <h3>
                ${escapeHtml(vehicle.category || "Vehicle")}
            </h3>

            ${gallery(
                vehicle.photo_urls,
                vehicle.category || "Vehicle"
            )}

            <div class="spec-grid">
                ${specification(
                    "Seats",
                    vehicle.seat_count
                )}

                ${specification(
                    "Transmission",
                    vehicle.transmission
                )}

                ${specification(
                    "Driver option",
                    vehicle.driver_option
                )}

                ${specification(
                    "Luggage capacity",
                    vehicle.luggage_capacity
                )}

                ${specification(
                    "Air conditioning",
                    vehicle.air_condition
                )}

                ${specification(
                    "Fuel",
                    vehicle.fuel_type
                )}
            </div>

            <div class="cab-price">
                ${priceHTML(vehicle)}
            </div>

            <button
                class="primary-btn"
                type="button"
            >
                + Add to My Trip
            </button>
        `;

        element.querySelector("button").addEventListener(
            "click",
            () => chooseVehicle(service, vehicle)
        );

        $("vehicleList").append(element);
    });

    if (!service.vehicles.length) {
        $("vehicleList").innerHTML = `
            <p class="muted">
                No vehicles are available to display.
                Contact the service for details.
            </p>
        `;
    }

    $("detailsModal").showModal();

    await loadDrivers(service.id, version);
}

/* ---------- PUBLIC DRIVER DETAILS ---------- */

async function loadDrivers(serviceId, version) {
    try {
        // Only request public-facing driver fields.
        // NIC, licence numbers and private contact details
        // are intentionally not requested.
        const result = await _supabase.rpc(
            "get_public_transport_drivers",
            { p_service_id: serviceId }
        );

        if (
            version !== detailsVersion ||
            !$("detailsModal").open
        ) {
            return;
        }

        if (result.error) {
            throw result.error;
        }

        const drivers = result.data || [];

        $("driverList").innerHTML = drivers.map(driver => {
            const image = photos(driver.photo_urls)[0];

            return `
                <div class="driver">
                    ${image ? `
                        <img
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(driver.name)}"
                            loading="lazy"
                        >
                    ` : ""}

                    <strong>
                        ${escapeHtml(driver.name || "Driver")}
                    </strong>
                </div>
            `;
        }).join("");

        if (!drivers.length) {
            $("driverList").innerHTML = `
                <p class="muted">
                    No public driver profiles are available.
                </p>
            `;
        }

    } catch (error) {
        console.error(
            "Driver profiles unavailable:",
            error
        );

        if (
            version === detailsVersion &&
            $("detailsModal").open
        ) {
            $("driverList").innerHTML = `
                <p class="muted">
                    Driver profiles could not be loaded.
                    Contact the service for driver information.
                </p>
            `;
        }
    }
}

/* ---------- VEHICLE SELECTION ---------- */

function createSelection(service, vehicle) {
    return {
        serviceId: service.id,
        vehicleId: vehicle.id,

        serviceName: service.service_name || "",
        serviceContact: service.contact || "",

        vehicleCategory: vehicle.category || "",
        unitPrice: vehicleRate(vehicle),
        priceUnit: vehicle.price_calculated_per || "",

        seatCount: vehicle.seat_count,
        driverOption: vehicle.driver_option || ""
    };
}

function selectionLabel(selection) {
    return selection.serviceName + (
        selection.vehicleCategory
            ? " — " + selection.vehicleCategory
            : ""
    );
}

async function chooseVehicle(service, vehicle) {
    try {
        const { data, error } =
            await _supabase.auth.getUser();

        if (error || !data.user) {
            showToast(
                "Please sign in through Account " +
                "before adding transport to a trip."
            );
            return;
        }

        selectedCab = createSelection(service, vehicle);

        // The user came from a particular route segment
        // in the personal trip planner.
        if (
            localStorage.getItem("isSelectingTransport") ===
            "true"
        ) {
            returnSelectionToPlanner();
            return;
        }

        await openTripSelection(data.user.id);

    } catch (error) {
        console.error(
            "Unable to select transport:",
            error
        );

        showToast(
            "Unable to load your trip selection. " +
            "Please try again."
        );
    }
}

function returnSelectionToPlanner() {
    const rawIndex = localStorage.getItem(
        "transportSegmentIndex"
    );

    const index =
        rawIndex === null ? -1 : Number(rawIndex);

    const draft = JSON.parse(
        localStorage.getItem("tripDraft") || "{}"
    );

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        !draft.transportSegments?.[index]
    ) {
        showToast(
            "Your route draft is unavailable. " +
            "Return to the planner and choose " +
            "the transport segment again."
        );
        return;
    }

    draft.transportSegments[index] = {
        ...draft.transportSegments[index],
        ...selectedCab,
        serviceName: selectionLabel(selectedCab)
    };

    localStorage.setItem(
        "tripDraft",
        JSON.stringify(draft)
    );

    // These keys match your existing planner return flow.
    localStorage.setItem(
        "selectedTransportName",
        selectionLabel(selectedCab)
    );

    localStorage.setItem(
        "selectedTransportContact",
        selectedCab.serviceContact
    );

    window.location.href = "personal.html";
}

/* ---------- SELECT AN EXISTING TRIP ---------- */

async function openTripSelection(userId) {
    $("modalCabName").textContent =
        selectionLabel(selectedCab);

    $("tripSelect").replaceChildren(
        new Option("Loading trips…", "")
    );

    $("confirmBtn").disabled = true;
    $("bookingStatus").textContent = "";

    $("bookingModal").showModal();

    const result = await _supabase
        .from("trips")
        .select("id,title,travel_date,status")
        .eq("user_id", userId);

    if (result.error) {
        throw result.error;
    }

    const trips = (result.data || []).filter(
        trip => !["cancelled", "completed"].includes(
            String(trip.status || "").toLowerCase()
        )
    );

    $("tripSelect").replaceChildren(
        new Option(
            trips.length
                ? "Choose a trip"
                : "No trips available — create one in your dashboard",
            ""
        )
    );

    trips.forEach(trip => {
        $("tripSelect").add(
            new Option(
                `${trip.title || "Untitled trip"} ` +
                `(${trip.travel_date || "Dates not set"})`,
                trip.id
            )
        );
    });
}

/* ---------- SAVE TO AN EXISTING TRIP ---------- */

async function confirmBooking() {
    const tripId = $("tripSelect").value;

    if (saving || !selectedCab || !tripId) {
        return;
    }

    saving = true;
    $("confirmBtn").disabled = true;

    $("bookingStatus").textContent =
        "Saving your transport choice…";

    try {
        const { data, error } =
            await _supabase.auth.getUser();

        if (error || !data.user) {
            throw new Error("Please sign in again.");
        }

        const existing = await _supabase
            .from("trips")
            .select("id,planner_data,status")
            .eq("id", tripId)
            .eq("user_id", data.user.id)
            .single();

        if (existing.error) {
            throw existing.error;
        }

        const status = String(
            existing.data.status || ""
        ).toLowerCase();

        if (["cancelled", "completed"].includes(status)) {
            throw new Error(
                "This trip is no longer available for changes."
            );
        }

        const planner = existing.data.planner_data;

        if (
            planner !== null &&
            planner !== undefined &&
            (
                typeof planner !== "object" ||
                Array.isArray(planner)
            )
        ) {
            throw new Error(
                "This trip uses an older data format. " +
                "Please open and save it in the planner first."
            );
        }

        const result = await _supabase
            .from("trips")
            .update({
                cab_name: selectionLabel(selectedCab),
                cab_contact: selectedCab.serviceContact,

                planner_data: {
                    ...(planner || {}),
                    selectedTransport: selectedCab
                }
            })
            .eq("id", tripId)
            .eq("user_id", data.user.id)
            .select("id")
            .single();

        if (result.error) {
            throw result.error;
        }

        $("bookingModal").close();

        showToast(
            "Transport added to your trip. " +
            "Contact the service to confirm your ride."
        );

        window.location.href = "personal.html";

    } catch (error) {
        console.error(
            "Unable to save transport:",
            error
        );

        $("bookingStatus").textContent =
            error.message ||
            "Unable to save. Please try again.";

    } finally {
        saving = false;
        $("confirmBtn").disabled =
            !$("tripSelect").value;
    }
}

/* ---------- INITIALIZATION ---------- */

document.addEventListener("DOMContentLoaded", () => {
    function updateClock() {
        const now = new Date();

        $("time").textContent =
            now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        $("date").textContent =
            now.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric"
            });
    }

    updateClock();
    setInterval(updateClock, 1000);

    $("searchInput").addEventListener(
        "input",
        applyFilters
    );

    $("categoryFilter").addEventListener(
        "change",
        applyFilters
    );

    $("sortSelect").addEventListener(
        "change",
        applyFilters
    );

    $("tripSelect").addEventListener("change", () => {
        $("confirmBtn").disabled =
            saving || !$("tripSelect").value;
    });

    $("confirmBtn").addEventListener(
        "click",
        confirmBooking
    );

    document.querySelectorAll("[data-close]")
        .forEach(button => {
            button.addEventListener("click", () => {
                if (!saving) {
                    $(button.dataset.close).close();
                }
            });
        });

    $("bookingModal").addEventListener(
        "cancel",
        event => {
            if (saving) {
                event.preventDefault();
            }
        }
    );

    // Replace unavailable images without broken-image icons.
    document.addEventListener(
        "error",
        event => {
            if (event.target instanceof HTMLImageElement) {
                const placeholder =
                    document.createElement("div");

                placeholder.className =
                    "photo-placeholder";

                placeholder.textContent =
                    "Photo unavailable";

                event.target.replaceWith(placeholder);
            }
        },
        true
    );

    loadCabs();
});
// ===== TRANSPORT SERVICE REVIEWS =====
const TransportReviews = (() => {
    const summaries = new Map();

    let dialog;
    let activeService;
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
            (sum, row) => sum + Number(row.rating),
            0
        );

        return `★ ${(total / rows.length).toFixed(1)} / 5 · ${
            rows.length
        } review${rows.length === 1 ? "" : "s"}`;
    }

    async function readReviews(serviceId, full = false) {
        const rows = [];

        for (let start = 0; ; start += 500) {
            const { data, error } = await _supabase
                .from("Reviews")
                .select(
                    full
                        ? "id,user_id,rating,comment,created_at"
                        : "id,rating"
                )
                .eq("transport_id", serviceId)
                .order("id", { ascending: true })
                .range(start, start + 499);

            if (error) throw error;

            rows.push(...(data || []));

            if (!data || data.length < 500) return rows;
        }
    }

    function attach(card, service) {
        const info = card.querySelector(".cab-info");

        if (!info || info.querySelector(".tr-button")) return;

        card.dataset.reviewServiceId = String(service.id);

        const label = make(
            "p",
            "Loading reviews…",
            "tr-summary"
        );

        const button = make("button", "Reviews", "tr-button");
        button.type = "button";

        button.addEventListener("click", event => {
            event.stopPropagation();
            open(service, button);
        });

        info.append(label, button);

        const id = String(service.id);

        if (!summaries.has(id)) {
            summaries.set(id, readReviews(id));
        }

        const request = summaries.get(id);

        request.then(rows => {
            if (label.isConnected) {
                label.textContent = summary(rows);
            }
        }).catch(error => {
            if (summaries.get(id) === request) {
                summaries.delete(id);
            }

            label.textContent = "Rating unavailable";
            console.error("Transport rating:", error);
        });
    }

    function updateCards(serviceId, rows) {
        summaries.set(
            String(serviceId),
            Promise.resolve(rows)
        );

        document.querySelectorAll(".cab-card").forEach(card => {
            if (
                card.dataset.reviewServiceId !== String(serviceId)
            ) return;

            const label = card.querySelector(".tr-summary");

            if (label) label.textContent = summary(rows);
        });
    }

    function buildDialog() {
        if (dialog) return;

        dialog = document.createElement("dialog");
        dialog.className = "tr-dialog";
        dialog.setAttribute("aria-labelledby", "tr-title");

        dialog.innerHTML = `
            <div class="tr-header">
                <h2 id="tr-title">Transport reviews</h2>

                <button id="tr-close"
                        type="button"
                        class="tr-close"
                        aria-label="Close reviews">×</button>
            </div>

            <p id="tr-summary" class="tr-summary"></p>

            <p id="tr-message"
               class="tr-message"
               role="status"
               aria-live="polite"></p>

            <form id="tr-form" class="tr-form" hidden>
                <label for="tr-rating">Your rating</label>

                <select id="tr-rating" required>
                    <option value="">Choose a rating</option>
                    <option value="5">★★★★★ — 5 Excellent</option>
                    <option value="4">★★★★☆ — 4 Good</option>
                    <option value="3">★★★☆☆ — 3 Average</option>
                    <option value="2">★★☆☆☆ — 2 Poor</option>
                    <option value="1">★☆☆☆☆ — 1 Very poor</option>
                </select>

                <label for="tr-comment">
                    Comment (optional, maximum 1,000 characters)
                </label>

                <textarea id="tr-comment"
                          maxlength="1000"
                          placeholder="Share your experience with this transport service."></textarea>

                <button id="tr-save"
                        type="submit"
                        class="tr-action">
                    Submit review
                </button>
            </form>

            <button id="tr-delete"
                    type="button"
                    class="tr-action tr-delete"
                    hidden>
                Delete my review
            </button>

            <button id="tr-retry"
                    type="button"
                    class="tr-action"
                    hidden>
                Retry loading
            </button>

            <div id="tr-list"></div>
        `;

        document.body.appendChild(dialog);

        el("tr-close").addEventListener("click", () => {
            if (!busy) dialog.close();
        });

        dialog.addEventListener("cancel", event => {
            if (busy) event.preventDefault();
        });

        dialog.addEventListener("close", () => {
            version++;
            previousFocus?.focus();
        });

        el("tr-form").addEventListener("submit", save);
        el("tr-delete").addEventListener("click", remove);
        el("tr-retry").addEventListener("click", () => load());
    }

    function setBusy(value) {
        busy = value;

        [
            "tr-close",
            "tr-save",
            "tr-delete",
            "tr-retry",
            "tr-rating",
            "tr-comment"
        ].forEach(id => {
            el(id).disabled = value;
        });
    }

    function messageFor(error) {
        if (error.code === "23505") {
            return "You already reviewed this service. Reopen Reviews to edit it.";
        }

        if (error.code === "42501") {
            return "Review not allowed. Sign in and make sure this service is in your saved trip.";
        }

        if (error.code === "23514") {
            return "The review did not pass database validation. Please check the review setup.";
        }

        return "Could not complete the request. Please try again.";
    }

    async function open(service, trigger) {
        if (busy) return;

        buildDialog();

        activeService = service;
        previousFocus = trigger;

        el("tr-title").textContent =
            `${service.service_name || "Transport service"} — Reviews`;

        if (!dialog.open) dialog.showModal();

        await load();
    }

    function renderRows(rows) {
        const list = el("tr-list");
        list.replaceChildren();

        if (!rows.length) {
            list.append(
                make("p", "No reviews yet.", "tr-message")
            );
            return;
        }

        [...rows]
            .sort(
                (a, b) =>
                    new Date(b.created_at) - new Date(a.created_at)
            )
            .forEach(row => {
                const article = make(
                    "article",
                    undefined,
                    "tr-review"
                );

                const rating = Math.max(
                    1,
                    Math.min(
                        5,
                        Math.trunc(Number(row.rating) || 1)
                    )
                );

                article.append(
                    make(
                        "strong",
                        "★".repeat(rating) +
                        "☆".repeat(5 - rating)
                    )
                );

                const author = row.user_id === user?.id
                    ? "Your review"
                    : "Traveler";

                const date = new Date(row.created_at);

                const dateText = Number.isNaN(date.getTime())
                    ? ""
                    : date.toLocaleDateString();

                article.append(
                    make(
                        "small",
                        [author, dateText]
                            .filter(Boolean)
                            .join(" · ")
                    )
                );

                // Display comments as text, never executable HTML.
                if (row.comment) {
                    article.append(make("p", row.comment));
                }

                list.append(article);
            });
    }

    async function load(successMessage = "") {
        const currentVersion = ++version;
        const serviceId = activeService.id;

        user = null;
        ownReview = null;
        eligible = false;

        el("tr-form").hidden = true;
        el("tr-delete").hidden = true;
        el("tr-retry").hidden = true;

        el("tr-list").replaceChildren();
        el("tr-summary").textContent = "";
        el("tr-message").textContent = "Loading reviews…";

        const stale = () =>
            currentVersion !== version || !dialog.open;

        try {
            const rows = await readReviews(serviceId, true);
            if (stale()) return;

            updateCards(serviceId, rows);
            el("tr-summary").textContent = summary(rows);
            renderRows(rows);

            const { data: sessionData, error: sessionError } =
                await _supabase.auth.getSession();

            if (stale()) return;
            if (sessionError) throw sessionError;

            if (sessionData.session) {
                const { data, error } =
                    await _supabase.auth.getUser();

                if (stale()) return;
                if (error) throw error;

                user = data.user;
            }

            if (user) {
                ownReview = rows.find(
                    row => row.user_id === user.id
                ) || null;

                const { data, error } = await _supabase.rpc(
                    "can_review_transport",
                    { p_transport_id: serviceId }
                );

                if (stale()) return;
                if (error) throw error;

                eligible = data === true;
            }

            renderRows(rows);
            el("tr-delete").hidden = !ownReview;

            if (eligible) {
                el("tr-form").hidden = false;

                el("tr-rating").value = ownReview
                    ? String(ownReview.rating)
                    : "";

                el("tr-comment").value =
                    ownReview?.comment || "";

                el("tr-save").textContent = ownReview
                    ? "Update review"
                    : "Submit review";

                el("tr-message").textContent =
                    successMessage ||
                    "This service is in your saved trip. You can write a review.";
            } else {
                const explanation = user
                    ? "Add this service to a trip and save the trip to review it. For older trips, select the service again and save. Cancelled trips do not qualify. Owners cannot review their own service."
                    : "Sign in to write a review. You can still read existing reviews.";

                el("tr-message").textContent =
                    [successMessage, explanation]
                        .filter(Boolean)
                        .join(" ");
            }
        } catch (error) {
            if (stale()) return;

            console.error("Load transport reviews:", error);

            el("tr-form").hidden = true;
            el("tr-delete").hidden = true;
            el("tr-retry").hidden = false;

            el("tr-message").textContent =
                "Could not load reviews or check eligibility. Please retry.";
        }
    }

    async function checkAccount() {
        const { data, error } = await _supabase.auth.getUser();

        if (error) throw error;

        if (!data.user || data.user.id !== user?.id) {
            throw new Error("Sign-in changed. Reopen Reviews.");
        }
    }

    async function save(event) {
        event.preventDefault();

        if (busy || !eligible || !user) return;

        const rating = Number(el("tr-rating").value);
        const comment = el("tr-comment").value.trim();

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            el("tr-message").textContent =
                "Choose a rating from 1 to 5.";
            return;
        }

        if ([...comment].length > 1000) {
            el("tr-message").textContent =
                "Keep your comment within 1,000 characters.";
            return;
        }

        setBusy(true);
        el("tr-message").textContent = "Saving review…";

        try {
            await checkAccount();

            let query;

            if (ownReview) {
                query = _supabase
                    .from("Reviews")
                    .update({
                        rating,
                        comment: comment || null
                    })
                    .eq("id", ownReview.id)
                    .eq("user_id", user.id)
                    .eq("transport_id", activeService.id);
            } else {
                query = _supabase
                    .from("Reviews")
                    .insert({
                        user_id: user.id,
                        transport_id: activeService.id,
                        hotel_id: null,
                        guide_id: null,
                        restaurant_id: null,
                        rating,
                        comment: comment || null
                    });
            }

            const { data, error } = await query.select("id");

            if (error) throw error;

            if (!data?.length) {
                throw new Error("Review was not saved.");
            }

            await load("Your review was saved.");
        } catch (error) {
            console.error("Save transport review:", error);
            el("tr-message").textContent = messageFor(error);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (busy || !ownReview || !user) return;

        if (
            !window.confirm(
                "Delete your review for this transport service?"
            )
        ) return;

        setBusy(true);
        el("tr-message").textContent = "Deleting review…";

        try {
            await checkAccount();

            const { data, error } = await _supabase
                .from("Reviews")
                .delete()
                .eq("id", ownReview.id)
                .eq("user_id", user.id)
                .eq("transport_id", activeService.id)
                .select("id");

            if (error) throw error;

            if (!data?.length) {
                throw new Error("Review was not deleted.");
            }

            await load("Your review was deleted.");
        } catch (error) {
            console.error("Delete transport review:", error);
            el("tr-message").textContent = messageFor(error);
        } finally {
            setBusy(false);
        }
    }

    return { attach };
})();
