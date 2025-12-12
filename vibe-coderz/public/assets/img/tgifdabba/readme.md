github link : https://github.com/ar162387/tgifdabba.git

live website : http://tgifdabba.co.uk




TGIF Dabba CMS (Content Management System)

A comprehensive Content Management System for the TGIF Dabba restaurant, built with React frontend and Node.js/Express backend.

Features

Authentication & Security

JWT-based authentication with httpOnly cookies
Protected routes with role-based access control
Rate limiting for API endpoints
Input validation and sanitization
Core Functionality

Items Management: CRUD operations for menu items with categories, allergens, and pricing
Daily Menu: Create and manage daily menus for each day of the week
Orders Management: View, update status, and manage customer orders
Contacts: Handle customer inquiries and messages
Dashboard: Overview with statistics and recent activity
Profile Management: Update email and password
User Experience

Responsive design with Tailwind CSS
Real-time notifications for new orders and contacts
Search, filter, and pagination for all data tables
Toast notifications for user feedback
Modal dialogs for detailed views and forms


API Endpoints

Authentication

POST /api/cms/auth/login - User login
POST /api/cms/auth/logout - User logout
GET /api/cms/auth/me - Get current user
PATCH /api/cms/auth/profile - Update user profile
Items

GET /api/cms/items - Get all items (with pagination, search, filters)
GET /api/cms/items/:id - Get item by ID
POST /api/cms/items - Create new item
PUT /api/cms/items/:id - Update item
DELETE /api/cms/items/:id - Delete item
PATCH /api/cms/items/:id/toggle-status - Toggle item active status
Daily Menu

GET /api/cms/daily-menu - Get all daily menus
GET /api/cms/daily-menu/day/:day - Get menu for specific day
POST /api/cms/daily-menu - Create daily menu
PUT /api/cms/daily-menu/:id - Update daily menu
DELETE /api/cms/daily-menu/:id - Delete daily menu
PATCH /api/cms/daily-menu/:id/publish - Publish daily menu
Orders

GET /api/cms/orders - Get all orders (with pagination, search, filters)
GET /api/cms/orders/:id - Get order by ID
PATCH /api/cms/orders/:id/status - Update order status
PATCH /api/cms/orders/:id/read - Mark order as read
GET /api/cms/orders/stats - Get order statistics
Contacts

GET /api/cms/contacts - Get all contacts (with pagination, search, filters)
GET /api/cms/contacts/:id - Get contact by ID
PATCH /api/cms/contacts/:id/read - Mark contact as read
PATCH /api/cms/contacts/:id/respond - Add response to contact
DELETE /api/cms/contacts/:id - Delete contact
GET /api/cms/contacts/stats - Get contact statistics
Notifications

GET /api/cms/notifications/counters - Get notification counters
GET /api/cms/notifications/activity - Get recent activity

Key Features

Dashboard

Overview statistics (orders, contacts, revenue)
Recent activity feed
Quick action buttons
Real-time notification counters
Items Management

Create, edit, delete menu items
Categorize items (appetizer, main, dessert, etc.)
Set allergens and pricing
Toggle active/inactive status
Search and filter functionality
Daily Menu

Create menus for each day of the week
Assign items to specific days
Organize items into sections
Publish/unpublish daily menus
Visual day-by-day management
Orders Management

View all customer orders
Update order status (pending, preparing, delivered, canceled)
View detailed order information
Mark orders as read/unread
Search and filter orders
Contacts Management

View customer inquiries
Respond to messages
Mark contacts as read/unread
Search and filter contacts
Delete old contacts
Profile Management

Update email address
Change password
View account information
Security settings
Security Features

JWT token authentication
Protected routes
Rate limiting
Input validation
CORS configuration
Helmet security headers
Password hashing with bcrypt
Development

Running in Development Mode

Start MongoDB
Start backend: cd backend && npm run dev
Start frontend: cd frontend && npm run dev
Environment Variables

Backend (.env)

MONGODB_URI: MongoDB connection string
JWT_SECRET: Secret key for JWT tokens
PORT: Server port (default: 5000)
NODE_ENV: Environment (development/production)
FRONTEND_URL: Frontend URL for CORS
Deployment

Backend Deployment

Set production environment variables
Build and start the server
Ensure MongoDB is accessible
Configure reverse proxy (nginx)
Frontend Deployment

Build the application: npm run build
Deploy the dist folder to your hosting service
Configure routing for SPA
API Documentation