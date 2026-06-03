import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwOHjjWJI4T7eDyiYRzyFXfjT-OJWFkRU",
  authDomain: "hostelos-01.firebaseapp.com",
  projectId: "hostelos-01",
  storageBucket: "hostelos-01.firebasestorage.app",
  messagingSenderId: "908126464614",
  appId: "1:908126464614:web:b9a1af5131c0f77d725ba7",
  measurementId: "G-76BJ0T02H5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
