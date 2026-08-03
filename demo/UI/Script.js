/* ==========================================================
   TRACE Admin — shared JS
   Handles: Tailwind design-token config, section navigation,
   data-driven row/card rendering, and shared micro-interactions.
   ========================================================== */

/* ==========================================================
   Configuration — Tailwind design tokens.
   NOTE: must be set before the Tailwind CDN parses the page.
   ========================================================== */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "inverse-primary": "#c8c6c5",
        "on-tertiary-container": "#c76c00",
        "tertiary-fixed": "#ffdcc3",
        "on-primary-fixed-variant": "#474646",
        "on-surface": "#0b1c30",
        "surface-bright": "#f8f9ff",
        "on-error": "#ffffff",
        "on-background": "#0b1c30",
        "secondary": "#006d35",
        "on-surface-variant": "#444748",
        "primary-fixed": "#e5e2e1",
        "secondary-container": "#8df9a8",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "outline": "#747878",
        "outline-variant": "#c4c7c7",
        "surface-container-lowest": "#ffffff",
        "inverse-on-surface": "#eaf1ff",
        "surface-container-low": "#eff4ff",
        "surface-dim": "#cbdbf5",
        "on-secondary-fixed": "#00210c",
        "on-primary-fixed": "#1c1b1b",
        "on-secondary": "#ffffff",
        "tertiary-fixed-dim": "#ffb77d",
        "on-tertiary": "#ffffff",
        "primary-fixed-dim": "#c8c6c5",
        "surface-variant": "#d3e4fe",
        "background": "#f8f9ff",
        "on-tertiary-fixed": "#2f1500",
        "on-tertiary-fixed-variant": "#6e3900",
        "surface": "#f8f9ff",
        "on-primary-container": "#858383",
        "secondary-fixed-dim": "#71dc8e",
        "secondary-fixed": "#8df9a8",
        "primary-container": "#1c1b1b",
        "inverse-surface": "#213145",
        "tertiary": "#000000",
        "primary": "#000000",
        "on-secondary-container": "#007439",
        "surface-container-high": "#dce9ff",
        "on-error-container": "#93000a",
        "surface-container": "#e5eeff",
        "surface-container-highest": "#d3e4fe",
        "tertiary-container": "#2f1500",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#005226",
        "surface-tint": "#5f5e5e"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        "sidebar-width": "280px",
        lg: "24px",
        gutter: "24px",
        xl: "32px",
        md: "16px",
        base: "4px"
      },
      fontFamily: {
        "headline-sm": ["Manrope"],
        "headline-lg": ["Manrope"],
        "headline-md": ["Manrope"],
        "display-lg": ["Manrope"],
        "body-sm": ["Inter"],
        "body-md": ["Inter"],
        "body-lg": ["Inter"],
        "label-sm": ["Inter"],
        "label-md": ["Inter"]
      }
    }
  }
};

