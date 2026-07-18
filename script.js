// Global State Management Engine
let students = JSON.parse(localStorage.getItem("ps_students")) || [];
let attendanceLogs = JSON.parse(localStorage.getItem("ps_logs")) || [];
let activeTab = "dashboard";
let html5QrcodeScanner = null;

// Initialization Hook
document.addEventListener("DOMContentLoaded", () => {
  updateAnalytics();
  renderAllModules();
  initScanner();
});

// Navigation Controller Switches
function switchTab(tabId) {
  activeTab = tabId;
  document
    .querySelectorAll(".tab-pane")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(`tab-${tabId}`).classList.add("active");
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }

  // Page Context Update
  const titles = {
    dashboard: "Dashboard Overview",
    scanner: "Live Terminal",
    registry: "Student Registry",
    reports: "Attendance Reports",
  };
  document.getElementById("page-title").innerText = titles[tabId];

  renderAllModules();
}

// Master Data Synchronizer
function renderAllModules() {
  renderQuickActivityFeed();
  renderRegistryTable();
  renderReportTable();
}

// Universal Metric Evaluator & Percentage Engine
function updateAnalytics() {
  const totalSessions =
    parseInt(document.getElementById("total-sessions").value) || 1;

  // 1. Enrolled Metrics
  document.getElementById("metric-enrolled").innerText = students.length;

  // 2. Today's Present Counter
  const todayStr = new Date().toDateString();
  const todayCount = attendanceLogs.filter(
    (log) => new Date(log.timestamp).toDateString() === todayStr,
  ).length;
  document.getElementById("metric-present").innerText = todayCount;

  // 3. Overall Average Class Performance Percentage
  if (students.length === 0) {
    document.getElementById("metric-avg-pct").innerText = "0%";
    return;
  }

  let totalPctAccumulator = 0;
  students.forEach((student) => {
    const attendanceCount = attendanceLogs.filter(
      (log) => log.id === student.id,
    ).length;
    totalPctAccumulator += (attendanceCount / totalSessions) * 100;
  });

  const overallAvg = (totalPctAccumulator / students.length).toFixed(1);
  document.getElementById("metric-avg-pct").innerText =
    `${Math.min(overallAvg, 100)}%`;
}

// --- 1. QR ENGINE GENERATION CONTEXT WITH STRICT 'CSC/' VALIDATION ---
document.getElementById("generator-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const idInput = document.getElementById("candidate-id");
  const rawId = idInput.value.trim();
  const name = document.getElementById("candidate-name").value.trim();

  // Strict structural pattern validation mapping (e.g., CSC/2022/1157)
  const cscMatricRegex = /^CSC\/[0-9]{4}\/[0-9]+$/i;

  if (!cscMatricRegex.test(rawId)) {
    showToast(
      "Invalid Format! Matric number must match 'CSC/YYYY/####'",
      "error",
    );
    idInput.classList.add("input-error");
    idInput.focus();
    return; // Block pipeline execution completely
  }

  // Clear any persistent error markers and enforce uppercase standardization
  idInput.classList.remove("input-error");
  const id = rawId.toUpperCase();

  // Prevent cross-contamination or duplicate data registrations
  if (!students.some((s) => s.id === id)) {
    students.push({
      id,
      name,
      dateRegistered: new Date().toLocaleDateString(),
    });
    localStorage.setItem("ps_students", JSON.stringify(students));
    showToast(`Registered student profile: ${name}`, "success");
  }

  const payload = JSON.stringify({ id, name });
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";
  document.getElementById("qrcode-output").style.display = "flex";
  document.getElementById("qr-label").innerText = `${name} [${id}]`;

  new QRCode(qrContainer, {
    text: payload,
    width: 160,
    height: 160,
    colorDark: "#0f172a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  updateAnalytics();
  renderAllModules();
  document.getElementById("generator-form").reset();
});

// --- 2. CAMERA SCANNERS HARNESS ---
function initScanner() {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    {
      fps: 15,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    },
    false,
  );
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText) {
  const feedbackCard = document.getElementById("scanner-feedback-hero");
  try {
    const data = JSON.parse(decodedText);
    if (!data.id || !data.name) throw new Error("Invalid payload map");

    const status = logCheckIn(data.id, data.name);

    if (status === "success") {
      feedbackCard.className = "scanner-hero success";
      feedbackCard.innerHTML = `<i class="fa-solid fa-circle-check placeholder-icon"></i>
                                      <h3>Access Granted</h3><p>${data.name} (${data.id}) logged successfully.</p>`;
    } else {
      feedbackCard.className = "scanner-hero error";
      feedbackCard.innerHTML = `<i class="fa-solid fa-circle-xmark placeholder-icon"></i>
                                      <h3>Duplicate Entry</h3><p>${data.name} already processed today.</p>`;
    }
  } catch (err) {
    feedbackCard.className = "scanner-hero error";
    feedbackCard.innerHTML = `<i class="fa-solid fa-triangle-exclamation placeholder-icon"></i>
                                  <h3>Unrecognized Token</h3><p>Parsed QR text is not configured for standard ProScan payloads.</p>`;
  }
}

