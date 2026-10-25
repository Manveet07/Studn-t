// Main app file

import {
    getSessionUser,
    getUsers,
    saveUsers,
    getStoredQuestions,
    saveQuestions
} from "./storage.js";

import {
    updateUserHeader,
    switchView
} from "./nav.js";

import {
    renderTags,
    renderQueue,
    renderMyDoubts,
    renderLeaderboard,
    renderResponses
} from "./view.js";


let currentUser = getSessionUser();
let questions = getStoredQuestions();

if (!currentUser) {
    // storage.js redirects to login
    throw new Error("No logged in user");
}

let selectedTag = "ALL";
let activeQuestionId = null;


// Start app
function init() {
    updateUserHeader(currentUser);
    refreshUI();
    setupEventListeners();
    startOnlineStatus();
}


// Refresh dashboard data
function refreshUI() {
    renderTags(questions, selectedTag, function(tag) {
        selectedTag = tag;
        refreshUI();
    });

    renderQueue(questions, selectedTag, handleViewQuestion);
    renderMyDoubts(questions, currentUser, handleViewQuestion);
    renderLeaderboard(getUsers());
    renderResponses(questions, currentUser, handleViewQuestion);

    updateOnlineCount();
}


// Open a question
function handleViewQuestion(questionId) {
    activeQuestionId = questionId;

    let question = questions.find(function(q) {
        return q.id === questionId;
    });

    if (!question) return;

    question.views = (question.views || 0) + 1;
    saveQuestions(questions);

    document.getElementById("modalQuestionTitle").innerText = question.title;

    let meta = document.getElementById("modalQuestionMeta");
    if (meta) {
        meta.innerHTML = `
            <span>${question.subject}</span>
            <span>Asked by ${question.authorName}</span>
            <span>👀 ${question.views} views</span>
        `;
    }

    showAnswers(question);

    let modal = document.getElementById("answerModal");
    if (modal) modal.classList.add("active");
}


// Show answers inside question modal
function showAnswers(question) {
    let list = document.getElementById("answersList");
    let count = document.getElementById("answerCountDisplay");

    if (!list) return;

    list.innerHTML = "";

    let answers = question.answers || [];

    if (count) count.innerText = answers.length;

    if (answers.length === 0) {
        list.innerHTML = "<p>No answers yet. Be the first to help!</p>";
        return;
    }

    answers.forEach(function(answer) {
        let div = document.createElement("div");
        div.className = "answer-card";

        div.innerHTML = `
            <div>
                <b>${answer.authorName}</b>
                <span>👍 ${answer.votes || 0}</span>
            </div>
            <p>${answer.text}</p>
        `;

        list.appendChild(div);
    });
}


