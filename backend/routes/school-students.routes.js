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

// Public validation only: client options can never enable insertion or subscriptions.
router.post("/validate-sr-receipts", (req, res) => {
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
