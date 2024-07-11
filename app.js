const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const https = require('https');

// Initialize Firebase Admin SDK
const serviceAccount = require('./key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Save user data to Firestore
    await db.collection('users').doc(email).set({
      email,
      password
    });
    res.redirect('/signin');
  } catch (error) {
    res.render('signup', { error: 'Error creating user: ' + error.message });
  }
});

app.get('/signin', (req, res) => {
  res.render('signin', { error: null });
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) {
      throw new Error('User does not exist');
    }

    const user = userDoc.data();
    if (user.password !== password) {
      throw new Error('Invalid password');
    }

    res.redirect('/');
  } catch (error) {
    res.render('signin', { error: 'Error signing in: ' + error.message });
  }
});

app.get('/dictionary', (req, res) => {
  const { word } = req.query;
  if (!word) {
    return res.render('index', { definition: null });
  }
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  
  https.get(url, (response) => {
    let data = '';
    
    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        const definition = parsedData[0].meanings[0].definitions[0].definition;
        res.render('index', { definition });
      } catch (error) {
        res.render('index', { definition: 'Word not found' });
      }
    });
  }).on('error', (error) => {
    res.render('index', { definition: 'Word not found' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
