const SUPABASE_URL = 'https://cibsdukzkrtyeivjuzoc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Mqw_rI4PpdxKA_j48U9RSw_gQ0Yeku1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const passwordInput = document.getElementById('new-password');
const strengthBar    = document.getElementById('strength-bar');
const strengthText   = document.getElementById('strength-text');
const updateBtn      = document.getElementById('update-btn');
const statusMsg      = document.getElementById('status-msg');

// 1. Password Strength Logic
passwordInput.oninput = (e) => {
    let strength = 0;
    const val = e.target.value;

    if (val.length > 5)              strength += 25;
    if (val.match(/[A-Z]/))          strength += 25;
    if (val.match(/[0-9]/))          strength += 25;
    if (val.match(/[^A-Za-z0-9]/))   strength += 25;

    strengthBar.style.width = strength + '%';

    if (strength === 0) {
        strengthBar.className = 'bg-red-500 h-1.5 rounded-full';
        if (strengthText) strengthText.innerText = 'Strength: None';
    } else if (strength < 50) {
        strengthBar.className = 'bg-red-500 h-1.5 rounded-full';
        if (strengthText) strengthText.innerText = 'Strength: Weak';
    } else if (strength < 100) {
        strengthBar.className = 'bg-yellow-500 h-1.5 rounded-full';
        if (strengthText) strengthText.innerText = 'Strength: Fair';
    } else {
        strengthBar.className = 'bg-green-500 h-1.5 rounded-full';
        if (strengthText) strengthText.innerText = 'Strength: Strong';
    }
};

// 2. Update Password Logic
updateBtn.onclick = async () => {
    const newPassword = passwordInput.value;

    if (newPassword.length < 6) {
        showStatus('Password must be at least 6 characters.', 'text-red-500');
        return;
    }

    updateBtn.innerText = 'Updating...';
    updateBtn.disabled  = true;

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
        showStatus(error.message, 'text-red-500');
        updateBtn.innerText = 'Update Password';
        updateBtn.disabled  = false;
    } else {
        showStatus('Success! Password updated. Redirecting...', 'text-green-500');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
};

function showStatus(msg, colorClass) {
    statusMsg.innerText   = msg;
    statusMsg.className   = `mt-4 text-center text-sm ${colorClass}`;
    statusMsg.classList.remove('hidden');
}
