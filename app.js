require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const axios = require("axios");

const User = require("./User");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Register (Sign Up)
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "Account created successfully!" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Error signing up", error: error.message });
  }
});

// *LOGIN ROUTE*
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
 
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
});

// ✅ Define Stream Schema & Model
const StreamSchema = new mongoose.Schema({
    song_id: { type: String, required: true, unique: true },
    streams: { type: Number, default: 1 },
});

const Stream = mongoose.model('Stream', StreamSchema);

// ✅ API Route: Update Stream Count
app.post('/api/update-stream', async (req, res) => {
    const { song_id } = req.body;

    try {
        let stream = await Stream.findOne({ song_id });

        if (stream) {
            stream.streams += 1;  // Increase stream count
            await stream.save();
        } else {
            stream = await Stream.create({ song_id, streams: 1 });
        }

        res.json({ success: true, message: 'Stream updated', stream });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ API Route: Fetch All Streams
app.get('/api/get-streams', async (req, res) => {
    try {
        const streams = await Stream.find();
        res.json({ success: true, streams });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});



// Music API
// const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
// const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URL; // Change to your backend's actual IP

// app.post("/api/spotify-token", async (req, res) => {
//   const { code, codeVerifier } = req.body; // Receive code & codeVerifier from frontend
//   const redirectUri = "exp://192.168.43.157:8081/--/SpotifyLoginScreen/callback";

//   const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

//   try {
//     const response = await fetch("https://accounts.spotify.com/api/token", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: new URLSearchParams({
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: redirectUri,
//         client_id: process.env.SPOTIFY_CLIENT_ID,
//         code_verifier: codeVerifier, // ✅ Required for PKCE
//       }),
//     });

//     const data = await response.json();
//     console.log("Spotify Token Response:", data);

//     if (data.access_token) {
//       res.json(data);
//     } else {
//       res.status(400).json({ error: "Token exchange failed", details: data });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error", details: error.message });
//   }
// });

// Saving access Token? Sending to Html

let spotifyToken = null; // Temporary in-memory storage (use a database for real apps)

app.post("/store-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is missing!" });

  spotifyToken = token;
  console.log("✅ Spotify Token Stored:", spotifyToken);
  res.json({ message: "Token saved successfully!" });
});

app.get("/get-token", (req, res) => {
  if (!spotifyToken) return res.status(404).json({ error: "No token stored!" });

  res.json({ token: spotifyToken });
});



// const musicRoutes = require('./routes/musicRoutes');
// app.use('/api/music', musicRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
