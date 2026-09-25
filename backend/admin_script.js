const supabaseUrl = 'https://cdcolkoavowjjymzdzud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY29sa29hdm93amp5bXpkenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDI2NjQsImV4cCI6MjA4Mzk3ODY2NH0.JPzj9fI1pKpPbPxyGqsemjcwpKiu0h046H7aBSURnpM';

const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

const SERVICE_TABLES = [
  {
    table: "hotel_service",
    type: "hotel",
    label: "Hotel",
    icon: "fa-hotel"
  },
  {
    table: "rest_service",
    type: "restaurant",
    label: "Restaurant",
    icon: "fa-utensils"
  },
  {
    table: "guide_service",
    type: "guide",
    label: "Guide",
    icon: "fa-user-check"
  },
  {
    table: "transport_service",
    type: "transport",
    label: "Transport",
    icon: "fa-car-side"
  }
];

let allUsers = [];
let allServices = [];
let approvalFilter = "all";

window.addEventListener("DOMContentLoaded", async () => {
  setupProfileMenu();
  const isAdmin = await loadAdminProfile();
  if (!isAdmin) {
    return;
  }
  await refreshDashboard();
});

async function loadAdminProfile() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.replace("admin_login.html");
    return false;
  }

  if (user.app_metadata?.role !== "admin") {
    await supabaseClient.auth.signOut();

    alert("You do not have administrator access.");

    window.location.replace("admin_login.html");
    return false;
  }

  const { data: profile } = await supabaseClient
    .from("users")
    .select("*")
    .eq("email", user.email)
    .maybeSingle();

  const fullName =
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") || "Administrator";

  const firstLetter =
    fullName.charAt(0).toUpperCase();

  setText("adminName", fullName);
  setText("menuAdminName", fullName);
  setText("welcomeName", profile?.first_name || "Admin");
  setText("adminEmail", user.email || "");
  setText("profileLetter", firstLetter);
  setText("profileLetterLarge", firstLetter);

  return true;
}
/*async function refreshDashboard() {
  const refreshIcon = document.querySelector(".refresh-btn i");

  refreshIcon?.classList.add("fa-spin");

  await Promise.all([
    loadUsers(),
    loadServices()
  ]);

  updateStatistics();
  renderRecentServices();
  renderCategorySummary();
  renderUsers();
  renderApprovals();
  renderAllServices();

  refreshIcon?.classList.remove("fa-spin");

  showToast("Dashboard updated.", "success");
}
*/
async function refreshDashboard() {
  const refreshIcon = document.querySelector(".refresh-btn i");

  refreshIcon?.classList.add("fa-spin");

  const [usersLoaded] = await Promise.all([
    loadUsers(),
    loadServices()
  ]);

  updateStatistics();
  renderRecentServices();
  renderCategorySummary();
  renderUsers();
  renderApprovals();
  renderAllServices();

  refreshIcon?.classList.remove("fa-spin");

  if (usersLoaded) {
    showToast("Dashboard updated.", "success");
  }
}

/*async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load users:", error);
    allUsers = [];
    showToast(
      "Could not load users. Check table access.",
      "error"
    );
    return;
  }

  allUsers = data || [];
}
*/
async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("users")
    .select("*");

  if (error) {
    console.error("Could not load public.users:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    allUsers = [];

    showToast(
      `Could not load users: ${error.message}`,
      "error"
    );

    return false;
  }

  allUsers = (data || []).sort(
    (first, second) =>
      new Date(second.created_at || 0) -
      new Date(first.created_at || 0)
  );

  console.log(
    `Loaded ${allUsers.length} row(s) from public.users.`
  );

  if (!allUsers.length) {
    showToast(
      "public.users is empty. Authentication users are stored separately in auth.users.",
      "info"
    );
  }

  return true;
}
async function loadServices() {
  const results = await Promise.all(
    SERVICE_TABLES.map(async (config) => {
      const { data, error } = await supabaseClient
        .from(config.table)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(
          `Could not load ${config.table}:`,
          error.message
        );

        return [];
      }

      return (data || []).map((item) =>
        normalizeService(item, config)
      );
    })
  );

  allServices = results
    .flat()
    .sort(
      (first, second) =>
        new Date(second.created_at || 0) -
        new Date(first.created_at || 0)
    );
}

