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
let allBookingCases = [];
let allCommissionInvoices = [];
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
    loadServices(),
    loadBookingCases(),
    loadCommissionInvoices()
  ]);

  updateStatistics();
  renderRecentServices();
  renderCategorySummary();
  renderUsers();
  renderApprovals();
  renderAllServices();
  renderBookingCases();
  renderCommissionInvoices();

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
async function loadBookingCases() {
  const { data, error } = await supabaseClient.rpc(
    "get_admin_booking_cases"
  );

  if (error) {
    console.error("Could not load booking cases:", error);
    allBookingCases = [];
    setText("caseNavCount", "0");
    return false;
  }

  allBookingCases = data || [];

  const pendingCount = allBookingCases.filter(
    item => item.case_status === "pending"
  ).length;

  setText("caseNavCount", pendingCount);

  return true;
}

function renderBookingCases() {
  const container =
    document.getElementById("bookingCasesGrid");

  const empty =
    document.getElementById("bookingCasesEmpty");

  const filter =
    document.getElementById("bookingCaseStatusFilter")
      ?.value || "pending";

  if (!container || !empty) {
    return;
  }

  const cases = allBookingCases.filter(item => {
    return (
      filter === "all" ||
      item.case_status === filter
    );
  });

  container.innerHTML = "";
  empty.classList.toggle("hidden", cases.length > 0);

  if (!cases.length) {
    return;
  }

  container.innerHTML = cases
    .map(bookingCaseHTML)
    .join("");
}

function bookingCaseHTML(item) {
  const caseType =
    item.case_type === "no_show"
      ? "No-show"
      : "Service problem";

  const reportedBy =
    item.opened_by_role === "business"
      ? "Business"
      : "Customer";

  const confirmedAmount =
    item.final_amount ??
    item.quoted_amount ??
    0;

  const feeSection =
    item.case_type === "no_show"
      ? `
        <div>
          <span>Fee reported</span>
          <strong>
            ${escapeHTML(item.currency || "LKR")}
            ${formatCaseMoney(item.claimed_fee_amount)}
          </strong>
        </div>
      `
      : "";

  const responses = `
    ${
      item.traveler_response
        ? `
          <div class="case-response">
            <span>Customer response</span>
            <p>${escapeHTML(item.traveler_response)}</p>
          </div>
        `
        : ""
    }

    ${
      item.business_response
        ? `
          <div class="case-response">
            <span>Business response</span>
            <p>${escapeHTML(item.business_response)}</p>
          </div>
        `
        : ""
    }
  `;

  const controls =
    item.case_status === "pending"
      ? `
        <div class="case-resolution">
          <select
            class="case-decision"
            onchange="updateCaseAmountField(
              '${item.case_id}',
              this
            )"
          >
            <option value="">Choose decision</option>
            <option value="no_commission">
              No commission
            </option>
            <option value="adjusted_commission">
              Commission on another amount
            </option>
            <option value="full_commission">
              Commission on full price
            </option>
          </select>

          <input
            type="number"
            class="case-adjusted-amount"
            min="0"
            step="0.01"
            placeholder="Commissionable amount"
            disabled
          >

          <textarea
            class="case-admin-notes"
            maxlength="2000"
            placeholder="Admin notes"
          ></textarea>

          <button
            type="button"
            class="case-resolve-button"
            onclick="resolveBookingCase(
              '${item.case_id}',
              this
            )"
          >
            Resolve
          </button>
        </div>
      `
      : `
        <div class="case-result">
          ${formatCaseResolution(item.resolution)}
        </div>
      `;

  return `
    <article
      class="booking-case-card"
      data-case-id="${escapeAttribute(item.case_id)}"
    >
      <div class="booking-case-header">
        <div>
          <p class="eyebrow">
            ${escapeHTML(item.service_type)}
          </p>

          <h3>${escapeHTML(item.service_name)}</h3>
        </div>

        <span class="case-status ${escapeHTML(item.case_status)}">
          ${escapeHTML(item.case_status)}
        </span>
      </div>

      <div class="booking-case-info">
        <div>
          <span>Case</span>
          <strong>${escapeHTML(caseType)}</strong>
        </div>

        <div>
          <span>Reported by</span>
          <strong>${escapeHTML(reportedBy)}</strong>
        </div>

        <div>
          <span>Customer</span>
          <strong>${escapeHTML(item.traveler_email)}</strong>
        </div>

        <div>
          <span>Business</span>
          <strong>${escapeHTML(item.business_email)}</strong>
        </div>

        <div>
          <span>Service date</span>
          <strong>${escapeHTML(formatDate(item.start_at))}</strong>
        </div>

        <div>
          <span>Confirmed price</span>
          <strong>
            ${escapeHTML(item.currency || "LKR")}
            ${formatCaseMoney(confirmedAmount)}
          </strong>
        </div>

        ${feeSection}
      </div>

      <div class="case-reason">
        <span>Report</span>
        <p>${escapeHTML(item.reason)}</p>
      </div>

      ${responses}
      ${controls}
    </article>
  `;
}

