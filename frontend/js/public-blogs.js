// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

let blogsData = []; // Store blogs data globally

async function loadPublicBlogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/blogs`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const blogs = await response.json();
        blogsData = blogs; // Store blogs data globally
        if (blogs && blogs.length > 0) {
            displayBlogs(blogs);
        } else {
            document.getElementById('blogs-container').innerHTML = '<div class="col-12 text-center"><h3>No blogs available</h3></div>';
        }
    } catch (error) {
        console.error('Error loading blogs:', error);
        document.getElementById('blogs-container').innerHTML = '<div class="col-12 text-center"><h3>Error loading blogs</h3></div>';
    }
}

function displayBlogs(blogs) {
    const container = document.getElementById('blogs-container');
    container.innerHTML = '';
    
    blogs.forEach(blog => {
        const blogCard = `
            <div class="col-md-4 mb-4">
                <div class="card">
                    ${blog.imageUrl ? `<img src="${blog.imageUrl}" class="card-img-top" alt="Blog Image">` : ''}
                    <div class="card-body">
                        <h5 class="card-title">${blog.blogTitle || 'Untitled'}</h5>
                        <p class="card-text">${blog.blogDescription ? blog.blogDescription.substring(0, 100) + '...' : 'No description available'}</p>
                        <button class="btn btn-primary mb-2" onclick="showFullBlog('${blog._id}')">Read More</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += blogCard;
    });
}

function showFullBlog(blogId) {
    const blog = blogsData.find(b => b._id === blogId);
    if (!blog) {
        alert('Blog not found');
        return;
    }

    const modalContent = `
        <div class="blog-full-content">
            ${blog.imageUrl ? `
                <div class="text-center mb-4">
                    <img src="${blog.imageUrl}" class="img-fluid rounded" alt="Blog Image" style="max-height: 400px;">
                </div>
            ` : ''}
            <h3 class="mb-4">${blog.blogTitle || 'Untitled'}</h3>
            <div class="blog-meta mb-3">
                <small class="text-muted">
                    Posted by ${blog.author ? blog.author.username : 'Anonymous'}
                </small>
            </div>
            <div class="blog-description">
                ${blog.blogDescription || 'No content available'}
            </div>
            ${blog.blogType ? `<div class="mt-3"><span class="badge bg-secondary">${blog.blogType}</span></div>` : ''}
            
            ${blog.comments && blog.comments.length > 0 ? `
                <div class="comments-section mt-4">
                    <h5>Comments</h5>
                    ${blog.comments.map(comment => `
                        <div class="comment-item border-bottom py-2">
                            <small class="text-muted">${comment.author ? comment.author.username : 'Anonymous'} - ${new Date(comment.createdAt).toLocaleString()}</small>
                            <p class="mb-0">${comment.text}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('fullBlogContent').innerHTML = modalContent;
    document.getElementById('readMoreModalLabel').textContent = blog.blogTitle || 'Blog Post';
    const modal = new bootstrap.Modal(document.getElementById('readMoreModal'));
    modal.show();
}
