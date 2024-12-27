const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      size: String,
      quantity: Number,
      price: Number,
    }
  ],
  total: Number,
  status: { type: String, default: 'Pending' },
  date: { type: Date, default: Date.now },
  trackingNumber: String,
  shippingFee: Number,
  totalPrice: Number,
  address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' } // Reference to Address model
});

module.exports = mongoose.model('Order', orderSchema);
