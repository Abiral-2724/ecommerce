import client from '../prisma.js';
import cloudinary from '../utils/cloudinary.js'; // adjust path to wherever your cloudinary config lives

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Generates a short, human-readable, unique claim ID like "WC-7F3K9A2X"
const generateClaimId = async () => {
  const makeCode = () =>
    'WC-' + Math.random().toString(36).slice(2, 10).toUpperCase();

  let code = makeCode();
  // extremely unlikely to collide, but guard against it anyway
  // while (await client.warrantyClaim.findUnique({ where: { claimId: code } })) {
  //   code = makeCode();
  // }
  return code;
};

const uploadBuffer = (file, resourceType = 'auto') =>
  cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    { folder: 'warranty_claims', resource_type: resourceType }
  );

// Fields we're happy to expose to the CUSTOMER when they check status
// (i.e. no internalNotes, no raw userId, etc.)
const toPublicClaim = (claim) => ({
  claimId: claim.claimId,
  productName: claim.productName,
  productModel: claim.productModel,
  status: claim.status,
  createdAt: claim.createdAt,
  updatedAt: claim.updatedAt,
  history: claim.history?.map((h) => ({
    status: h.status,
    note: h.note,
    createdAt: h.createdAt,
  })),
});

// ---------------------------------------------------------------------
// CUSTOMER: Submit a warranty claim
// POST /api/v1/warranty
// multipart/form-data fields:
//   fullName, mobileNumber, email, productName, productModel,
//   orderId (optional), purchaseDate (optional), reason
// files (field names):
//   invoice          -> single file
//   warrantyCard     -> single file
//   productImages    -> multiple files
//   productVideo     -> single file
// If the user is logged in, pass userId as a route param or in body —
// here it's read from req.params.userId if present, else left null.
// ---------------------------------------------------------------------
export const createWarrantyClaim = async (req, res) => {
  try {
    const userId = req.params?.userId || req.body?.userId || null;

    const {
      fullName,
      mobileNumber,
      email,
      productName,
      productModel,
      orderId,
      purchaseDate,
      reason,
    } = req.body;

    const required = { fullName, mobileNumber, email, productName, productModel, reason };
    const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // Pull files by fieldname
    const invoiceFile = req.files?.find((f) => f.fieldname === 'invoice');
    const warrantyCardFile = req.files?.find((f) => f.fieldname === 'warrantyCard');
    const productImageFiles = req.files?.filter((f) => f.fieldname === 'productImages') || [];
    const productVideoFile = req.files?.find((f) => f.fieldname === 'productVideo');

    // Upload everything in parallel
    const [invoiceResult, warrantyCardResult, productImageResults, productVideoResult] =
      await Promise.all([
        invoiceFile ? uploadBuffer(invoiceFile) : Promise.resolve(null),
        warrantyCardFile ? uploadBuffer(warrantyCardFile) : Promise.resolve(null),
        Promise.all(productImageFiles.map((f) => uploadBuffer(f))),
        productVideoFile ? uploadBuffer(productVideoFile, 'video') : Promise.resolve(null),
      ]);

    const claimId = await generateClaimId();

    const claim = await client.warrantyClaim.create({
      data: {
        claimId,
        userId,
        fullName,
        mobileNumber,
        email,
        productName,
        productModel,
        orderId: orderId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        reason,
        status: 'CLAIM_RECEIVED',
        history: {
          create: [{ status: 'CLAIM_RECEIVED', note: 'Claim submitted by customer' }],
        },
      },
    });

    // Build attachment rows for whatever was actually uploaded
    const attachmentData = [];
    if (invoiceResult) {
      attachmentData.push({
        claimId: claim.id,
        type: 'INVOICE',
        url: invoiceResult.secure_url,
        originalName: invoiceFile.originalname,
      });
    }
    if (warrantyCardResult) {
      attachmentData.push({
        claimId: claim.id,
        type: 'WARRANTY_CARD',
        url: warrantyCardResult.secure_url,
        originalName: warrantyCardFile.originalname,
      });
    }
    productImageResults.forEach((result, i) => {
      attachmentData.push({
        claimId: claim.id,
        type: 'PRODUCT_IMAGE',
        url: result.secure_url,
        originalName: productImageFiles[i]?.originalname,
      });
    });
    if (productVideoResult) {
      attachmentData.push({
        claimId: claim.id,
        type: 'PRODUCT_VIDEO',
        url: productVideoResult.secure_url,
        originalName: productVideoFile.originalname,
      });
    }

    if (attachmentData.length > 0) {
      await client.warrantyAttachment.createMany({ data: attachmentData });
    }

    return res.status(201).json({
      success: true,
      message: 'Warranty claim submitted successfully',
      claimId: claim.claimId,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      message: 'Error while submitting warranty claim. Please try again later!',
    });
  }
};

