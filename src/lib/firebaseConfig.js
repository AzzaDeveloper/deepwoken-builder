// Import the functions you need from the SDKs you need



// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { env } from '$env/dynamic/public';

export let firebaseConfig = {

  apiKey: env.PUBLIC_FIREBASE_API_KEY,

  authDomain: "deepwoken-builder.firebaseapp.com",

  projectId: "deepwoken-builder",

  storageBucket: "deepwoken-builder.appspot.com",

  messagingSenderId: "569027661918",

  appId: "1:569027661918:web:ebf0284bb012342d4564cf",

  measurementId: "G-QEZHDC7L5H"

};