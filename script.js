/* =========================================
   AI TOOLS HUB — MAIN JAVASCRIPT
========================================= */

/* ---------- SUPABASE CONNECTION ---------- */

const SUPABASE_URL = "https://iuvxddawxdjexzmhzozz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UW6cj3VeCcldZUqRmqwa9g_nq-YunwG";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

/* ---------- HTML ELEMENTS ---------- */

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const priceFilter = document.getElementById("priceFilter");
const sortFilter = document.getElementById("sortFilter");
const clearButton = document.getElementById("clearFilters");

const toolGrid = document.getElementById("toolGrid");
const noResults = document.getElementById("noResults");
const resultsCount = document.getElementById("resultsCount");

const accountButton = document.getElementById("accountButton");
const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signupButton = document.getElementById("signupButton");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const authForms = document.getElementById("authForms");
const authMessage = document.getElementById("authMessage");
const themeToggle = document.getElementById("themeToggle");

const toolCards = Array.from(
    document.querySelectorAll(".tool-card")
);

const categoryButtons = document.querySelectorAll(
    "[data-category-filter]"
);

const originalOrder = new Map(
    toolCards.map((card, index) => [card, index])
);
/* =========================================
   FAVOURITES
========================================= */

let currentUser = null;
let favoriteNames = new Set();

function updateFavoriteButtons() {
    document.querySelectorAll("[data-favorite-tool]").forEach(button => {
        const toolName = button.dataset.favoriteTool;
        const isFavorite = favoriteNames.has(toolName);

        button.classList.toggle("active", isFavorite);
        button.setAttribute("aria-pressed", String(isFavorite));
        button.title = isFavorite
            ? "Remove from favourites"
            : "Add to favourites";
    });
}

function resetFavoriteButtons() {
    favoriteNames.clear();
    updateFavoriteButtons();
}

async function loadFavorites(user) {
    if (!user) {
        resetFavoriteButtons();
        return;
    }

    const { data, error } = await supabaseClient
        .from("favorites")
        .select("tool_name")
        .eq("user_id", user.id);

    if (error) {
        console.error("Could not load favourites:", error.message);
        return;
    }

    favoriteNames = new Set(
        (data || []).map(item => item.tool_name)
    );

    updateFavoriteButtons();
}

document.addEventListener("click", async event => {
    const button = event.target.closest("[data-favorite-tool]");

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
        if (authModal) authModal.hidden = false;

        if (authMessage) {
            authMessage.textContent =
                "Please log in to save your favourites.";
        }

        return;
    }

    const toolName = button.dataset.favoriteTool;

    if (!toolName) return;

    button.disabled = true;

    try {
        if (favoriteNames.has(toolName)) {
            const { error } = await supabaseClient
                .from("favorites")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("tool_name", toolName);

            if (error) throw error;

            favoriteNames.delete(toolName);
        } else {
            const { error } = await supabaseClient
                .from("favorites")
                .insert({
                    user_id: currentUser.id,
                    tool_name: toolName
                });

            if (error) throw error;

            favoriteNames.add(toolName);
        }

        updateFavoriteButtons();

    } catch (error) {
        console.error("Favourite update failed:", error.message);

        if (authMessage) {
            authMessage.textContent =
                "Could not update favourites. Please try again.";
        }
    } finally {
        button.disabled = false;
    }
});


/* =========================================
   RECENTLY VIEWED TOOLS
========================================= */

const RECENTLY_VIEWED_KEY = "aiToolsHubRecentlyViewed";
const MAX_RECENTLY_VIEWED = 8;

function readRecentlyViewed() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]"
        );

        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.error("Recently viewed history error:", error);
        return [];
    }
}

function saveRecentlyViewed(toolName) {
    if (!toolName) return;

    try {
        const history = readRecentlyViewed();

        const normalizedHistory = history
            .map(item => typeof item === "string" ? { name: item } : item)
            .filter(item => item && item.name !== toolName);

        const updatedHistory = [
            { name: toolName, visitedAt: new Date().toISOString() },
            ...normalizedHistory
        ].slice(0, MAX_RECENTLY_VIEWED);

        localStorage.setItem(
            RECENTLY_VIEWED_KEY,
            JSON.stringify(updatedHistory)
        );
    } catch (error) {
        console.error("Could not save recently viewed tool:", error);
    }
}

