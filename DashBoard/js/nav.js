// UI helper functions

export function formatElapsedTime(timestamp) {
    let seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 30) return "Just now";
    if (seconds < 60) return seconds + "s ago";

    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";

    let hours = Math.floor(minutes / 60);
    return hours + "h ago";
}

export function updateUserHeader(user) {
    if (!user) return;

    let name = document.getElementById("globalUserName");
    let rep = document.getElementById("globalRepScore");
    let avatar = document.getElementById("globalAvatar");

    if (name) name.innerText = user.name;
    if (rep) rep.innerText = user.repScore || 0;
    if (avatar) {
        avatar.innerText = user.avatar || user.name.charAt(0).toUpperCase();
    }
}

export function switchView(viewName) {
    let pages = document.querySelectorAll(".view-page");
    let navItems = document.querySelectorAll(".nav-item");

    pages.forEach(function(page) {
        page.style.display = "none";
    });

    navItems.forEach(function(item) {
        item.classList.remove("active");
    });

    let pageId = "dashboardView";
    let navId = "navDashboard";

    if (viewName === "profile") {
        pageId = "profileView";
        navId = "navProfile";
    } else if (viewName === "leaderboard") {
        pageId = "leaderboardView";
        navId = "navLeaderboard";
    } else if (viewName === "responses") {
        pageId = "responsesView";
        navId = "navResponses";
    }

    let page = document.getElementById(pageId);
    let nav = document.getElementById(navId);

    if (page) page.style.display = "block";
    if (nav) nav.classList.add("active");
}
