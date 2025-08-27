const express = require("express");
const mongoose = require("mongoose");
const createInitialAdmin = require('./Controllers/CreateInitialadmin');
const dns = require('dns');
const googleuser = require('./models/googleuser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session');
const session = require('express-session');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const userRoutes = require("./routes/user");
const productRoutes = require("./routes/product");
const forgotpassword = require("./forgotpassword/forgotpassword");
const ContactusRoutes = require("./routes/Contactus");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const newsletterRoutes = require("./routes/newsletter");
const adminRoutes = require('./middlewares/admin');
const path = require("path");
const bodyParser = require('body-parser');
require("dotenv").config();

// Set DNS servers
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Initialize Express app
const app = express();
const port = process.env.PORT || 5500;

// Database connection with retry logic
let isConnected = false;

const connectdb = async () => {
    if (isConnected) {
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Medifit:m7j0pADbeL4nMXk3@medifit.x3ym908.mongodb.net/?retryWrites=true&w=majority&appName=Medifit', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // زيادة timeout إلى 30 ثانية
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 5,
        });
        
        isConnected = true;
        console.log("MongoDB connected successfully");
        
        // استدعاء createInitialAdmin بعد التأكد من الاتصال
        if (mongoose.connection.readyState === 1) {
            createInitialAdmin();
        }
    } catch (error) {
        console.log("MongoDB connection error: ", error);
        isConnected = false;
        // أعد المحاولة بعد 5 ثواني
        setTimeout(connectdb, 5000);
    }
};

// Mongoose connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
    isConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.log('Mongoose connection error:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
    isConnected = false;
    // محاولة إعادة الاتصال
    setTimeout(connectdb, 5000);
});

// بدء الاتصال بقاعدة البيانات فوراً
connectdb();

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../../Medifit_Folder/Main-Medifit/src/assets/img')));

const corsOptions = {
  origin: function (origin, callback) {
    // السماح للطلبات بدون origin (مثل Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://backend-medifit.vercel.app'
        ]
      : ['http://localhost:4200', 'http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(bodyParser.json({ type: 'application/json' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware للتأكد من الاتصال أو إعادة المحاولة
app.use(async (req, res, next) => {
    // تخطي health check endpoint
    if (req.path === '/health') {
        return next();
    }
    
    if (mongoose.connection.readyState !== 1) {
        // محاولة الاتصال مرة أخرى
        await connectdb();
        
        // انتظر قليلاً للتأكد من الاتصال
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                error: "Database connection not ready",
                status: "Service Unavailable",
                message: "Please try again in a few seconds"
            });
        }
    }
    next();
});

// Health check endpoint (قبل middleware التحقق من قاعدة البيانات)
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][dbStatus];
  
  res.status(dbStatus === 1 ? 200 : 503).json({ 
    status: dbStatus === 1 ? 'OK' : 'ERROR',
    database: dbStatusText,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/forgot", forgotpassword);
app.use("/contactus", ContactusRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/newsletter", newsletterRoutes);
app.use('/admin', adminRoutes);

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://backend-medifit.vercel.app/auth/google/callback'
    : 'http://localhost:5500/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await googleuser.findOne({ googleId: profile.id });

    if (!user) {
      user = await googleuser.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        role: 'user' 
      });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/cancel' }),
  (req, res) => {
    try {
      const userRole = req.user.role || 'user';
      const token = jwt.sign(
        { 
          id: req.user._id.toString(), 
          role: userRole
        }, 
        process.env.SECRET_KEY, 
        { expiresIn: '3h' }
      );
      
      const frontendURL = process.env.NODE_ENV === 'production'
        ? 'https://backend-medifit.vercel.app'
        : 'http://localhost:4200';
      
      res.send(`
        <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'auth_success',
                token: '${token}',
                user: {
                  username: '${req.user.name}',
                  email: '${req.user.email}',
                  googleId: '${req.user.googleId}',
                  role: '${userRole}'
                }
              }, '${frontendURL}');
              window.close();
            } else {
              window.location.href = '${frontendURL}/home';
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.status(500).send('Authentication failed');
    }
  }
);

app.get('/auth/google/cancel', (req, res) => {
  const frontendURL = process.env.NODE_ENV === 'production'
    ? 'https://backend-medifit.vercel.app'
    : 'http://localhost:4200';
  res.redirect(`${frontendURL}/signup`);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.log({ error });
  const statuscode = error.statuscode || 500;
  const message = error.message || "Internal Server Error";
  res
    .status(statuscode)
    .json({ from: "ErrorHandling Mid", error: error.message });
});

// Handle 404
app.use("*", (req, res, next) => {
  res.sendStatus(404);
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

module.exports = app;