function onScanFailure() {
  /* Silent mitigation to decouple console spamming */
}

// --- 3. ATTENDANCE & DUPLICATION LAWS ---
function logCheckIn(id, name) {
  const todayStr = new Date().toDateString();

  // Enforce matching constraints on standard date windows to prevent spamming
  const isDoubleDip = attendanceLogs.some(
    (log) =>
      log.id === id && new Date(log.timestamp).toDateString() === todayStr,
  );

  if (isDoubleDip) {
    showToast(`Duplicate entry intercepted for ID: ${id}`, "error");
    return "duplicate";
  }

  // Auto-onboard identity profiles if scanned directly from external sources
  if (!students.some((s) => s.id === id)) {
    students.push({
      id,
      name,
      dateRegistered: new Date().toLocaleDateString(),
    });
    localStorage.setItem("ps_students", JSON.stringify(students));
  }

  attendanceLogs.push({ id, name, timestamp: new Date().toISOString() });
  localStorage.setItem("ps_logs", JSON.stringify(attendanceLogs));

  showToast(`Attendance verified for ${name}`, "success");
  updateAnalytics();
  renderAllModules();
  return "success";
}

// --- 4. RENDER LAYERS & STATISTICAL MATRICES ---
function renderQuickActivityFeed() {
  const feed = document.getElementById("quick-activity-feed");
  feed.innerHTML =
    attendanceLogs.length === 0
      ? `<p style="color:var(--text-muted); font-size:0.85rem">No automated traffic streams tracked yet.</p>`
      : "";

  attendanceLogs
    .slice(-4)
    .reverse()
    .forEach((log) => {
      const item = document.createElement("div");
      item.className = "activity-item";
      item.innerHTML = `<div class="activity-info"><h4>${escapeHtml(log.name)}</h4><p>${escapeHtml(log.id)}</p></div>
                          <div class="activity-time">${new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;
      feed.appendChild(item);
    });
}

function renderRegistryTable() {
  const list = document.getElementById("registry-list");
  const query = document.getElementById("registry-search").value.toLowerCase();
  list.innerHTML = "";

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query),
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No student profiles align with your filters.</td></tr>`;
    return;
  }

  filtered.forEach((student) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="font-weight:600; color:var(--primary)">${escapeHtml(student.id)}</td>
                        <td>${escapeHtml(student.name)}</td>
                        <td>${student.dateRegistered}</td>
                        <td><button class="btn btn-danger btn-sm" onclick="removeStudent('${student.id}')"><i class="fa-solid fa-user-minus"></i> Remove</button></td>`;
    list.appendChild(tr);
  });
}

function renderReportTable() {
  const list = document.getElementById("report-list");
  const query = document.getElementById("report-search").value.toLowerCase();
  const totalSessions =
    parseInt(document.getElementById("total-sessions").value) || 1;
  list.innerHTML = "";

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query),
  );

  filtered.forEach((student) => {
    const attended = attendanceLogs.filter(
      (log) => log.id === student.id,
    ).length;
    const absent = Math.max(0, totalSessions - attended);
    const percentage = Math.min((attended / totalSessions) * 100, 100).toFixed(
      1,
    );

    let badgeClass = "badge-danger";
    if (percentage >= 75) badgeClass = "badge-success";
    else if (percentage >= 50) badgeClass = "badge-warning";

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="font-weight:600;">${escapeHtml(student.id)}</td>
            <td style="font-weight:500;">${escapeHtml(student.name)}</td>
            <td><span class="badge badge-success">${attended} Sessions</span></td>
            <td><span class="badge badge-danger">${absent} Absences</span></td>
            <td>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${percentage}%; background:${percentage >= 75 ? "var(--success)" : percentage >= 50 ? "var(--warning)" : "var(--danger)"}"></div></div>
                <span class="progress-text">${percentage}%</span>
            </td>
            <td><span class="badge ${badgeClass}">${percentage >= 75 ? "Good Standing" : percentage >= 50 ? "Low Margin" : "Critical Risk"}</span></td>
        `;
    list.appendChild(tr);
  });
}

