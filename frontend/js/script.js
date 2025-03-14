// Targeting the parent element
const blogContainer = document.querySelector('.blog__container');
const blogModal = document.querySelector(".blog__modal__body");
const sectionTitle = document.getElementById('section-title');

// Global store
let globalStore = [];
let currentSection = 'all'; // 'all' or 'my'
let currentBlogId = null;

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Function to check if user is in public mode
const isPublicMode = () => {
    return !localStorage.getItem('token');
};

// Check authentication
const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
};

// Get auth header
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// Function to read the uploaded file as a base64 string
const readImageFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
};

// Function to create a new card
const newCard = (blog) => {
    const currentUser = localStorage.getItem('username');
    const isAuthor = blog.author && blog.author.username === currentUser;
    const previewDescription = blog.blogDescription.length > 100 ? blog.blogDescription.substring(0, 100) + '...' : blog.blogDescription;

    return `<div class="col-lg-4 col-md-6" id=${blog._id}>
        <div class="card m-2">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span class="text-muted">By: ${blog.author ? blog.author.username : 'Unknown'}</span>
                ${!isPublicMode() && isAuthor ? `
                    <div class="btn-group">
                        <button type="button" class="btn btn-outline-success btn-sm" id="${blog._id}" onclick="openEditModal.apply(this, arguments)">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" id="${blog._id}" onclick="deleteCard.apply(this, arguments)">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            ${blog.imageUrl ? `<img src="${blog.imageUrl}" class="card-img-top" alt="Blog image">` : ''}
            <div class="card-body">
                <h5 class="card-title">${blog.blogTitle}</h5>
                <p class="card-text">${previewDescription}</p>
                <span class="badge bg-primary">${blog.blogType}</span>
            </div>
            <div class="card-footer d-flex justify-content-end gap-2">
                ${!isPublicMode() ? `
                    <button type="button" class="btn btn-outline-secondary" onclick="openCommentModal('${blog._id}')">
                        <i class="fas fa-comment"></i> Comment
                    </button>
                ` : ''}
                <button type="button" class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#showblog" onclick="openBlog.apply(this, arguments)" id="${blog._id}">
                    <i class="fas fa-book-open"></i> Read More
                </button>
            </div>
        </div>
    </div>`;
};

// Function to load data from MongoDB
const loadData = async (section = 'all') => {
    try {
        currentSection = section;
        
        // If trying to access 'my' blogs in public mode, redirect to login
        if (section === 'my' && isPublicMode()) {
            alert('Please login to view your blogs');
            window.location.href = 'login.html';
            return;
        }

        const endpoint = section === 'my' ? `${API_BASE_URL}/blogs/my` : `${API_BASE_URL}/blogs`;
        const headers = section === 'my' ? getAuthHeader() : { 'Content-Type': 'application/json' };
        
        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
            if (response.status === 401 && section === 'my') {
                alert('Please login to view your blogs');
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Failed to fetch blogs');
        }
        
        const blogs = await response.json();
        globalStore = blogs;
        
        // Update section title
        sectionTitle.textContent = section === 'my' ? 'My Blogs' : 'All Blogs';
        
        // Show/hide add button and my blogs button based on auth state
        const addNewBtn = document.getElementById('add-new-btn');
        const myBlogsBtn = document.getElementById('my-blogs-btn');
        
        if (isPublicMode()) {
            addNewBtn.style.display = 'none';
            myBlogsBtn.style.display = 'block';
        } else {
            addNewBtn.style.display = section === 'my' ? 'block' : 'none';
            myBlogsBtn.style.display = 'block';
        }
        
        // Clear and reload blog container
        blogContainer.innerHTML = '';
        if (blogs.length === 0) {
            blogContainer.innerHTML = '<div class="col-12 text-center mt-5"><h3>No blogs found</h3></div>';
        } else {
            const blogHTML = blogs.map((blog) => newCard(blog)).join('');
            blogContainer.insertAdjacentHTML('beforeend', blogHTML);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        blogContainer.innerHTML = '<div class="col-12 text-center mt-5"><h3>Error loading blogs. Please try again later.</h3></div>';
    }
};

// Updated function to save changes (add new blog)
const saveChanges = async () => {
    if (!checkAuth()) return;

    const imageFile = document.getElementById('imagefile').files[0];
    let imageUrl = document.getElementById('imageurl').value;

    if (imageFile) {
        try {
            imageUrl = await readImageFile(imageFile);
        } catch (error) {
            console.error('Error reading image file:', error);
            return;
        }
    }

    if (!imageUrl) return;

    const blogData = {
        id: `${Date.now()}`,
        imageUrl,
        blogTitle: document.getElementById('title').value,
        blogType: document.getElementById('type').value,
        blogDescription: document.getElementById('description').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/blogs`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(blogData)
        });

        if (!response.ok) {
            throw new Error('Failed to save blog');
        }

        const savedBlog = await response.json();
        const createNewBlog = newCard(savedBlog);
        blogContainer.insertAdjacentHTML("beforeend", createNewBlog);
        globalStore.push(savedBlog);
        
        clearForm();
    } catch (error) {
        console.error('Error saving blog:', error);
        if (error.message === 'Failed to save blog') {
            alert('Please log in to create a blog post.');
            window.location.href = 'login.html';
        }
    }
};

