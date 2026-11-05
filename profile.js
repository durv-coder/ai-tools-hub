/* AI Tools Hub — Profile */
const SUPABASE_URL = "https://iuvxddawxdjexzmhzozz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UW6cj3VeCcldZUqRmqwa9g_nq-YunwG";

const profileMessage = document.getElementById("profileMessage");
const profileEmail = document.getElementById("profileEmail");
const profileStatus = document.getElementById("profileStatus");
const profileLogout = document.getElementById("profileLogout");
const themeToggle = document.getElementById("themeToggle");
const favoriteList = document.getElementById("favoriteList");
const favoritesMessage = document.getElementById("favoritesMessage");
const recentlyViewedList = document.getElementById("recentlyViewedList");
const recentlyViewedMessage = document.getElementById("recentlyViewedMessage");
const clearRecentlyViewedButton = document.getElementById("clearRecentlyViewed");
const RECENT_TOOLS_KEY = "aiToolsHubRecentlyViewed";

const toolLinks = {
    "ChatGPT": "https://chatgpt.com/", "Midjourney": "https://www.midjourney.com/",
    "GitHub Copilot": "https://github.com/features/copilot", "Runway": "https://runwayml.com/",
    "Grammarly": "https://www.grammarly.com/", "Adobe Firefly": "https://firefly.adobe.com/",
    "Cursor": "https://cursor.com/", "Claude": "https://claude.ai/", "CapCut": "https://www.capcut.com/",
    "Leonardo AI": "https://leonardo.ai/", "Perplexity": "https://www.perplexity.ai/", "Canva": "https://www.canva.com/"
};

function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = selectedTheme;
    localStorage.setItem("aiToolsHubTheme", selectedTheme);
    if (themeToggle) {
        themeToggle.textContent = selectedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
        themeToggle.setAttribute("aria-label", selectedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
}

function makeToolLink(name, prefix) {
    const link = document.createElement("a");
    link.className = "favorite-tool-link";
    link.textContent = `${prefix} ${name}`;
    link.href = toolLinks[name] || "index.html#tools";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
}

async function loadFavorites(user, supabaseClient) {
    favoriteList.replaceChildren();
    favoritesMessage.textContent = "Loading your favourites...";
    const { data, error } = await supabaseClient.from("favorites").select("tool_name").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) {
        console.error("Favourite loading error:", error);
        favoritesMessage.textContent = "Could not load your favourites. Please refresh the page.";
        return;
    }
    if (!data?.length) {
        favoritesMessage.textContent = "You haven't saved any favourite tools yet.";
        return;
    }
    favoritesMessage.textContent = `You have saved ${data.length} favourite tool(s).`;
    data.forEach(({ tool_name: name }) => {
        const item = document.createElement("li");
        item.className = "favorite-list-item";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-favorite-button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${name} from favourites`);
        remove.addEventListener("click", async () => {
            remove.disabled = true;
            const { error: deleteError } = await supabaseClient.from("favorites").delete().eq("user_id", user.id).eq("tool_name", name);
            if (deleteError) {
                profileMessage.textContent = deleteError.message || "Could not remove this favourite.";
                remove.disabled = false;
                return;
            }
            profileMessage.textContent = `${name} was removed from your favourites.`;
            loadFavorites(user, supabaseClient);
        });
        item.append(makeToolLink(name, "♥"), remove);
        favoriteList.appendChild(item);
    });
}

function loadRecentlyViewed() {
    recentlyViewedList.replaceChildren();
    let history = [];
    try { history = JSON.parse(localStorage.getItem(RECENT_TOOLS_KEY) || "[]"); } catch (error) { console.error("Recently viewed history error:", error); }
    const items = (Array.isArray(history) ? history : []).map(item => typeof item === "string" ? { name: item } : item).filter(item => item && Object.hasOwn(toolLinks, item.name));
    if (!items.length) {
        recentlyViewedMessage.textContent = "You haven't viewed any AI tools yet.";
        clearRecentlyViewedButton.hidden = true;
        return;
    }
    recentlyViewedMessage.textContent = `You recently viewed ${items.length} AI tool(s).`;
    clearRecentlyViewedButton.hidden = false;
    items.forEach(({ name }) => {
        const item = document.createElement("li");
        item.className = "favorite-list-item";
        item.appendChild(makeToolLink(name, "↗"));
        recentlyViewedList.appendChild(item);
    });
}

async function initializeProfile() {
    if (!window.supabase) {
        profileStatus.textContent = "Unavailable";
        profileMessage.textContent = "The account service could not be loaded. Please refresh the page.";
        return;
    }
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        if (!data.user) { window.location.replace("index.html"); return; }
        profileEmail.textContent = data.user.email || "Not available";
        profileStatus.textContent = "Active";
        await loadFavorites(data.user, supabaseClient);
    } catch (error) {
        console.error("Profile loading error:", error);
        profileStatus.textContent = "Unavailable";
        profileMessage.textContent = "Unable to load your profile. Check your connection and refresh.";
    }
    profileLogout?.addEventListener("click", async () => {
        profileLogout.disabled = true;
        profileMessage.textContent = "Logging out...";
        const { error } = await supabaseClient.auth.signOut();
        if (error) { profileMessage.textContent = error.message || "Logout failed. Please try again."; profileLogout.disabled = false; return; }
        window.location.href = "index.html";
    });
}

applyTheme(localStorage.getItem("aiToolsHubTheme") || "light");
themeToggle?.addEventListener("click", () => applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
clearRecentlyViewedButton?.addEventListener("click", () => { localStorage.removeItem(RECENT_TOOLS_KEY); loadRecentlyViewed(); profileMessage.textContent = "Recently viewed history cleared."; });
loadRecentlyViewed();
initializeProfile();
