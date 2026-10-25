// Get all users
export function getUsers() {
    let users = localStorage.getItem("Stud-nt_users");
    return users ? JSON.parse(users) : [];
}

// Save users
export function saveUsers(users) {
    localStorage.setItem("Stud-nt_users", JSON.stringify(users));
}

// Get questions
export function getStoredQuestions() {
    let questions = localStorage.getItem("Stud-nt_questions");

    if (questions) {
        return JSON.parse(questions);
    }

    let defaultQuestions = [
        {
            id: "q101",
            authorId: "u_other1",
            authorName: "Ananya Verma",
            title: "Does Prof. Sharma give partial marks in DBMS internals?",
            subject: "DBMS",
            timestamp: Date.now() - 3 * 60 * 60 * 1000,
            views: 18,
            answers: [
                {
                    id: "a100",
                    authorId: "u_alex",
                    authorName: "Alex Rivers",
                    text: "Yes, partial marks are given if the steps are clearly explained.",
                    timestamp: Date.now() - 60 * 60 * 1000,
                    votes: 4
                }
            ]
        },
        {
            id: "q102",
            authorId: "u_alex",
            authorName: "Alex Rivers",
            title: "How does B+ Tree node splitting work?",
            subject: "DBMS",
            timestamp: Date.now() - 180 * 1000,
            views: 12,
            answers: [
                {
                    id: "a1",
                    authorId: "u_rohan",
                    authorName: "Rohan Mehta",
                    text: "When a node becomes full, it is split into two nodes.",
                    timestamp: Date.now() - 60 * 1000,
                    votes: 3
                }
            ]
        }
    ];

    saveQuestions(defaultQuestions);
    return defaultQuestions;
}

export function saveQuestions(questions) {
    localStorage.setItem("Stud-nt_questions", JSON.stringify(questions));
}

// Get logged in user
export function getSessionUser() {
    let userId = localStorage.getItem("Stud-nt_session");

    if (!userId) {
        window.location.href = "../Auth/logsig.html";
        return null;
    }

    let users = getUsers();
    let user = users.find(function(u) {
        return u.id === userId;
    });

    if (user) {
        return user;
    }

    localStorage.removeItem("Stud-nt_session");
    window.location.href = "../Auth/logsig.html";
    return null;
}
