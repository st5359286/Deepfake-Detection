import config from "./config.js";

// --- Helper Functions ---
function showDashboard(role) {
  if (role === "admin") {
    document.getElementById("admin-dashboard").classList.remove("hidden");
    document.getElementById("user-dashboard").classList.add("hidden");
  } else {
    document.getElementById("user-dashboard").classList.remove("hidden");
    document.getElementById("admin-dashboard").classList.add("hidden");
  }
}

async function fetchAdminData() {
  try {
    const response = await fetch(`${config.API_URL}/api/admin/activity`);
    if (!response.ok) throw new Error("Failed to fetch admin data");

    const activity = await response.json();
    const activityBody = document.getElementById("activity-log-body");
    activityBody.innerHTML = ""; // Clear previous data

    activity.forEach((user) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-cyan/5 transition-colors group";
      row.innerHTML = `
                <td class="px-6 py-4 font-bold text-white group-hover:text-cyan">${user.username}</td>
                <td class="px-6 py-4">${user.analyses_today}</td>
                <td class="px-6 py-4">${user.total_analyses}</td>
                <td class="px-6 py-4 text-xs text-gray-500">${user.last_active ? new Date(user.last_active).toLocaleString() : "OFFLINE"}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="deleteUser(${user.id}, '${user.username}')" 
                        class="btn-cyber-red py-1 px-3 text-xs border border-alertRed text-alertRed hover:bg-alertRed hover:text-black transition uppercase font-bold">
                        [ DELETE ]
                    </button>
                </td>
            `;
      activityBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching admin activity:", error);
    const activityBody = document.getElementById("activity-log-body");
    activityBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-400">Could not load user activity.</td></tr>`;
  }
}

async function fetchAdminStats() {
  try {
    const response = await fetch(`${config.API_URL}/api/admin/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");

    const stats = await response.json();
    document.getElementById("admin-total-users").textContent = stats.totalUsers;
    document.getElementById("admin-total-scans").textContent =
      stats.totalAnalyses;
    document.getElementById("admin-total-fakes").textContent =
      stats.deepfakesDetected;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
  }
}

async function fetchAdminFeedback() {
  try {
    const response = await fetch(`${config.API_URL}/api/admin/feedback`);
    if (!response.ok) throw new Error("Failed to fetch feedback logs");

    const feedback = await response.json();
    const feedbackBody = document.getElementById("feedback-log-body");
    feedbackBody.innerHTML = "";

    if (feedback.length === 0) {
      feedbackBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No feedback reports found.</td></tr>`;
      return;
    }

    feedback.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-yellow-500/5 transition-colors group";
      row.innerHTML = `
                <td class="px-6 py-4 text-xs text-gray-500">${new Date(item.timestamp).toLocaleString()}</td>
                <td class="px-6 py-4 text-white">${item.username || "Anonymous"}</td>
                <td class="px-6 py-4 text-xs text-gray-500" title="${item.file_hash}">${item.file_hash.substring(0, 16)}...</td>
                <td class="px-6 py-4 text-red-400 font-bold">${item.predicted_label}</td>
                <td class="px-6 py-4 text-emerald-400 font-bold">${item.user_feedback_label}</td>
            `;
      feedbackBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error fetching admin feedback logs:", error);
    const feedbackBody = document.getElementById("feedback-log-body");
    if (feedbackBody) {
      feedbackBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-400">Could not load feedback logs.</td></tr>`;
    }
  }
}

// Global scope for onclick access
window.deleteUser = async function (userId, username) {
  if (
    !confirm(
      `Are you sure you want to delete user "${username}"? This cannot be undone.`,
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${config.API_URL}/api/admin/user/${userId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("User deleted successfully.");
      fetchAdminData(); // Refresh the table
      fetchAdminStats(); // Refresh stats
    } else {
      alert("Failed to delete user.");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("An error occurred.");
  }
};

async function handleExport() {
  try {
    const response = await fetch(`${config.API_URL}/api/admin/export-activity`);
    if (!response.ok) throw new Error("Export failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Activity_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Export error:", error);
    alert("Failed to export data.");
  }
}

async function fetchUserActivity(userId) {
  try {
    const response = await fetch(
      `${config.API_URL}/api/user-activity/${userId}`,
    );
    if (!response.ok) throw new Error("Failed to fetch user activity");

    const stats = await response.json();

    // Update the DOM with the fetched stats
    document.getElementById("stat-analyses-today").textContent =
      stats.analysesToday;
    document.getElementById("stat-total-analyses").textContent =
      stats.totalAnalyses;
    document.getElementById("stat-avg-confidence").textContent =
      `${stats.avgConfidence}%`;
  } catch (error) {
    console.error("Error fetching user activity:", error);
    // You could show an error state for the stats here if desired
  }
}

// Helper to get auth header
function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Main Logic ---
(async () => {
  const userString = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  if (!userString || !token) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/index.html";
    return;
  }

  const user = JSON.parse(userString);
  const welcomeMessage = document.getElementById("welcome-message");

  try {
    const response = await fetch(`${config.API_URL}/api/dashboard`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    const data = await response.json();

    if (response.ok && data.user) {
      welcomeMessage.textContent = `Welcome, ${data.user.username} (${data.user.role})!`;
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      showDashboard(updatedUser.role);

      if (updatedUser.role === "admin") {
        await fetchAdminData();
        await fetchAdminStats();
        await fetchAdminFeedback();
        const exportBtn = document.getElementById("export-btn");
        if (exportBtn) exportBtn.addEventListener("click", handleExport);
      } else {
        document.getElementById("user-username-display").textContent =
          data.user.username;
        document.getElementById("user-email").textContent = data.user.email;
        document.getElementById("user-role").textContent =
          data.user.role.toUpperCase();
        await fetchUserActivity(updatedUser.id);
      }
    } else {
      if (response.status === 401 || response.status === 403) {
        console.warn("Session expired or unauthorized. Logging out.");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/index.html";
        return;
      }
      welcomeMessage.textContent = `Welcome, ${user.username}! (Offline/Sync Issue)`;
      showDashboard(user.role);
      if (user.role !== "admin") {
        document.getElementById("user-username-display").textContent =
          user.username || "-";
        document.getElementById("user-email").textContent = user.email || "-";
        document.getElementById("user-role").textContent = (
          user.role || "user"
        ).toUpperCase();
      }
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    welcomeMessage.textContent =
      "Could not load dashboard data. (Offline Mode)";
    showDashboard(user.role);
  }
})();

// Logout functionality
document.getElementById("logout-button").addEventListener("click", () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = "/index.html";
});
