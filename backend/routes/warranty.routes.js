import express from 'express';
import multer from 'multer';
import {
  createWarrantyClaim,
  getClaimStatusByClaimId,
  getMyClaims,
  getAllClaimsAdmin,
  getClaimByIdAdmin,
  updateClaimStatusAdmin,
  updateInternalNoteAdmin,
} from '../controllers/warranty.controllers.js'; // adjust path to match your project structure

const router = express.Router();

// Same in-memory storage pattern your product route already uses,
// so req.files arrives as an array of { fieldname, buffer, mimetype, originalname }
const upload = multer({ storage: multer.memoryStorage() });

const warrantyUploadFields = upload.fields([
  { name: 'invoice', maxCount: 1 },
  { name: 'warrantyCard', maxCount: 1 },
  { name: 'productImages', maxCount: 5 },
  { name: 'productVideo', maxCount: 1 },
]);

// multer's .fields() gives req.files as an OBJECT keyed by fieldname, not
// an array. The controller above expects an array (like addProduct does),
// so this tiny adapter flattens it — drop this in and nothing else needs
// to change. If you already have a shared multer setup using .any(),
// just reuse that instead and skip this adapter.
const flattenFiles = (req, res, next) => {
  if (req.files && !Array.isArray(req.files)) {
    const flat = [];
    for (const [fieldname, files] of Object.entries(req.files)) {
      files.forEach((f) => flat.push({ ...f, fieldname }));
    }
    req.files = flat;
  }
  next();
};

// ---------------- Customer routes ----------------

// Submit a claim (logged-in customer)
router.post('/:userId', warrantyUploadFields, flattenFiles, createWarrantyClaim);
// Submit a claim (guest / not logged in)
router.post('/', warrantyUploadFields, flattenFiles, createWarrantyClaim);

// Check status by Claim ID (public)
router.get('/status/:claimId', getClaimStatusByClaimId);

// All claims for a logged-in customer
router.get('/my-claims/:userId', getMyClaims);

// ---------------- Admin routes ----------------

router.get('/admin/:userId', getAllClaimsAdmin);
router.get('/admin/:userId/:claimId', getClaimByIdAdmin);
router.patch('/admin/:userId/:claimId/status', updateClaimStatusAdmin);
router.patch('/admin/:userId/:claimId/note', updateInternalNoteAdmin);

export default router;