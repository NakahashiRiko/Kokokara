// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7VbNvqL_aSqqoVw6xeXUGK355uJmz6xk",
  authDomain: "kokokara-bda91.firebaseapp.com",
  projectId: "kokokara-bda91",
  storageBucket: "kokokara-bda91.firebasestorage.app",
  messagingSenderId: "1065741439149",
  appId: "1:1065741439149:web:6c846482ed1a25a4b73624",
  measurementId: "G-ZW1K3VHYHP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);