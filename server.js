const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const Product = require('./Model/product');
const jwt = require('jsonwebtoken');
const ShippingFee = require('./Model/ShippingFee');
const authRoutes = require('./routes/auth');
const Admin = require('./Model/Admin');
const PopularShoe = require('./Model/PopularShoe');
const Order = require('./Model/Order');
const Address = require('./Model/Address');

const app = express();
const PORT = process.env.PORT || 3004;
const JWT_SECRET = 'your_jwt_secret';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware setup
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Nike');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Signup route
app.post('/api/admin/signup', async (req, res) => {
  const { name, email, password, phoneNumber } = req.body;

  try {
    // Check if admin with the same email already exists
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    // Save admin to the database
    await newAdmin.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example (dashboard)
app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
  // Access dashboard logic here
  res.json({ message: 'Welcome to the admin dashboard' });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token not provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, admin) => {
    if (err) {
      return res.status(403).json({ error: 'Token verification failed' });
    }
    req.admin = admin;
    next();
  });
}

// Update the /api/products POST route in your backend
app.post('/api/products', upload.array('photos'), async (req, res) => {
  const { name, category, description, price } = req.body;
  const photos = req.files.map((file) => file.filename); // Assuming files are stored with multer

  try {
    const product = new Product({
      name,
      category,
      description,
      price,
      photos, // Store filenames in MongoDB
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product route
app.put('/api/products/:id', upload.array('photos', 10), async (req, res) => {
  const { id } = req.params;
  const { name, category, description, price } = req.body;
  const photos = req.files.map((file) => file.filename);

  try {
    const product = await Product.findByIdAndUpdate(
      id,
      { name, category, description, price, $push: { photos: { $each: photos } } },
      { new: true }
    );
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

// Assuming this is your delete route for products
app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.deleteOne();

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get current shipping fee
app.get('/api/shipping-fee', async (req, res) => {
  try {
    const shippingFee = await ShippingFee.findOne();
    if (!shippingFee) {
      return res.status(404).json({ error: 'Shipping fee not found' });
    }
    res.status(200).json({ fee: shippingFee.fee });
  } catch (error) {
    console.error('Error fetching shipping fee:', error);
    res.status(500).json({ error: 'Failed to fetch shipping fee' });
  }
});

// Update shipping fee
app.put('/api/shipping-fee', async (req, res) => {
  const { fee } = req.body;

  try {
    let shippingFee = await ShippingFee.findOne();
    if (!shippingFee) {
      shippingFee = new ShippingFee({ fee });
    } else {
      shippingFee.fee = fee;
    }

    await shippingFee.save();
    res.status(200).json({ message: 'Shipping fee updated successfully', fee: shippingFee.fee });
  } catch (error) {
    console.error('Error updating shipping fee:', error);
    res.status(500).json({ error: 'Failed to update shipping fee' });
  }
});

// Example of organizing server routes
app.use('/api/admin', authenticateToken); // Protect all admin routes with authentication middleware

// API route to fetch admin profile
app.get('/api/admin/profile', async (req, res) => {
  try {
    const adminId = req.admin.id; // Assuming your JWT payload has 'id' field
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    console.log('Admin Data Sent:', admin); // Log the admin data sent
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assuming this is your delete route for a specific photo of a product
app.delete('/api/products/:id/photo/:photoName', async (req, res) => {
  const { id, photoName } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Remove the photo from the photos array
    product.photos = product.photos.filter(photo => photo !== photoName);
    await product.save();

    // Optionally, you can also delete the physical file from your server
    // Uncomment if you want to delete the file from the uploads directory
    const filePath = path.join(uploadDir, photoName);
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'Photo deleted successfully', product });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all route for serving index.html for client-side routing
app.get('*', function (req, res) {
  const index = path.join(__dirname, 'build', 'index.html');
  res.sendFile(index);
});

// GET popular shoes
app.get('/api/popular-shoes', async (req, res) => {
  console.log('Fetching popular shoes...');
  try {
    const popularShoes = await PopularShoe.find();
    console.log('Popular shoes fetched:', popularShoes);
    res.status(200).json(popularShoes);
  } catch (error) {
    console.error('Error fetching popular shoes:', error);
    res.status(500).json({ error: 'Failed to fetch popular shoes' });
  }
});


// POST popular shoes
app.post('/api/popular-shoes', upload.single('photo'), async (req, res) => {
  const photoUrl = req.file.filename;

  try {
    const newPopularShoe = new PopularShoe({ photoUrl });
    await newPopularShoe.save();
    res.status(201).json(newPopularShoe);
  } catch (error) {
    console.error('Error adding popular shoe:', error);
    res.status(500).json({ error: 'Failed to add popular shoe' });
  }
});

// DELETE popular shoes
app.delete('/api/popular-shoes/:id', async (req, res) => {
  const shoeId = req.params.id;

  try {
    const shoe = await PopularShoe.findById(shoeId);
    if (!shoe) {
      return res.status(404).json({ error: 'Popular shoe not found' });
    }

    await shoe.deleteOne();
    res.status(200).json({ message: 'Popular shoe deleted successfully' });
  } catch (error) {
    console.error('Error deleting popular shoe:', error);
    res.status(500).json({ error: 'Failed to delete popular shoe' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('Address');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get("/", (req, res) => {
  res.send({ message: "Welcome to my API" });
});

app.get("/api/data", (req, res) => {
  res.json({ data: "Sample data" });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