// ---------------------------------------------------------------------
// CUSTOMER: Check claim status by Claim ID (public, no auth needed)
// GET /api/v1/warranty/status/:claimId
// ---------------------------------------------------------------------
export const getClaimStatusByClaimId = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claim = await client.warrantyClaim.findUnique({
      where: { claimId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'No claim found with this Claim ID' });
    }

    return res.status(200).json({ success: true, claim: toPublicClaim(claim) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while fetching claim status' });
  }
};

// ---------------------------------------------------------------------
// CUSTOMER: Get all claims for a logged-in user
// GET /api/v1/warranty/my-claims/:userId
// ---------------------------------------------------------------------
export const getMyClaims = async (req, res) => {
  try {
    const { userId } = req.params;

    const claims = await client.warrantyClaim.findMany({
      where: { userId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      claims: claims.map(toPublicClaim),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while fetching your claims' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: Get all claims (with optional ?status=... filter & pagination)
// GET /api/v1/warranty/admin/:userId?status=UNDER_REVIEW&page=1&limit=20
// ---------------------------------------------------------------------
export const getAllClaimsAdmin = async (req, res) => {
  try {
    const { userId } = req.params; // admin's own user id, for the role check
    const admin = await client.user.findFirst({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You have no right to view this' });
    }

    const { status } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const where = status ? { status } : {};

    const [claims, total] = await Promise.all([
      client.warrantyClaim.findMany({
        where,
        include: { attachments: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      client.warrantyClaim.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      claims,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while fetching claims' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: Get single claim, full detail (attachments + history + notes)
// GET /api/v1/warranty/admin/:userId/:claimId
// ---------------------------------------------------------------------
export const getClaimByIdAdmin = async (req, res) => {
  try {
    const { userId, claimId } = req.params;
    const admin = await client.user.findFirst({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You have no right to view this' });
    }

    const claim = await client.warrantyClaim.findUnique({
      where: { claimId },
      include: {
        attachments: true,
        history: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true, phoneNumber: true } },
      },
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    return res.status(200).json({ success: true, claim });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while fetching claim' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: Update claim status (optionally with a note) — also logs history
// PATCH /api/v1/warranty/admin/:userId/:claimId/status
// body: { status, note (optional) }
// ---------------------------------------------------------------------
const VALID_STATUSES = [
  'CLAIM_RECEIVED',
  'UNDER_REVIEW',
  'ADDITIONAL_INFO_REQUIRED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'PRODUCT_RECEIVED',
  'REPAIR_IN_PROGRESS',
  'REPLACEMENT_APPROVED',
  'REPLACEMENT_SHIPPED',
  'RESOLVED',
];

export const updateClaimStatusAdmin = async (req, res) => {
  try {
    const { userId, claimId } = req.params;
    const { status, note } = req.body;

    const admin = await client.user.findFirst({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You have no right to do this' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing status' });
    }

    const existing = await client.warrantyClaim.findUnique({ where: { claimId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const updated = await client.warrantyClaim.update({
      where: { claimId },
      data: {
        status,
        history: { create: [{ status, note: note || null }] },
      },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });

    // TODO: hook up your email/SMS provider here to notify the customer
    // e.g. sendStatusUpdateEmail(updated.email, updated.claimId, updated.status)

    return res.status(200).json({ success: true, message: 'Status updated', claim: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while updating status' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: Add/update an internal note without changing status
// PATCH /api/v1/warranty/admin/:userId/:claimId/note
// body: { internalNotes }
// ---------------------------------------------------------------------
export const updateInternalNoteAdmin = async (req, res) => {
  try {
    const { userId, claimId } = req.params;
    const { internalNotes } = req.body;

    const admin = await client.user.findFirst({ where: { id: userId } });
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You have no right to do this' });
    }

    const updated = await client.warrantyClaim.update({
      where: { claimId },
      data: { internalNotes: internalNotes || null },
    });

    return res.status(200).json({ success: true, message: 'Note saved', claim: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Error while saving note' });
  }
};