if (toolGrid) {
    toolGrid.addEventListener("click", event => {
        const link = event.target.closest(".tool-card a");

        if (!link) return;

        const card = link.closest(".tool-card");
        const toolName = card?.querySelector("h3")?.textContent.trim();

        if (toolName) {
            saveRecentlyViewed(toolName);
        }
    });
}
/* =========================================
   SEARCH, CATEGORY AND PRICE FILTERS
========================================= */

function updateCategoryButtons(selectedCategory) {
    categoryButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.categoryFilter === selectedCategory
        );
    });
}

function filterTools() {
    if (
        !searchInput ||
        !categoryFilter ||
        !priceFilter ||
        !sortFilter ||
        !toolGrid
    ) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedPrice = priceFilter.value;
    const selectedSort = sortFilter.value;

    let matchingCards = toolCards.filter(card => {
        const name = card.querySelector("h3")?.textContent.toLowerCase() || "";
        const description = card.querySelector("p")?.textContent.toLowerCase() || "";

        const categories = (
            card.dataset.categories ||
            card.dataset.category ||
            ""
        ).split(/\s+/);

        const priceElement = card.querySelector(".tool-price");
        const price = priceElement?.classList.contains("free")
            ? "free"
            : "paid";

        const matchesSearch =
            name.includes(searchTerm) ||
            description.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            categories.includes(selectedCategory);

        const matchesPrice =
            selectedPrice === "all" ||
            price === selectedPrice;

        return matchesSearch && matchesCategory && matchesPrice;
    });

    /* SORTING */

    if (selectedSort === "az") {
        matchingCards.sort((a, b) =>
            a.querySelector("h3").textContent.localeCompare(
                b.querySelector("h3").textContent
            )
        );
    } else if (selectedSort === "za") {
        matchingCards.sort((a, b) =>
            b.querySelector("h3").textContent.localeCompare(
                a.querySelector("h3").textContent
            )
        );
    } else if (selectedSort === "free-first") {
        matchingCards.sort((a, b) =>
            Number(b.querySelector(".tool-price").classList.contains("free")) -
            Number(a.querySelector(".tool-price").classList.contains("free"))
        );
    } else if (selectedSort === "paid-first") {
        matchingCards.sort((a, b) =>
            Number(a.querySelector(".tool-price").classList.contains("free")) -
            Number(b.querySelector(".tool-price").classList.contains("free"))
        );
    } else {
        matchingCards.sort((a, b) =>
            originalOrder.get(a) - originalOrder.get(b)
        );
    }

    /* UPDATE DISPLAY */

    toolCards.forEach(card => {
        card.style.display = "none";
    });

    matchingCards.forEach(card => {
        card.style.display = "";
        toolGrid.appendChild(card);
    });

    if (noResults) {
        noResults.hidden = matchingCards.length !== 0;
    }

    if (resultsCount) {
        resultsCount.textContent =
            `Showing ${matchingCards.length} of ${toolCards.length} AI tools`;
    }

    updateCategoryButtons(selectedCategory);
}

/* CATEGORY BUTTONS */

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (!categoryFilter) return;

        categoryFilter.value = button.dataset.categoryFilter;
        filterTools();

        document.getElementById("tools")?.scrollIntoView({
            behavior: "smooth"
        });
    });
});

/* FILTER EVENTS */

searchInput?.addEventListener("input", filterTools);
categoryFilter?.addEventListener("change", filterTools);
priceFilter?.addEventListener("change", filterTools);
sortFilter?.addEventListener("change", filterTools);

/* CLEAR FILTERS */

clearButton?.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    priceFilter.value = "all";
    sortFilter.value = "featured";

    filterTools();
});

filterTools();

/* =========================================
   SCROLL REVEAL ANIMATIONS
========================================= */

const revealElements = document.querySelectorAll(
    ".categories-section, .category-card, .tools-content, .tool-card"
);

revealElements.forEach(element => {
    element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach(element => {
        element.classList.add("visible");
    });
}

/* =========================================
   LIGHT AND DARK THEME
========================================= */

function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    document.body.dataset.theme = selectedTheme;

    if (themeToggle) {
        themeToggle.textContent =
            selectedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

        themeToggle.setAttribute(
            "aria-label",
            selectedTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
        );

        themeToggle.title =
            selectedTheme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode";
    }

    localStorage.setItem("aiToolsHubTheme", selectedTheme);
}

