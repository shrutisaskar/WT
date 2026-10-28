/* =====================================================
   FitZone - Gym & Fitness Center Membership Portal
   Vanilla JavaScript + LocalStorage
   ===================================================== */

/* ---------- 1. Fixed data (single source of truth) ---------- */
const PLANS = [
  { id: "basic", name: "Basic", price: 999, months: 1, duration: "month",
    benefits: ["Access to gym floor", "Basic equipment", "Locker facility"] },
  { id: "standard", name: "Standard", price: 2499, months: 3, duration: "3 months",
    benefits: ["Access to all equipment", "Trainer guidance", "Group classes", "Locker facility"] },
  { id: "premium", name: "Premium", price: 7999, months: 12, duration: "12 months",
    benefits: ["All standard features", "Personal training (2 sessions/month)", "Diet plan support"] }
];

const TRAINERS = [
  { name: "Jaee Naik", specialization: "Strength Training",
    description: "Specializes in strength training and weight management." },
  { name: "Ashmi Pawar", specialization: "Yoga & Flexibility",
    description: "Helps improve flexibility, posture and overall wellness." },
  { name: "Tanuja Ranade", specialization: "Cardio & HIIT",
    description: "Focuses on cardio, HIIT and stamina building." }
];

const TIME_SLOTS = [
  "6:00 AM - 7:00 AM", "7:00 AM - 8:00 AM", "5:00 PM - 6:00 PM",
  "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM"
];

/* LocalStorage keys */
const KEY_MEMBERS = "fz_members";
const KEY_BOOKINGS = "fz_bookings";
const KEY_ATTENDANCE = "fz_attendance";
const KEY_CURRENT = "fz_currentMember";

/* ---------- 2. Helper functions ---------- */

// Read an array from LocalStorage (empty array if nothing saved)
function loadData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

// Save an array to LocalStorage
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Date object -> "YYYY-MM-DD" (the format used by <input type="date">)
function toISO(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + m + "-" + d;
}

// "YYYY-MM-DD" -> Date object (local time)
function parseISO(str) {
  const p = str.split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

// "YYYY-MM-DD" -> "DD-MM-YYYY" for display
function formatDate(str) {
  const p = str.split("-");
  return p[2] + "-" + p[1] + "-" + p[0];
}

function todayISO() {
  return toISO(new Date());
}

// Show a message in a .msg box. type = "error" or "success"
function showMsg(box, html, type) {
  box.className = "msg " + type;
  box.innerHTML = html;
}

function clearMsg(box) {
  box.className = "msg";
  box.innerHTML = "";
}

function getPlan(id) {
  return PLANS.find(function (p) { return p.id === id; });
}

/* Expiry date = start date + plan months.
   Example: 28-10-2026 + 3 months = 28-01-2027 */
function calculateExpiry(startISO, months) {
  const start = parseISO(startISO);
  let expiry = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  // If the month is shorter (e.g. 31 Jan + 1 month), JS overflows to next month.
  // In that case use the last day of the intended month.
  if (expiry.getDate() !== start.getDate()) {
    expiry = new Date(start.getFullYear(), start.getMonth() + months + 1, 0);
  }
  return toISO(expiry);
}

/* Membership status by comparing today with start and expiry dates */
function getStatus(member) {
  const today = todayISO();
  if (today < member.startDate) return "Upcoming";
  if (today > member.expiryDate) return "Expired";
  return "Active";
}

/* ---------- 3. Page navigation ---------- */

// Show one section and hide the others
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(function (sec) {
    sec.classList.toggle("hidden", sec.id !== pageId);
  });
  // Highlight the matching link in the navbar
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    link.classList.toggle("active", link.dataset.page === pageId);
  });
  if (pageId === "membership") renderMembership();
  window.scrollTo(0, 0);
}

/* ---------- 4. Build plans, trainers and dropdowns ---------- */

function renderPlans() {
  const list = document.getElementById("planList");
  list.innerHTML = "";
  PLANS.forEach(function (plan) {
    const items = plan.benefits.map(function (b) { return "<li>" + b + "</li>"; }).join("");
    list.innerHTML +=
      '<div class="plan">' +
        '<div class="plan-head"><h3>' + plan.name + "</h3>" +
        '<div class="price">₹' + plan.price.toLocaleString("en-IN") +
        " <small>/ " + plan.duration + "</small></div></div>" +
        "<ul>" + items + "</ul>" +
        '<button class="btn select-plan" data-plan="' + plan.id + '">Select Plan</button>' +
      "</div>";
  });
}

function renderTrainers() {
  const list = document.getElementById("trainerList");
  list.innerHTML = "";
  TRAINERS.forEach(function (t) {
    // Initials for the avatar circle, e.g. "Jaee Naik" -> "JN"
    const initials = t.name.split(" ").map(function (w) { return w[0]; }).join("");
    list.innerHTML +=
      '<div class="trainer">' +
        '<div class="avatar">' + initials + "</div>" +
        "<h3>" + t.name + "</h3>" +
        '<p class="spec">' + t.specialization + "</p>" +
        '<p class="desc">' + t.description + "</p>" +
        '<button class="btn book-trainer" data-trainer="' + t.name + '">Book Slot</button>' +
      "</div>";
  });
}

