// ============================================================================
// SECURE ADMIN AUTHENTICATION - Uses Supabase Auth (Server-Side)
// ============================================================================
// NO HARDCODED CREDENTIALS - All authentication happens server-side via Supabase
// ============================================================================

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://cibsdukzkrtyeivjuzoc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Mqw_rI4PpdxKA_j48U9RSw_gQ0Yeku1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// List of admin email addresses (you can add multiple admins)
// This is safe to expose - it just checks IF someone is an admin AFTER they authenticate
const ADMIN_EMAILS = [
    'thevith19@gmail.com',  // Add your admin email(s) here
    // 'admin2@example.com',  // You can add more admins
];

// Session management
let isAuthenticated = false;
let currentAdminEmail = null;

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkSupabaseSession();
    setupAuthListeners();
});

// Check if user is already logged in via Supabase
async function checkSupabaseSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session && session.user) {
        // User is logged in, check if they're an admin
        const userEmail = session.user.email;
        
        if (ADMIN_EMAILS.includes(userEmail)) {
            // User is an authorized admin
            authenticateUser(userEmail);
        } else {
            // User is logged in but NOT an admin
            showError('Access Denied: You do not have admin privileges.');
        }
    }
}

// Setup authentication event listeners
function setupAuthListeners() {
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const togglePassword = document.getElementById('toggle-password');
    const logoutBtn = document.getElementById('logout-btn');

    // Login button click
    loginBtn?.addEventListener('click', handleLogin);

    // Enter key to login
    [emailInput, passwordInput].forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    });

    // Toggle password visibility
    togglePassword?.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
    });

    // Logout button
    logoutBtn?.addEventListener('click', handleLogout);
}

// Handle login via Supabase authentication
async function handleLogin() {
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('auth-error');
    const errorMsgEl = document.getElementById('auth-error-message');
    const loginBtn = document.getElementById('login-btn');

    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    try {
        // Authenticate with Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            showError(error.message);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Access Dashboard';
            return;
        }

        // Check if the authenticated user is an admin
        if (!ADMIN_EMAILS.includes(email)) {
            // User authenticated but is not an admin
            await supabaseClient.auth.signOut();
            showError('Access Denied: You do not have admin privileges.');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Access Dashboard';
            return;
        }

        // Success - user is authenticated AND is an admin
        authenticateUser(email);

    } catch (err) {
        console.error('Login error:', err);
        showError('An unexpected error occurred. Please try again.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Access Dashboard';
    }
}

// Authenticate user and show dashboard
function authenticateUser(email) {
    isAuthenticated = true;
    currentAdminEmail = email;

    // Store session (just to maintain login state)
    sessionStorage.setItem('adminAuthenticated', 'true');

    // Hide auth modal and show dashboard
    const authModal = document.getElementById('auth-modal');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (authModal) authModal.classList.add('hidden');
    if (dashboardContent) dashboardContent.classList.remove('hidden');
    
    // Unlock page
    document.body.classList.remove('locked');

    // Update UI with admin email
    const adminEmailEl = document.getElementById('admin-user-email');
    if (adminEmailEl) adminEmailEl.textContent = email;

    // Load dashboard data
    loadDashboardData();
}

// Show error message
function showError(message) {
    const errorEl = document.getElementById('auth-error');
    const errorMsgEl = document.getElementById('auth-error-message');
    
    if (errorMsgEl) errorMsgEl.textContent = message;
    if (errorEl) errorEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorEl) errorEl.classList.add('hidden');
    }, 5000);
}

// Handle logout
async function handleLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    // Sign out from Supabase
    await supabaseClient.auth.signOut();
    
    // Clear session
    sessionStorage.removeItem('adminAuthenticated');
    isAuthenticated = false;
    currentAdminEmail = null;

    // Reload page to show login screen
    window.location.reload();
}

// ============================================================================
// DASHBOARD DATA LOADING
// ============================================================================

async function loadDashboardData() {
    await Promise.all([
        loadPosts(),
        loadStats(),
        loadContributors()
    ]);
}

// Load all posts from database
async function loadPosts() {
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        renderPostsTable(posts);
        renderTrashTable(posts);
    } catch (err) {
        console.error('Error loading posts:', err);
    }
}