const savedTheme =
    localStorage.getItem("aiToolsHubTheme") || "light";

applyTheme(savedTheme);

themeToggle?.addEventListener("click", () => {
    const currentTheme = document.body.dataset.theme;

    applyTheme(currentTheme === "dark" ? "light" : "dark");
});

/* =========================================
   AUTHENTICATION INTERFACE
========================================= */

function openAuthModal(message = "") {
    if (!authModal) return;

    authModal.hidden = false;

    if (authMessage) {
        authMessage.textContent = message;
    }
}

function closeAuthModal() {
    if (authModal) {
        authModal.hidden = true;
    }
}

function updateAuthUI(user) {
    if (user) {
        if (accountButton) {
            accountButton.textContent = "My Account";
        }

        if (authForms) authForms.hidden = true;
        if (logoutButton) logoutButton.hidden = false;

        if (authMessage) {
            authMessage.textContent = `Signed in as ${user.email}`;
        }
    } else {
        if (accountButton) {
            accountButton.textContent = "Account";
        }

        if (authForms) authForms.hidden = false;
        if (logoutButton) logoutButton.hidden = true;
    }
}

/* ACCOUNT BUTTON */

accountButton?.addEventListener("click", async () => {
    accountButton.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error) throw error;

        if (data.user) {
            window.location.href = "profile.html";
        } else {
            openAuthModal();
        }
    } catch (error) {
        console.error("Account check failed:", error);
        openAuthModal("Unable to check your account. Please try again.");
    } finally {
        accountButton.disabled = false;
    }
});

/* CLOSE MODAL */

closeAuth?.addEventListener("click", closeAuthModal);

authModal?.addEventListener("click", event => {
    if (event.target === authModal) {
        closeAuthModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && authModal && !authModal.hidden) {
        closeAuthModal();
    }
});

/* =========================================
   SIGN UP
========================================= */

signupButton?.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) {
        authMessage.textContent = "Please enter your email and password.";
        return;
    }

    if (password.length < 6) {
        authMessage.textContent = "Password must contain at least 6 characters.";
        return;
    }

    signupButton.disabled = true;
    authMessage.textContent = "Creating your account...";

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        if (data.session && data.user) {
            currentUser = data.user;
            updateAuthUI(currentUser);
            await loadFavorites(currentUser);

            authMessage.textContent = "Account created successfully!";
        } else {
            authMessage.textContent =
                "Account created! Please check your email for the confirmation link.";
        }
    } catch (error) {
        console.error("Signup error:", error);
        authMessage.textContent = error.message || "Signup failed. Please try again.";
    } finally {
        signupButton.disabled = false;
    }
});

/* =========================================
   LOGIN
========================================= */

loginButton?.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) {
        authMessage.textContent = "Please enter your email and password.";
        return;
    }

    loginButton.disabled = true;
    authMessage.textContent = "Logging in...";

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        currentUser = data.user;
        updateAuthUI(currentUser);
        await loadFavorites(currentUser);

        authMessage.textContent = "Login successful!";
        authPassword.value = "";
    } catch (error) {
        console.error("Login error:", error);
        authMessage.textContent = error.message || "Login failed. Please try again.";
    } finally {
        loginButton.disabled = false;
    }
});

/* =========================================
   LOGOUT
========================================= */

logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    authMessage.textContent = "Logging out...";

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        currentUser = null;
        updateAuthUI(null);
        resetFavoriteButtons();

        authMessage.textContent = "You have logged out successfully.";

        if (authEmail) authEmail.value = "";
        if (authPassword) authPassword.value = "";
    } catch (error) {
        console.error("Logout error:", error);
        authMessage.textContent = error.message || "Logout failed. Please try again.";
    } finally {
        logoutButton.disabled = false;
    }
});

/* The earlier implementation above is the single active favourites/history system.
   This superseded copy is retained only as source history and never executes. */
