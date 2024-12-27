const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: String,
  contactNumber: String,
  region: String,
  province: String,
  municipality: String,
  barangay: String,
  streetName: String,
  building: String,
  houseNumber: String,
  zip: String,
});

module.exports = mongoose.model('Address', addressSchema);
