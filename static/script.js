// ---------- Grab the elements we need ----------
const addButton = document.getElementById("addButton");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const messageBox = document.getElementById("message");
const leadsBody = document.getElementById("leadsBody");
const leadsTable = document.getElementById("leadsTable");

const leadDialog = document.getElementById("leadDialog");
const leadForm = document.getElementById("leadForm");
const dialogTitle = document.getElementById("dialogTitle");
const cancelButton = document.getElementById("cancelButton");
const formError = document.getElementById("formError");

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const phoneInput = document.getElementById("phoneInput");
const businessInput = document.getElementById("businessInput");
const statusInput = document.getElementById("statusInput");

// null means "adding a new lead", a number means "editing that lead"
let editingLeadId = null;
let searchTimer = null;

const STATUS_OPTIONS = ["New", "Contacted", "Converted"];


// ---------- Helper: show a message above the table ----------
function showMessage(text, isError) {
  messageBox.textContent = text;
  if (isError) {
    messageBox.className = "message error";
  } else {
    messageBox.className = "message";
  }
}

// Stops people from injecting HTML through lead details
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Builds a round avatar with the lead's initials and a colour based on the name
function avatarHtml(name) {
  const words = name.trim().split(" ");
  let initials = words[0].charAt(0);
  if (words.length > 1) {
    initials = initials + words[words.length - 1].charAt(0);
  }

  // Turn the name into a number, then into a colour (same name = same colour)
  let total = 0;
  for (let i = 0; i < name.length; i++) {
    total = total + name.charCodeAt(i);
  }
  const hue = (total * 37) % 360;

  return '<span class="avatar" style="background:hsl(' + hue + ', 70%, 90%); color:hsl(' + hue + ', 55%, 28%)">' +
    escapeHtml(initials.toUpperCase()) + "</span>";
}

// ---------- Helper: talk to the backend ----------
async function callApi(url, options) {
  const response = await fetch(url, options);
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}


// ---------- Stats ----------
async function loadStats() {
  try {
    const stats = await callApi("/api/stats");
    document.getElementById("statTotal").textContent = stats.total;
    document.getElementById("statNew").textContent = stats.new;
    document.getElementById("statConverted").textContent = stats.converted;

    // Conversion rate = converted leads / total leads
    let rate = 0;
    if (stats.total > 0) {
      rate = Math.round((stats.converted / stats.total) * 100);
    }
    document.getElementById("conversionRate").textContent = rate + "%";
    document.getElementById("conversionFill").style.width = rate + "%";
  } catch (error) {
    showMessage(error.message, true);
  }
}


