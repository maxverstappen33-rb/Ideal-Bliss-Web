// --- CONFIGURATION ---
const SUPABASE_URL = 'https://cibsdukzkrtyeivjuzoc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Mqw_rI4PpdxKA_j48U9RSw_gQ0Yeku1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUD_NAME = 'djxr1flup';
const UPLOAD_PRESET = 'blogpost';

// --- STATE ---
let saveTimeout;
let currentDraftId = sessionStorage.getItem('activeDraftId');
let imageUrls = [];

// --- 1. AUTH GATE (runs once, before anything else) ---
async function checkUserAccess() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // Show a professional access denied screen
        document.body.innerHTML = `
            <div class="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
                <div class="bg-gray-800/50 backdrop-blur-xl p-10 md:p-16 rounded-3xl border-2 border-red-500/30 shadow-2xl max-w-2xl w-full text-center">
                    <!-- Lock Icon -->
                    <div class="flex justify-center mb-8">
                        <div class="bg-red-600/20 p-6 rounded-full border-2 border-red-500/50 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Title -->
                    <h1 class="text-4xl md:text-5xl font-black text-white mb-4">
                        Access Denied
                    </h1>
                    
                    <!-- Message -->
                    <p class="text-gray-300 text-lg md:text-xl mb-8 leading-relaxed">
                        You must be signed in to access the story editor. 
                        <br class="hidden md:block">
                        Please log in or create an account to start writing.
                    </p>
                    
                    <!-- Countdown -->
                    <p class="text-gray-500 text-sm mb-8">
                        Redirecting to homepage in <span id="countdown" class="text-red-400 font-bold">3</span> seconds...
                    </p>
                    
                    <!-- Action Button -->
                    <button onclick="window.location.href='index.html?auth_required=true'" 
                            class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/30">
                        Go to Login Page
                    </button>
                </div>
            </div>
        `;
        
        // Countdown timer
        let countdown = 3;
        const countdownEl = document.getElementById('countdown');
        const timer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = 'index.html?auth_required=true';
            }
        }, 1000);
        
        return; // Stop execution
    } else {
        // Only show the editor body if the user is confirmed logged in
        document.body.classList.remove('opacity-0');
    }
}
checkUserAccess();