// Universal Format Selection router
function triggerReportGeneration() {
  const format = document.getElementById("export-format-select").value;

  switch (format) {
    case "csv":
      generateCSVEngine();
      break;
    case "excel":
      generateExcelEngine();
      break;
    case "pdf":
      generatePDFEngine();
      break;
    case "docx":
      generateDocxEngine();
      break;
    default:
      showToast("Unsupported configuration selection.", "error");
  }
}

// 1. CLEAN CSV ENGINE
function generateCSVEngine() {
  const totalSessions =
    parseInt(document.getElementById("total-sessions").value) || 1;
  let csvContent =
    "data:text/csv;charset=utf-8,Student ID,Full Name,Attended,Absences,Percentage,Status\n";

  students.forEach((s) => {
    const attended = attendanceLogs.filter((log) => log.id === s.id).length;
    const absent = Math.max(0, totalSessions - attended);
    const pct = Math.min((attended / totalSessions) * 100, 100).toFixed(1);
    const status =
      pct >= 75 ? "Good Standing" : pct >= 50 ? "Low Margin" : "Critical Risk";
    csvContent += `"${s.id}","${s.name}",${attended},${absent},${pct}%,${status}\n`;
  });

  downloadVirtualFile(
    encodeURI(csvContent),
    `Attendance_Report_${new Date().getFullYear()}.csv`,
  );
}

// 2. EXCEL ENGINE (Tab-Delimited Spreadsheets XML Compatibility)
function generateExcelEngine() {
  const totalSessions =
    parseInt(document.getElementById("total-sessions").value) || 1;
  let excelContent = "data:application/vnd.ms-excel;charset=utf-8,";
  excelContent +=
    "Student ID\tFull Name\tAttended\tAbsences\tPercentage\tStatus\n";

  students.forEach((s) => {
    const attended = attendanceLogs.filter((log) => log.id === s.id).length;
    const absent = Math.max(0, totalSessions - attended);
    const pct = Math.min((attended / totalSessions) * 100, 100).toFixed(1);
    const status =
      pct >= 75 ? "Good Standing" : pct >= 50 ? "Low Margin" : "Critical Risk";
    excelContent += `${s.id}\t${s.name}\t${attended}\t${absent}\t${pct}%\t${status}\n`;
  });

  downloadVirtualFile(
    encodeURI(excelContent),
    `Attendance_Registry_${new Date().getFullYear()}.xls`,
  );
}