// ---------- Leads list ----------
async function loadLeads() {
  showMessage("Loading leads...", false);
  leadsTable.style.display = "none";

  const params = new URLSearchParams();
  if (searchInput.value.trim() !== "") {
    params.append("search", searchInput.value.trim());
  }
  if (statusFilter.value !== "") {
    params.append("status", statusFilter.value);
  }

  try {
    const leads = await callApi("/api/leads?" + params.toString());
    drawLeads(leads);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function drawLeads(leads) {
  leadsBody.innerHTML = "";

  if (leads.length === 0) {
    const filtersUsed = searchInput.value.trim() !== "" || statusFilter.value !== "";
    if (filtersUsed) {
      showMessage("No leads match your search. Try a different name or status.", false);
    } else {
      showMessage("No leads yet. Click 'Add lead' to save your first enquiry.", false);
    }
    return;
  }

  showMessage("", false);
  leadsTable.style.display = "table";

  for (const lead of leads) {
    const row = document.createElement("tr");

    // Build the status dropdown for this row
    let statusHtml = '<select class="row-status status-' + lead.status.toLowerCase() + '" data-id="' + lead.id + '">';
    for (const option of STATUS_OPTIONS) {
      const selected = option === lead.status ? " selected" : "";
      statusHtml += "<option" + selected + ">" + option + "</option>";
    }
    statusHtml += "</select>";

    row.innerHTML =
      '<td data-label="Name"><div class="name-cell">' + avatarHtml(lead.name) + "<span>" + escapeHtml(lead.name) + "</span></div></td>" +
      '<td data-label="Email">' + escapeHtml(lead.email) + "</td>" +
      '<td data-label="Phone">' + escapeHtml(lead.phone) + "</td>" +
      '<td data-label="Business">' + escapeHtml(lead.business_name) + "</td>" +
      '<td data-label="Status">' + statusHtml + "</td>" +
      '<td data-label="Actions" class="actions">' +
        '<button class="btn small edit-btn">Edit</button>' +
        '<button class="btn small danger delete-btn">Delete</button>' +
      "</td>";

    // Status change
    row.querySelector(".row-status").addEventListener("change", function (event) {
      changeStatus(lead.id, event.target.value);
    });
    // Edit
    row.querySelector(".edit-btn").addEventListener("click", function () {
      openForm(lead);
    });
    // Delete
    row.querySelector(".delete-btn").addEventListener("click", function () {
      deleteLead(lead);
    });

    leadsBody.appendChild(row);
  }
}


// ---------- Change status, delete ----------
async function changeStatus(leadId, newStatus) {
  try {
    await callApi("/api/leads/" + leadId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    refreshAll();
  } catch (error) {
    showMessage(error.message, true);
    loadLeads(); // put the dropdown back to the saved value
  }
}

async function deleteLead(lead) {
  const sure = confirm("Delete " + lead.name + "? This cannot be undone.");
  if (!sure) {
    return;
  }
  try {
    await callApi("/api/leads/" + lead.id, { method: "DELETE" });
    refreshAll();
  } catch (error) {
    showMessage(error.message, true);
  }
}


// ---------- Add / Edit form ----------
function clearFormErrors() {
  const errorTags = document.querySelectorAll(".field-error");
  for (const tag of errorTags) {
    tag.textContent = "";
  }
  formError.textContent = "";
}

function openForm(lead) {
  clearFormErrors();

  if (lead) {
    editingLeadId = lead.id;
    dialogTitle.textContent = "Edit lead";
    nameInput.value = lead.name;
    emailInput.value = lead.email;
    phoneInput.value = lead.phone;
    businessInput.value = lead.business_name;
    statusInput.value = lead.status;
  } else {
    editingLeadId = null;
    dialogTitle.textContent = "Add lead";
    leadForm.reset();
  }

  leadDialog.showModal();
}

function checkForm() {
  // Returns true only if every field is fine
  clearFormErrors();
  let allGood = true;

  if (nameInput.value.trim() === "") {
    document.getElementById("nameError").textContent = "Enter the lead's name.";
    allGood = false;
  }

  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailPattern.test(emailInput.value.trim())) {
    document.getElementById("emailError").textContent = "Enter a valid email, like name@company.com.";
    allGood = false;
  }

  const phoneDigits = phoneInput.value.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    document.getElementById("phoneError").textContent = "Enter a phone number with 7 to 15 digits.";
    allGood = false;
  }

  if (businessInput.value.trim() === "") {
    document.getElementById("businessError").textContent = "Enter the business name.";
    allGood = false;
  }

  return allGood;
}

leadForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!checkForm()) {
    return;
  }

  const leadData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    business_name: businessInput.value.trim(),
    status: statusInput.value,
  };

  let url = "/api/leads";
  let method = "POST";
  if (editingLeadId !== null) {
    url = "/api/leads/" + editingLeadId;
    method = "PUT";
  }

  try {
    await callApi(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadData),
    });
    leadDialog.close();
    refreshAll();
  } catch (error) {
    formError.textContent = error.message;
  }
});


// ---------- Buttons and inputs ----------
addButton.addEventListener("click", function () {
  openForm(null);
});

cancelButton.addEventListener("click", function () {
  leadDialog.close();
});

// Wait a short moment after typing so we don't call the API on every key
searchInput.addEventListener("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadLeads, 300);
});

statusFilter.addEventListener("change", loadLeads);


// ---------- Start ----------
function refreshAll() {
  loadStats();
  loadLeads();
}

refreshAll();