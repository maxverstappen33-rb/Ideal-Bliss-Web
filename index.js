console.log("✅ Full Integrated Script Loaded!");

// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://cibsdukzkrtyeivjuzoc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Mqw_rI4PpdxKA_j48U9RSw_gQ0Yeku1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State tracking
window.isSignUpMode = false;
let allPosts = [];
let currentPage = 1;
const POSTS_PER_PAGE = 6; // Number of posts per page

// 2. TOAST NOTIFICATION SYSTEM
window.showToast = (message, type = 'success') => {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-white font-bold shadow-2xl transition-all duration-500 z-[300] ${bgColor} translate-y-20`;
    toast.innerText = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-20'), 100);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

// 3. AUTH LOGIC (With Email Check)
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (window.isSignUpMode) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            if (error.message.toLowerCase().includes("already registered") || error.status === 422) {
                showToast("This email is already in use. Try logging in!", "error");
            } else {
                showToast(error.message, "error");
            }
            return;
        }
        showToast("Success! Check your email for a link.", "success");
    } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            showToast(error.message, "error");
            return;
        }
        window.location.reload();
    }
}


// GOOGLE SIGN-IN
async function handleGoogleSignIn() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    
    if (error) {
        showToast(error.message, "error");
    }
}
// 4. COUNTER LOGIC
window.updateSavedBadge = () => {
    const countEl = document.getElementById('saved-count');
    if (!countEl) return;
    const count = JSON.parse(localStorage.getItem('readingList') || '[]').length;
    countEl.innerText = count;
    countEl.className = count > 0 
        ? "bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full border border-indigo-400 transition-all"
        : "bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-700 transition-all";
};

// 5. PAGINATION LOGIC
function paginatePosts(posts) {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
}

function renderPagination(totalPosts) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center justify-center gap-2 mt-12">';
    
    // Previous button
    paginationHTML += `
        <button 
            onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                currentPage === 1 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white'
            }">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
        </button>
    `;

    // Page numbers with smart truncation
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page + ellipsis
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="changePage(1)" class="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition-all">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += '<span class="text-gray-600 px-2">...</span>';
        }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button 
                onclick="changePage(${i})" 
                class="px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    i === currentPage 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }">
                ${i}
            </button>
        `;
    }

    // Last page + ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="text-gray-600 px-2">...</span>';
        }
        paginationHTML += `
            <button onclick="changePage(${totalPages})" class="px-4 py-2 rounded-lg font-semibold text-sm bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition-all">
                ${totalPages}
            </button>
        `;
    }

    // Next button
    paginationHTML += `
        <button 
            onclick="changePage(${currentPage + 1})" 
            ${currentPage === totalPages ? 'disabled' : ''}
            class="px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                currentPage === totalPages 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white'
            }">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    `;

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

