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

// Get all unique scholarship categories
router.get("/categories", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const categories = await scholarships.aggregate([
      { $group: { _id: "$scholarshipCategory" } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const categoryList = categories.map(c => c._id);

    res.status(200).json({
      message: "Unique scholarship categories fetched successfully",
      data: categoryList,
    });
  } catch (error) {
    console.error("Error fetching scholarship categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Get all uniques countries
router.get("/countries", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const scholarships = db.collection("scholarships");

    const countries = await scholarships.aggregate([
      { $group: { _id: "$universityCountry" } },
      { $sort: { _id: 1 } }
    ]).toArray();

    const countryList = countries.map(c => c._id);

    res.status(200).json({
      message: "Unique countries fetched successfully",
      data: countryList,
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
