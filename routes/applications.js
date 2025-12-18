const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

// Save a new application
router.post("/", verifyToken, async (req, res) => {
  if (req.user.role !== "Student") {
    return res.status(403).json({ message: "Only students can apply" });
  }

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

    if (!scholarshipId || !userId || !userEmail) {
      return res.status(400).json({ message: "Required fields missing" });
    }

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
              applicationDate: new Date(),
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
      applicationDate: new Date(),
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

// Get all applications for a user
router.get("/user/:email", verifyToken, async (req, res) => {
  if (req.user.email !== req.params.email && !["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

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
router.put("/:id", verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");
  const applicationId = req.params.id;

  if (!ObjectId.isValid(applicationId)) {
    return res.status(400).json({ message: "Invalid application ID" });
  }

  try {
    const existingApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    if (!existingApp) return res.status(404).json({ message: "Application not found" });

    if (existingApp.userId !== req.user.uid && !["Admin", "Moderator"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
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
        updatedFields.applicationDate = new Date();
      }
    }

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await applications.updateOne({ _id: new ObjectId(applicationId) }, { $set: updatedFields });

    const updatedApp = await applications.findOne({ _id: new ObjectId(applicationId) });
    res.json({ message: "Application updated successfully", application: updatedApp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update application" });
  }
});

// Delete an application
router.delete("/:id", verifyToken, async (req, res) => {
  const db = req.app.locals.db;
  const applications = db.collection("applications");
  const applicationId = req.params.id;

  if (!ObjectId.isValid(applicationId)) {
    return res.status(400).json({ message: "Invalid application ID" });
  }

  try {
    const existingApp = await applications.findOne({ _id: new ObjectId(applicationId) });

    if (!existingApp) return res.status(404).json({ message: "Application not found" });

    if (existingApp.applicationStatus !== "pending") {
      return res.status(403).json({ message: "Cannot delete an application that is not pending" });
    }

    if (existingApp.userId !== req.user.uid && !["Admin", "Moderator"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await applications.deleteOne({ _id: new ObjectId(applicationId) });
    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete application" });
  }
});

// Get all applications
router.get("/", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

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

// Feedback update
router.patch("/:id/feedback", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const db = req.app.locals.db;
  const applications = db.collection("applications");

  const { id } = req.params;
  const { feedback } = req.body;

  if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid application ID" });

  try {
    await applications.updateOne({ _id: new ObjectId(id) }, { $set: { feedback } });
    res.json({ message: "Feedback updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update feedback" });
  }
});

// Update application status
router.patch("/:id/status", verifyToken, async (req, res) => {
  if (!["Admin", "Moderator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const db = req.app.locals.db;
  const applications = db.collection("applications");

  const { id } = req.params;
  const { status } = req.body;

  if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid application ID" });

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
