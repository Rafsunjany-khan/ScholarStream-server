const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Save a new application
router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  try {
    const newApplication = {
      scholarshipId: new ObjectId(req.body.scholarshipId),
      userId: req.body.userId,
      userName: req.body.userName,
      userEmail: req.body.userEmail,
      universityName: req.body.universityName,
      scholarshipCategory: req.body.scholarshipCategory,
      degree: req.body.degree,
      applicationFees: req.body.applicationFees,
      serviceCharge: req.body.serviceCharge,
      applicationStatus: "pending",
      paymentStatus: "unpaid",
      applicationDate: new Date().toISOString().split("T")[0],
      feedback: "",
    };

    const result = await applications.insertOne(newApplication);

    res.status(201).json({
      message: "Application saved successfully",
      application: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save application" });
  }
});

// Get all applications
router.get("/user/:email", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  try {
    const data = await applications
      .aggregate([
        { $match: { userEmail: req.params.email } },
        {
          $lookup: {
            from: "scholarships",
            localField: "scholarshipId",
            foreignField: "_id",
            as: "scholarshipDetails",
          },
        },
        { $unwind: { path: "$scholarshipDetails", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

module.exports = router;
