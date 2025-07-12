const Product = require("../models/Product");
const User = require("../models/User");
const path = require("path");
const bcrypt = require('bcryptjs');

const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.status(201).json(products);
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  const { type, rating, name, price, description, key_benefits, sale_percentage, price_after_sale } = req.body; // إضافة الحقول الجديدة
  const image = req.file ? path.join("", req.file.filename) : req.body.imageUrl;

  if (!req.file && !req.body.imageUrl) {
    return res.status(400).json({ error: "Image is required" });
  }
  
  try {
    const newProduct = new Product({ 
      type, 
      rating, 
      name, 
      price, 
      image, 
      description,
      key_benefits,
      sale_percentage, // إضافة الحقل الجديد
      price_after_sale // إضافة الحقل الجديد
    });
    await newProduct.save();
    res.status(201).json({ message: "Product added successfully.." });
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  const { id } = req.params;
  const { type, rating, name, price, description, key_benefits, sale_percentage, price_after_sale } = req.body;
  const image = req.file
    ? path.join("", req.file.filename)
    : req.body.imageUrl;

  if (!req.file && !req.body.imageUrl) {
    return res.status(400).json({ error: "Image is required" });
  }

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.type = type || product.type;
    product.rating = rating || product.rating;
    product.name = name || product.name;
    product.price = price || product.price;
    product.image = image || product.image;
    product.description = description || product.description;
    product.key_benefits = key_benefits || product.key_benefits;
    product.sale_percentage = sale_percentage !== undefined ? sale_percentage : product.sale_percentage;
    product.price_after_sale = price_after_sale !== undefined ? price_after_sale : product.price_after_sale; 

    await product.save();
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteAllProducts = async (req, res, next) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password incorrect" });
    }

    await Product.deleteMany({});
    res.status(201).json({ message: "All products deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllProducts, addProduct, editProduct, deleteProduct, deleteAllProducts };