function updateCaseAmountField(caseId, select) {
  const card = document.querySelector(
    `[data-case-id="${caseId}"]`
  );

  const amountInput = card?.querySelector(
    ".case-adjusted-amount"
  );

  if (!amountInput) return;

  const enabled =
    select.value === "adjusted_commission";

  amountInput.disabled = !enabled;

  if (!enabled) {
    amountInput.value = "";
  }
}

async function resolveBookingCase(caseId, button) {
  const card = button.closest(".booking-case-card");

  const decision =
    card.querySelector(".case-decision").value;

  const amountInput =
    card.querySelector(".case-adjusted-amount");

  const notes =
    card.querySelector(".case-admin-notes")
      .value.trim() || null;

  if (!decision) {
    showToast("Choose a decision.", "error");
    return;
  }

  let amount = null;

  if (decision === "adjusted_commission") {
    amount = Number(amountInput.value);

    if (!Number.isFinite(amount) || amount < 0) {
      showToast("Enter a valid amount.", "error");
      amountInput.focus();
      return;
    }
  }

  if (!confirm("Resolve this booking case?")) {
    return;
  }

  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const { error } = await supabaseClient.rpc(
      "admin_resolve_booking_case",
      {
        p_case_id: caseId,
        p_decision: decision,
        p_commissionable_amount: amount,
        p_admin_notes: notes
      }
    );

    if (error) throw error;

    showToast("Case resolved.", "success");

    await loadBookingCases();
    renderBookingCases();
  } catch (error) {
    console.error("Could not resolve case:", error);

    showToast(
      error.message || "Could not resolve the case.",
      "error"
    );

    button.disabled = false;
    button.textContent = "Resolve";
  }
}