// --- 2. EVERYTHING ELSE WAITS FOR THE DOM ---
document.addEventListener('DOMContentLoaded', () => {

    // --- UI Element References ---
    // These match the IDs that actually exist in editor.html
    const html            = document.documentElement;
    const themeContainer  = document.getElementById('theme-toggle-container');
    const themeIndicator  = document.getElementById('theme-indicator');
    const statusEl        = document.getElementById('save-status');
    const titleArea       = document.getElementById('post-title');
    const authorArea      = document.getElementById('author-name');
    const contentArea     = document.getElementById('post-content');
    const wordCountEl     = document.getElementById('word-count-display');   // was 'word-count'
    const readingTimeEl   = document.getElementById('reading-time-display'); // was 'reading-time'
    const fileInput       = document.getElementById('file-input');
    const uploadTrigger   = document.getElementById('upload-trigger');
    const uploadStatus    = document.getElementById('upload-status');

    // --- 3. THEME TOGGLE ---
    const setTheme = (theme, isInitial = false) => {
        if (isInitial) html.style.transition = 'none';

        if (theme === 'dark') {
            html.classList.add('dark');
            if (themeIndicator) themeIndicator.style.transform = 'translateX(44px)';
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark');
            if (themeIndicator) themeIndicator.style.transform = 'translateX(0px)';
            localStorage.setItem('theme', 'light');
        }

        if (isInitial) setTimeout(() => { html.style.transition = ''; }, 100);
    };

    setTheme(localStorage.getItem('theme') || 'light', true);

    themeContainer?.addEventListener('click', () => {
        setTheme(html.classList.contains('dark') ? 'light' : 'dark');
    });

    // --- 4. UI HELPERS ---
    function autoResize(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight + 4) + 'px';
    }

    function updateWritingStats() {
        const text  = contentArea.value.trim();
        const words = text.length > 0 ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
        const mins  = words === 0 ? 0 : Math.ceil(words / 200);

        if (wordCountEl)    wordCountEl.innerText    = words + ' words';
        if (readingTimeEl)  readingTimeEl.innerText  = mins + ' min read';
    }

    // Replaces the entire save-status block with either a spinner or a checkmark.
    // This works regardless of what's already rendered inside the container.
    function showStatus(msg) {
        if (!statusEl) return;
        statusEl.innerHTML = `
            <div class="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-[10px] uppercase tracking-widest font-black text-blue-500">${msg}</span>
        `;
    }

    function showSaved() {
        if (!statusEl) return;
        statusEl.innerHTML = `
            <svg class="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-[10px] uppercase tracking-widest font-black">Draft Saved</span>
        `;
    }

    // --- 5. CLOUD SAVE (Supabase upsert) ---
    async function performUpsert() {
        const title      = titleArea.value.trim();
        const authorName = authorArea?.value.trim() || '';
        const content    = contentArea.value.trim();

        // Nothing to save yet
        if (!title && !content && imageUrls.length === 0) return;

        showStatus('Saving...');

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (!user || authError) {
            showStatus('Log in to save');
            return;
        }

        const payload = {
            title,
            content,
            author_name: authorName,
            image_url:  imageUrls,
            author_email: user.email,
            is_draft:   true,
            is_trash:   false,
            updated_at: new Date()
        };

        // If we already have a draft in the DB, target that row
        if (currentDraftId) payload.id = currentDraftId;

        const { data, error } = await supabaseClient.from('posts').upsert(payload).select();

        if (!error && data?.[0]) {
            currentDraftId = data[0].id;
            sessionStorage.setItem('activeDraftId', currentDraftId);
            showSaved();
        } else {
            console.error('Supabase upsert error:', error);
            if (statusEl) statusEl.innerHTML = `<span class="text-[10px] uppercase tracking-widest font-black text-red-500">Error saving</span>`;
        }
    }

    function triggerAutoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(performUpsert, 800);
    }

    // --- 6. IMAGE UPLOAD ---
    uploadTrigger?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadStatus?.classList.remove('hidden');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
            const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.secure_url) {
                imageUrls.push(data.secure_url);
                fileInput.value = '';   // reset so the same file can be re-selected
                renderGallery();
                triggerAutoSave();
            }
        } catch (err) {
            console.error('Cloudinary upload error:', err);
            alert('Upload failed. Please try again.');
        } finally {
            uploadStatus?.classList.add('hidden');
        }
    });

    window.renderGallery = () => {
        const gallery = document.getElementById('image-gallery');
        if (!gallery) return;

        gallery.innerHTML = imageUrls.map((url, i) => `
            <div class="relative group overflow-hidden rounded-2xl h-64 shadow-md border dark:border-gray-800">
                <img src="${url}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="removeGalleryImage(${i})" class="bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs transform hover:scale-105 transition">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    };

    window.removeGalleryImage = (index) => {
        imageUrls.splice(index, 1);
        renderGallery();
        triggerAutoSave();
    };

    // --- 7. INPUT LISTENERS (title, author, content) ---
    [titleArea, authorArea, contentArea].forEach(el => {
        el?.addEventListener('input', () => {
            if (el !== authorArea) autoResize(el);
            if (el === contentArea) updateWritingStats();
            showStatus('Changes detected...');
            triggerAutoSave();
        });
    });

    // --- 8. PUBLISH BUTTON ---
    document.getElementById('publish-btn')?.addEventListener('click', async () => {
        // Make sure there is actually a draft row in the DB before we try to update it
        if (!currentDraftId) await performUpsert();
        if (!currentDraftId) return; // still nothing (e.g. empty post) — bail

        showStatus('Publishing...');

        const { error } = await supabaseClient.from('posts')
            .update({ is_draft: false, updated_at: new Date() })
            .eq('id', currentDraftId);

        if (!error) {
            sessionStorage.removeItem('activeDraftId');
            window.location.href = 'index.html';
        } else {
            console.error('Publish error:', error);
            if (statusEl) statusEl.innerHTML = `<span class="text-[10px] uppercase tracking-widest font-black text-red-500">Error publishing</span>`;
        }
    });

    // --- 9. DISCARD DRAFT (the nav link back to index.html) ---
    const discardLink = document.querySelector('a[href="index.html"]');
    if (discardLink) {
        discardLink.addEventListener('click', async (e) => {
            // If there is no draft saved anywhere, just let the link go
            if (!currentDraftId) return;

            // Otherwise pause navigation and ask
            e.preventDefault();
            const confirmed = confirm('Are you sure? This will delete your saved draft.');
            if (!confirmed) return;

            // Delete the draft row from Supabase, then navigate
            await supabaseClient.from('posts').delete().eq('id', currentDraftId);
            sessionStorage.removeItem('activeDraftId');
            window.location.href = 'index.html';
        });
    }

    // --- 10. LOAD EXISTING DRAFT ON PAGE OPEN ---
    (async () => {
        if (!currentDraftId) return;

        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', currentDraftId)
            .single();

        if (!error && data) {
            titleArea.value  = data.title || '';
            if (authorArea)  authorArea.value = data.author_name || '';
            contentArea.value = data.content || '';

            imageUrls = Array.isArray(data.image_url)
                ? data.image_url
                : (data.image_url ? [data.image_url] : []);

            renderGallery();
            autoResize(titleArea);
            autoResize(contentArea);
            updateWritingStats();
        }
    })();

    // --- 11. AUTO-FOCUS (desktop only, new post only) ---
    if (window.innerWidth > 768 && titleArea && !currentDraftId) {
        titleArea.focus();
    }
});

        publishBtn.addEventListener('click', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
        alert("Your session has expired. Please log in again.");
        return;
    }

    // Continue with publishing...
    const { error } = await supabaseClient.from('posts').insert([{
        title: titleArea.value,
        content: contentArea.value,
        author_name: authorArea.value,
        user_id: user.id // Best practice: Link the post to the user's ID
    }]);
});