(function () {
  "use strict";

  /* ==========================================================
     Cached DOM
     ========================================================== */
  const pageTitle = document.getElementById("page-title");
  const globalSearch = document.getElementById("global-search");
  const sidebarNav = document.getElementById("sidebar-nav");
  const saveFooter = document.getElementById("save-footer");
  const saveBtn = document.getElementById("save-btn");
  const usersTbody = document.getElementById("users-tbody");
  const categoriesGrid = document.getElementById("categories-grid");
  const notificationToggles = document.getElementById("notification-toggles");
  const matchingSliders = document.getElementById("matching-sliders");
  const rolesTbody = document.getElementById("roles-tbody");
  const scrollArea = document.querySelector(".overflow-y-auto.custom-scrollbar");
  const sections = document.querySelectorAll(".app-section");
  const navLinks = document.querySelectorAll(".nav-link");

  /* ==========================================================
     Application State
     ========================================================== */
  // The application is fully data-driven and stateless: every dynamic
  // row/card is rendered from the data arrays below and sections are
  // switched on demand, so no mutable state is required.

  /* ==========================================================
     Data
     ========================================================== */
  // Section titles + search placeholders (per section).
  const SECTION_META = {
    dashboard: { title: "Admin Dashboard", search: "Search users, items, categories, or reports..." },
    users: { title: "Manage Users", search: "Search users, items, categories, or reports..." },
    categories: { title: "Manage Categories", search: "Search categories..." },
    reports: { title: "Reports", search: "Search reports..." },
    settings: { title: "System Settings", search: "Search system logs or users..." }
  };

  // Data for repeated row/card markup, kept in one place.
  const USERS_DATA = [
    { name: "JENIFER BROWN", email: "J.Brown@trace.org", role: "Administrator", roleClass: "bg-[var(--primary)]/10 text-[var(--primary)]", status: "Active", statusClass: "bg-secondary/10 text-secondary", dotClass: "bg-secondary", date: "Oct 12, 2023", initials: "JM" },
    { name: "NYIKI MALULEKE", email: "M.MALULEKE@trace.org", role: "Officer", roleClass: "bg-on-tertiary-container/10 text-on-tertiary-container", status: "Active", statusClass: "bg-secondary/10 text-secondary", dotClass: "bg-secondary", date: "Nov 05, 2023", initials: "LV" },
    { name: "KAT_LE_GODCHAUKE DLAMINI", email: "K.DLAMINI@trace.org", role: "User", roleClass: "bg-outline-variant/30 text-on-surface-variant", status: "Suspended", statusClass: "bg-outline-variant/30 text-outline", dotClass: "bg-outline", date: "Jan 15, 2024", initials: "MR" },
    { name: "TSHEGOFATSO MODIBA", email: "T.MODIBA@trace.org", role: "Officer", roleClass: "bg-on-tertiary-container/10 text-on-tertiary-container", status: "Active", statusClass: "bg-secondary/10 text-secondary", dotClass: "bg-secondary", date: "Feb 20, 2024", initials: "SC" },
    { name: "NLS NYEMBE", email: "N.NYEMBE@trace.org", role: "User", roleClass: "bg-outline-variant/30 text-on-surface-variant", status: "Active", statusClass: "bg-secondary/10 text-secondary", dotClass: "bg-secondary", date: "Mar 02, 2024", initials: "DR" }
  ];

  const CATEGORY_DATA = [
    { name: "Electronics", icon: "devices", count: 84 },
    { name: "Bags & Backpacks", icon: "backpack", count: 112 },
    { name: "Documents & Cards", icon: "assignment_ind", count: 45 },
    { name: "Jewelry & Accessories", icon: "watch", count: 29 },
    { name: "Clothing", icon: "checkroom", count: 67 },
    { name: "Keys", icon: "vpn_key", count: 156 },
    { name: "Other", icon: "category", count: 31 }
  ];

  const NOTIFICATION_DATA = [
    { id: "toggle_email", title: "Email Alerts", desc: "System-wide critical event summaries", checked: true },
    { id: "toggle_match", title: "Match Notifications", desc: "Real-time alerts when new items match a claim", checked: true },
    { id: "toggle_claim", title: "Claim Updates", desc: "Notify relevant officers on status changes", checked: true },
    { id: "toggle_reminders", title: "Collection Reminders", desc: "Automatic pings for items pending retrieval", checked: false }
  ];

  const MATCHING_DATA = [
    { label: "Category Match Weight", value: 70, desc: "How much influence exact category matching has on final score." },
    { label: "Location Match Weight", value: 50, desc: "Geospatial proximity weighting for matching reports." },
    { label: "Description-Similarity Weight", value: 85, desc: "NLP-driven similarity scoring of text descriptions." }
  ];

  const ROLES_DATA = [
    { name: "Administrator", dotClass: "bg-primary", manage: true, approve: true, edit: true },
    { name: "Officer", dotClass: "bg-secondary", manage: false, approve: true, edit: true },
    { name: "User", dotClass: "bg-outline-variant", manage: false, approve: false, edit: false }
  ];

  // Icon actions shared by every user row (keeps the row template compact).
  const USER_ACTIONS = [
    { icon: "edit", title: "Edit User", hoverClass: "text-primary" },
    { icon: "verified_user", title: "Verify Account", hoverClass: "text-secondary" },
    { icon: "block", title: "Suspend User", hoverClass: "text-tertiary-container" },
    { icon: "delete", title: "Delete User", hoverClass: "text-error" }
  ];

  /* ==========================================================
     Render Functions
     ========================================================== */
  function renderUsers() {
    if (!usersTbody) return;

    usersTbody.innerHTML = USERS_DATA.map((user) => `
      <tr class="table-row hover:bg-surface-container-low transition-colors">
        <td class="px-lg py-md">
          <div class="flex items-center gap-md">
            <div class="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white flex items-center justify-center text-slate-600 font-bold text-sm">${escapeHtml(user.initials)}</div>
            <span class="font-bold text-on-surface">${escapeHtml(user.name)}</span>
          </div>
        </td>
        <td class="px-lg py-md text-on-surface-variant">${escapeHtml(user.email)}</td>
        <td class="px-lg py-md"><span class="${user.roleClass} px-sm py-[2px] rounded-full text-xs font-bold uppercase">${escapeHtml(user.role)}</span></td>
        <td class="px-lg py-md"><span class="${user.statusClass} px-sm py-[2px] rounded-full text-xs font-bold inline-flex items-center"><span class="status-dot ${user.dotClass}"></span> ${escapeHtml(user.status)}</span></td>
        <td class="px-lg py-md text-on-surface-variant">${escapeHtml(user.date)}</td>
        <td class="px-lg py-md text-right">
          <div class="flex items-center justify-end gap-xs">
            ${USER_ACTIONS.map(actionIconButton).join("")}
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderCategories() {
    if (!categoriesGrid) return;

    const addCard = categoriesGrid.lastElementChild; // preserve the "Create New Category" card
    const html = CATEGORY_DATA.map((category) => `
      <div class="bg-surface-container-lowest p-lg rounded-xl card-shadow flex flex-col gap-md relative">
        <div class="flex justify-between items-start">
          <div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[32px]" aria-hidden="true">${category.icon}</span>
          </div>
          <div class="flex gap-1">
            <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant" title="Edit" aria-label="Edit ${escapeHtml(category.name)}">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
            </button>
            <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error-container hover:text-error transition-colors text-on-surface-variant" title="Delete" aria-label="Delete ${escapeHtml(category.name)}">
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
            </button>
          </div>
        </div>
        <div class="mt-2">
          <h3 class="font-headline-sm text-headline-sm text-on-background">${escapeHtml(category.name)}</h3>
          <div class="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant">
            <span class="text-label-sm font-label-sm text-on-surface-variant">${category.count} items</span>
          </div>
        </div>
      </div>
    `).join("");

    categoriesGrid.insertAdjacentHTML("afterbegin", html);
    categoriesGrid.appendChild(addCard); // keep the add-card last
  }

  function renderNotifications() {
    if (!notificationToggles) return;

    notificationToggles.innerHTML = NOTIFICATION_DATA.map((setting, index) => {
      const border = index < NOTIFICATION_DATA.length - 1 ? " border-b border-surface-container" : "";
      return `
        <div class="flex items-center justify-between py-sm${border}">
          <div>
            <p class="font-label-md text-on-surface">${escapeHtml(setting.title)}</p>
            <p class="text-body-sm text-on-surface-variant">${escapeHtml(setting.desc)}</p>
          </div>
          <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
            <input ${setting.checked ? "checked" : ""} class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-outline-variant appearance-none cursor-pointer focus:outline-none" id="${setting.id}" name="toggle" type="checkbox" aria-label="${escapeHtml(setting.title)}">
            <label class="toggle-label block overflow-hidden h-6 rounded-full bg-surface-container cursor-pointer" for="${setting.id}"></label>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderMatchingSliders() {
    if (!matchingSliders) return;

    const infoBox = matchingSliders.lastElementChild; // preserve the info note
    const html = MATCHING_DATA.map((slider) => {
      const sliderId = `slider-${slugify(slider.label)}`;
      return `
        <div class="space-y-md">
          <div class="flex justify-between items-end">
            <label class="font-label-md text-on-surface" for="${sliderId}">${escapeHtml(slider.label)}</label>
            <span class="text-headline-sm font-bold text-secondary">${slider.value}%</span>
          </div>
          <input class="w-full" id="${sliderId}" max="100" min="0" type="range" value="${slider.value}" aria-label="${escapeHtml(slider.label)}">
          <p class="text-body-sm text-on-surface-variant italic">${escapeHtml(slider.desc)}</p>
        </div>
      `;
    }).join("");

    matchingSliders.insertAdjacentHTML("afterbegin", html);
    matchingSliders.appendChild(infoBox);
  }

  function renderRoles() {
    if (!rolesTbody) return;

    rolesTbody.innerHTML = ROLES_DATA.map((role) => `
      <tr class="hover:bg-surface-container-low transition-colors">
        <td class="px-lg py-lg">
          <div class="flex items-center gap-sm">
            <span class="w-2 h-2 rounded-full ${role.dotClass}"></span>
            <span class="font-label-md text-on-surface">${escapeHtml(role.name)}</span>
          </div>
        </td>
        <td class="px-lg py-lg text-center">${checkboxHTML(role.manage, `${role.name} can manage users`)}</td>
        <td class="px-lg py-lg text-center">${checkboxHTML(role.approve, `${role.name} can approve claims`)}</td>
        <td class="px-lg py-lg text-center">${checkboxHTML(role.edit, `${role.name} can edit categories`)}</td>
        <td class="px-lg py-lg">
          <button type="button" class="text-on-surface-variant hover:text-primary transition-colors" title="Edit Role" aria-label="Edit ${escapeHtml(role.name)} role">
            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
          </button>
        </td>
      </tr>
    `).join("");
  }

  /* ==========================================================
     Event Listeners
     ========================================================== */
  function showSection(target) {
    const section = document.getElementById(`section-${target}`);
    if (!section) return;

    sections.forEach((element) => element.classList.remove("active"));
    section.classList.add("active");

    navLinks.forEach((link) => {
      const isActive = link.dataset.target === target;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    const meta = SECTION_META[target] || SECTION_META.dashboard;
    if (pageTitle) pageTitle.textContent = meta.title;
    if (globalSearch) globalSearch.placeholder = meta.search;
    if (saveFooter) saveFooter.style.display = target === "settings" ? "block" : "none";

    window.scrollTo(0, 0);
    if (scrollArea) scrollArea.scrollTop = 0;
  }

  function attachSidebarNav() {
    if (!sidebarNav) return;

    const activateLink = (link) => {
      const target = link.dataset.target;
      if (target) showSection(target);
    };

    sidebarNav.addEventListener("click", (event) => {
      const link = event.target.closest(".nav-link");
      if (link) activateLink(link);
    });

    // Keyboard support for the button-styled nav links.
    sidebarNav.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const link = event.target.closest(".nav-link");
      if (link) {
        event.preventDefault();
        activateLink(link);
      }
    });
  }

  function attachRowHover() {
    bindEnterLeaveEffects(
      ".table-row",
      (row) => {
        row.style.transform = "translateX(4px)";
        row.style.transition = "transform .2s ease";
      },
      (row) => {
        row.style.transform = "translateX(0)";
      }
    );
  }

  function attachCategoryHover() {
    bindEnterLeaveEffects(
      ".card-shadow",
      (card) => {
        const icon = card.querySelector(".material-symbols-outlined");
        if (icon) icon.style.transform = "scale(1.1)";
      },
      (card) => {
        const icon = card.querySelector(".material-symbols-outlined");
        if (icon) icon.style.transform = "scale(1)";
      }
    );
  }

  function attachSliderSync() {
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
      slider.addEventListener("input", (event) => {
        const valueText = event.target.parentElement.querySelector("span.text-secondary");
        if (valueText) valueText.textContent = `${event.target.value}%`;
      });
    });
  }

  function attachSaveButton() {
    if (!saveBtn) return;

    const originalHTML = saveBtn.innerHTML;
    const darkClass = "bg-[var(--primary)]";

    saveBtn.addEventListener("click", () => {
      saveBtn.innerHTML = `
        <span class="material-symbols-outlined animate-spin" aria-hidden="true">sync</span> Saving...
      `;
      saveBtn.classList.add("opacity-80");

      setTimeout(() => {
        saveBtn.innerHTML = `
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span> Changes Saved
        `;
        saveBtn.classList.remove(darkClass);
        saveBtn.classList.add("bg-secondary");

        setTimeout(() => {
          saveBtn.innerHTML = originalHTML;
          saveBtn.classList.remove("bg-secondary", "opacity-80");
          saveBtn.classList.add(darkClass);
        }, 2000);
      }, 1000);
    });
  }

  function attachSearchFocusRing() {
    if (!globalSearch) return;

    globalSearch.addEventListener("focus", () => {
      globalSearch.parentElement.classList.add("ring-2", "ring-primary/20");
    });
    globalSearch.addEventListener("blur", () => {
      globalSearch.parentElement.classList.remove("ring-2", "ring-primary/20");
    });
  }

  /* ==========================================================
     Utility Functions
     ========================================================== */
  const escapeDiv = document.createElement("div");

  // Escapes a value for safe use inside HTML templates.
  function escapeHtml(value) {
    escapeDiv.textContent = value;
    return escapeDiv.innerHTML;
  }

  // Turns a label into a url/id-safe slug (e.g. "My Label" -> "my-label").
  function slugify(value) {
    return value.toLowerCase().replace(/\s+/g, "-");
  }

  // Binds enter/leave hover handlers to every element matching a selector.
  function bindEnterLeaveEffects(selector, onEnter, onLeave) {
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("mouseenter", onEnter);
      element.addEventListener("mouseleave", onLeave);
    });
  }

  // Renders a compact icon action button used in data-driven rows.
  function actionIconButton({ icon, title, hoverClass }) {
    return `
      <button type="button" class="p-sm text-outline hover:${hoverClass} hover:bg-surface-container rounded-lg transition-all" title="${title}" aria-label="${title}">
        <span class="material-symbols-outlined" aria-hidden="true">${icon}</span>
      </button>
    `;
  }

  // Renders an accessible permission checkbox.
  function checkboxHTML(checked, label) {
    return `
      <input ${checked ? "checked" : ""} class="w-5 h-5 rounded border-outline-variant text-[var(--primary)] focus:ring-primary cursor-pointer" type="checkbox" aria-label="${escapeHtml(label)}">
    `;
  }

  /* ==========================================================
     Initialization
     ========================================================== */
  function init() {
    renderUsers();
    renderCategories();
    renderNotifications();
    renderMatchingSliders();
    renderRoles();

    attachSidebarNav();
    attachRowHover();
    attachCategoryHover();
    attachSliderSync();
    attachSaveButton();
    attachSearchFocusRing();

    showSection("dashboard");
  }

  // The script is loaded with `defer`, so the DOM is ready at this point.
  init();
})();