function fillDropdowns() {
  const planSelect = document.getElementById("planSelect");
  planSelect.innerHTML = '<option value="">Select plan</option>';
  PLANS.forEach(function (p) {
    planSelect.innerHTML += '<option value="' + p.id + '">' + p.name +
      " (₹" + p.price.toLocaleString("en-IN") + " / " + p.duration + ")</option>";
  });

  const trainerSelect = document.getElementById("trainerSelect");
  trainerSelect.innerHTML = '<option value="">Select trainer</option>';
  TRAINERS.forEach(function (t) {
    trainerSelect.innerHTML += '<option value="' + t.name + '">' +
      t.name + " (" + t.specialization + ")</option>";
  });

  const slotSelect = document.getElementById("slotSelect");
  slotSelect.innerHTML = '<option value="">Select time slot</option>';
  TIME_SLOTS.forEach(function (s) {
    slotSelect.innerHTML += '<option value="' + s + '">' + s + "</option>";
  });
}

/* ---------- 5. Member registration ---------- */

// Fee is taken from the selected plan, never typed in
function updateFee() {
  const plan = getPlan(document.getElementById("planSelect").value);
  document.getElementById("totalFee").textContent =
    "₹" + (plan ? plan.price.toLocaleString("en-IN") : "0");
}

function resetRegForm() {
  document.getElementById("regForm").reset();
  document.getElementById("startDate").value = todayISO();
  updateFee();
}

