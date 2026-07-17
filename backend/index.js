import express from 'express' ;
import dotenv from 'dotenv'
// import client from './prisma.js';
import cors from 'cors'
import userRoute from './routes/user.routes.js'
import categoryRoute from './routes/category.routes.js'
import productRoute from './routes/product.routes.js'
import wishListRoute from './routes/wishlist.routes.js'
import cartRoute from './routes/cart.routes.js'
import orderRoute from './routes/order.routes.js'
import coupenRoute from './routes/coupen.routes.js'
import reviewRoute from './routes/customerReview.routes.js'
import paymentRoute from './routes/payment.routes.js'
import returnRoute from './routes/return.routes.js'
import storeRoute from './routes/store.routes.js'
import corporateRoute from './routes/corporate.routes.js'
import blogRoute from './routes/blog.routes.js'
import analyticsRoute from './routes/analytics.routes.js' ;
import warrantyRoute from './routes/warranty.routes.js' ;
const app = express() ; 

dotenv.config({}) ; 

const PORT = process.env.PORT || 8000 ; 


app.use(express.json()) ;
app.use(express.urlencoded({extended : true})) ; 

// const corsOptions = {
//     origin: 'https://ecommerce-two-teal-40.vercel.app',
//     credentials: true, 
// };

const allowedOrigins = [
   'https://arttag.in',
    "https://www.arttag.in",
    "https://ecommerce-two-teal-40.vercel.app",
    "http://localhost:3000" ,
    'http://localhost:7071',
     'https://checkout.razorpay.com',
     'https://arttag.vercel.app',
    
  ];

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow server-to-server or tools (Postman, mobile apps)
      if (!origin) return callback(null, true);
  
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS blocked: " + origin));
      }
    },
    credentials: true
  };

app.use(cors(corsOptions)) ; 

app.use('/api/v1/user' ,userRoute) ;

app.use('/api/v1/product' ,productRoute)

app.use('/api/v1/category' ,categoryRoute)

app.use('/api/v1/wishlist' ,wishListRoute) ;

app.use('/api/v1/cart' ,cartRoute)

app.use('/api/v1/order' ,orderRoute);

app.use('/api/v1/coupen' ,coupenRoute);

app.use('/api/v1/review' ,reviewRoute)

app.use('/api/v1/payment' , paymentRoute)

app.use('/api/v1/return' ,returnRoute)

app.use('/api/v1/store' ,storeRoute) ; 

app.use('/api/v1/corporate' ,corporateRoute) ; 

app.use('/api/v1/blog' ,blogRoute) ;

app.use('/api/v1/analytics', analyticsRoute);

app.use('/api/v1/warranty' ,warrantyRoute) ;

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT ,'0.0.0.0',() => {
    console.log(`Server running at ${PORT}`) ; 
})