// Load statistics
async function loadStats() {
    try {
        const { data: allPosts, error } = await supabaseClient
            .from('posts')
            .select('*');

        if (error) throw error;

        const activePosts = allPosts.filter(p => !p.is_trash);
        const publishedPosts = activePosts.filter(p => !p.is_draft);
        const trashedPosts = allPosts.filter(p => p.is_trash);
        const uniqueAuthors = [...new Set(activePosts.map(p => p.author_email))].length;

        document.getElementById('total-posts').textContent = activePosts.length;
        document.getElementById('total-users').textContent = uniqueAuthors;
        document.getElementById('published-count').textContent = publishedPosts.length;
        document.getElementById('trash-count').textContent = trashedPosts.length;

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// Load contributors list
async function loadContributors() {
    try {
        const { data: posts, error } = await supabaseClient
            .from('posts')
            .select('author_name, author_email')
            .eq('is_trash', false);

        if (error) throw error;

        const contributorsMap = new Map();
        posts.forEach(post => {
            const email = post.author_email;
            if (!contributorsMap.has(email)) {
                contributorsMap.set(email, {
                    name: post.author_name || 'Anonymous',
                    email: email,
                    count: 0
                });
            }
            contributorsMap.get(email).count++;
        });

        const userListEl = document.getElementById('user-list');
        if (!userListEl) return;

        if (contributorsMap.size === 0) {
            userListEl.innerHTML = '<li class="py-3 text-gray-500 text-sm italic">No contributors yet</li>';
            return;
        }

        userListEl.innerHTML = Array.from(contributorsMap.values()).map(contributor => `
            <li class="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span class="text-indigo-600 font-bold text-sm">${contributor.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${contributor.name}</p>
                        <p class="text-xs text-gray-500">${contributor.email}</p>
                    </div>
                </div>
                <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                    ${contributor.count} ${contributor.count === 1 ? 'post' : 'posts'}
                </span>
            </li>
        `).join('');

    } catch (err) {
        console.error('Error loading contributors:', err);
    }
}

// Render posts table
function renderPostsTable(posts) {
    const tableBody = document.getElementById('admin-posts-table');
    if (!tableBody) return;

    const activePosts = posts.filter(p => !p.is_trash);

    if (activePosts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-16 text-center text-gray-500">
                    No posts found. Posts will appear here once created.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = activePosts.map(post => {
        const date = new Date(post.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const statusBadge = post.is_draft
            ? '<span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">Draft</span>'
            : '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Published</span>';

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-900 mb-1">${post.title || 'Untitled'}</div>
                    <div class="text-sm text-gray-500 line-clamp-1">${(post.content || '').substring(0, 80)}...</div>
                </td>
                <td class="px-6 py-4 text-gray-700">${post.author_name || 'Anonymous'}</td>
                <td class="px-6 py-4 text-gray-600 text-sm">${post.author_email || 'N/A'}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-gray-600 text-sm">${date}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2 justify-end">
                        <button onclick="viewPost('${post.id}')" class="p-2 hover:bg-blue-50 rounded-lg transition" title="View">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button onclick="editPost('${post.id}')" class="p-2 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button onclick="togglePublish('${post.id}', ${post.is_draft})" class="p-2 hover:bg-green-50 rounded-lg transition" title="${post.is_draft ? 'Publish' : 'Unpublish'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${post.is_draft ? 'text-green-600' : 'text-gray-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        <button onclick="moveToTrash('${post.id}')" class="p-2 hover:bg-gray-50 rounded-lg transition" title="Move to Trash">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        </button>
                        <button onclick="deletePost('${post.id}')" class="p-2 hover:bg-red-50 rounded-lg transition" title="Delete Permanently">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render trash table
function renderTrashTable(posts) {
    const trashBody = document.getElementById('trash-table');
    if (!trashBody) return;

    const trashedPosts = posts.filter(p => p.is_trash);

    if (trashedPosts.length === 0) {
        trashBody.innerHTML = '<tr><td class="p-4 text-gray-500 italic text-center">Trash is empty</td></tr>';
        return;
    }

    trashBody.innerHTML = trashedPosts.map(post => `
        <tr class="hover:bg-red-100 transition">
            <td class="p-4">
                <span class="font-medium text-gray-800">${post.title || 'Untitled'}</span>
                <span class="text-gray-500 text-xs ml-2">by ${post.author_name || 'Anonymous'}</span>
            </td>
            <td class="p-4 text-right">
                <button onclick="restorePost('${post.id}')" class="text-green-600 hover:text-green-700 font-medium text-sm mr-4">
                    Restore
                </button>
                <button onclick="deletePost('${post.id}')" class="text-red-600 hover:text-red-700 font-medium text-sm">
                    Delete Forever
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================================================
// POST ACTIONS
// ============================================================================

window.viewPost = (postId) => {
    window.open(`index.html#post-${postId}`, '_blank');
};

window.editPost = (postId) => {
    sessionStorage.setItem('activeDraftId', postId);
    window.open('editor.html', '_blank');
};

window.togglePublish = async (postId, isDraft) => {
    const action = isDraft ? 'publish' : 'unpublish';
    const confirmed = confirm(`Are you sure you want to ${action} this post?`);
    if (!confirmed) return;

    const { error } = await supabaseClient
        .from('posts')
        .update({ is_draft: !isDraft })
        .eq('id', postId);

    if (!error) {
        loadDashboardData();
    } else {
        alert('Error updating post: ' + error.message);
    }
};

window.moveToTrash = async (postId) => {
    const confirmed = confirm('Move this post to trash?');
    if (!confirmed) return;

    const { error } = await supabaseClient
        .from('posts')
        .update({ is_trash: true })
        .eq('id', postId);

    if (!error) {
        loadDashboardData();
    } else {
        alert('Error moving to trash: ' + error.message);
    }
};

window.restorePost = async (postId) => {
    const { error } = await supabaseClient
        .from('posts')
        .update({ is_trash: false })
        .eq('id', postId);

    if (!error) {
        loadDashboardData();
    } else {
        alert('Error restoring post: ' + error.message);
    }
};

window.deletePost = async (postId) => {
    const confirmed = confirm('⚠️ PERMANENT DELETE ⚠️\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?');
    if (!confirmed) return;

    const doubleCheck = confirm('Last chance! Delete this post forever?');
    if (!doubleCheck) return;

    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);

    if (!error) {
        loadDashboardData();
    } else {
        alert('Error deleting post: ' + error.message);
    }
};
