# 🚗 Dodge's BlogVerse

A modern blog platform built with Node.js, Express, and MongoDB, featuring a clean UI and secure authentication. Create, share, and engage with blog posts in a user-friendly environment.

## 🌟 Features

- User Authentication (Login/Register)
- Create, Read, Update, Delete (CRUD) blog posts
- Comment system
- Public and private blog views
- Secure password reset functionality with security questions
- Modern, responsive UI with Bootstrap
- Image upload support for blog posts

## 📁 Project Structure

```
Dodge-BlogVerse/
├── frontend/
│   ├── css/
│   │   ├── login.css
│   │   └── style.css
│   ├── js/
│   │   ├── forgot-password.js
│   │   ├── login.js
│   │   ├── public-blogs.js
│   │   └── script.js
│   ├── img/
│   └── html/
│       ├── blogs.html
│       ├── forgot-password.html
│       ├── index.html
│       └── login.html
└── backend/
    ├── server.js
    ├── .env
    └── routes/
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Syed-Anwar-Uddin/Dodge-BlogVerse.git
   cd Dodge-BlogVerse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

### MongoDB Setup

1. Create a MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is fine)
3. Click "Connect" on your cluster
4. Choose "Connect your application"
5. Copy the connection string
6. Replace `your_mongodb_connection_string` in `.env` with your connection string
   - Remember to replace `<password>` with your database user's password
   - Replace `<dbname>` with your desired database name (e.g., "blogverse")

### Running the Application

1. Start the server:
   ```bash
   cd backend
   npm start
   ```

2. Open your browser and navigate to:
   - Public blog view: `http://localhost:3000/blogs.html`
   - Login page: `http://localhost:3000/login.html`
   - Main application: `http://localhost:3000/index.html`

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Security questions for password reset
- CORS protection
- Request rate limiting

## 💻 Tech Stack

- **Frontend:**
  - HTML5
  - CSS3
  - JavaScript (Vanilla)
  - Bootstrap 5

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB
  - Mongoose
  - JWT for authentication

## 📝 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/auth/reset-password` - Reset password

### Blogs
- `GET /api/blogs` - Get all blogs
- `POST /api/blogs` - Create new blog
- `PUT /api/blogs/:id` - Update blog
- `DELETE /api/blogs/:id` - Delete blog

### Comments
- `POST /api/blogs/:blogId/comments` - Add comment
- `GET /api/blogs/:blogId/comments` - Get blog comments

## 👥 Authors

- G. Vishnu Vallabh Rao
- Syed Anwaruddin
- V. Harsha Vardhan

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