// All buttons and forms
function setupEventListeners() {

    // Navigation
    document.querySelectorAll(".nav-item").forEach(function(item) {
        item.addEventListener("click", function(event) {
            event.preventDefault();

            if (item.id === "navProfile") {
                showProfile(currentUser);
            } else if (item.id === "navLeaderboard") {
                switchView("leaderboard");
            } else if (item.id === "navResponses") {
                switchView("responses");
            } else {
                switchView("dashboard");
            }
        });
    });


    // Ask question buttons
    let openAsk = document.getElementById("btnOpenAskModal");
    let quickAsk = document.getElementById("btnQuickAsk");

    if (openAsk) openAsk.onclick = openAskModal;
    if (quickAsk) quickAsk.onclick = openAskModal;


    let closeAsk = document.getElementById("btnCloseAskModal");
    if (closeAsk) {
        closeAsk.onclick = function() {
            closeModal("askModal");
        };
    }


    // Close answer modal
    let closeAnswer = document.getElementById("btnCloseAnswerModal");
    if (closeAnswer) {
        closeAnswer.onclick = function() {
            closeModal("answerModal");
        };
    }


    // Ask question form
    let askForm = document.getElementById("askForm");

    if (askForm) {
        askForm.addEventListener("submit", function(event) {
            event.preventDefault();

            let title = document.getElementById("inputTitle").value.trim();
            let subject = document.getElementById("inputSubject").value.trim().toUpperCase();

            if (!title || !subject) return;

            let newQuestion = {
                id: "q_" + Date.now(),
                authorId: currentUser.id,
                authorName: currentUser.name,
                title: title,
                subject: subject,
                timestamp: Date.now(),
                views: 0,
                answers: []
            };

            questions.push(newQuestion);
            saveQuestions(questions);

            askForm.reset();
            closeModal("askModal");
            refreshUI();
        });
    }


    // Answer form
    let answerForm = document.getElementById("answerForm");

    if (answerForm) {
        answerForm.addEventListener("submit", function(event) {
            event.preventDefault();

            let text = document.getElementById("inputAnswerText").value.trim();
            if (!text || !activeQuestionId) return;

            let question = questions.find(function(q) {
                return q.id === activeQuestionId;
            });

            if (!question) return;

            // Don't answer your own question
            if (question.authorId === currentUser.id) {
                alert("You cannot answer your own question.");
                return;
            }

            let answer = {
                id: "a_" + Date.now(),
                authorId: currentUser.id,
                authorName: currentUser.name,
                text: text,
                timestamp: Date.now(),
                votes: 0
            };

            if (!question.answers) {
                question.answers = [];
            }

            question.answers.push(answer);

            // Give helper +10 reputation
            currentUser.repScore = (currentUser.repScore || 0) + 10;

            let users = getUsers();
            let userIndex = users.findIndex(function(user) {
                return user.id === currentUser.id;
            });

            if (userIndex !== -1) {
                users[userIndex] = currentUser;
                saveUsers(users);
            }

            saveQuestions(questions);

            answerForm.reset();
            showAnswers(question);
            updateUserHeader(currentUser);
            refreshUI();
        });
    }


    // Hide/show My Doubts
    let toggleDoubts = document.getElementById("btnToggleDoubts");

    if (toggleDoubts) {
        toggleDoubts.onclick = function() {
            let sidebar = document.getElementById("rightSidebar");
            let sub = document.getElementById("myDoubtsSub");
            let list = document.getElementById("myDoubtsList");

            if (!sidebar) return;

            if (list.style.display === "none") {
                list.style.display = "block";
                if (sub) sub.style.display = "block";
                toggleDoubts.innerText = "👁️";
            } else {
                list.style.display = "none";
                if (sub) sub.style.display = "none";
                toggleDoubts.innerText = "👁️‍🗨️";
            }
        };
    }


    // Edit bio
    let editBio = document.getElementById("btnEditBio");
    if (editBio) {
        editBio.onclick = function() {
            toggleBioEdit(true);
        };
    }

    let saveBioButton = document.getElementById("btnSaveBio");
    if (saveBioButton) {
        saveBioButton.onclick = saveBio;
    }

    let cancelBioButton = document.getElementById("btnCancelBio");
    if (cancelBioButton) {
        cancelBioButton.onclick = function() {
            toggleBioEdit(false);
        };
    }

    let backButton = document.getElementById("btnBackDashboard");
    if (backButton) {
        backButton.onclick = function() {
            switchView("dashboard");
        };
    }

    let logoutButton = document.getElementById("btnLogout");
    if (logoutButton) {
        logoutButton.onclick = function(event) {
            event.preventDefault();
            window.handleLogout();
        };
    }


    // Profile card click
    let profileButton = document.querySelector(".user-profile");
    if (profileButton) {
        profileButton.onclick = function() {
            showProfile(currentUser);
        };
    }
}


function openAskModal() {
    let modal = document.getElementById("askModal");
    if (modal) modal.classList.add("active");
}


function closeModal(id) {
    let modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}


