const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const {
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct,
  deleteAllProducts,
} = require("../Controllers/productController");
const {
  ValidationErrors,
  validateProduct,
  validateEditproduct,
  validateDeleteAllproduct,
} = require("../validation/validate");
const upload = require("../middlewares/upload");
const auth = require("../middlewares/auth");
const path = require("path");

router.get("/getAllProducts", getAllProducts);

router.post(
  "/addProduct",
  auth(["admin", "supervisor"]),
  upload.single("image"),
  validateProduct,
  ValidationErrors,
  addProduct
);

router.patch(
  "/editProduct/:id",
  auth(["admin"]),
  upload.single("image"),
  validateEditproduct,
  ValidationErrors,
  editProduct
);

router.delete("/deleteProduct/:id", auth(["admin"]), deleteProduct);

router.delete("/deleteAllProducts", auth(["admin"]) , validateDeleteAllproduct , ValidationErrors ,deleteAllProducts);

module.exports = router;
