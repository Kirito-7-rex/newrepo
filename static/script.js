import { auth, db } from "/static/firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ROUTES (FIXED FOR FLASK)
window.goSignup = () => window.location = "/signup";
window.goLogin = () => window.location = "/";

// EMAIL VALIDATION
function isValidEmail(email) {
  const regex = /^[a-z0-9]+([._%+-]?[a-z0-9]+)*@[a-z0-9-]+\.[a-z]{2,}$/;

  if (!regex.test(email)) return false;
  if (email.includes("..")) return false;
  if (email.includes("@.")) return false;

  const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com"];
  const domain = email.split("@")[1];

  return allowedDomains.includes(domain);
}

// ================= SIGNUP =================
window.signup = async () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!isValidEmail(email)) {
    document.getElementById("msg").innerText =
      "Invalid email ❌ (example : user@gmail.com)";
    return;
  }

  if (password.length < 6) {
    document.getElementById("msg").innerText =
      "Password must be at least 6 characters ❌";
    return;
  }

  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", user.user.uid), {
      username,
      email
    });

    alert("Account created successfully!");
    window.location = "/";

  } catch (e) {
    document.getElementById("msg").innerText = e.message;
  }
};

// ================= LOGIN WITH ML =================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!isValidEmail(email)) {
    document.getElementById("msg").innerText = "Invalid email ❌";
    return;
  }

  let failedAttempts = parseInt(localStorage.getItem("failedAttempts")) || 0;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    // SAVE USER
    localStorage.setItem("uid", user.uid);
    localStorage.setItem("email", user.email);

    localStorage.setItem("finalFailedAttempts", failedAttempts);
    localStorage.setItem("failedAttempts", 0);

    // ================= ML DATA =================
    let device = /Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobile" : "Laptop";

    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    const time = `${hours}:${minutes} ${ampm}`;

    // LOCATION
    let location = "India";
    try {
      const res = await fetch("https://ipwho.is/");
      const data = await res.json();
      if (data.success) location = data.country;
    } catch {}

    const loginCount = 1;

    // ================= CALL ML API =================
    const response = await fetch("/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device,
        location,
        loginCount,
        failedAttempts,
        time
      })
    });

    const result = await response.json();

    // ================= DECISION =================
    if (result.prediction === 0) {
      // SAFE → DIRECT LOGIN
      window.location = "/home";
    } else {
      // RISK → OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      localStorage.setItem("otp", otp);
      localStorage.setItem("otpTime", Date.now().toString());

      alert("OTP: " + otp);

      window.location = "/otp";
    }

  } catch (e) {
    failedAttempts++;
    localStorage.setItem("failedAttempts", failedAttempts);

    if (e.code === "auth/user-not-found") {
      document.getElementById("msg").innerText = "Invalid account ❌";
    } else if (e.code === "auth/wrong-password") {
      document.getElementById("msg").innerText =
        "Invalid password ❌ (" + failedAttempts + " attempts)";
    } else {
      document.getElementById("msg").innerText = "Login failed ❌";
    }
  }
};
