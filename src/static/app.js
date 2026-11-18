document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupAuthMessage = document.getElementById("signup-auth-message");
  const accountToggle = document.getElementById("account-toggle");
  const accountActions = document.getElementById("account-actions");
  const accountStatus = document.getElementById("account-status");
  const loginOpenButton = document.getElementById("login-open");
  const logoutButton = document.getElementById("logout");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const activityPlaceholder = activitySelect.options[0].cloneNode(true);
  let teacherCredentials = null;

  function getAuthorizationHeader(credentials = teacherCredentials) {
    if (!credentials) {
      return null;
    }

    const bytes = new TextEncoder().encode(
      `${credentials.username}:${credentials.password}`
    );
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return `Basic ${btoa(binary)}`;
  }

  function updateAuthenticationUI() {
    const signedIn = teacherCredentials !== null;
    signupForm.classList.toggle("hidden", !signedIn);
    signupAuthMessage.classList.toggle("hidden", signedIn);
    loginOpenButton.classList.toggle("hidden", signedIn);
    logoutButton.classList.toggle("hidden", !signedIn);
    accountStatus.textContent = signedIn
      ? `Signed in as ${teacherCredentials.username}`
      : "Not signed in";
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(activityPlaceholder.cloneNode(true));

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacherCredentials
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Remove ${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: getAuthorizationHeader() },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          teacherCredentials = null;
          updateAuthenticationUI();
          fetchActivities();
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: getAuthorizationHeader() },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          teacherCredentials = null;
          updateAuthenticationUI();
          fetchActivities();
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  accountToggle.addEventListener("click", () => {
    const isExpanded = accountToggle.getAttribute("aria-expanded") === "true";
    accountToggle.setAttribute("aria-expanded", String(!isExpanded));
    accountActions.classList.toggle("hidden", isExpanded);
  });

  loginOpenButton.addEventListener("click", () => {
    loginMessage.classList.add("hidden");
    loginForm.reset();
    loginDialog.showModal();
  });

  document.getElementById("login-cancel").addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const credentials = {
      username: usernameInput.value,
      password: passwordInput.value,
    };

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { Authorization: getAuthorizationHeader(credentials) },
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage(loginMessage, result.detail || "Login failed.", "error");
        return;
      }

      teacherCredentials = credentials;
      passwordInput.value = "";
      loginDialog.close();
      accountActions.classList.add("hidden");
      accountToggle.setAttribute("aria-expanded", "false");
      updateAuthenticationUI();
      fetchActivities();
    } catch (error) {
      showMessage(loginMessage, "Failed to sign in. Please try again.", "error");
      console.error("Error signing in:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    teacherCredentials = null;
    updateAuthenticationUI();
    accountActions.classList.add("hidden");
    accountToggle.setAttribute("aria-expanded", "false");
    fetchActivities();
  });

  // Initialize app
  updateAuthenticationUI();
  fetchActivities();
});
