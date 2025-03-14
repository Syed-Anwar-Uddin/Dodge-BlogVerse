require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const app = express();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Special route to delete all users (MUST be before any middleware)
app.delete('/api/users/delete-all-special', async (req, res) => {
    try {
        await mongoose.connection.collection('users').deleteMany({});
        console.log('All users deleted successfully');
        res.json({ message: 'All users deleted successfully' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ message: error.message });
    }
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend/html'))); // Serve frontend files

// Route to delete all users (no authentication required)
app.delete('/api/users/clear-all', async (req, res) => {
    try {
        // Delete all users
        await User.deleteMany({});
        console.log('All users deleted successfully');
        res.json({ message: 'All users deleted successfully' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ message: error.message });
    }
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 100,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    securityQuestion: { type: String, required: true },
    securityAnswer: { type: String, required: true },
    resetToken: String,
    resetTokenExpiry: Date
}, { timestamps: true });

// Create compound indexes for optimal querying
userSchema.index({ username: 1, email: 1 });

const User = mongoose.model('User', userSchema);

// Blog Schema
const blogSchema = new mongoose.Schema({
    id: String,
    imageUrl: String,
    blogTitle: { type: String, index: true },
    blogType: { type: String, index: true },
    blogDescription: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    comments: [{
        text: String,
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Create compound indexes for blog queries
blogSchema.index({ blogTitle: 1, blogType: 1 });
blogSchema.index({ author: 1, createdAt: -1 });

const Blog = mongoose.model('Blog', blogSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
};

// Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { username, email, password, securityQuestion, securityAnswer } = req.body;

        // Validate input
        if (!username || !email || !password || !securityQuestion || !securityAnswer) {
            console.log('Missing required fields:', { username, email, securityQuestion, securityAnswer });
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            console.log('User already exists:', { username, email });
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            securityQuestion,
            securityAnswer: securityAnswer.toLowerCase() // Store answer in lowercase for case-insensitive comparison
        });

        console.log('Attempting to save user:', { username, email });
        await user.save();
        console.log('User saved successfully:', { username, email });
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error during registration: ' + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Create and assign token
        const token = jwt.sign({ _id: user._id }, JWT_SECRET);
        
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get security question
app.post('/api/auth/get-security-question', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ securityQuestion: user.securityQuestion });
    } catch (error) {
        console.error('Error fetching security question:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify security answer
app.post('/api/auth/verify-security-answer', async (req, res) => {
    try {
        const { username, answer } = req.body;
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare answers (case-insensitive)
        if (user.securityAnswer !== answer.toLowerCase()) {
            return res.status(400).json({ message: 'Incorrect answer' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '15m' });
        
        // Save reset token
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        res.json({ resetToken });
    } catch (error) {
        console.error('Error verifying security answer:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        
        // Verify token
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        const user = await User.findOne({
            _id: decoded.userId,
            resetToken,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Routes that don't need authentication
app.delete('/api/blogs/clear-all', async (req, res) => {
    try {
        // Delete all blogs
        await Blog.deleteMany({});
        console.log('All blogs deleted successfully');
        res.json({ message: 'All blogs deleted successfully' });
    } catch (error) {
        console.error('Error deleting blogs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all blogs with pagination
app.get('/api/blogs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username')
            .populate('comments.author', 'username');

        // If pagination is requested
        if (req.query.page) {
            const total = await Blog.countDocuments();
            const paginatedBlogs = blogs.slice(skip, skip + limit);
            return res.json({
                blogs: paginatedBlogs,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalBlogs: total
            });
        }

        // If no pagination requested, return all blogs (maintaining old behavior)
        res.json(blogs);
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add comment to blog
app.post('/api/blogs/:blogId/comments', authenticateToken, async (req, res) => {
    try {
        const { blogId } = req.params;
        const { text } = req.body;
        console.log('Adding comment to blog:', blogId);
        console.log('Comment text:', text);
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Get the user information
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Found blog and user:', { blogId: blog._id, userId: user._id });

        // Initialize comments array if it doesn't exist
        if (!blog.comments) {
            blog.comments = [];
        }

        // Add the new comment
        const newComment = {
            text: text,
            author: user._id,
            createdAt: new Date()
        };

        blog.comments.push(newComment);
        await blog.save();
        console.log('Comment saved successfully:', newComment);

        res.json({ 
            message: 'Comment added successfully',
            comment: newComment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// Get comments for a blog
app.get('/api/blogs/:blogId/comments', async (req, res) => {
    try {
        const { blogId } = req.params;
        console.log('Fetching comments for blog:', blogId);
        
        const blog = await Blog.findById(blogId)
            .populate({
                path: 'comments.author',
                select: 'username'
            });
        
        if (!blog) {
            console.log('Blog not found:', blogId);
            return res.status(404).json({ message: 'Blog not found' });
        }

        console.log('Found blog with comments:', {
            blogId: blog._id,
            commentCount: blog.comments ? blog.comments.length : 0,
            comments: blog.comments
        });

        res.json(blog.comments || []);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// Authentication middleware - all routes below this require authentication
app.use(authenticateToken);

// Protected Blog Routes
app.get('/api/blogs/my', async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.user._id }).populate('author', 'username');
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/blogs', async (req, res) => {
    try {
        const blogData = { 
            ...req.body, 
            author: req.user._id,
            id: `${Date.now()}` // Ensure we set the id field
        };
        const blog = new Blog(blogData);
        const savedBlog = await blog.save();
        const populatedBlog = await Blog.findById(savedBlog._id).populate('author', 'username');
        res.status(201).json(populatedBlog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/blogs/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.author.toString() !== req.user._id) {
            return res.status(403).json({ message: 'Not authorized to edit this blog' });
        }

        blog.blogTitle = req.body.blogTitle;
        blog.blogType = req.body.blogType;
        blog.blogDescription = req.body.blogDescription;
        if (req.body.imageUrl) {
            blog.imageUrl = req.body.imageUrl;
        }

        await blog.save();
        
        const updatedBlog = await Blog.findById(blog._id).populate('author', 'username');
        res.json(updatedBlog);
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ message: 'Error updating blog' });
    }
});

app.delete('/api/blogs/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        if (blog.author.toString() !== req.user._id) {
            return res.status(403).json({ message: 'Not authorized to delete this blog' });
        }

        await Blog.deleteOne({ _id: req.params.id });
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ message: 'Error deleting blog' });
    }
});

// Add a catch-all route for SPA
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/html/index.html'));
    }
});

// Export the Express API
module.exports = app;

// If running locally, start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