// Function to update MongoDB
const updateMongoDB = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/blogs`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({ cards: globalStore })
        });

        if (!response.ok) {
            throw new Error('Failed to update MongoDB');
        }
    } catch (error) {
        console.error('Error updating MongoDB:', error);
    }
};

// Function to clear the form fields
const clearForm = () => {
    document.getElementById('imageurl').value = '';
    document.getElementById('imagefile').value = '';
    document.getElementById('title').value = '';
    document.getElementById('type').value = '';
    document.getElementById('description').value = '';
};

// Function to delete a card
const deleteCard = async (event) => {
    if (!checkAuth()) return;

    event = event || window.event;
    let targetID = event.target.id;
    
    // If clicked on the icon, get the parent button's ID
    if (!targetID) {
        targetID = event.target.closest('button').id;
    }

    if (!targetID) {
        console.error('Could not find blog ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/blogs/${targetID}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete blog');
        }

        // Show success message and reload page
        alert('Blog deleted successfully!');
        window.location.reload();
        
    } catch (error) {
        console.error('Error deleting blog:', error);
        if (error.message === 'Not authorized to delete this blog') {
            alert('You can only delete your own blog posts.');
        } else {
            alert('Error deleting blog. Please try again.');
        }
    }
};

// Function to open the edit modal with existing blog data
const openEditModal = (event) => {
    event = event || window.event;
    const targetID = event.target.id || event.target.closest('button').id;

    if (!targetID) {
        console.error('Could not find blog ID');
        return;
    }

    const blogToEdit = globalStore.find(blog => blog._id === targetID);
    if (!blogToEdit) {
        console.error('Could not find blog data');
        return;
    }

    document.getElementById('imageurl').value = blogToEdit.imageUrl || '';
    document.getElementById('imagefile').value = '';
    document.getElementById('title').value = blogToEdit.blogTitle || '';
    document.getElementById('type').value = blogToEdit.blogType || '';
    document.getElementById('description').value = blogToEdit.blogDescription || '';

    const saveButton = document.querySelector('.modal-footer .btn-primary');
    saveButton.setAttribute('onclick', `saveEditChanges('${targetID}')`);
    saveButton.innerHTML = 'Save Changes';

    const editModal = new bootstrap.Modal(document.getElementById('staticBackdrop'));
    editModal.show();

    document.getElementById('staticBackdrop').addEventListener('hidden.bs.modal', removeModalBackdrop);
};

// Function to save edited changes
const saveEditChanges = async (id) => {
    if (!checkAuth()) return;

    const blogData = {
        id,
        blogTitle: document.getElementById('title').value,
        blogType: document.getElementById('type').value,
        blogDescription: document.getElementById('description').value
    };

    // Keep existing image if no new image is selected
    const imageFile = document.getElementById('imagefile').files[0];
    const imageUrl = document.getElementById('imageurl').value;

    if (imageFile) {
        try {
            blogData.imageUrl = await readImageFile(imageFile);
        } catch (error) {
            console.error('Error reading image file:', error);
            return;
        }
    } else if (imageUrl) {
        blogData.imageUrl = imageUrl;
    } else {
        const existingBlog = globalStore.find(item => item.id === id);
        blogData.imageUrl = existingBlog.imageUrl;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(blogData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        const updatedBlog = await response.json();
        const updatedCard = newCard(updatedBlog);
        
        // Update DOM and global store
        const cardElement = document.getElementById(id);
        cardElement.parentElement.parentElement.outerHTML = updatedCard;
        globalStore = globalStore.map(item => item.id === id ? updatedBlog : item);
        
        // Close the modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        editModal.hide();
        
        clearForm();
        alert('Blog updated successfully!');
        
        // Reload page after successful edit
        setTimeout(() => {
            window.location.reload();
        }, 100); // Reduced delay for faster reload
    } catch (error) {
        console.error('Error updating blog:', error);
        if (error.message === 'Not authorized to edit this blog') {
            alert('You can only edit your own blog posts.');
        } else {
            alert('Error updating blog. Please try again.');
        }
    }
};

// Function to open blog modal
const openBlog = async (event) => {
    try {
        event = event || window.event;
        const targetID = event.target.closest('button').id;
        const getBlog = globalStore.find((blog) => blog._id === targetID || blog.id === targetID);
        if (getBlog) {
            // Store the MongoDB _id for comment operations
            currentBlogId = getBlog._id;
            
            const blogModal = document.querySelector(".blog__modal__body");
            if (blogModal) {
                // Fetch comments for this blog using MongoDB _id
                let comments = [];
                try {
                    const response = await fetch(`http://localhost:3000/api/blogs/${getBlog._id}/comments`);
                    if (response.ok) {
                        comments = await response.json();
                    }
                } catch (error) {
                    console.error('Error fetching comments:', error);
                }
                
                // Add comments to the blog object
                getBlog.comments = comments;
                blogModal.innerHTML = htmlModalContent(getBlog);
            } else {
                console.error('Blog modal body not found');
            }
        } else {
            console.error('Blog not found with ID:', targetID);
        }
    } catch (error) {
        console.error('Error opening blog:', error);
    }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const htmlModalContent = ({
    _id,
    id,
    blogTitle,
    blogDescription,
    imageUrl,
    blogType,
    author,
    comments = []
}) => {
    const blogId = _id || id;
    const date = new Date(parseInt(blogId));
    const formattedDate = !isNaN(date.getTime()) ? date.toLocaleString() : 'Date not available';
    const authorName = author && author.username ? author.username : 'Unknown';

    return `<div id=${blogId}>
        <img
            src=${imageUrl}
            alt="bg image"
            class="img-fluid place__holder__image mb-3 p-4"
        />
        <div class="text-sm text-muted">
            Created on ${formattedDate}
            <br>By: ${authorName}
        </div>
        <h2 class="my-4 text-center" style="font-size: 2em;">${blogTitle}</h2>
        <div class="text-center" style="margin-top: -10px;">
            <span class="badge bg-primary" style="font-size: 0.8em;">${blogType}</span>
        </div>
        <p class="lead mt-2">${blogDescription}</p>
        
        <!-- Comments Section -->
        <div class="comments-section mt-4">
            <h4>Comments (${comments.length})</h4>
            ${comments.length > 0 ? 
                comments.map(comment => `
                    <div class="comment border-bottom py-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong class="text-primary">${comment.author ? comment.author.username : 'Anonymous'}</strong>
                            <small class="text-muted">${formatDate(comment.createdAt)}</small>
                        </div>
                        <p class="mb-0">${comment.text}</p>
                    </div>
                `).join('') 
                : '<p class="text-muted">No comments yet. Be the first to comment!</p>'
            }
        </div>
    </div>`;
};

