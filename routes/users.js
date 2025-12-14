const express = require("express");
const router = express.Router();

// Admin verification middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");
    const { adminUid } = req.body;

    if (!adminUid) return res.status(401).json({ message: "Admin UID required" });

    const adminUser = await users.findOne({ uid: adminUid });
    if (!adminUser || adminUser.role !== "Admin") return res.status(403).json({ message: "Access denied. Admin only." });

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
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

// Login user
router.post("/login", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid, email } = req.body;
    if (!uid && !email) return res.status(400).json({ message: "UID or Email required" });

    const user = uid ? await users.findOne({ uid }) : await users.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User fetched successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/", async (req, res) => {
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
router.put("/update-role/:uid", verifyAdmin, async (req, res) => {
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
router.delete("/:uid", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const users = db.collection("users");

    const { uid } = req.params;
    const { adminUid } = req.query;

    if (!adminUid) {
      return res.status(401).json({ message: "Admin UID required" });
    }

    const adminUser = await users.findOne({ uid: adminUid });
    if (!adminUser || adminUser.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Prevent admin deleting himself
    if (uid === adminUid) {
      return res.status(400).json({ message: "Admin cannot delete self" });
    }

    const result = await users.deleteOne({ uid });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
