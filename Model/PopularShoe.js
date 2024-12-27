const mongoose = require('mongoose');

const popularShoeSchema = new mongoose.Schema({
  photoUrl: { type: String, required: true }, 
});

module.exports = mongoose.model('PopularShoe', popularShoeSchema);
