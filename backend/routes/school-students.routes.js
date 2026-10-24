const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/role");
const {
  assignSubscriptionToUsers,
  changePasswordForStudent,
  getSchools,
  getImportHistory,
  getImportHistoryDetails,
  importOfflineReceiptUsers,
  importSrReceiptUsers,
  importSchoolStudents,
  getSubscriptionPlans,
} = require("../controllers/schoolStudents.controller");

const router = express.Router();
router.post("/review-assign", verifyToken, requireRole("accountant"), async (req, res) => {
  try {
    const { approveStudents } = require("../services/studentReview.service");
    res.json(await approveStudents({ ...req.body, reviewer: req.user }));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : "Assignment could not be confirmed. Refresh and verify the students before retrying." });
  }
});
const { validateSrReceiptSheet } = require("../services/schoolStudentsBulkImport.service");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (
      allowedMimeTypes.includes(file.mimetype) ||
      /\.(xlsx|xls|csv)$/i.test(file.originalname)
    ) {
      cb(null, true);
      return;
    }

    cb(new Error("Only .xlsx, .xls, and .csv files are allowed"));
  },
});

const uploadImportFile = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "form-data", maxCount: 1 },
]);

const normalizeUploadedFile = (req, res, next) => {
  req.file =
    req.file ||
    req.files?.file?.[0] ||
    req.files?.["form-data"]?.[0] ||
    null;

  next();
};

// Data-entry validation uses its own authenticated, audited endpoint.
router.post("/validate-sr-receipts", verifyToken, requireRole("accountant"), (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) return res.status(400).json({ message: uploadError.message });
    if (!req.file?.buffer) return res.status(400).json({ message: "Please upload a sheet." });
    try {
      return res.json(await validateSrReceiptSheet(req.file.buffer));
    } catch (error) {
      console.error("SR sheet validation failed:", error.message);
      return res.status(400).json({ message: "Unable to validate this file. Check that it is a readable Excel/CSV file with 1–5,000 student rows on the first sheet, then try again." });
    }
  });
});

router.get("/schools", verifyToken, getSchools);

router.get(
  "/import-history",
  verifyToken,
  requireRole("accountant"),
  getImportHistory
);

router.get(
  "/import-history/:importId",
  verifyToken,
  requireRole("accountant"),
  getImportHistoryDetails
);

router.post(
  "/import",
  verifyToken,
  requireRole("accountant"),
  uploadImportFile,
  normalizeUploadedFile,
  importSchoolStudents
);

router.post(
  "/import-offline-receipts",
  verifyToken,
  requireRole("accountant"),
  uploadImportFile,
  normalizeUploadedFile,
  importOfflineReceiptUsers
);

router.post(
  "/import-sr-receipts",
  verifyToken,
  requireRole("accountant"),
  uploadImportFile,
  normalizeUploadedFile,
  importSrReceiptUsers
);

router.post(
  "/subscriptions",
  verifyToken,
  requireRole("accountant"),
  getSubscriptionPlans
);

router.post(
  "/assign-subscription",
  verifyToken,
  requireRole("accountant"),
  assignSubscriptionToUsers
);

router.post(
  "/change-password",
  verifyToken,
  requireRole("accountant"),
  changePasswordForStudent
);

module.exports = router;