// 3. HIGH-FIDELITY WEB-PRINT PDF ENGINE
function generatePDFEngine() {
  const printWindow = window.open("", "_blank");
  const totalSessions = document.getElementById("total-sessions").value;

  let tableRows = "";
  students.forEach((s) => {
    const attended = attendanceLogs.filter((log) => log.id === s.id).length;
    const pct = Math.min((attended / totalSessions) * 100, 100).toFixed(1);
    tableRows += `<tr><td>${s.id}</td><td>${s.name}</td><td>${attended}</td><td>${pct}%</td></tr>`;
  });

  printWindow.document.write(`
        <html><head><title>Attendance Report</title>
        <style>body{font-family:sans-serif;padding:30px;color:#1e293b;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #e2e8f0;padding:12px;text-align:left;}th{background:#f8fafc;}</style>
        </head><body>
        <h1>ProScan Attend | Official Compliance Summary</h1>
        <p>Generated: ${new Date().toLocaleString()} (Target Sessions: ${totalSessions})</p>
        <table><thead><tr><th>Student ID</th><th>Name</th><th>Attended</th><th>Percentage</th></tr></thead><tbody>${tableRows}</tbody></table>
        <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>
    `);
  printWindow.document.close();
}

// 4. CLEAN MICROSOFT WORD ENGINE (.DOCX RICH TEXT EXPORTER)
function generateDocxEngine() {
  const totalSessions =
    parseInt(document.getElementById("total-sessions").value) || 1;
  let docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Attendance Document</title><style>body{font-family:Arial;}</style></head>
    <body><h2>Attendance Report Summary Registry</h2><p>Term Reference Limit: ${totalSessions} sessions.</p><hr/>`;

  students.forEach((s) => {
    const attended = attendanceLogs.filter((log) => log.id === s.id).length;
    const pct = Math.min((attended / totalSessions) * 100, 100).toFixed(1);
    docHtml += `<p><b>Student:</b> ${s.name} (${s.id}) &nbsp;|&nbsp; <b>Rate:</b> ${pct}% (${attended} check-ins)</p>`;
  });

  docHtml += `</body></html>`;

  const blob = new Blob(["\ufeff" + docHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  downloadVirtualFile(url, `Attendance_Export_${new Date().getFullYear()}.doc`);
}

// Reusable downstream file utility downloader
function downloadVirtualFile(uri, fileName) {
  const link = document.createElement("a");
  link.setAttribute("href", uri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast(`Successfully exported document: ${fileName}`, "success");
}

function removeStudent(id) {
  if (
    confirm(
      "Purge student profile? Attendance history items will remain tracked but decoupled.",
    )
  ) {
    students = students.filter((s) => s.id !== id);
    localStorage.setItem("ps_students", JSON.stringify(students));
    updateAnalytics();
    renderAllModules();
    showToast("Student profile purged successfully.", "warning");
  }
}

function clearLogs() {
  if (
    confirm(
      "CRITICAL WARNING: This completely flushes all localized student databases, profile configurations, and tracking historical instances. Proceed?",
    )
  ) {
    localStorage.removeItem("ps_students");
    localStorage.removeItem("ps_logs");
    students = [];
    attendanceLogs = [];
    updateAnalytics();
    renderAllModules();
    showToast(
      "System infrastructure database initialized to default states.",
      "error",
    );
  }
}

function showToast(message, type) {
  const toast = document.getElementById("toast-message");
  toast.className = `toast ${type}`;
  toast.style.display = "flex";
  toast.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-triangle-exclamation"}"></i> ${message}`;
  setTimeout(() => (toast.style.display = "none"), 4000);
}

function printQR() {
  const printWindow = window.open("", "_blank");
  const labelText = document.getElementById("qr-label").innerText;
  const qrGraphic = document.getElementById("qrcode").innerHTML;
  printWindow.document.write(
    `<html><head><title>Print Badge</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;}</style></head><body><div>${qrGraphic}<h2>${labelText}</h2></div></body></html>`,
  );
  printWindow.document.close();
  printWindow.print();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Toggle Drawer State Visibility
function toggleMobileMenu() {
  const sidebar = document.getElementById("sidebar-menu");
  sidebar.classList.toggle("open");
}

// Intercept Navigation items to handle sliding close animations automatically
function handleNavClick(tabId) {
  switchTab(tabId);

  // Auto-close menu if interacting via a mobile viewport size
  const sidebar = document.getElementById("sidebar-menu");
  if (window.innerWidth <= 1024) {
    sidebar.classList.remove("open");
  }
}