window.changePage = (page) => {
    const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderFeed(allPosts);
    
    // Smooth scroll to top of feed
    document.getElementById('posts-feed').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 6. ENHANCED RENDER FEED with Pagination
window.renderFeed = (posts) => {
    const feedContainer = document.getElementById('posts-feed');
    if (!feedContainer) return;

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `
            <div class="col-span-full text-center py-20">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto mb-6 text-gray-700 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-gray-500 text-lg font-medium">No stories found.</p>
                <p class="text-gray-600 text-sm mt-2">Be the first to share your story!</p>
            </div>
        `;
        renderPagination(0);
        return;
    }

    // Get paginated posts
    const paginatedPosts = paginatePosts(posts);

    feedContainer.innerHTML = paginatedPosts.map(post => {
        const savedPosts = JSON.parse(localStorage.getItem('readingList') || '[]');
        const isSaved = savedPosts.includes(post.id);
        const coverImg = Array.isArray(post.image_url) ? post.image_url[0] : post.image_url;
        const wordCount = post.content ? post.content.split(/\s+/).length : 0;
        const readingTime = Math.ceil(wordCount / 200) || 1;

        return `
            <article class="group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-800 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
                <!-- Bookmark Button -->
                <button 
                    onclick="toggleBookmark(event, '${post.id}')" 
                    class="bookmark-btn absolute top-4 right-4 z-20 p-2.5 bg-black/60 backdrop-blur-md rounded-full border border-gray-700 hover:border-indigo-500 transition-all duration-300 hover:scale-110 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${isSaved ? 'text-indigo-400 fill-indigo-400' : 'text-gray-400'}" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </button>

                <!-- Clickable Post Content -->
                <div onclick="openReader('${post.id}')" class="cursor-pointer">
                    <!-- Cover Image with Gradient Overlay -->
                    ${coverImg ? `
                        <div class="relative h-56 overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10"></div>
                            <img src="${coverImg}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${post.title || 'Cover image'}">
                        </div>
                    ` : ''}

                    <!-- Content Section -->
                    <div class="p-6 ${!coverImg ? 'pt-12' : ''}">
                        <!-- Title -->
                        <h3 class="text-2xl font-bold mb-3 text-gray-100 line-clamp-2 group-hover:text-indigo-400 transition-colors duration-300 leading-tight">
                            ${post.title || 'Untitled Story'}
                        </h3>

                        <!-- Meta Info -->
                        <div class="flex items-center gap-3 mb-4 text-xs text-gray-500 font-medium">
                            <div class="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>${post.author_name || 'Anonymous'}</span>
                            </div>
                            <span class="w-1 h-1 rounded-full bg-gray-700"></span>
                            <div class="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>${readingTime} min read</span>
                            </div>
                        </div>

                        <!-- Excerpt -->
                        <p class="text-gray-400 line-clamp-3 text-sm leading-relaxed mb-4">
                            ${post.content || 'No preview available...'}
                        </p>

                        <!-- Read More Link -->
                        <div class="flex items-center gap-2 text-indigo-400 group-hover:text-indigo-300 text-sm font-semibold transition-colors">
                            <span>Read full story</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    updateSavedBadge();
    renderPagination(posts.length);
};

// 7. SEARCH & TABS
window.switchTab = (tab) => {
    const isAll = tab === 'all';
    currentPage = 1; // Reset to first page when switching tabs
    
    document.getElementById('tab-all').className = isAll 
        ? "pb-3 text-sm font-bold border-b-2 border-indigo-500 text-indigo-500 transition-all" 
        : "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-300 transition-all";
    
    document.getElementById('tab-saved').className = !isAll 
        ? "pb-3 text-sm font-bold border-b-2 border-indigo-500 text-indigo-500 flex items-center gap-2 transition-all" 
        : "pb-3 text-sm font-bold border-b-2 border-transparent text-gray-500 hover:text-gray-300 flex items-center gap-2 transition-all";
    
    document.getElementById('feed-title').innerText = isAll ? "Latest Stories" : "Your Reading List";
    
    isAll ? fetchPublishedPosts() : fetchSavedPosts();
};

// Authentication Gate for Editor Access
async function checkAuthBeforePost() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        showAuthRequiredModal();
    } else {
        window.location.href = 'editor.html';
    }
}

function showAuthRequiredModal() {
    const existingModal = document.getElementById('auth-required-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'auth-required-modal';
    modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-fadeIn';
    
    modal.innerHTML = `
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 p-8 md:p-12 rounded-3xl border-2 border-indigo-500/30 shadow-2xl max-w-lg w-full mx-4 transform scale-95 animate-scaleIn">
            <!-- Icon -->
            <div class="flex justify-center mb-6">
                <div class="bg-indigo-600/20 p-5 rounded-full border-2 border-indigo-500/50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
            </div>

            <!-- Title -->
            <h2 class="text-3xl md:text-4xl font-bold mb-4 text-white text-center">
                Authentication Required
            </h2>
            
            <!-- Message -->
            <p class="text-gray-300 text-center mb-8 text-lg leading-relaxed">
                You need to be signed in to create and publish stories. Join our community of writers today!
            </p>

            <!-- Action Buttons -->
            <div class="flex flex-col gap-3">
                <button onclick="closeAuthRequiredModal(); openAuthModal(true);" 
                        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/30">
                    Create Account
                </button>
                
                <button onclick="closeAuthRequiredModal(); openAuthModal(false);" 
                        class="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-95">
                    Sign In
                </button>
                
                <button onclick="closeAuthRequiredModal();" 
                        class="w-full text-gray-400 hover:text-white py-3 text-sm font-medium transition-colors">
                    Maybe Later
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation styles if not already present
    if (!document.getElementById('auth-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes scaleIn {
                from { 
                    transform: scale(0.9);
                    opacity: 0;
                }
                to { 
                    transform: scale(1);
                    opacity: 1;
                }
            }
            .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
            }
            .animate-scaleIn {
                animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
        `;
        document.head.appendChild(style);
    }
}

window.closeAuthRequiredModal = () => {
    const modal = document.getElementById('auth-required-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    }
};

document.getElementById('search-bar')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    currentPage = 1; // Reset to first page when searching
    
    const filteredPosts = allPosts.filter(p => 
        p.title?.toLowerCase().includes(term) || 
        p.content?.toLowerCase().includes(term) ||
        p.author_name?.toLowerCase().includes(term)
    );
    
    renderFeed(filteredPosts);
});

// 8. UI MODALS & PASSWORDS
window.openAuthModal = (isSignUp = false) => {
    window.isSignUpMode = isSignUp;
    const authModal = document.getElementById('auth-modal');
    authModal.classList.remove('hidden');
    authModal.querySelector('h2').innerText = isSignUp ? 'Create Account' : 'Welcome Back';
    document.getElementById('auth-action-btn').innerText = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('toggle-auth').innerText = isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up';
};

document.getElementById('toggle-password')?.addEventListener('click', () => {
    const pwd = document.getElementById('password');
    pwd.type = pwd.type === 'password' ? 'text' : 'password';
});

document.getElementById('password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = document.getElementById('strength-bar');
    let strength = Math.min(100, (val.length > 5 ? 33 : 0) + (/[A-Z]/.test(val) ? 33 : 0) + (/[0-9]/.test(val) ? 34 : 0));
    bar.style.width = strength + '%';
    bar.className = `h-1.5 rounded-full transition-all ${strength < 40 ? 'bg-red-500' : strength < 80 ? 'bg-yellow-500' : 'bg-green-500'}`;
});

document.getElementById('toggle-auth')?.addEventListener('click', () => window.openAuthModal(!window.isSignUpMode));

// 9. BOOKMARKS & INITIALIZATION
window.toggleBookmark = (event, postId) => {
    event.stopPropagation(); 
    let saved = JSON.parse(localStorage.getItem('readingList') || '[]');
    saved.includes(postId) ? (saved = saved.filter(id => id !== postId)) : saved.push(postId);
    localStorage.setItem('readingList', JSON.stringify(saved));
    renderFeed(allPosts);
};

document.addEventListener('DOMContentLoaded', () => {
    fetchPublishedPosts();
    updateSavedBadge();
    updateAuthUI();

    // Handle Auth Redirect Check
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_required') === 'true') {
        openAuthModal(false);
        showToast("Login required to access the editor", "error");
    }

    // Button Bindings
    document.getElementById('auth-action-btn').onclick = handleAuth;
    document.getElementById('smart-post-btn').onclick = checkAuthBeforePost;
    document.getElementById('close-modal').onclick = () => document.getElementById('auth-modal').classList.add('hidden');
    
    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            const confirmed = confirm('Are you sure you want to logout?');
            if (confirmed) {
                await supabaseClient.auth.signOut();
                showToast('Logged out successfully', 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        };
    }
    
    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        updateAuthUI();
    });
});

async function fetchPublishedPosts() {
    const { data, error } = await supabaseClient.from('posts').select('*').eq('is_draft', false).eq('is_trash', false).order('updated_at', { ascending: false });
    if (!error) { 
        allPosts = data; 
        currentPage = 1;
        renderFeed(data); 
    }
}

async function fetchSavedPosts() {
    const ids = JSON.parse(localStorage.getItem('readingList') || '[]');
    const { data } = await supabaseClient.from('posts').select('*').in('id', ids);
    allPosts = data || [];
    currentPage = 1;
    renderFeed(allPosts);
}

// Update UI based on authentication state
async function updateAuthUI() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const loggedOutUI = document.getElementById('logged-out-ui');
    const loggedInUI = document.getElementById('logged-in-ui');
    
    if (session) {
        if (loggedOutUI) loggedOutUI.classList.add('hidden');
        if (loggedInUI) loggedInUI.classList.remove('hidden');
    } else {
        if (loggedOutUI) loggedOutUI.classList.remove('hidden');
        if (loggedInUI) loggedInUI.classList.add('hidden');
    }
}

window.openReader = async (postId) => {
    const modal = document.getElementById('reader-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const galleryEl = document.getElementById('modal-gallery');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    titleEl.innerText = "Loading...";
    bodyEl.innerText = "";
    if(galleryEl) galleryEl.innerHTML = "";

    try {
        const { data: post, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) throw error;

        titleEl.innerText = post.title || "Untitled";
        bodyEl.innerText = post.content || "No content available.";

        if (post.image_url && galleryEl) {
            const images = Array.isArray(post.image_url) ? post.image_url : [post.image_url];
            images.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.className = "w-full rounded-2xl shadow-xl mb-6 object-cover";
                galleryEl.appendChild(img);
            });
        }
    } catch (err) {
        console.error("Error loading post:", err);
        titleEl.innerText = "Error";
        bodyEl.innerText = "Could not load this story. Please try again.";
    }
};

window.closeReader = () => {
    const modal = document.getElementById('reader-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('read-progress-bar').style.width = '0%';
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeReader();
    }
});

document.getElementById('modal-scroll-container').addEventListener('scroll', (e) => {
    const container = e.target;
    const winScroll = container.scrollTop;
    const height = container.scrollHeight - container.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById('read-progress-bar').style.width = scrolled + "%";
});
