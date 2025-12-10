const express = require("express");
const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const allScholarships = await scholarships.find({}).toArray();

    res.status(200).json({
      message: "All scholarships fetched successfully",
      data: allScholarships,
    });
  } catch (error) {
    console.error("Error fetching scholarships:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