const removeModalBackdrop = () => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style = '';
};

// Add logout functionality
const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
};

// Add logout button event listener
document.getElementById('login-logout-btn').addEventListener('click', () => {
    if (localStorage.getItem('token')) {
        logout();
    } else {
        window.location.href = 'login.html';
    }
});

// Update login/logout button text
const updateAuthButton = () => {
    const button = document.getElementById('login-logout-btn');
    if (isPublicMode()) {
        button.textContent = 'Login';
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');
        button.onclick = () => window.location.href = 'login.html';
    } else {
        button.textContent = 'Logout';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
        button.onclick = logout;
    }
};

// Add event listeners for navigation
document.getElementById('home-btn').addEventListener('click', () => {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('blog-content').style.display = 'block';
    loadData('all');
});

document.getElementById('my-blogs-btn').addEventListener('click', (e) => {
    e.preventDefault();
    if (isPublicMode()) {
        alert('Please login to view your blogs');
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('blog-content').style.display = 'block';
    loadData('my');
});

document.getElementById('explore-blogs-btn').addEventListener('click', function() {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('blog-content').style.display = 'block';
    loadData('all');
});

document.getElementById('home-btn').addEventListener('click', function() {
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('blog-content').style.display = 'block';
    loadData('all');
});

// Function to open comment modal
const openCommentModal = (blogId) => {
    try {
        currentBlogId = blogId;
        const commentModal = document.getElementById('commentModal');
        if (!commentModal) {
            console.error('Comment modal element not found');
            return;
        }
        
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded');
            return;
        }

        let bsModal;
        try {
            bsModal = bootstrap.Modal.getInstance(commentModal);
            if (!bsModal) {
                bsModal = new bootstrap.Modal(commentModal);
            }
        } catch (modalError) {
            console.error('Error creating modal:', modalError);
            return;
        }

        bsModal.show();
    } catch (error) {
        console.error('Error opening comment modal:', error);
    }
};