function registerMember(event) {
  event.preventDefault();

  const name = document.getElementById("fullName").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const email = document.getElementById("email").value.trim();
  const age = Number(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const planId = document.getElementById("planSelect").value;
  const startDate = document.getElementById("startDate").value;
  const msgBox = document.getElementById("regMsg");

  // ----- Validation: collect every error in a list -----
  const errors = [];
  if (!/^[A-Za-z ]{3,}$/.test(name)) errors.push("Enter a valid full name (letters only, minimum 3 characters).");
  if (!/^[6-9][0-9]{9}$/.test(mobile)) errors.push("Mobile number must be 10 digits and start with 6, 7, 8 or 9.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!age || age < 12 || age > 80) errors.push("Age must be between 12 and 80.");
  if (gender === "") errors.push("Select a gender.");
  if (planId === "") errors.push("Select a membership plan.");
  if (startDate === "") errors.push("Select a start date.");
  else if (startDate < todayISO()) errors.push("Start date cannot be in the past.");

  const members = loadData(KEY_MEMBERS);
  if (members.some(function (m) { return m.mobile === mobile; })) {
    errors.push("A member with this mobile number is already registered.");
  }

  if (errors.length > 0) {
    showMsg(msgBox, errors.join("<br>"), "error");
    return;
  }

  // ----- Calculate fee and expiry, then save -----
  const plan = getPlan(planId);
  const member = {
    id: Date.now(),                       // unique id for each member
    name: name, mobile: mobile, email: email, age: age, gender: gender,
    planId: plan.id,
    startDate: startDate,
    expiryDate: calculateExpiry(startDate, plan.months),
    fee: plan.price
  };
  members.push(member);
  saveData(KEY_MEMBERS, members);
  localStorage.setItem(KEY_CURRENT, member.id);   // remember who is "logged in"

  resetRegForm();
  showMsg(msgBox,
    "Registration successful! Plan: " + plan.name + ", Fee: ₹" + plan.price.toLocaleString("en-IN") +
    ", Expiry: " + formatDate(member.expiryDate) +
    '. <a href="#" data-page="membership">View My Membership</a>', "success");
}

/* ---------- 6. Trainer slot booking ---------- */

function bookSlot(event) {
  event.preventDefault();

  const trainer = document.getElementById("trainerSelect").value;
  const date = document.getElementById("bookDate").value;
  const slot = document.getElementById("slotSelect").value;
  const msgBox = document.getElementById("bookMsg");

  if (trainer === "" || date === "" || slot === "") {
    showMsg(msgBox, "Please select trainer, date and time slot.", "error");
    return;
  }
  if (date < todayISO()) {
    showMsg(msgBox, "You cannot book a slot in the past.", "error");
    return;
  }

  // Same trainer + same date + same time = already booked
  const bookings = loadData(KEY_BOOKINGS);
  const alreadyBooked = bookings.some(function (b) {
    return b.trainer === trainer && b.date === date && b.slot === slot;
  });
  if (alreadyBooked) {
    showMsg(msgBox, trainer + " is already booked on " + formatDate(date) + " at " + slot +
      ". Please choose another slot.", "error");
    return;
  }

  bookings.push({ trainer: trainer, date: date, slot: slot });
  saveData(KEY_BOOKINGS, bookings);
  showMsg(msgBox, "Slot booked with " + trainer + " on " + formatDate(date) + " at " + slot + ".", "success");
}

// Called from the "Book Slot" button on a trainer card
function openBookingFor(trainerName) {
  showPage("book");
  document.getElementById("trainerSelect").value = trainerName;   // preselect trainer
  clearMsg(document.getElementById("bookMsg"));
}

/* ---------- 7. My membership & attendance ---------- */

function getCurrentMember() {
  const members = loadData(KEY_MEMBERS);
  const id = Number(localStorage.getItem(KEY_CURRENT));
  // fall back to the first member if no current member is saved
  return members.find(function (m) { return m.id === id; }) || members[0];
}

function renderMembership() {
  const members = loadData(KEY_MEMBERS);
  const noMember = document.getElementById("noMember");
  const area = document.getElementById("memberArea");

  // No one registered yet: show a helpful message
  if (members.length === 0) {
    noMember.classList.remove("hidden");
    area.classList.add("hidden");
    return;
  }
  noMember.classList.add("hidden");
  area.classList.remove("hidden");

  const member = getCurrentMember();

  // Fill the member dropdown
  const select = document.getElementById("memberSelect");
  select.innerHTML = "";
  members.forEach(function (m) {
    select.add(new Option(m.name + " (" + m.mobile + ")", m.id));
  });
  select.value = member.id;

  // Membership details
  document.getElementById("mPlan").textContent = getPlan(member.planId).name;
  document.getElementById("mStart").textContent = formatDate(member.startDate);
  document.getElementById("mExpiry").textContent = formatDate(member.expiryDate);
  const status = getStatus(member);
  const badge = document.getElementById("mStatus");
  badge.textContent = status;
  badge.className = "badge " + status.toLowerCase();

  // Attendance date: default today, future dates not allowed
  const attDate = document.getElementById("attDate");
  attDate.max = todayISO();
  if (attDate.value === "") attDate.value = todayISO();

  renderAttendance(member);
}

function renderAttendance(member) {
  const body = document.getElementById("attBody");
  body.innerHTML = "";

  // Only this member's records, newest date first
  const records = loadData(KEY_ATTENDANCE)
    .filter(function (a) { return a.memberId === member.id; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  if (records.length === 0) {
    body.innerHTML = '<tr><td colspan="2">No attendance marked yet.</td></tr>';
    return;
  }
  records.forEach(function (r) {
    body.innerHTML += "<tr><td>" + formatDate(r.date) +
      '</td><td><span class="present">Present</span></td></tr>';
  });
}

function markAttendance() {
  const member = getCurrentMember();
  const date = document.getElementById("attDate").value;
  const msgBox = document.getElementById("attMsg");

  if (date === "") {
    showMsg(msgBox, "Please select a date.", "error");
    return;
  }
  if (date > todayISO()) {
    showMsg(msgBox, "You cannot mark attendance for a future date.", "error");
    return;
  }
  if (date < member.startDate || date > member.expiryDate) {
    showMsg(msgBox, "Date must be within your membership period (" +
      formatDate(member.startDate) + " to " + formatDate(member.expiryDate) + ").", "error");
    return;
  }

  // Prevent duplicate entry for the same member on the same date
  const records = loadData(KEY_ATTENDANCE);
  const duplicate = records.some(function (a) {
    return a.memberId === member.id && a.date === date;
  });
  if (duplicate) {
    showMsg(msgBox, "Attendance for " + formatDate(date) + " is already marked.", "error");
    return;
  }

  records.push({ memberId: member.id, date: date });
  saveData(KEY_ATTENDANCE, records);
  showMsg(msgBox, "Attendance marked for " + formatDate(date) + ".", "success");
  renderAttendance(member);
}

/* ---------- 8. Connect everything when the page loads ---------- */

function init() {
  renderPlans();
  renderTrainers();
  fillDropdowns();

  // Date fields: start date and booking date cannot be in the past
  document.getElementById("startDate").value = todayISO();
  document.getElementById("startDate").min = todayISO();
  document.getElementById("bookDate").value = todayISO();
  document.getElementById("bookDate").min = todayISO();

  // One click listener handles navigation and the dynamically created buttons
  document.addEventListener("click", function (e) {
    const navItem = e.target.closest("[data-page]");
    if (navItem) {
      e.preventDefault();
      showPage(navItem.dataset.page);
      return;
    }
    const planBtn = e.target.closest(".select-plan");
    if (planBtn) {
      showPage("register");
      document.getElementById("planSelect").value = planBtn.dataset.plan;
      updateFee();
      clearMsg(document.getElementById("regMsg"));
      return;
    }
    const trainerBtn = e.target.closest(".book-trainer");
    if (trainerBtn) openBookingFor(trainerBtn.dataset.trainer);
  });

  document.getElementById("planSelect").addEventListener("change", updateFee);
  document.getElementById("regForm").addEventListener("submit", registerMember);
  document.getElementById("resetBtn").addEventListener("click", function () {
    resetRegForm();
    clearMsg(document.getElementById("regMsg"));
  });
  document.getElementById("bookForm").addEventListener("submit", bookSlot);
  document.getElementById("markBtn").addEventListener("click", markAttendance);
  document.getElementById("memberSelect").addEventListener("change", function (e) {
    localStorage.setItem(KEY_CURRENT, e.target.value);
    renderMembership();
  });

  showPage("home");
}

init();
