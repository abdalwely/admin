// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyD21vT0hBfAOwX0LuVYGOfg7FBPxVuaPbs",
  authDomain: "housingsa-ab542.firebaseapp.com",
  databaseURL: "https://housingsa-ab542-default-rtdb.firebaseio.com",
  projectId: "housingsa-ab542",
  storageBucket: "housingsa-ab542.appspot.com",
  messagingSenderId: "866511745374",
  appId: "1:866511745374:web:af20fb65816563e03e1fcf",
  measurementId: "G-LDBQ1STZ1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;