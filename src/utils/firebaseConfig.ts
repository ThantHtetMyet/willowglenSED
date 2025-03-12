import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
//import firebase from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBk-b_AZYf1lS7lk5--39Vnos3qYygYjg",
  authDomain: "willowsed-7f0f6.firebaseapp.com",
  projectId: "willowsed-7f0f6",
  storageBucket: "willowsed-7f0f6.firebasestorage.app",
  messagingSenderId: "7198894104",
  appId: "1:7198894104:web:15e64ba44b6bff9c87fb6d",
  measurementId: "G-MGXFRD2CFD"
};

export const initializeFirebase = () => {
    initializeApp(firebaseConfig);
};