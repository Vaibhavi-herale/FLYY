const express = require('express');
const { searchLocations } = require('../controllers/locationController');

const router = express.Router();

router.get('/search', searchLocations);

module.exports = router;