function normalizeService(item, config) {
  const photos =
    item.photo_urls ||
    item.photos ||
    [];

  const firstPhoto = Array.isArray(photos)
    ? photos[0]
    : photos;

  return {
    ...item,

    sourceTable: config.table,
    type: config.type,
    typeLabel: config.label,
    typeIcon: config.icon,

    name:
      item.service_name ||
      item.name ||
      `${config.label} Service`,

    ownerEmail:
      item.email ||
      item.owner_email ||
      "Not provided",

    location:
      item.city ||
      item.address ||
      "Location not provided",

    status: String(
      item.approval_status ||
      item.status ||
      "pending"
    ).toLowerCase(),

    image: firstPhoto || "",

    created_at: item.created_at || null
  };
}

function updateStatistics() {
  const businessUsers = allUsers.filter(
    (user) =>
      String(user.account_type).toLowerCase() ===
      "business"
  ).length;

  const pending = allServices.filter(
    (service) => service.status === "pending"
  ).length;

  setText("totalUsers", allUsers.length);
  setText("businessUsers", businessUsers);
  setText("pendingApprovals", pending);
  setText("totalServices", allServices.length);
  setText("userNavCount", allUsers.length);
  setText("pendingNavCount", pending);
}

function renderRecentServices() {
  const container =
    document.getElementById("recentServices");

  const recent = allServices.slice(0, 5);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <i class="fa-solid fa-folder-open"></i>
        <p>No service submissions yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = recent
    .map(
      (service) => `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fa-solid ${service.typeIcon}"></i>
          </div>

          <div class="activity-info">
            <strong>
              ${escapeHTML(service.name)}
            </strong>

            <small>
              ${escapeHTML(service.typeLabel)}
              ·
              ${escapeHTML(
                formatDate(service.created_at)
              )}
            </small>
          </div>

          ${statusBadge(service.status)}
        </div>
      `
    )
    .join("");
}

function renderCategorySummary() {
  const container =
    document.getElementById("categorySummary");

  const maxCount = Math.max(
    1,
    ...SERVICE_TABLES.map(
      (config) =>
        allServices.filter(
          (service) => service.type === config.type
        ).length
    )
  );

  container.innerHTML = SERVICE_TABLES.map(
    (config) => {
      const count = allServices.filter(
        (service) => service.type === config.type
      ).length;

      const width = Math.max(
        count ? 8 : 0,
        Math.round((count / maxCount) * 100)
      );

      return `
        <div class="category-row">
          <div class="category-label">
            <i class="fa-solid ${config.icon}"></i>
            ${config.label}
          </div>

          <div class="category-bar">
            <div
              class="category-fill"
              style="width: ${width}%"
            ></div>
          </div>

          <strong>${count}</strong>
        </div>
      `;
    }
  ).join("");
}