if (false) {
/* =========================================
   FAVOURITE AI TOOLS (LEGACY — DISABLED)
========================================= */

function updateFavoriteButton(button, isFavorite) {
    const toolName = button.dataset.favoriteTool;

    button.textContent = isFavorite ? "♥" : "♡";

    button.setAttribute("aria-pressed", String(isFavorite));

    button.setAttribute(
        "aria-label",
        isFavorite
            ? `Remove ${toolName} from favourites`
            : `Add ${toolName} to favourites`
    );

    button.classList.toggle("is-favorite", isFavorite);
}

function resetFavoriteButtons() {
    document.querySelectorAll(".favorite-button").forEach(button => {
        updateFavoriteButton(button, false);
    });
}

async function loadFavorites(user) {
    if (!user) {
        resetFavoriteButtons();
        return;
    }

    const { data, error } = await supabaseClient
        .from("favorites")
        .select("tool_name")
        .eq("user_id", user.id);

    if (error) {
        console.error("Could not load favourites:", error.message);
        return;
    }

    const savedTools = new Set(
        (data || []).map(item => item.tool_name)
    );

    document.querySelectorAll(".favorite-button").forEach(button => {
        updateFavoriteButton(
            button,
            savedTools.has(button.dataset.favoriteTool)
        );
    });
}

/* FAVOURITE BUTTON CLICK */

toolGrid?.addEventListener("click", async event => {
    const button = event.target.closest(".favorite-button");

    if (!button || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    button.disabled = true;

    try {
        const { data, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        const user = data.user;

        if (!user) {
            openAuthModal("Please log in to save your favourite AI tools.");
            return;
        }

        const toolName = button.dataset.favoriteTool;
        const isFavorite =
            button.getAttribute("aria-pressed") === "true";

        if (isFavorite) {
            const { error } = await supabaseClient
                .from("favorites")
                .delete()
                .eq("user_id", user.id)
                .eq("tool_name", toolName);

            if (error) throw error;

            updateFavoriteButton(button, false);
        } else {
            const { error } = await supabaseClient
                .from("favorites")
                .upsert(
                    {
                        user_id: user.id,
                        tool_name: toolName
                    },
                    {
                        onConflict: "user_id,tool_name",
                        ignoreDuplicates: true
                    }
                );

            if (error) throw error;

            updateFavoriteButton(button, true);
        }
    } catch (error) {
        console.error("Favourite error:", error);
        alert(error.message || "Could not update your favourite. Please try again.");
    } finally {
        button.disabled = false;
    }
});

/* =========================================
   AUTH SESSION INITIALIZATION
========================================= */

async function checkUserSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        const user = data.session?.user ?? null;

        updateAuthUI(user);
        await loadFavorites(user);
    } catch (error) {
        console.error("Session initialization failed:", error);
        updateAuthUI(null);
        resetFavoriteButtons();
    }
}

/* LISTEN FOR AUTHENTICATION CHANGES */

supabaseClient.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;

    updateAuthUI(user);

    if (event === "SIGNED_OUT") {
        resetFavoriteButtons();
    }
});

checkUserSession();
/* =========================================
   RECENTLY VIEWED AI TOOLS
========================================= */

const RECENT_TOOLS_KEY = "aiToolsHubRecentlyViewed";
const MAX_RECENT_TOOLS = 8;

function saveRecentlyViewed(toolName) {
    try {
        const saved = JSON.parse(
            localStorage.getItem(RECENT_TOOLS_KEY) || "[]"
        );

        const recentTools = Array.isArray(saved) ? saved : [];

        // Remove an older entry so the newest visit goes first.
        const updatedTools = recentTools.filter(
            item => item.name !== toolName
        );

        updatedTools.unshift({
            name: toolName,
            visitedAt: new Date().toISOString()
        });

        localStorage.setItem(
            RECENT_TOOLS_KEY,
            JSON.stringify(updatedTools.slice(0, MAX_RECENT_TOOLS))
        );
    } catch (error) {
        console.error("Could not save recently viewed tool:", error);
    }
}

// Record visits when someone clicks a tool's Visit Website link.
toolGrid?.addEventListener("click", event => {
    const link = event.target.closest(".tool-card a");

    if (!link) return;

    const card = link.closest(".tool-card");
    const toolName = card?.querySelector("h3")?.textContent.trim();

    if (toolName) {
        saveRecentlyViewed(toolName);
    }
});
console.log("AI Tools Hub initialized.");
}

/* =========================================
   AUTH SESSION INITIALIZATION
========================================= */

async function initializeSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        currentUser = data.session?.user ?? null;
        updateAuthUI(currentUser);
        await loadFavorites(currentUser);
    } catch (error) {
        console.error("Session initialization failed:", error);
        currentUser = null;
        updateAuthUI(null);
        resetFavoriteButtons();
    }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI(currentUser);

    if (!currentUser) resetFavoriteButtons();
});

initializeSession();
