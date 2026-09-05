 // GLOBAL VARIABLES
        let generatedCode = null;
        let tempUser = {};
        let resetEmailAddr = "";
        
        // --- TOAST NOTIFICATIONS ---
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span class="toast-msg">${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
        }

        // --- NAVIGATION ---
        function setMode(mode) {
            document.getElementById('main-tabs').style.display = 'flex';
            document.querySelectorAll('.form-slide').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            if (mode === 'login') {
                document.getElementById('login-form').classList.add('active');
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
            } else {
                document.getElementById('signup-form').classList.add('active');
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
            }
        }
        function showForgotPassword() {
            document.getElementById('main-tabs').style.display = 'none';
            document.querySelectorAll('.form-slide').forEach(s => s.classList.remove('active'));
            document.getElementById('forgot-form').classList.add('active');
        }
        function togglePass(id, icon) {
            const input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash');
        }
        function selectAccType(type) {
            document.getElementById('selected-acc-type').value = type;
            document.getElementById('opt-personal').classList.toggle('selected', type === 'personal');
            document.getElementById('opt-business').classList.toggle('selected', type === 'business');
        }
        function closeModal() { document.getElementById('verify-modal').classList.remove('visible'); }

        // ==========================================
        // 1. "SMART" PASSWORD RESET (SUPPORTS 6-8 DIGITS)
        // ==========================================
        
        // A. Send Code
        async function sendSmartCode(e) {
            e.preventDefault();
            const email = document.getElementById('reset-email').value.trim().toLowerCase();
            const btn = document.getElementById('reset-btn');
            
            if (!email) return showToast("Please enter email", "error");
            btn.innerText = "SENDING...";

            

            // Using signInWithOtp
            const { error } = await supabaseClient.auth.signInWithOtp({ 
                email: email,
                options: { shouldCreateUser: false } 
            });

            if (error) {
                showToast(error.message, "error");
                btn.innerText = "TRY AGAIN";
            } else {
                showToast("Code sent! Check your email.", "success");
                document.getElementById('forgot-form').classList.remove('active');
                document.getElementById('verify-reset-form').classList.add('active');
            }
        }

        // B. Verify Code (Tries ALL types)
        async function verifySmartCode() {
            const email = document.getElementById('reset-email').value.trim().toLowerCase();
            const code = document.getElementById('reset-code-input').value.trim();
            const btn = document.getElementById('verify-btn');
            
            if (!email) return showToast("Session expired. Restart.", "error");
            
            // FIX: Allow 6, 7, or 8 digit codes
            if (code.length < 6) return showToast("Enter full code", "error");

            btn.innerText = "CHECKING...";

            const typesToTry = ['email', 'magiclink', 'recovery', 'signup'];
            let success = false;

            for (let type of typesToTry) {
                console.log(`Trying verification type: ${type} with code length ${code.length}`);
                
                const { data, error } = await supabaseClient.auth.verifyOtp({
                    email: email,
                    token: code,
                    type: 'recovery'
                });

                if (!error && data.session) {
                    success = true;
                    break;
                }
            }

            if (success) {
                showToast("Verified! Create new password.", "success");
                document.getElementById('verify-reset-form').classList.remove('active');
                document.getElementById('new-pass-form').classList.add('active');
            } else {
                showToast("Invalid Code. Please check email.", "error");
                btn.innerText = "VERIFY CODE";
            }
        }

        // C. Update Password
        async function updatePasswordSmart(e) {
            e.preventDefault();
            const newPass = document.getElementById('new-pass').value;
            const confirmPass = document.getElementById('confirm-pass').value;

            if (newPass !== confirmPass) return showToast("Passwords do not match", "error");

            const btn = document.getElementById('update-pass-btn');
            btn.innerText = "UPDATING...";

            const { error } = await supabaseClient.auth.updateUser({ password: newPass });

            if (error) {
                showToast(error.message, "error");
                btn.innerText = "UPDATE PASSWORD";
            } else {
                showToast("Success! Logging you in...", "success");
                
                setTimeout(() => {
                    checkUserAndRedirect();
                }, 1500);
            }
        }

        async function checkUserAndRedirect() {
             const { data: { user } } = await supabaseClient.auth.getUser();
             if(user) {
                 const { data } = await supabaseClient.from('users').select('account_type').eq('email', user.email).single();
                 window.location.href = data?.account_type === 'business' ? "business.html" : "personal.html";
             } else {
                 setMode('login');
             }
        }

        // ==========================================
        // 2. SIGN UP
        // ==========================================
        function initiateSignupVerification(e) {
            e.preventDefault();
            const btn = document.getElementById('signup-btn');
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            
            generatedCode = Math.floor(100000 + Math.random() * 900000);
            
            tempUser = {
                email: email,
                fname: document.getElementById('reg-fname').value,
                lname: document.getElementById('reg-lname').value,
                pass: document.getElementById('reg-pass').value,
                accType: document.getElementById('selected-acc-type').value
            };

            btn.innerText = "SENDING...";
            
            emailjs.send("service_kix8fen", "template_vij2vyj", {
                to_name: tempUser.fname,
                to_email: email,
                code: generatedCode
            }).then(() => {
                btn.innerText = "CREATE & VERIFY";
                document.getElementById('display-email').innerText = email;
                document.getElementById('verify-modal').classList.add('visible');
                showToast("Code sent to " + email, "success");
            }).catch(err => {
                showToast("Email failed.", "error");
                btn.innerText = "TRY AGAIN";
            });
        }

        async function handleSignupVerifySubmit() {
            const inputCode = document.getElementById('signup-verify-code').value;
            if (parseInt(inputCode) !== generatedCode) return showToast("Invalid Code", "error");

            closeModal();
            
            const { data, error } = await supabaseClient.auth.signUp({
                email: tempUser.email,
                password: tempUser.pass,
                options: {
                    data: {
                        first_name: tempUser.fname,
                        last_name: tempUser.lname,
                        account_type: tempUser.accType
                        }
                 }
            });

            if (error) return showToast(error.message, "error");

            await supabaseClient.from('users').insert([{
                email: tempUser.email,
                first_name: tempUser.fname,
                last_name: tempUser.lname,
                account_type: tempUser.accType
            }]);

            //localStorage.setItem('userFName', tempUser.fname);
            showToast("Account Created!", "success");
            setTimeout(() => {
                window.location.href = tempUser.accType === 'business' ? "business.html" : "personal.html";
            }, 1500);
        }

        // ==========================================
        // 3. LOGIN
        // ==========================================
        async function handleLogin(e) {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            btn.innerText = "CHECKING...";

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: document.getElementById('login-email').value.trim().toLowerCase(),
                password: document.getElementById('login-pass').value
            });

            if (error) {
                btn.innerText = "ACCESS ACCOUNT";
                return showToast("Invalid Credentials", "error");
            }

            const { data: userData } = await supabaseClient.from('users').select('first_name, account_type').eq('email', data.user.email).single();
            
            showToast("Login Successful!", "success");
            setTimeout(() => {
                window.location.href = userData?.account_type === 'business' ? "business.html" : "personal.html";
            }, 1000);
        }

        // ==========================================