// Function to submit comment
const submitComment = async () => {
    const commentText = document.getElementById('commentText').value;
    if (!commentText.trim()) {
        alert('Please enter a comment');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to comment');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/blogs/${currentBlogId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                text: commentText
            })
        });

        if (response.ok) {
            // Clear the comment text
            document.getElementById('commentText').value = '';
            
            // Close the comment modal
            const commentModal = document.getElementById('commentModal');
            const bsCommentModal = bootstrap.Modal.getInstance(commentModal);
            bsCommentModal.hide();

            // Refresh the blog modal content to show the new comment
            const blogModal = document.querySelector(".blog__modal__body");
            if (blogModal) {
                try {
                    // Fetch updated comments
                    const commentsResponse = await fetch(`http://localhost:3000/api/blogs/${currentBlogId}/comments`);
                    if (commentsResponse.ok) {
                        const comments = await commentsResponse.json();
                        
                        // Get the current blog data
                        const currentBlog = globalStore.find(blog => blog._id === currentBlogId || blog.id === currentBlogId);
                        if (currentBlog) {
                            // Update the modal content with new comments
                            currentBlog.comments = comments;
                            blogModal.innerHTML = htmlModalContent(currentBlog);
                        }
                    }
                } catch (error) {
                    console.error('Error refreshing comments:', error);
                }
            }
        } else {
            const errorData = await response.json();
            alert(errorData.message || 'Failed to submit comment');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment. Please try again.');
    }
};

// Initialize page
const onload = () => {
    updateAuthButton();
    document.getElementById('welcome-section').style.display = 'none';
    document.getElementById('blog-content').style.display = 'block';
    loadData('all'); // Load all blogs by default
    
    // Initialize all modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modalElement => {
        new bootstrap.Modal(modalElement);
    });
};

window.onload = onload;
