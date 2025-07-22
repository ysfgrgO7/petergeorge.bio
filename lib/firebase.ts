import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCd7s5hEmcJPU_6B0nUAcBgEUO0BnbkjFU",
  authDomain: "master-biology.firebaseapp.com",
  projectId: "master-biology",
  storageBucket: "master-biology.firebasestorage.app",
  messagingSenderId: "191148972070",
  appId: "1:191148972070:web:400fcacb1d1335a731eee7",
  measurementId: "G-XG45EP0R5F",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
