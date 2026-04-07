import { auth } from "/static/firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ✅ CHANGE THIS TO YOUR BACKEND URL
const BASE_URL = "https://newrepo-md96.onrender.com";

// ROUTES
window.goSignup = () => window.location = "/signup";
window.goLogin = () => window.location = "/";

// EMAIL VALIDATION
function isValidEmail(email) {
  const regex = /^[a-z0-9]+([._%+-]?[a-z0-9]+)*@[a-z0-9-]+\.[a-z]{2,}$/;

  if (!regex.test(email)) return false;
  if (email.includes("..") || email.includes("@.")) return false;

  const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com"];
  return allowedDomains.includes(email.split("@")[1]);
}

// DEVICE
function getDevice() {
  if (
    navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  ) return "Mobile";

  return "Laptop";
}

// ✅ SAFE LOCATION (NO ERRORS)
async function getLocation() {
  return "India";
}

// ================= SIGNUP =================
window.signup = async () => {
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!isValidEmail(email)) {
    document.getElementById("msg").innerText = "Invalid email ❌";
    return;
  }

  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);

    const { db } = await import("/static/firebase.js");
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

// ================= LOGIN =================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let failedAttempts = parseInt(localStorage.getItem("failedAttempts")) || 0;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    localStorage.setItem("uid", userCred.user.uid);
    localStorage.setItem("email", userCred.user.email);

    const device = getDevice();
    const location = await getLocation();

    const now = new Date();
    const time = now.toLocaleTimeString();

    const { db } = await import("/static/firebase.js");
    const { doc, getDoc } = await import(
      "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
    );

    const ref = doc(db, "activity", userCred.user.uid);
    const snap = await getDoc(ref);

    let loginCount = 1;
    if (snap.exists()) {
      loginCount = (snap.data().loginCount || 0) + 1;
    }

    // ML CALL
    const response = await fetch(BASE_URL + "/predict", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        device,
        location,
        loginCount,
        failedAttempts,
        time
      })
    });

    const result = await response.json();

    if (result.prediction === 0) {

      await storeData(failedAttempts);
      localStorage.setItem("failedAttempts", 0);
      window.location = "/home";

    } else {
      // 🔐 OTP FLOW

      localStorage.setItem("finalFailedAttempts", failedAttempts);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem("otp", otp);
      localStorage.setItem("otpTime", Date.now());

      try {
        const res = await fetch(BASE_URL + "/send-otp", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            email: userCred.user.email,
            otp: otp
          })
        });

        if (!res.ok) {
          document.getElementById("msg").innerText = "OTP API not found ❌";
          return;
        }

        const data = await res.json();

        if (!data.success) {
          document.getElementById("msg").innerText = "Failed to send OTP ❌";
          return;
        }

      } catch (err) {
        console.error("OTP Error:", err);
        document.getElementById("msg").innerText = "Server error ❌";
        return;
      }

      window.location = "/otp";
    }

  } catch (error) {
    console.error("Login Error:", error);

    let msg = "Login failed ❌";

    if (error.code === "auth/user-not-found") {
      msg = "User not found ❌";
    } else if (error.code === "auth/wrong-password") {
      msg = "Wrong password ❌";
    } else if (error.code === "auth/invalid-email") {
      msg = "Invalid email ❌";
    }

    document.getElementById("msg").innerText = msg;
  }
};

// ================= STORE DATA =================
async function storeData(failedAttempts) {
  const { db } = await import("/static/firebase.js");
  const { doc, setDoc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"
  );

  const uid = localStorage.getItem("uid");
  const email = localStorage.getItem("email");

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString();

  const device = getDevice();
  const location = await getLocation();

  const ref = doc(db, "activity", uid);
  const snap = await getDoc(ref);

  let loginCount = 1;
  if (snap.exists()) {
    loginCount = (snap.data().loginCount || 0) + 1;
  }

  await setDoc(ref, {
    email,
    location,
    device,
    date,
    time,
    loginCount,
    failedAttempts
  });
}
