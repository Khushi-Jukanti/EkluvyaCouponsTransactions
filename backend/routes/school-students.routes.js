const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/auth");
const requireRole = require("../middleware/role");
const {
  assignSubscriptionToUsers,
  getImportHistory,
  getImportHistoryDetails,
  importOfflineReceiptUsers,
  importSchoolStudents,
  getSubscriptionPlans,
} = require("../controllers/schoolStudents.controller");

const router = express.Router();
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

module.exports = router;
