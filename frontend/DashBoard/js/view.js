import { formatElapsedTime } from "./nav.js";

export function renderTags(questions, selectedTag, onSelectTag) {
    let tagsList = document.getElementById("tagsList");
    if (!tagsList) return;

    let defaultSubjects = ["ALL", "DBMS", "DSA", "CN", "JAVA", "PYTHON", "WEB-DEV", "OS"];
    let questionSubjects = questions.map(function(q) {
        return q.subject;
    });

    let allSubjects = [...new Set([...defaultSubjects, ...questionSubjects])];

    tagsList.innerHTML = "";

    allSubjects.forEach(function(subject) {
        let button = document.createElement("button");
        button.className = "tag-pill";

        if (selectedTag === subject) {
            button.classList.add("active");
        }

        button.innerText = subject === "ALL" ? "🏷️ All Tags" : "# " + subject;

        button.onclick = function() {
            onSelectTag(subject);
        };

        tagsList.appendChild(button);
    });
}

export function renderQueue(questions, selectedTag, onViewQuestion) {
    let tbody = document.getElementById("queueTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let filtered = questions;

    if (selectedTag !== "ALL") {
        filtered = questions.filter(function(q) {
            return q.subject === selectedTag;
        });
    }

    filtered.forEach(function(q, index) {
        let row = document.createElement("tr");
        let status = "⏳ Unanswered";

        if (q.answers && q.answers.length > 0) {
            let lastAnswer = q.answers[q.answers.length - 1];
            status = "💬 Replied by " + lastAnswer.authorName;
        }

        row.innerHTML = `
            <td><b>#${index + 1}</b></td>
            <td>
                <div class="tbl-title">${q.title}</div>
                <div class="tbl-sub">
                    <span class="tag-pill">${q.subject}</span>
                    Asked by <b>${q.authorName}</b>
                </div>
            </td>
            <td><span class="score-badge">${getPriorityScore(q)}</span></td>
            <td>👀 ${q.views || 0}</td>
            <td>${status}</td>
            <td>
                <button class="btn-primary view-question-btn">
                    View / Answer
                </button>
            </td>
        `;

        row.querySelector(".view-question-btn").onclick = function() {
            onViewQuestion(q.id);
        };

        tbody.appendChild(row);
    });
}

function getPriorityScore(question) {
    let waitMinutes = Math.floor((Date.now() - question.timestamp) / 60000);
    return 50 + waitMinutes;
}

export function renderMyDoubts(questions, currentUser, onViewQuestion) {
    let container = document.getElementById("myDoubtsList");
    let count = document.getElementById("myDoubtsCount");

    if (!container || !currentUser) return;

    let myQuestions = questions.filter(function(q) {
        return q.authorId === currentUser.id;
    });

    if (count) count.innerText = myQuestions.length;

    container.innerHTML = "";

    if (myQuestions.length === 0) {
        container.innerHTML = "<p>You haven't posted any questions yet.</p>";
        return;
    }

    myQuestions.forEach(function(q) {
        let card = document.createElement("div");
        card.className = "my-doubt-card";

        let status = q.answers && q.answers.length > 0
            ? "✅ Answered"
            : "⏳ Open";

        card.innerHTML = `
            <div class="my-doubt-title">${q.title}</div>
            <div class="my-doubt-status">
                <span>${status}</span>
                <span>${formatElapsedTime(q.timestamp)}</span>
            </div>
        `;

        card.onclick = function() {
            onViewQuestion(q.id);
        };

        container.appendChild(card);
    });
}

export function renderLeaderboard(users) {
    let tbody = document.getElementById("leaderboardTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let sortedUsers = [...users].sort(function(a, b) {
        return (b.repScore || 0) - (a.repScore || 0);
    });

    sortedUsers.forEach(function(user, index) {
        let row = document.createElement("tr");

        row.innerHTML = `
            <td><b>#${index + 1}</b></td>
            <td>${user.avatar || "🎓"} ${user.name}</td>
            <td>🏆 ${user.repScore || 0}</td>
            <td>👍 ${user.upvotesReceived || 0}</td>
            <td>🟢 Active</td>
        `;

        tbody.appendChild(row);
    });
}

export function renderResponses(questions, currentUser, onViewQuestion) {
    let tbody = document.getElementById("responsesTableBody");
    if (!tbody || !currentUser) return;

    tbody.innerHTML = "";
    let number = 1;

    questions.forEach(function(q) {
        if (!q.answers) return;

        q.answers.forEach(function(answer) {
            if (answer.authorId === currentUser.id) {
                let row = document.createElement("tr");

                row.innerHTML = `
                    <td>${number}</td>
                    <td>
                        <div class="tbl-title">${q.title}</div>
                        <div class="tbl-sub">${q.subject}</div>
                    </td>
                    <td>${answer.text}</td>
                    <td>👍 ${answer.votes || 0}</td>
                    <td>
                        <button class="btn-primary view-response-btn">
                            View
                        </button>
                    </td>
                `;

                row.querySelector(".view-response-btn").onclick = function() {
                    onViewQuestion(q.id);
                };

                tbody.appendChild(row);
                number++;
            }
        });
    });
}
