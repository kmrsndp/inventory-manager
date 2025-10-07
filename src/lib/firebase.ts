// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuY57SIhWS3wQ6f1mQkKy4d-kxOMKx3EU",
  authDomain: "inventory-manager-bff34.firebaseapp.com",
  projectId: "inventory-manager-bff34",
  storageBucket: "inventory-manager-bff34.firebasestorage.app",
  messagingSenderId: "555434488623",
  appId: "1:555434488623:web:6bc63b3c657cd04c40e7da",
  measurementId: "G-SFP02MSQQB"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