function renderUsers() {
  const body =
    document.getElementById("usersTableBody");

  const empty =
    document.getElementById("usersEmpty");

  const search =
    document
      .getElementById("userSearch")
      ?.value.trim()
      .toLowerCase() || "";

  const role =
    document.getElementById("userRoleFilter")
      ?.value || "all";

  const filtered = allUsers.filter((user) => {
    const name =
      `${user.first_name || ""} ${user.last_name || ""}`.trim();

    const matchesSearch =
      `${name} ${user.email || ""}`
        .toLowerCase()
        .includes(search);

    const matchesRole =
      role === "all" ||
      String(user.account_type).toLowerCase() ===
        role;

    return matchesSearch && matchesRole;
  });

  body.innerHTML = filtered
    .map((user) => {
      const name =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        "Unnamed User";

      const letter = name.charAt(0).toUpperCase();

      const accountType =
        user.account_type || "personal";

      return `
        <tr>
          <td>
            <div class="user-cell">
              <span class="user-avatar">
                ${escapeHTML(letter)}
              </span>

              <div>
                <strong>
                  ${escapeHTML(name)}
                </strong>

                <small>
                  ${escapeHTML(
                    user.email || "No email"
                  )}
                </small>
              </div>
            </div>
          </td>

          <td>
            <span class="role-badge">
              ${escapeHTML(accountType)}
            </span>
          </td>

          <td>
            ${escapeHTML(
              formatDate(user.created_at)
            )}
          </td>

          <td>
            <span class="status-badge approved">
              <i class="fa-solid fa-circle"></i>
              Active
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  empty.classList.toggle(
    "hidden",
    filtered.length > 0
  );
}

function renderApprovals() {
  const grid =
    document.getElementById("approvalGrid");

  const empty =
    document.getElementById("approvalEmpty");

  const pending = allServices.filter(
    (service) =>
      service.status === "pending" &&
      (
        approvalFilter === "all" ||
        service.type === approvalFilter
      )
  );

  grid.innerHTML = pending
    .map(serviceCardHTML)
    .join("");

  empty.classList.toggle(
    "hidden",
    pending.length > 0
  );
}

function renderAllServices() {
  const grid =
    document.getElementById("allServicesGrid");

  const empty =
    document.getElementById("servicesEmpty");

  const search =
    document
      .getElementById("serviceSearch")
      ?.value.trim()
      .toLowerCase() || "";

  const type =
    document.getElementById("serviceTypeFilter")
      ?.value || "all";

  const status =
    document.getElementById("serviceStatusFilter")
      ?.value || "all";

  const filtered = allServices.filter(
    (service) => {
      const matchesSearch =
        `${service.name} ${service.ownerEmail} ${service.location}`
          .toLowerCase()
          .includes(search);

      const matchesType =
        type === "all" ||
        service.type === type;

      const matchesStatus =
        status === "all" ||
        service.status === status;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    }
  );

  grid.innerHTML = filtered
    .map(serviceCardHTML)
    .join("");

  empty.classList.toggle(
    "hidden",
    filtered.length > 0
  );
}

function serviceCardHTML(service) {
  const image = service.image
    ? `
      <img
        src="${escapeAttribute(service.image)}"
        alt="${escapeAttribute(service.name)}"
        onerror="
          this.parentElement.innerHTML =
          '<div class=&quot;service-image-placeholder&quot;>
            <i class=&quot;fa-solid ${service.typeIcon}&quot;></i>
          </div>'
        "
      >
    `
    : `
      <div class="service-image-placeholder">
        <i class="fa-solid ${service.typeIcon}"></i>
      </div>
    `;

  const approvalButtons =
    service.status === "pending"
      ? `
        <button
          class="btn-approve"
          onclick="updateServiceStatus(
            '${service.sourceTable}',
            '${service.id}',
            'approved'
          )"
        >
          <i class="fa-solid fa-check"></i>
          Approve
        </button>

        <button
          class="btn-reject"
          onclick="updateServiceStatus(
            '${service.sourceTable}',
            '${service.id}',
            'rejected'
          )"
        >
          <i class="fa-solid fa-xmark"></i>
          Reject
        </button>
      `
      : "";

  return `
    <article class="service-card">
      <div class="service-image">
        ${image}

        <span class="service-type">
          <i class="fa-solid ${service.typeIcon}"></i>
          ${escapeHTML(service.typeLabel)}
        </span>

        ${statusBadge(service.status)}
      </div>

      <div class="service-content">
        <h3 title="${escapeAttribute(service.name)}">
          ${escapeHTML(service.name)}
        </h3>

        <div class="service-meta">
          <span>
            <i class="fa-solid fa-location-dot"></i>
            ${escapeHTML(service.location)}
          </span>

          <span>
            <i class="fa-solid fa-envelope"></i>
            ${escapeHTML(service.ownerEmail)}
          </span>
        </div>

        <div class="service-actions">
          <button
            class="btn-view"
            onclick="openServiceDetails(
              '${service.sourceTable}',
              '${service.id}'
            )"
          >
            <i class="fa-solid fa-eye"></i>
            View
          </button>

          ${approvalButtons}
        </div>
      </div>
    </article>
  `;
}

async function updateServiceStatus(
  table,
  id,
  newStatus
) {
  const service = allServices.find(
    (item) =>
      item.sourceTable === table &&
      String(item.id) === String(id)
  );

  if (
    !service ||
    !["approved", "rejected"].includes(newStatus)
  ) {
    return;
  }

  const actionText =
    newStatus === "approved"
      ? "Approve"
      : "Reject";

  const confirmed = window.confirm(
    `${actionText} "${service.name}"?`
  );

  if (!confirmed) {
    return;
  }

  let result = await supabaseClient
    .from(table)
    .update({
      approval_status: newStatus
    })
    .eq("id", id);

  /*
    This fallback is used only if your table uses a
    column named "status" instead of "approval_status".
  */
  if (result.error) {
    result = await supabaseClient
      .from(table)
      .update({
        status: newStatus
      })
      .eq("id", id);
  }

  if (result.error) {
    console.error(result.error);

    showToast(
      "Update failed. Add an approval_status column to this table.",
      "error"
    );

    return;
  }

  service.status = newStatus;

  updateStatistics();
  renderRecentServices();
  renderApprovals();
  renderAllServices();
  closeDetailsModal();

  showToast(
    `Service ${newStatus}.`,
    "success"
  );
}

function openServiceDetails(table, id) {
  const service = allServices.find(
    (item) =>
      item.sourceTable === table &&
      String(item.id) === String(id)
  );

  if (!service) {
    return;
  }

  const ignored = new Set([
    "photo_paths",
    "photo_urls",
    "photos",
    "sourceTable",
    "typeIcon",
    "typeLabel",
    "image",
    "name",
    "ownerEmail",
    "location"
  ]);

  const preferred = [
    "service_name",
    "property_type",
    "star_rating",
    "city",
    "address",
    "contact",
    "email",
    "description",
    "years_of_experience",
    "guide_license_number",
    "created_at"
  ];

  const preferredKeys = preferred.filter(
    (key) =>
      service[key] !== undefined &&
      service[key] !== null &&
      service[key] !== ""
  );

  const otherKeys = Object.keys(service).filter(
    (key) =>
      !preferred.includes(key) &&
      !ignored.has(key) &&
      service[key] !== undefined &&
      service[key] !== null &&
      service[key] !== ""
  );

  const keys = [
    ...preferredKeys,
    ...otherKeys
  ].slice(0, 14);

  const modalContent =
    document.getElementById("modalContent");

  modalContent.innerHTML = `
    <div class="modal-header">
      <div class="modal-header-icon">
        <i class="fa-solid ${service.typeIcon}"></i>
      </div>

      <div>
        <h2>
          ${escapeHTML(service.name)}
        </h2>

        <p>
          ${escapeHTML(service.typeLabel)}
          service ·
          ${escapeHTML(service.status)}
        </p>
      </div>
    </div>

    <div class="detail-list">
      ${keys
        .map(
          (key) => `
            <div class="detail-item ${
              key === "description"
                ? "full"
                : ""
            }">
              <small>
                ${escapeHTML(
                  prettifyKey(key)
                )}
              </small>

              <strong>
                ${escapeHTML(
                  formatValue(service[key])
                )}
              </strong>
            </div>
          `
        )
        .join("")}
    </div>

    ${
      service.status === "pending"
        ? `
          <div class="modal-actions">
            <button
              class="btn-approve"
              onclick="updateServiceStatus(
                '${service.sourceTable}',
                '${service.id}',
                'approved'
              )"
            >
              <i class="fa-solid fa-check"></i>
              Approve Service
            </button>

            <button
              class="btn-reject"
              onclick="updateServiceStatus(
                '${service.sourceTable}',
                '${service.id}',
                'rejected'
              )"
            >
              <i class="fa-solid fa-xmark"></i>
              Reject Service
            </button>
          </div>
        `
        : ""
    }
  `;

  document
    .getElementById("detailsModal")
    .classList.remove("hidden");
}

function closeDetailsModal(event) {
  const modal =
    document.getElementById("detailsModal");

  if (event && event.target !== modal) {
    return;
  }

  modal.classList.add("hidden");
}

function showSection(sectionName, link) {
  document
    .querySelectorAll(".dashboard-section")
    .forEach((section) =>
      section.classList.remove("active")
    );

  document
    .querySelectorAll(".nav-link")
    .forEach((item) =>
      item.classList.remove("active")
    );

  document
    .getElementById(`${sectionName}Section`)
    ?.classList.add("active");

  link?.classList.add("active");

  const titles = {
    overview: "Dashboard Overview",
    users: "User Management",
    approvals: "Service Approvals",
    services: "All Services"
  };

  setText(
    "pageTitle",
    titles[sectionName] || "Admin Dashboard"
  );

  closeSidebar();
}

function openApprovalsSection() {
  showSection(
    "approvals",
    document.querySelector(
      '[data-section="approvals"]'
    )
  );
}

function setApprovalFilter(filter, button) {
  approvalFilter = filter;

  document
    .querySelectorAll(
      "#approvalFilters .filter-chip"
    )
    .forEach((item) =>
      item.classList.remove("active")
    );

  button.classList.add("active");

  renderApprovals();
}

function setupProfileMenu() {
  const profileButton =
    document.getElementById("profileBtn");

  const profileMenu =
    document.getElementById("profileMenu");

  if (!profileButton || !profileMenu) {
    return;
  }

  profileButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      profileMenu.classList.toggle("hidden");
    }
  );

  document.addEventListener(
    "click",
    () => profileMenu.classList.add("hidden")
  );

  profileMenu.addEventListener(
    "click",
    (event) => event.stopPropagation()
  );
}

function toggleSidebar() {
  document
    .getElementById("sidebar")
    .classList.toggle("open");

  document
    .getElementById("mobileOverlay")
    .classList.toggle("active");
}

function closeSidebar() {
  document
    .getElementById("sidebar")
    .classList.remove("open");

  document
    .getElementById("mobileOverlay")
    .classList.remove("active");
}

async function logout() {
  await supabaseClient.auth.signOut();

  window.location.href = "admin_login.html";
}

function statusBadge(status) {
  const safeStatus =
    ["approved", "rejected"].includes(status)
      ? status
      : "pending";

  const icons = {
    pending: "fa-clock",
    approved: "fa-check",
    rejected: "fa-xmark"
  };

  return `
    <span class="status-badge ${safeStatus}">
      <i class="fa-solid ${icons[safeStatus]}"></i>
      ${safeStatus}
    </span>
  `;
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not provided";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.join(", ")
      : "Not provided";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function prettifyKey(key) {
  return key
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase()
    );
}

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll(
    "`",
    "&#096;"
  );
}

function showToast(message, type = "info") {
  const container =
    document.getElementById("toastContainer");

  if (!container) {
    console.log(message);
    return;
  }

  const toast =
    document.createElement("div");

  const icon =
    type === "success"
      ? "fa-circle-check"
      : type === "error"
        ? "fa-circle-exclamation"
        : "fa-circle-info";

  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(
    () => toast.remove(),
    3200
  );
}