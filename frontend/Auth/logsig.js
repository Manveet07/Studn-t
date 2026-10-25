// Helper functions

function getUsers() {
    let users = localStorage.getItem("Stud-nt_users");

    if (users) {
        return JSON.parse(users);
    }

    return [];
}


function saveUsers(users) {
    localStorage.setItem("Stud-nt_users", JSON.stringify(users));
}


// Create a unique ID for every user
function generateUserId() {
    return "u_" + Date.now() + "_" +
        Math.random().toString(36).slice(2, 7);
}


// Show message on the screen
function showMessage(text, isError = true) {

    let box = document.getElementById("statusMessage");

    if (!box) {
        return;
    }

    box.textContent = text;

    if (isError) {
        box.className = "msg-box error";
    } else {
        box.className = "msg-box success";
    }

    box.style.display = "block";
}


// Hide message
function clearMessage() {

    let box = document.getElementById("statusMessage");

    if (!box) {
        return;
    }

    box.style.display = "none";
    box.textContent = "";
}


// Show selected form
function showForm(formId) {

    clearMessage();

    let forms = document.querySelectorAll(".auth-form");

    forms.forEach(function(form) {
        form.classList.remove("active");
    });

    let form = document.getElementById(formId);

    if (form) {
        form.classList.add("active");
    }
}



// ---------------- SIGNUP ----------------

let signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", function(event) {

        event.preventDefault();

        let name = document
            .getElementById("signup-name")
            .value
            .trim();

        let email = document
            .getElementById("signup-email")
            .value
            .trim()
            .toLowerCase();

        let password =
            document.getElementById("signup-pass").value;


        let users = getUsers();


        // Check if email already exists
        let existingUser = users.find(function(user) {
            return user.email === email;
        });


        if (existingUser) {
            showMessage(
                "An account with this email already exists."
            );
            return;
        }


        // Create new user
        let newUser = {

            id: generateUserId(),

            name: name,

            email: email,

            password: password,

            repScore: 0,

            bio: "",

            avatar: "🎓",

            memberSince: new Date().toLocaleDateString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            ),

            upvotesReceived: 0,

            lastSeenTime: 0,

            lastSeen: "never"
        };


        users.push(newUser);

        saveUsers(users);


        showMessage(
            "Account created successfully! Please log in.",
            false
        );


        signupForm.reset();

        showForm("loginForm");
    });
}



// ---------------- LOGIN ----------------

let loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function(event) {

        event.preventDefault();


        let email = document
            .getElementById("login-email")
            .value
            .trim()
            .toLowerCase();

        let password =
            document.getElementById("login-pass").value;


        let users = getUsers();


        // Find user with matching email and password
        let user = users.find(function(user) {

            return user.email === email &&
                   user.password === password;

        });


        if (!user) {

            showMessage("Invalid email or password.");

            return;
        }


        // Save logged-in user's ID
        localStorage.setItem(
            "Stud-nt_session",
            user.id
        );


        // Go to dashboard
        window.location.href =
            "../DashBoard/dashboard.html";
    });
}



// ---------------- RESET PASSWORD ----------------

let resetForm = document.getElementById("resetForm");

if (resetForm) {

    resetForm.addEventListener("submit", function(event) {

        event.preventDefault();


        let email = document
            .getElementById("reset-email")
            .value
            .trim()
            .toLowerCase();

        let newPassword =
            document.getElementById("reset-new-pass").value;


        let users = getUsers();


        // Find user by email
        let userIndex = users.findIndex(function(user) {

            return user.email === email;

        });


        if (userIndex === -1) {

            showMessage(
                "No account found with that email."
            );

            return;
        }


        // Change password
        users[userIndex].password = newPassword;

        saveUsers(users);


        showMessage(
            "Password updated! You can now log in with your new password.",
            false
        );


        resetForm.reset();

        showForm("loginForm");
    });
}



// ---------------- SESSION CHECK ----------------

function checkSession() {

    let sessionUserId =
        localStorage.getItem("Stud-nt_session");


    // No one is logged in
    if (!sessionUserId) {
        return;
    }


    let users = getUsers();


    let user = users.find(function(user) {

        return user.id === sessionUserId;

    });


    // Session exists but user doesn't
    if (!user) {

        localStorage.removeItem("Stud-nt_session");

        return;
    }


    // User is already logged in
    window.location.href =
        "../DashBoard/dashboard.html";
}



// ---------------- LOGOUT ----------------

function handleLogout() {

    localStorage.removeItem("Stud-nt_session");

    showForm("loginForm");

    showMessage(
        "You have logged out.",
        false
    );
}


// Make logout available to HTML
window.handleLogout = handleLogout;


// Check session when page loads
checkSession();