// 4. GOOGLE OAUTH SIGN IN
// ==========================================
async function signInWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.href // Redirects back to the auth page after Google confirms
        }
    });
    
    if (error) {
        showToast("Google login failed: " + error.message, "error");
    }
}

// Automatically catch returning Google users when the page loads
window.addEventListener('DOMContentLoaded', () => {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            
            // Check if user already exists in your custom 'users' table
            const { data: userData, error } = await supabaseClient
                .from('users')
                .select('account_type')
                .eq('email', session.user.email)
                .single();

            if (!userData) {
                // NEW USER: Create their profile in your database
                const fullName = session.user.user_metadata.full_name || 'Traveler';
                const nameParts = fullName.split(' ');
                const fName = nameParts[0];
                const lName = nameParts.slice(1).join(' ');

                await supabaseClient.from('users').insert([{
                    email: session.user.email,
                    first_name: fName,
                    last_name: lName,
                    account_type: 'personal' // Automatically assign personal account type
                }]);
                
                showToast("Google Account Linked!", "success");
                setTimeout(() => window.location.href = "personal.html", 1000);
            } else {
                // RETURNING USER: Send them to their correct dashboard
                showToast("Login Successful!", "success");
                setTimeout(() => {
                    window.location.href = userData.account_type === 'business' ? "business.html" : "personal.html";
                }, 1000);
            }
        }
    });
});