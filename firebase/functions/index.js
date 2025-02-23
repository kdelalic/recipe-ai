const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.scheduledDeletion = onSchedule("every 24 hours", async (event) => {
  // Define a threshold for 30 days ago
  const threshold = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  try {
    // Query for archived recipes older than 30 days
    const archivedRecipesQuery = db.collection("recipes")
        .where("archived", "==", true)
        .where("archivedAt", "<", threshold);

    const snapshot = await archivedRecipesQuery.get();
    if (snapshot.empty) {
      console.log("No archived recipes to delete.");
      return;
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("Deleted archived recipes older than 30 days");
  } catch (err) {
    console.error("Error deleting archived recipes:", err);
  }
});
