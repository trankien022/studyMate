const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const knowledgemapController = require('../controllers/knowledgemap.controller');

// Tất cả routes đều cần xác thực
router.use(auth);

// ─── CRUD ────────────────────────────────────────────────────
router.post('/', knowledgemapController.createMap);
router.get('/', knowledgemapController.getMaps);
router.get('/:id', knowledgemapController.getMapDetail);
router.delete('/:id', knowledgemapController.deleteMap);

// ─── AI Generate & Analyze ─────────────────────────────────
router.post('/:id/generate', knowledgemapController.generateNodes);
router.post('/:id/analyze-gaps', knowledgemapController.analyzeGaps);

// ─── Node management ───────────────────────────────────────
router.patch('/:id/node', knowledgemapController.updateNode);
router.delete('/:id/node/:nodeId', knowledgemapController.deleteNode);

module.exports = router;
