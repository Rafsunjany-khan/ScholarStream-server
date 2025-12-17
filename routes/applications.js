const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Save a new application
router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  try {
    const {
      scholarshipId,
      userId,
      userName,
      userEmail,
      universityName,
      scholarshipCategory,
      degree,
      applicationFees,
      serviceCharge,
      paymentStatus = "unpaid",
    } = req.body;

    // Check if the user already applied for this scholarship
    const existingApp = await applications.findOne({
      scholarshipId: new ObjectId(scholarshipId),
      userId,
    });

    if (existingApp) {
      if (paymentStatus === "paid" && existingApp.paymentStatus === "unpaid") {
        await applications.updateOne(
          { _id: existingApp._id },
          {
            $set: {
              paymentStatus: "paid",
              applicationDate: new Date().toISOString().split("T")[0],
            },
          }
        );
        const updatedApp = await applications.findOne({ _id: existingApp._id });
        return res.status(200).json({
          message: "Payment updated successfully",
          application: updatedApp,
        });
      }

      return res.status(400).json({
        message: "You have already applied for this scholarship",
        application: existingApp,
      });
    }

    const newApplication = {
      scholarshipId: new ObjectId(scholarshipId),
      userId,
      userName,
      userEmail,
      universityName,
      scholarshipCategory,
      degree,
      applicationFees,
      serviceCharge,
      applicationStatus: "pending",
      paymentStatus,
      applicationDate: new Date().toISOString().split("T")[0],
      feedback: "",
    };

    const result = await applications.insertOne(newApplication);
    const insertedApplication = await applications.findOne({ _id: result.insertedId });

    res.status(201).json({
      message: "Application saved successfully",
      application: insertedApplication,
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

// Edit application
router.put("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");
  const applicationId = req.params.id;

  try {
    const existingApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    if (!existingApp) {
      return res.status(404).json({ message: "Application not found" });
    }

    const updatedFields = {};

    if (existingApp.applicationStatus === "pending") {
      if (req.body.degree) updatedFields.degree = req.body.degree;
      if (req.body.scholarshipCategory) updatedFields.scholarshipCategory = req.body.scholarshipCategory;
    }

    if (req.body.paymentStatus) {
      const allowedPaymentStatus = ["unpaid", "paid"];
      if (!allowedPaymentStatus.includes(req.body.paymentStatus)) {
        return res.status(400).json({ message: "Invalid paymentStatus value" });
      }
      updatedFields.paymentStatus = req.body.paymentStatus;

      if (req.body.paymentStatus === "paid") {
        updatedFields.applicationDate = new Date().toISOString().split("T")[0];
      }
    }

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await applications.updateOne(
      { _id: new ObjectId(applicationId) },
      { $set: updatedFields }
    );

    const updatedApp = await applications.findOne({ _id: new ObjectId(applicationId) });
    res.json({ message: "Application updated successfully", application: updatedApp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update application" });
  }
});

// Delete an application
router.delete("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");
  const applicationId = req.params.id;

  try {
    const existingApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    if (!existingApp) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (existingApp.applicationStatus !== "pending") {
      return res.status(403).json({ message: "Cannot delete an application that is not pending" });
    }

    await applications.deleteOne({ _id: new ObjectId(applicationId) });
    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete application" });
  }
});

// Get all applications (for moderators)
router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  try {
    const data = await applications
      .aggregate([
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

// Feedback
router.patch("/:id/feedback", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  const { id } = req.params;
  const { feedback } = req.body;

  try {
    await applications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { feedback } }
    );

    res.json({ message: "Feedback updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update feedback" });
  }
});

// Update and rejection application status
router.patch("/:id/status", async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");

  const { id } = req.params;
  const { status } = req.body;

  const allowedStatus = ["processing", "completed", "rejected"];

  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    await applications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { applicationStatus: status } }
    );

    res.json({ message: `Application status updated to ${status} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update application status" });
  }
});

module.exports = router;
