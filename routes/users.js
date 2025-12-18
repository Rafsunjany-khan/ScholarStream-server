const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");

const JWT_SECRET = process.env.JWT_SECRET;

// Admin verification middleware
const verifyAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }

  next();
};

// Register user
router.post("/register", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid, name, email, photoURL } = req.body;
    if (!uid || !email) return res.status(400).json({ message: "UID and Email are required" });

    const existingUser = await users.findOne({ uid });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const newUser = { uid, name, email, photoURL, role: "Student", createdAt: new Date() };
    const result = await users.insertOne(newUser);

    res.status(201).json({ message: "User saved successfully", user: { ...newUser, _id: result.insertedId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login user and return JWT
router.post("/login", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid, email } = req.body;
    if (!uid && !email) return res.status(400).json({ message: "UID or Email required" });

    const user = uid ? await users.findOne({ uid }) : await users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { uid: user.uid, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ message: "User logged in successfully", user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");
    const allUsers = await users.find({}).toArray();
    res.status(200).json({ users: allUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user role
router.put("/update-role/:uid", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid } = req.params;
    const { role } = req.body;

    if (!["Student", "Moderator", "Admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });

    const result = await users.updateOne({ uid }, { $set: { role } });
    if (result.modifiedCount === 0) return res.status(404).json({ message: "User not found" });

    res.json({ message: `User role updated to ${role}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user
router.delete("/:uid", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid } = req.params;

    if (uid === req.user.uid) return res.status(400).json({ message: "Admin cannot delete self" });

    const result = await users.deleteOne({ uid });

    if (result.deletedCount === 0) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