// Profile page
function showProfile(user) {
    switchView("profile");

    let questionsAsked = questions.filter(function(q) {
        return q.authorId === user.id;
    });

    let answersGiven = 0;
    let upvotes = 0;
    let topTags = {};

    questions.forEach(function(q) {
        (q.answers || []).forEach(function(answer) {
            if (answer.authorId === user.id) {
                answersGiven++;
                upvotes += answer.votes || 0;

                if (!topTags[q.subject]) {
                    topTags[q.subject] = 0;
                }

                topTags[q.subject]++;
            }
        });
    });

    let name = document.getElementById("profileName");
    let avatar = document.getElementById("profileAvatarIcon");
    let member = document.getElementById("profileMemberSince");
    let lastSeen = document.getElementById("profileLastSeen");
    let bio = document.getElementById("profileBioDisplay");

    if (name) name.innerText = user.name;
    if (avatar) avatar.innerText = user.avatar || "🎓";
    if (member) member.innerText = user.memberSince || "Recently";
    if (lastSeen) lastSeen.innerText = user.lastSeen || "just now";
    if (bio) bio.innerText = user.bio || "No bio added yet.";

    document.getElementById("profileRepDisplay").innerText = user.repScore || 0;
    document.getElementById("profileAnswersCount").innerText = answersGiven;
    document.getElementById("profileQuestionsCount").innerText = questionsAsked.length;
    document.getElementById("profileUpvotesReceived").innerText = upvotes;

    let tags = document.getElementById("topTagsContainer");

    if (tags) {
        tags.innerHTML = "";

        Object.keys(topTags).forEach(function(subject) {
            let div = document.createElement("div");
            div.innerText = subject + " (" + topTags[subject] + " answers)";
            tags.appendChild(div);
        });

        if (Object.keys(topTags).length === 0) {
            tags.innerText = "No answers yet.";
        }
    }
}


function toggleBioEdit(show) {
    let form = document.getElementById("bioEditForm");
    let input = document.getElementById("inputBio");

    if (!form) return;

    if (show) {
        form.style.display = "block";
        if (input) input.value = currentUser.bio || "";
    } else {
        form.style.display = "none";
    }
}


function saveBio() {
    let input = document.getElementById("inputBio");
    if (!input) return;

    currentUser.bio = input.value.trim();

    let users = getUsers();

    let index = users.findIndex(function(user) {
        return user.id === currentUser.id;
    });

    if (index !== -1) {
        users[index] = currentUser;
        saveUsers(users);
    }

    toggleBioEdit(false);
    showProfile(currentUser);
}


// Online status
function startOnlineStatus() {
    updateMyLastSeen();

    setInterval(function() {
        updateMyLastSeen();
    }, 30000);
}

function updateMyLastSeen() {
    let users = getUsers();

    let index = users.findIndex(function(user) {
        return user.id === currentUser.id;
    });

    if (index !== -1) {
        users[index].lastSeenTime = Date.now();
        users[index].lastSeen = "just now";

        saveUsers(users);
        currentUser = users[index];
    }

    updateOnlineCount();
}

function updateOnlineCount() {
    let users = getUsers();
    let online = 0;
    let now = Date.now();

    users.forEach(function(user) {
        if (user.lastSeenTime && now - user.lastSeenTime < 60000) {
            online++;
        }
    });

    // If using old users without lastSeenTime, show at least current user
    if (online === 0 && currentUser) {
        online = 1;
    }

    let display = document.getElementById("onlineCountDisplay");
    if (display) display.innerText = online;
}


// Logout
window.handleLogout = function() {
    localStorage.removeItem("Stud-nt_session");
    window.location.href = "../Auth/logsig.html";
};

// These are needed by the existing HTML buttons
window.switchView = switchView;
window.toggleBioEdit = toggleBioEdit;
window.saveBio = saveBio;
window.viewUserProfile = function() {
    showProfile(currentUser);
};


init();
