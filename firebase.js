// ============================================
// YogaBinds — Firebase Configuration
// ============================================
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or select existing one)
// 3. Go to Project Settings > General > Your apps > Add web app
// 4. Copy the firebaseConfig values below
// 5. Enable Firestore Database in the Firebase console
//    (Build > Firestore Database > Create database > Start in test mode)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// ---- YOUR FIREBASE CONFIG ----
// Replace the placeholder values below with your actual Firebase credentials.
// Never commit real API keys to a public repository.
const firebaseConfig = {
  apiKey: "AIzaSyBdkU-JwarkIAHvsJrpiT8-fyUa2flqWnE",
  authDomain: "yogabinds-faa6f.firebaseapp.com",
  projectId: "yogabinds-faa6f",
  storageBucket: "yogabinds-faa6f.firebasestorage.app",
  messagingSenderId: "149493449941",
  appId: "1:149493449941:web:0a3a8614c73c2bfc71ce5c",
  measurementId: "G-2PXFN0XL1R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// ---- Save Feedback ----
export async function saveFeedback(name, email, message) {
  try {
    await addDoc(collection(db, "feedback"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving feedback:", error);
    return false;
  }
}

// ---- Save Booking ----
export async function saveBooking(bookingData) {
  try {
    await addDoc(collection(db, "bookings"), {
      ...bookingData,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving booking:", error);
    return false;
  }
}

// ---- Save Contact Message ----
export async function saveContact(name, email, message) {
  try {
    await addDoc(collection(db, "contacts"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving contact:", error);
    return false;
  }
}

// ---- Fetch Bookings ----
export async function getBookings() {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
}

// ---- Fetch Feedback ----
export async function getFeedback() {
  try {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
}

// ---- Fetch Contact Messages ----
export async function getContacts() {
  try {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
}
