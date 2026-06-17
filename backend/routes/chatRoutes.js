const express = require('express');
const { handleChat, getChats, getChat, renameChat, deleteChat } = require('../controllers/chatController');
const { protectUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protectUser);

router.get('/', getChats);
router.get('/:id', getChat);
router.put('/:id', renameChat);
router.delete('/:id', deleteChat);
router.post('/', handleChat);

module.exports = router;