function formatCaseMoney(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCaseResolution(value) {
  const labels = {
    no_commission: "No commission",
    adjusted_commission: "Adjusted commission",
    full_commission: "Full commission"
  };

  return labels[value] || "Resolved";
}
async function loadCommissionInvoices() {
  const statusElement =
    document.getElementById("adminInvoicesStatus");

  if (statusElement) {
    statusElement.textContent = "Loading invoices...";
    statusElement.style.display = "block";
  }

  setDefaultInvoiceMonth();

  const { data, error } = await supabaseClient.rpc(
    "get_admin_commission_invoices"
  );

  if (error) {
    console.error("Could not load invoices:", error);
    allCommissionInvoices = [];
    setText("commissionNavCount", "0");

    if (statusElement) {
      statusElement.textContent =
        error.message || "Could not load invoices.";
    }

    return false;
  }

  allCommissionInvoices =
    Array.isArray(data) ? data : [];

  const awaitingReview =
    allCommissionInvoices.filter(
      invoice =>
        invoice.status === "payment_submitted"
    ).length;

  setText("commissionNavCount", awaitingReview);

  renderCommissionInvoices();

  return true;
}

function setDefaultInvoiceMonth() {
  const input =
    document.getElementById("invoiceBillingMonth");

  if (!input || input.value) return;

  const date = new Date();

  date.setMonth(date.getMonth() - 1);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  input.value = `${year}-${month}`;
}

function renderCommissionInvoices() {
  const grid =
    document.getElementById("adminInvoicesGrid");

  const empty =
    document.getElementById("adminInvoicesEmpty");

  const statusElement =
    document.getElementById("adminInvoicesStatus");

  if (!grid || !empty || !statusElement) return;

  const filter =
    document.getElementById("invoiceStatusFilter")
      ?.value || "all";

  const dueTotal = allCommissionInvoices
    .filter(
      invoice =>
        invoice.status === "issued" ||
        invoice.status === "overdue"
    )
    .reduce(
      (total, invoice) =>
        total + Number(invoice.commission_total || 0),
      0
    );

  const reviewTotal = allCommissionInvoices
    .filter(
      invoice =>
        invoice.status === "payment_submitted"
    )
    .reduce(
      (total, invoice) =>
        total + Number(invoice.commission_total || 0),
      0
    );

  const paidTotal = allCommissionInvoices
    .filter(invoice => invoice.status === "paid")
    .reduce(
      (total, invoice) =>
        total + Number(invoice.commission_total || 0),
      0
    );

  setText(
    "invoiceDueTotal",
    `LKR ${formatCaseMoney(dueTotal)}`
  );

  setText(
    "invoiceReviewTotal",
    `LKR ${formatCaseMoney(reviewTotal)}`
  );

  setText(
    "invoicePaidTotal",
    `LKR ${formatCaseMoney(paidTotal)}`
  );

  const invoices = allCommissionInvoices.filter(
    invoice =>
      filter === "all" ||
      invoice.status === filter
  );

  grid.innerHTML = "";

  empty.classList.toggle(
    "hidden",
    invoices.length > 0
  );

  if (!invoices.length) {
    statusElement.style.display = "none";
    return;
  }

  statusElement.style.display = "none";

  grid.innerHTML = invoices
    .map(adminInvoiceHTML)
    .join("");
}

function adminInvoiceHTML(invoice) {
  const currency = invoice.currency || "LKR";

  const items = Array.isArray(invoice.items)
    ? invoice.items
    : [];

  const itemRows = items
    .map(
      item => `
        <tr>
          <td>${escapeHTML(item.service_name)}</td>
          <td>${escapeHTML(item.service_type)}</td>
          <td>
            ${escapeHTML(currency)}
            ${formatCaseMoney(item.booking_amount)}
          </td>
          <td>
            ${formatCaseMoney(item.commission_rate)}%
          </td>
          <td>
            ${escapeHTML(currency)}
            ${formatCaseMoney(item.commission_amount)}
          </td>
        </tr>
      `
    )
    .join("");

  let paymentSection = "";

  if (invoice.status === "payment_submitted") {
    paymentSection = `
      <div class="admin-payment-review">
        <div class="submitted-payment-reference">
          <span>Payment reference</span>
          <strong>
            ${escapeHTML(
              invoice.payment_reference ||
              "Not provided"
            )}
          </strong>
        </div>

        <textarea
          class="invoice-review-notes"
          maxlength="2000"
          placeholder="Message to the business"
        ></textarea>

        <div class="invoice-review-actions">
          <button
            type="button"
            class="approve-invoice-payment"
            onclick="reviewCommissionInvoice(
              '${escapeHTML(invoice.invoice_id)}',
              'approve',
              this
            )"
          >
            Approve payment
          </button>

          <button
            type="button"
            class="reject-invoice-payment"
            onclick="reviewCommissionInvoice(
              '${escapeHTML(invoice.invoice_id)}',
              'reject',
              this
            )"
          >
            Reject payment
          </button>
        </div>
      </div>
    `;
  } else if (invoice.status === "paid") {
    paymentSection = `
      <div class="admin-payment-result paid">
        Payment verified
        <span>
          ${formatAdminInvoiceDate(invoice.paid_at)}
        </span>
      </div>
    `;
  } else {
    paymentSection = `
      <div class="admin-payment-result waiting">
        Waiting for business payment
      </div>
    `;
  }

  const adminNotes = invoice.admin_notes
    ? `
      <div class="admin-invoice-notes">
        <span>Admin message</span>
        <p>${escapeHTML(invoice.admin_notes)}</p>
      </div>
    `
    : "";

  return `
    <article class="admin-invoice-card">
      <div class="admin-invoice-header">
        <div>
          <p class="eyebrow">
            ${escapeHTML(invoice.invoice_number)}
          </p>

          <h3>
            ${escapeHTML(
              invoice.business_email ||
              "Business account"
            )}
          </h3>
        </div>

        <span class="admin-invoice-status ${escapeHTML(
          invoice.status
        )}">
          ${escapeHTML(
            formatAdminInvoiceStatus(invoice.status)
          )}
        </span>
      </div>

      <div class="admin-invoice-summary">
        <div>
          <span>Billing period</span>
          <strong>
            ${formatAdminInvoiceDate(invoice.period_start)}
            –
            ${formatAdminInvoiceDate(invoice.period_end)}
          </strong>
        </div>

        <div>
          <span>Due date</span>
          <strong>
            ${formatAdminInvoiceDate(invoice.due_at)}
          </strong>
        </div>

        <div>
          <span>Booking total</span>
          <strong>
            ${escapeHTML(currency)}
            ${formatCaseMoney(invoice.booking_total)}
          </strong>
        </div>

        <div>
          <span>Commission</span>
          <strong>
            ${escapeHTML(currency)}
            ${formatCaseMoney(invoice.commission_total)}
          </strong>
        </div>
      </div>

      <div class="admin-invoice-table-wrap">
        <table class="admin-invoice-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th>
              <th>Booking</th>
              <th>Rate</th>
              <th>Commission</th>
            </tr>
          </thead>

          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      ${adminNotes}
      ${paymentSection}
    </article>
  `;
}

async function generateMonthlyInvoices() {
  const monthInput =
    document.getElementById("invoiceBillingMonth");

  const dueDaysInput =
    document.getElementById("invoiceDueDays");

  const button =
    document.getElementById("generateInvoicesButton");

  const statusElement =
    document.getElementById(
      "invoiceGenerationStatus"
    );

  const monthValue = monthInput.value;

  if (!monthValue) {
    showToast("Choose a billing month.", "error");
    monthInput.focus();
    return;
  }

  const dueDays = Number(dueDaysInput.value);

  if (
    !Number.isInteger(dueDays) ||
    dueDays < 1 ||
    dueDays > 90
  ) {
    showToast(
      "Payment days must be between 1 and 90.",
      "error"
    );

    dueDaysInput.focus();
    return;
  }

  const [yearText, monthText] =
    monthValue.split("-");

  const year = Number(yearText);
  const month = Number(monthText);

  const lastDay = new Date(
    year,
    month,
    0
  ).getDate();

  const periodStart =
    `${yearText}-${monthText}-01`;

  const periodEnd =
    `${yearText}-${monthText}-${String(
      lastDay
    ).padStart(2, "0")}`;

  if (
    !confirm(
      `Generate invoices for ${monthValue}?`
    )
  ) {
    return;
  }

  button.disabled = true;
  button.textContent = "Generating...";

  statusElement.textContent = "";

  try {
    const { data, error } = await supabaseClient.rpc(
      "generate_commission_invoices",
      {
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_due_days: dueDays
      }
    );

    if (error) throw error;

    const count = Number(data || 0);

    statusElement.textContent =
      count === 1
        ? "1 invoice generated."
        : `${count} invoices generated.`;

    showToast(
      count > 0
        ? "Invoices generated."
        : "No uninvoiced commissions found.",
      count > 0 ? "success" : "error"
    );

    await loadCommissionInvoices();
  } catch (error) {
    console.error(
      "Could not generate invoices:",
      error
    );

    showToast(
      error.message ||
      "Could not generate invoices.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.innerHTML = `
      <i class="fa-solid fa-file-circle-plus"></i>
      Generate invoices
    `;
  }
}

async function reviewCommissionInvoice(
  invoiceId,
  decision,
  button
) {
  const card = button.closest(
    ".admin-invoice-card"
  );

  const notes = card
    .querySelector(".invoice-review-notes")
    .value.trim();

  if (decision === "reject" && !notes) {
    showToast(
      "Enter a reason for rejecting the payment.",
      "error"
    );

    card
      .querySelector(".invoice-review-notes")
      .focus();

    return;
  }

  const message =
    decision === "approve"
      ? "Approve this payment?"
      : "Reject this payment?";

  if (!confirm(message)) return;

  const buttons = card.querySelectorAll("button");

  buttons.forEach(item => {
    item.disabled = true;
  });

  try {
    const { error } = await supabaseClient.rpc(
      "review_commission_invoice_payment",
      {
        p_invoice_id: invoiceId,
        p_decision: decision,
        p_admin_notes: notes || null
      }
    );

    if (error) throw error;

    showToast(
      decision === "approve"
        ? "Payment approved."
        : "Payment rejected.",
      "success"
    );

    await loadCommissionInvoices();
  } catch (error) {
    console.error(
      "Could not review payment:",
      error
    );

    showToast(
      error.message ||
      "Could not review the payment.",
      "error"
    );

    buttons.forEach(item => {
      item.disabled = false;
    });
  }
}

function formatAdminInvoiceStatus(status) {
  const labels = {
    issued: "Payment due",
    overdue: "Overdue",
    payment_submitted: "Awaiting verification",
    paid: "Paid",
    cancelled: "Cancelled"
  };

  return labels[status] || status;
}

function formatAdminInvoiceDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
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
    services: "All Services",
    cases: "Booking Cases",
    commissions: "Commission Invoices"
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