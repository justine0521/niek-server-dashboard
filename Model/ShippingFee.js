const mongoose = require('mongoose');
const { Schema } = mongoose;

const shippingFeeSchema = new Schema({
  fee: { type: Number, required: true },
});

module.exports = mongoose.model('ShippingFee', shippingFeeSchema);
