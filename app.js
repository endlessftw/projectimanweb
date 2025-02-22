// Constants
const DEFAULT_CATEGORIES = ['coding', 'design', 'business', 'marketing', 'productivity'];

// Supabase Configuration
const supabase = window.supabase;

// State Management
let resources = [];
let userPreferences = {
    darkMode: false,
    preferredCategories: [],
    viewMode: 'grid'
};
let userLocation = null;
let qiblaDirection = null;
let currentDhikr = 'SubhanAllah';
let tasbihCount = 0;
let currentSet = 0;
let totalToday = 0;
let lastResetDate = new Date().toDateString();

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    categoryFilters: document.getElementById('categoryFilters'),
    resourcesList: document.getElementById('resourcesList'),
    addResourceBtn: document.getElementById('addResourceBtn'),
    addResourceModal: document.getElementById('addResourceModal'),
    resourceForm: document.getElementById('resourceForm'),
    modalClose: document.querySelector('.close'),
    gridViewBtn: document.getElementById('gridViewBtn'),
    listViewBtn: document.getElementById('listViewBtn'),
    hijriDate: document.getElementById('hijriDate'),
    gregorianDate: document.getElementById('gregorianDate'),
    prayerTimes: document.getElementById('prayerTimes'),
    nextPrayer: document.getElementById('nextPrayer'),
    qiblaCompass: document.getElementById('qiblaCompass'),
    qiblaAngle: document.getElementById('qiblaAngle'),
    surahSelect: document.getElementById('surahSelect'),
    quranText: document.getElementById('quranText'),
    audioPlayer: document.getElementById('audioPlayer'),
    hadithContent: document.getElementById('hadithContent'),
    duaContent: document.getElementById('duaContent'),
    tasbihCount: document.getElementById('tasbihCount'),
    tasbihButton: document.getElementById('tasbihButton'),
    resetTasbih: document.getElementById('resetTasbih'),
    dhikrButtons: document.querySelectorAll('.dhikr-button'),
    eventsContainer: document.getElementById('eventsContainer'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    currentMonth: document.getElementById('currentMonth'),
    calendarDays: document.getElementById('calendarDays'),
    gregorianDateInput: document.getElementById('gregorianDate'),
    convertToHijri: document.getElementById('convertToHijri'),
    hijriResult: document.getElementById('hijriResult'),
    hijriDay: document.getElementById('hijriDay'),
    hijriMonth: document.getElementById('hijriMonth'),
    hijriYear: document.getElementById('hijriYear'),
    convertToGregorian: document.getElementById('convertToGregorian'),
    gregorianResult: document.getElementById('gregorianResult'),
};

// Add this to the top of the file, after the existing constants
const pages = {
    home: document.getElementById('home-page'),
    qibla: document.getElementById('qibla-page'),
    quran: document.getElementById('quran-page'),
    hadith: document.getElementById('hadith-page'),
    dua: document.getElementById('dua-page'),
    tasbih: document.getElementById('tasbih-page'),
    events: document.getElementById('events-page')
};

// Add this after the currentDisplayMonth declaration
const islamicEvents = {
    // Regular events
    'Rajab': { type: 'holy', description: 'Sacred Month' },
    "Sha'ban": { type: 'holy', description: 'Sacred Month' },
    'Ramadan': { type: 'holy', description: 'Month of Fasting' },
    'Dhul Qadah': { type: 'holy', description: 'Sacred Month' },
    'Dhul Hijjah': { type: 'holy', description: 'Sacred Month' },
    
    // Special days
    'Laylat al-Qadr': { type: 'special', description: 'Night of Power' },
    'Eid al-Fitr': { type: 'special', description: 'Festival of Breaking Fast' },
    'Eid al-Adha': { type: 'special', description: 'Festival of Sacrifice' },
    'Islamic New Year': { type: 'special', description: 'First of Muharram' },
    'Ashura': { type: 'special', description: '10th of Muharram' },
    "Mawlid al-Nabi": { type: 'special', description: "Prophet's Birthday" },
    'Isra and Miraj': { type: 'special', description: 'Night Journey' },
    'First of Ramadan': { type: 'special', description: 'Beginning of Ramadan' },
    'Laylat al-Baraat': { type: 'special', description: 'Night of Records' },
    'Laylat al-Miraj': { type: 'special', description: 'Night of Ascension' },
    'Laylat al-Raghaib': { type: 'special', description: 'Night of Wishes' }
};

// Add this after the islamicEvents constant
const RAMADAN_START_2024 = new Date(2024, 1, 28); // February 28, 2024

// Add these new calendar functions
let currentDisplayMonth = new Date();

async function updateCalendar() {
    try {
        const year = currentDisplayMonth.getFullYear();
        const month = currentDisplayMonth.getMonth() + 1;
        
        // Get calendar data for the entire month using Umm al-Qura calendar
        const response = await fetch(
            `https://api.aladhan.com/v1/gToHCalendar/${month}/${year}?adjustment=1`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch calendar data');
        }

        const data = await response.json();
        
        if (!data || !data.data || !data.data.length === 0) {
            throw new Error('Invalid calendar data received');
        }

        // Update month display
        const hijriMonth = data.data[0].hijri.month;
        const hijriYear = data.data[0].hijri.year;
        elements.currentMonth.textContent = `${currentDisplayMonth.toLocaleString('default', { month: 'long' })} ${year} / ${hijriMonth.en} ${hijriYear}`;

        // Calculate calendar grid
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        let calendarHTML = '';

        // Previous month days
        const prevMonthDays = startingDay;
        const prevMonth = new Date(year, month - 2, 0);
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const prevDate = new Date(year, month - 2, prevMonth.getDate() - i);
            calendarHTML += createDayElement(prevDate, true);
        }

        // Current month days
        for (let i = 0; i < daysInMonth; i++) {
            const date = new Date(year, month - 1, i + 1);
            const isToday = date.toDateString() === new Date().toDateString();
            const hijriData = data.data[i].hijri;
            calendarHTML += createDayElement(date, false, hijriData, isToday);
        }

        // Next month days
        const remainingDays = 42 - (prevMonthDays + daysInMonth);
        for (let i = 1; i <= remainingDays; i++) {
            const nextDate = new Date(year, month, i);
            calendarHTML += createDayElement(nextDate, true);
        }

        elements.calendarDays.innerHTML = calendarHTML;
    } catch (error) {
        console.error('Error updating calendar:', error);
        displayFallbackCalendar();
    }
}

function createDayElement(date, isDifferentMonth, hijriData = null, isToday = false) {
    const isFriday = date.getDay() === 5;
    const isRamadan = date >= RAMADAN_START_2024 && date <= new Date(2024, 2, 28);
    
    let hijriDateText = '';
    if (hijriData) {
        hijriDateText = `<span class="hijri-date">${hijriData.day} ${hijriData.month.en}</span>`;
    } else if (!isDifferentMonth) {
        // Use estimated calculation for dates without Hijri data
        const estimatedHijri = estimateHijriDate(date);
        hijriDateText = `<span class="hijri-date estimated">${estimatedHijri.day} ${estimatedHijri.month}</span>`;
    }
    
    const classes = [
        'calendar-day',
        isDifferentMonth ? 'different-month' : '',
        isToday ? 'today' : '',
        isFriday ? 'friday' : '',
        isRamadan ? 'ramadan' : ''
    ].filter(Boolean).join(' ');

    let islamicEventHTML = '';
    let ramadanInfoBtn = '';
    
    if (hijriData) {
        const dayEvents = getIslamicEvents(hijriData);
        if (dayEvents && dayEvents.length > 0) {
            islamicEventHTML = dayEvents.map(event => 
                `<div class="islamic-event ${event.type}">${event.description}</div>`
            ).join('');
            
            // Add Ramadan info button if it's the first day of Ramadan
            if (hijriData.month.en === 'Ramadan' && hijriData.day === '1') {
                ramadanInfoBtn = `
                    <div class="ramadan-info-btn" onclick="showRamadanInfo()">
                        <i class="fas fa-info-circle"></i> Learn More
                    </div>
                `;
            }
        }
    }

    return `
        <div class="${classes}">
            <span class="gregorian-date">${date.getDate()}</span>
            ${hijriDateText}
            ${islamicEventHTML}
            ${ramadanInfoBtn}
        </div>
    `;
}

// Add this helper function for estimating Hijri dates
function estimateHijriDate(gregorianDate) {
    // Constants for Hijri calendar calculation
    const ISLAMIC_EPOCH = 1948439.5; // Julian date for 1 Muharram 1 AH
    const GREGORIAN_EPOCH = 1721425.5; // Julian date for 1 January 1 CE
    const MILLISECONDS_PER_DAY = 86400000;
    
    // Convert Gregorian date to Julian date
    const julianDate = Math.floor((gregorianDate.getTime() / MILLISECONDS_PER_DAY) + GREGORIAN_EPOCH);
    
    // Calculate approximate Hijri date
    const hijriDays = julianDate - ISLAMIC_EPOCH;
    const hijriYear = Math.floor((30 * hijriDays + 10646) / 10631);
    const hijriMonth = Math.min(12, Math.ceil((hijriDays - (29 + Math.floor((hijriYear - 1) * 354.367)) + 29) / 29.5));
    const hijriDay = Math.min(30, Math.ceil(hijriDays - (29 + Math.floor((hijriYear - 1) * 354.367)) - Math.floor((hijriMonth - 1) * 29.5)));
    
    const months = [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
        'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
    ];
    
    return {
        day: Math.max(1, Math.min(30, Math.round(hijriDay))),
        month: months[Math.max(0, Math.min(11, hijriMonth - 1))],
        year: hijriYear
    };
}

function displayFallbackCalendar() {
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    elements.currentMonth.textContent = `${currentDisplayMonth.toLocaleString('default', { month: 'long' })} ${year}`;
    
    let calendarHTML = '';
    
    // Previous month days
    for (let i = startingDay - 1; i >= 0; i--) {
        calendarHTML += `
            <div class="calendar-day different-month">
                <span class="gregorian-date">${new Date(year, month, -i).getDate()}</span>
            </div>
        `;
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const isToday = date.toDateString() === new Date().toDateString();
        const isFriday = date.getDay() === 5;
        const isRamadan = date >= RAMADAN_START_2024 && date <= new Date(2024, 2, 28);
        
        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isFriday ? 'friday' : ''} ${isRamadan ? 'ramadan' : ''}">
                <span class="gregorian-date">${i}</span>
            </div>
        `;
    }
    
    // Next month days
    const remainingDays = 42 - (startingDay + daysInMonth);
    for (let i = 1; i <= remainingDays; i++) {
        calendarHTML += `
            <div class="calendar-day different-month">
                <span class="gregorian-date">${i}</span>
            </div>
        `;
    }
    
    elements.calendarDays.innerHTML = calendarHTML;
}

// Update the event listeners for calendar navigation
if (elements.prevMonth) {
    elements.prevMonth.addEventListener('click', async () => {
        currentDisplayMonth = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth() - 1, 1);
        await updateCalendar();
    });
}

if (elements.nextMonth) {
    elements.nextMonth.addEventListener('click', async () => {
        currentDisplayMonth = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth() + 1, 1);
        await updateCalendar();
    });
}

// Initialize calendar
(async () => {
    try {
        await updateCalendar();
    } catch (error) {
        console.error('Error initializing calendar:', error);
        // Add fallback display if API fails
        const daysInMonth = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), 1).getDay();
        
        let calendarHTML = '';
        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            calendarHTML += `
                <div class="calendar-day different-month">
                    <span class="gregorian-date">${new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), -i).getDate()}</span>
                </div>
            `;
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentDisplayMonth.getFullYear(), currentDisplayMonth.getMonth(), i);
            const isToday = date.toDateString() === new Date().toDateString();
            const isFriday = date.getDay() === 5;
            
            calendarHTML += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isFriday ? 'friday' : ''}">
                    <span class="gregorian-date">${i}</span>
                </div>
            `;
        }
        
        // Next month days
        const remainingDays = 42 - (firstDay + daysInMonth);
        for (let i = 1; i <= remainingDays; i++) {
            calendarHTML += `
                <div class="calendar-day different-month">
                    <span class="gregorian-date">${i}</span>
                </div>
            `;
        }
        
        elements.calendarDays.innerHTML = calendarHTML;
        elements.currentMonth.textContent = currentDisplayMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
})();

// Add these auth-related functions at the global scope, before the init function
let currentUser = null;

async function checkAuthState() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        currentUser = session?.user || null;
        updateAuthUI();
    } catch (error) {
        console.error('Error checking auth state:', error);
    }
}

async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        updateAuthUI();
        alert('Successfully signed in!');
    } catch (error) {
        console.error('Error signing in:', error);
        alert(error.message);
    }
}

async function signUpWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        alert('Please check your email for verification link');
    } catch (error) {
        console.error('Error signing up:', error);
        alert(error.message);
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        updateAuthUI();
        alert('Successfully signed out!');
    } catch (error) {
        console.error('Error signing out:', error);
        alert(error.message);
    }
}

function updateAuthUI() {
    const authSection = document.querySelector('.auth-section');
    if (!authSection) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            authSection.innerHTML = `
                <span class="user-email">
                    <i class="fas fa-user"></i>
                    ${session.user.email}
                </span>
                <button class="auth-button" id="signOutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    Sign Out
                </button>
            `;
            document.getElementById('signOutBtn').addEventListener('click', signOut);
        } else {
            authSection.innerHTML = `
                <button class="auth-button" id="signInBtn">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </button>
                <button class="auth-button" id="signUpBtn">
                    <i class="fas fa-user-plus"></i>
                    Sign Up
                </button>
            `;
            document.getElementById('signInBtn').addEventListener('click', () => showAuthModal('signin'));
            document.getElementById('signUpBtn').addEventListener('click', () => showAuthModal('signup'));
        }
    });
}

function showAuthModal(type) {
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'modal';
    
    const content = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeAuthModal()">
                <i class="fas fa-times"></i>
            </button>
            <h2>${type === 'signup' ? 'Sign Up' : type === 'forgot' ? 'Reset Password' : 'Sign In'}</h2>
            <form id="authForm-${type}" class="auth-form" onsubmit="handleAuth(event, '${type}')">
                <div class="form-group">
                    <label for="email-${type}">Email</label>
                    <input type="email" id="email-${type}" name="email" required placeholder="Enter your email">
                    <i class="fas fa-envelope"></i>
                </div>
                ${type !== 'forgot' ? `
                <div class="form-group">
                    <label for="password-${type}">Password</label>
                    <input type="password" id="password-${type}" name="password" required minlength="6" placeholder="Enter your password">
                    <i class="fas fa-lock"></i>
                </div>
                ` : ''}
                <button type="submit" class="auth-submit">
                    ${type === 'signup' ? '<i class="fas fa-user-plus"></i> Sign Up' : 
                      type === 'forgot' ? '<i class="fas fa-key"></i> Send Reset Link' : 
                      '<i class="fas fa-sign-in-alt"></i> Sign In'}
                </button>
            </form>
            <div class="auth-switch">
                ${type === 'signin' ? `
                    <p>Don't have an account? <a href="#" onclick="showAuthModal('signup')">Sign Up</a></p>
                    <a href="#" class="forgot-link" onclick="showAuthModal('forgot')">
                        <i class="fas fa-key"></i> Forgot Password?
                    </a>
                ` : type === 'signup' ? `
                    <p>Already have an account? <a href="#" onclick="showAuthModal('signin')">Sign In</a></p>
                ` : `
                    <p>Remember your password? <a href="#" onclick="showAuthModal('signin')">Sign In</a></p>
                `}
            </div>
        </div>
    `;
    
    modal.innerHTML = content;
    
    // Remove any existing modal
    const existingModal = document.getElementById('authModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.appendChild(modal);
}

// Add resetPassword function
async function resetPassword(email) {
    try {
        // Use the production URL for password reset
        const baseUrl = 'https://projectiman.netlify.app';
        const redirectUrl = `${baseUrl}/reset-password.html`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
            type: 'recovery'
        });
        
        if (error) throw error;
        
        showNotification('Password reset link sent to your email! Please check your inbox and spam folder.', 'success');
        closeAuthModal();
    } catch (error) {
        console.error('Reset password error:', error);
        throw error;
    }
}

// Update handleAuth function
async function handleAuth(event, type) {
    event.preventDefault();
    
    // Get the form and email field
    const form = event.target;
    const emailField = form.querySelector(`#email-${type}`);
    
    if (!emailField) {
        showNotification('Error: Email field not found', 'error');
        return;
    }
    
    const email = emailField.value.trim();
    const password = form.querySelector(`#password-${type}`)?.value;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Enhanced email validation
    if (!email) {
        emailField.focus();
        showNotification('Please enter your email address', 'error');
        return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailField.focus();
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Add loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    try {
        if (type === 'forgot') {
            await resetPassword(email);
            return; // Add early return after password reset
        }
        
        if (!password && type !== 'forgot') {
            showNotification('Please enter a password', 'error');
            form.querySelector(`#password-${type}`)?.focus();
            return;
        }

        if (type === 'signup') {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = type === 'signup' ? '<i class="fas fa-user-plus"></i> Sign Up' : 
                                type === 'forgot' ? '<i class="fas fa-key"></i> Send Reset Link' : 
                                '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.remove();
    }
}

function showNotification(message, type = 'info') {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Initialize the application
async function init() {
    try {
        // Set home page as active initially
        navigateToPage('home');
        
        // Core functionality
        setupEventListeners();
        
        // Check auth state
        await checkAuthState();

        // Try to load user preferences but don't block if it fails
        try {
            await loadUserPreferences();
        } catch (error) {
            console.warn('Could not load user preferences:', error);
        }

        // Location-based features
        try {
            await getCurrentLocation();
            await loadPrayerTimes();
            await loadQiblaDirection();
        } catch (error) {
            console.warn('Could not load location-based features:', error);
        }

        // Content features
        try {
            await loadQuranData();
        } catch (error) {
            console.warn('Could not load Quran data:', error);
            if (elements.quranText) {
                elements.quranText.innerHTML = '<div class="error-message">Unable to load Quran data. Please check your internet connection.</div>';
            }
        }

        try {
            await loadHadith();
        } catch (error) {
            console.warn('Could not load Hadith:', error);
            if (elements.hadithContent) {
                elements.hadithContent.innerHTML = '<div class="error-message">Unable to load Hadith. Please check your internet connection.</div>';
            }
        }

        try {
            await loadDua();
        } catch (error) {
            console.warn('Could not load Dua:', error);
            if (elements.duaContent) {
                elements.duaContent.innerHTML = '<div class="error-message">Unable to load Dua. Please try again later.</div>';
            }
        }

        try {
            await loadIslamicEvents();
        } catch (error) {
            console.warn('Could not load Islamic events:', error);
            if (elements.eventsContainer) {
                elements.eventsContainer.innerHTML = '<div class="error-message">Unable to load Islamic events. Please try again later.</div>';
            }
        }

        // Start updates
        startPrayerTimeUpdates();
        
        // Apply preferences
        applyUserPreferences();
        
        // Register service worker last
        if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
            try {
        await registerServiceWorker();
            } catch (error) {
                console.warn('Could not register service worker:', error);
            }
        } else {
            console.warn('Service Worker not registered: requires HTTPS or localhost');
        }
        
        // Start progress updates
        startProgressUpdates();
        
        // Initialize calendar calculator
        initializeCalendarCalculator();
        
        // Initialize calendar
        try {
            await updateCalendar();
        } catch (error) {
            console.warn('Could not initialize calendar:', error);
            displayFallbackCalendar();
        }
        
        // Initialize tasbih
        loadTasbihState();
        
    } catch (error) {
        console.error('Error during initialization:', error);
        // Show a user-friendly error message
        document.body.innerHTML += `
            <div class="error-message" style="position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 1rem; border-radius: 8px;">
                An error occurred while loading the application. Please refresh the page.
                <button onclick="window.location.reload()" class="retry-button">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// Database Functions
async function loadResources() {
    try {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .order('score', { ascending: false });

        if (error) throw error;
        resources = data;
        renderResources();
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

async function addResource(resource) {
    try {
        const { data, error } = await supabase
            .from('resources')
            .insert([{
                ...resource,
                votes: { upvotes: 0, downvotes: 0 },
                score: 0
            }])
            .select()
            .single();

        if (error) throw error;
        resources.push(data);
        renderResources();
    } catch (error) {
        console.error('Error adding resource:', error);
    }
}

async function updateVote(resourceId, isUpvote) {
    try {
        const resource = resources.find(r => r.id === resourceId);
        const newVotes = {
            upvotes: resource.votes.upvotes + (isUpvote ? 1 : 0),
            downvotes: resource.votes.downvotes + (isUpvote ? 0 : 1)
        };
        const newScore = newVotes.upvotes - newVotes.downvotes;

        const { data, error } = await supabase
            .from('resources')
            .update({ 
                votes: newVotes,
                score: newScore
            })
            .eq('id', resourceId)
            .select()
            .single();

        if (error) throw error;
        resources = resources.map(r => r.id === data.id ? data : r);
        renderResources();
    } catch (error) {
        console.error('Error updating vote:', error);
    }
}

async function searchResources(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .textSearch('search_text', searchTerm)
            .order('score', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error searching resources:', error);
        return [];
    }
}

async function filterByCategories(categories) {
    try {
        const { data, error } = await supabase
            .from('resources')
            .select('*')
            .in('category', categories)
            .order('score', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error filtering resources:', error);
        return [];
    }
}

// User Preferences
async function loadUserPreferences() {
    try {
        // Check if Supabase is initialized
        if (!supabase) {
            console.warn('Supabase not initialized, using default preferences');
            return;
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No data found, this is normal for new users
                console.log('No saved preferences found, using defaults');
                return;
            }
            throw error;
        }

        if (data) {
            tasbihCount = data.tasbih_count || 0;
            currentDhikr = data.current_dhikr || 'SubhanAllah';
            updateTasbihDisplay();
            updateDhikrButtons();
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
        // Continue with default values
        tasbihCount = 0;
        currentDhikr = 'SubhanAllah';
        updateTasbihDisplay();
        updateDhikrButtons();
    }
}

async function saveTasbihCount() {
    try {
        // Check if Supabase is initialized
        if (!supabase) {
            throw new Error('Database connection not initialized');
        }

        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.error('Auth error:', authError);
            throw new Error('Authentication error: ' + authError.message);
        }
        
        if (!user) {
            showNotification('Please sign in to save your progress', 'error');
            return;
        }

        // Prepare the data to save
        const preferenceData = {
            user_id: user.id,
            tasbih_count: tasbihCount,
            current_dhikr: currentDhikr,
            total_today: totalToday,
            last_reset_date: lastResetDate
        };

        console.log('Saving preferences:', preferenceData);

        // Save the preferences
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert(preferenceData)
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            if (error.code === '42P01') {
                throw new Error('Database table not found. Please ensure the database is properly set up.');
            } else if (error.code === '23505') {
                // If it's a unique constraint violation, try an update instead
                const { error: updateError } = await supabase
                    .from('user_preferences')
                    .update(preferenceData)
                    .eq('user_id', user.id);
                    
                if (updateError) {
                    throw new Error('Failed to update preferences: ' + updateError.message);
                }
            } else {
                throw new Error(error.message || 'Failed to save preferences');
            }
        }

        console.log('Preferences saved successfully:', data);
    } catch (error) {
        console.error('Error saving tasbih count:', error);
        showNotification(error.message || 'Failed to save progress', 'error');
        throw error; // Re-throw to handle in the calling function
    }
}

function updateTasbihDisplay() {
    // Update counter
    elements.tasbihCount.textContent = tasbihCount;
    
    // Update set progress
    currentSet = tasbihCount % 33;
    document.getElementById('currentSet').textContent = currentSet;
    document.getElementById('setProgress').style.width = `${(currentSet / 33) * 100}%`;
    
    // Update beads
    const beads = document.querySelectorAll('.tasbih-bead');
    beads.forEach((bead, index) => {
        bead.classList.toggle('active', index < currentSet);
    });
    
    // Check if we completed a set
    if (currentSet === 0 && tasbihCount > 0) {
        showNotification('Set completed! 33 times ' + currentDhikr, 'success');
    }
    
    // Update total for today
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
        totalToday = 0;
        lastResetDate = today;
    }
    document.getElementById('totalToday').textContent = totalToday;
}

function updateDhikrButtons() {
    elements.dhikrButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.dhikr === currentDhikr);
    });
    elements.tasbihButton.querySelector('span').textContent = 'Tap to Count';
}

// Event Listeners
function setupEventListeners() {
    // Add auth button listeners
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    
    if (signInBtn) {
        signInBtn.addEventListener('click', () => showAuthModal('signin'));
    }
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => showAuthModal('signup'));
    }

    // Logo click
    document.querySelector('.nav-logo').addEventListener('click', () => {
        navigateToPage('home');
    });

    // Theme Toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Search
    if (elements.searchButton && elements.searchInput) {
        elements.searchButton.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    // Add Resource Modal
    if (elements.addResourceBtn && elements.addResourceModal) {
        elements.addResourceBtn.addEventListener('click', () => {
            elements.addResourceModal.style.display = 'block';
        });
    }

    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', () => {
            elements.addResourceModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    if (elements.addResourceModal) {
        window.addEventListener('click', (e) => {
            if (e.target === elements.addResourceModal) {
                elements.addResourceModal.style.display = 'none';
            }
        });
    }

    // Form Submission
    if (elements.resourceForm) {
        elements.resourceForm.addEventListener('submit', handleResourceSubmission);
    }

    // View Toggle
    if (elements.gridViewBtn && elements.listViewBtn) {
        elements.gridViewBtn.addEventListener('click', () => toggleView('grid'));
        elements.listViewBtn.addEventListener('click', () => toggleView('list'));
    }

    // Tasbih Counter
    if (elements.tasbihButton && elements.resetTasbih) {
        elements.tasbihButton.addEventListener('click', handleTasbihClick);
        elements.resetTasbih.addEventListener('click', resetTasbih);
    }

    // Dhikr Buttons
    if (elements.dhikrButtons) {
        elements.dhikrButtons.forEach(button => {
            button.addEventListener('click', async () => {
                currentDhikr = button.dataset.dhikr;
                updateDhikrButtons();
                await saveTasbihCount();
            });
        });
    }

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.target.dataset.page;
            navigateToPage(pageId);
        });
    });

    // Add keyboard shortcut for tasbih
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.getElementById('tasbih-page').classList.contains('active')) {
            e.preventDefault();
            handleTasbihClick();
        }
    });
}

// Theme Functions
function toggleTheme() {
    userPreferences.darkMode = !userPreferences.darkMode;
    applyTheme();
    saveUserPreferences();
}

function applyTheme() {
    document.body.setAttribute('data-theme', userPreferences.darkMode ? 'dark' : 'light');
    elements.themeToggle.innerHTML = userPreferences.darkMode ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
}

// View Functions
function toggleView(mode) {
    // This function is no longer needed since we removed the view toggle functionality
    return;
}

// Category Functions
function renderCategories() {
    elements.categoryFilters.innerHTML = DEFAULT_CATEGORIES.map(category => `
        <button class="category-tag" data-category="${category}">
            ${category.charAt(0).toUpperCase() + category.slice(1)}
        </button>
    `).join('');

    // Add event listeners to category filters
    document.querySelectorAll('.category-tag').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            filterResources();
        });
    });
}

// Resource Functions
async function handleResourceSubmission(e) {
    e.preventDefault();

    const newResource = {
        title: document.getElementById('title').value,
        link: document.getElementById('link').value,
        category: document.getElementById('category').value,
        description: document.getElementById('description').value
    };

    await addResource(newResource);
    
    // Reset form and close modal
    e.target.reset();
    elements.addResourceModal.style.display = 'none';
}

function renderResources(filteredResources = resources) {
    elements.resourcesList.innerHTML = filteredResources.map(resource => `
        <div class="resource-card" data-id="${resource.id}">
            <h3>
                <a href="${resource.link}" target="_blank" rel="noopener noreferrer">
                    ${resource.title}
                </a>
            </h3>
            <span class="category">${resource.category}</span>
            <p class="description">${resource.description}</p>
            <div class="actions">
                <div class="vote-buttons">
                    <button class="vote-button upvote" data-id="${resource.id}">
                        <i class="fas fa-arrow-up"></i>
                        <span>${resource.votes.upvotes}</span>
                    </button>
                    <button class="vote-button downvote" data-id="${resource.id}">
                        <i class="fas fa-arrow-down"></i>
                        <span>${resource.votes.downvotes}</span>
                    </button>
                </div>
                <small>${new Date(resource.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', handleVote);
    });
}

async function handleVote(e) {
    const resourceId = e.currentTarget.dataset.id;
    const isUpvote = e.currentTarget.classList.contains('upvote');
    await updateVote(resourceId, isUpvote);
}

// Search and Filter Functions
async function handleSearch() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (!searchTerm) {
        await loadResources();
        return;
    }
    const searchResults = await searchResources(searchTerm);
    renderResources(searchResults);
}

async function filterResources() {
    const activeCategories = Array.from(document.querySelectorAll('.category-tag.active'))
        .map(tag => tag.dataset.category);

    if (activeCategories.length === 0) {
        await loadResources();
        return;
    }

    const filteredResources = await filterByCategories(activeCategories);
    renderResources(filteredResources);
}

// User Preferences
function applyUserPreferences() {
    // Only apply theme preferences
    document.body.setAttribute('data-theme', userPreferences.darkMode ? 'dark' : 'light');
    if (elements.themeToggle) {
        elements.themeToggle.innerHTML = userPreferences.darkMode ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
    }
}

// Service Worker Registration
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // First try to load the manifest
            try {
                const manifestResponse = await fetch('manifest.json');
                if (!manifestResponse.ok) {
                    console.warn('Manifest file not accessible, continuing without it');
                }
            } catch (manifestError) {
                console.warn('Error loading manifest:', manifestError);
            }

            // Register service worker
            const registration = await navigator.serviceWorker.register('service-worker.js', {
                scope: '/'
            });
            console.log('Service Worker registered successfully');
            
            // Force update check
            if (registration.active) {
                registration.update();
            }
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.log('Service Worker not supported in this browser');
    }
}

// Location Functions
async function getCurrentLocation() {
    try {
        elements.prayerTimes.innerHTML = '<div class="loading">Detecting location...</div>';
        
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        // Detect browser
        const userAgent = navigator.userAgent;
        const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent) && !/Brave/.test(userAgent);
        const isBrave = /Brave/.test(userAgent);
        
        console.log('Browser detection:', {
            userAgent,
            isChrome,
            isBrave
        });

        const position = await new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: isChrome ? 5000 : 10000, // Shorter timeout for Chrome
                maximumAge: 0
            };

            const successCallback = (pos) => {
                // Verify the coordinates are reasonable
                if (Math.abs(pos.coords.latitude) > 90 || Math.abs(pos.coords.longitude) > 180) {
                    reject(new Error('Invalid coordinates detected'));
                    return;
                }
                
                // Log position data for debugging
                console.log('Raw position data:', {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date(pos.timestamp).toISOString()
                });

                resolve(pos);
            };

            const errorCallback = async (error) => {
                console.error('Geolocation error:', error);

                // For Chrome, try again with lower accuracy if high accuracy fails
                if (isChrome && error.code === error.TIMEOUT) {
                    console.log('Retrying with lower accuracy on Chrome...');
                    navigator.geolocation.getCurrentPosition(
                        successCallback,
                        (finalError) => {
                            reject(new Error('Location detection failed. Please try using a different browser like Brave or Firefox.'));
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                    return;
                }

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Please allow location access to get accurate prayer times'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location information is unavailable'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Location request timed out'));
                        break;
                    default:
                        reject(new Error('An unknown error occurred'));
                }
            };

            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
        });

        userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            browser: isChrome ? 'Chrome' : (isBrave ? 'Brave' : 'Other')
        };

        // Get location name using Nominatim
        try {
            const nominatimResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.latitude}&lon=${userLocation.longitude}&zoom=10`,
                {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.9',
                        'User-Agent': 'Project Iman - Islamic Prayer Times App'
                    }
                }
            );
            
            if (!nominatimResponse.ok) {
                throw new Error('Failed to get location name');
            }
            
            const nominatimData = await nominatimResponse.json();
            console.log('Nominatim response:', nominatimData);
            
            // Extract city and country from address
            const address = nominatimData.address || {};
            const city = address.city || address.town || address.village || address.suburb || address.county || '';
            const country = address.country || '';
            
            // Store the verified location
            userLocation.locationName = city ? (country ? `${city}, ${country}` : city) : country;
            userLocation.verified = true;

            // If using Chrome and location seems incorrect, show a suggestion
            if (isChrome && userLocation.locationName.toLowerCase().includes('philadelphia')) {
                elements.prayerTimes.innerHTML = `
                    <div class="error-message">
                        Chrome may be providing incorrect location data. For more accurate results:
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Try using Brave or Firefox browser</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Disable any VPN or proxy services</li>
                        </ul>
                        <button onclick="getCurrentLocation().then(loadPrayerTimes)" class="retry-button">
                            Try Again
                        </button>
                    </div>
                `;
                throw new Error('Potentially incorrect location detected');
            }

            return userLocation;

        } catch (geocodeError) {
            console.error('Error getting location name:', geocodeError);
            userLocation.locationName = `Location at ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
            userLocation.verified = false;
            return userLocation;
        }

    } catch (error) {
        console.error('Error getting location:', error);
        elements.prayerTimes.innerHTML = `
            <div class="error-message">
                ${error.message}
                ${error.message.includes('Chrome') ? '' : '. Using default location (Mecca)'}
                <button onclick="getCurrentLocation().then(loadPrayerTimes)" class="retry-button">
                    Try Again
                </button>
            </div>
        `;
        
        if (!error.message.includes('Chrome')) {
            userLocation = {
                latitude: 21.4225,
                longitude: 39.8262,
                locationName: 'Mecca, Saudi Arabia',
                verified: true
            };
        }
        return userLocation;
    }
}

// Date Functions
async function updateDates() {
    const now = new Date();
    // Update Gregorian date
    elements.gregorianDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Fetch Hijri date with better error handling and fallback
    const fetchHijriDate = async () => {
        try {
            // Format date for API request (YYYY-MM-DD)
            const formattedDate = now.toISOString().split('T')[0];
            
            // Use the Umm al-Qura calendar API
            const response = await fetch(
                `https://api.aladhan.com/v1/gToH/${formattedDate}?adjustment=1`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch from API: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code === 200 && data.data && data.data.hijri) {
                const hijri = data.data.hijri;
                elements.hijriDate.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Error with Hijri date API:', error);
            // Use estimated calculation as fallback
            const estimatedHijri = estimateHijriDate(now);
            elements.hijriDate.textContent = `${estimatedHijri.day} ${estimatedHijri.month} ${estimatedHijri.year} AH (est.)`;
        }
    };

    await fetchHijriDate();
}

// Prayer Times Functions
async function loadPrayerTimes() {
    if (!userLocation) {
        elements.prayerTimes.innerHTML = `
            <div class="error-message">
                Location not available. Please allow location access to get accurate prayer times.
                <button onclick="window.location.reload()" class="retry-button">Refresh Page</button>
            </div>
        `;
        return;
    }

    try {
        elements.prayerTimes.innerHTML = `<div class="loading">Loading prayer times...</div>`;

        // Add VPN warning if location verification failed
        let locationInfo = `
            <div class="location-title">
                <i class="fas fa-map-marker-alt"></i>
                ${userLocation.locationName}
            </div>
            <div class="coordinates">
                ${userLocation.latitude.toFixed(4)}°, ${userLocation.longitude.toFixed(4)}°
            </div>
            ${!userLocation.verified ? `
                <div class="warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    You may be using a VPN. Prayer times might not be accurate.
                </div>
            ` : ''}
        `;

        // Use a simpler endpoint with coordinates
        const response = await fetch(
            `https://api.aladhan.com/v1/calendar?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=2&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !data.data || !data.data.length) {
            throw new Error('Invalid data format received from prayer times API');
        }

        // Get today's prayer times
        const today = new Date().getDate() - 1; // Array is 0-based
        const timings = data.data[today].timings;

        const prayerNames = {
            Fajr: { name: 'Fajr', icon: 'fa-sun' },
            Sunrise: { name: 'Sunrise', icon: 'fa-sunrise' },
            Dhuhr: { name: 'Dhuhr', icon: 'fa-sun' },
            Asr: { name: 'Asr', icon: 'fa-sun' },
            Maghrib: { name: 'Maghrib', icon: 'fa-moon' },
            Isha: { name: 'Isha', icon: 'fa-moon' }
        };

        // Format the times (remove timezone information)
        const formattedTimings = {};
        Object.keys(prayerNames).forEach(prayer => {
            if (timings[prayer]) {
                formattedTimings[prayer] = timings[prayer].split(' ')[0]; // Remove timezone
            }
        });

        const prayerTimesHTML = `
            <div class="location-info">
                ${locationInfo}
            </div>
            ${Object.entries(prayerNames)
                .map(([key, { name, icon }]) => {
                    const time = formattedTimings[key];
                    if (!time) return '';
                    return `
                        <div class="prayer-time">
                            <div class="prayer-name">
                                <i class="fas ${icon}"></i> ${name}
                            </div>
                            <div class="prayer-time-value">${time}</div>
                        </div>
                    `;
                })
                .filter(html => html)
                .join('')}`;

        if (!prayerTimesHTML) {
            throw new Error('No prayer times available');
        }

        elements.prayerTimes.innerHTML = prayerTimesHTML;
        updateNextPrayer(formattedTimings);
    } catch (error) {
        console.error('Error loading prayer times:', error);
        // Use more accurate static times for Mecca
        const staticTimes = {
            Fajr: '05:21',
            Sunrise: '06:39',
            Dhuhr: '12:12',
            Asr: '15:29',
            Maghrib: '17:45',
            Isha: '19:15'
        };

        elements.prayerTimes.innerHTML = `
            <div class="location-info">
                <div class="location-title">
                    <i class="fas fa-mosque"></i>
                    Mecca (Default)
                </div>
                <div class="coordinates">
                    21.4225°, 39.8262°
                </div>
            </div>
            ${Object.entries(staticTimes)
                .map(([name, time]) => `
                    <div class="prayer-time">
                        <div class="prayer-name">
                            <i class="fas ${name === 'Fajr' || name === 'Sunrise' || name === 'Dhuhr' || name === 'Asr' ? 'fa-sun' : 'fa-moon'}"></i>
                            ${name}
                        </div>
                        <div class="prayer-time-value">${time}</div>
                        <small class="static-note">(Approximate)</small>
                    </div>
                `).join('')}
            <div class="error-message">
                Unable to load live prayer times. Showing approximate times.
                <button onclick="loadPrayerTimes()" class="retry-button">Retry</button>
            </div>
        `;

        updateNextPrayer(staticTimes);
    }
}

function updateNextPrayer(timings) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayerTimes = Object.entries(timings)
        .filter(([name]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(name))
        .map(([name, time]) => {
            const [hours, minutes] = time.split(':').map(Number);
            return { name, minutes: hours * 60 + minutes };
        });

    // Sort prayers by time
    prayerTimes.sort((a, b) => a.minutes - b.minutes);

    // Find current and next prayer
    let currentPrayer = prayerTimes[prayerTimes.length - 1];
    let nextPrayer = prayerTimes[0];
    let progress = 0;

    for (let i = 0; i < prayerTimes.length; i++) {
        if (prayerTimes[i].minutes > currentTime) {
            nextPrayer = prayerTimes[i];
            currentPrayer = prayerTimes[i - 1] || prayerTimes[prayerTimes.length - 1];
            break;
        }
    }

    // Calculate time until next prayer
    let minutesUntil = nextPrayer.minutes - currentTime;
    if (minutesUntil < 0) {
        minutesUntil += 24 * 60; // Add 24 hours if it's tomorrow
    }

    // Calculate total interval and progress
    let totalInterval;
    if (nextPrayer.minutes < currentPrayer.minutes) {
        totalInterval = (24 * 60) - (currentPrayer.minutes - nextPrayer.minutes);
    } else {
        totalInterval = nextPrayer.minutes - currentPrayer.minutes;
    }

    let elapsed = currentTime - currentPrayer.minutes;
    if (elapsed < 0) {
        elapsed += 24 * 60;
    }

    progress = (elapsed / totalInterval) * 100;

    // Format times for display
    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60) % 24;
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Update next prayer display
    const hours = Math.floor(minutesUntil / 60);
    const minutes = minutesUntil % 60;
    let timeString = '';
    if (hours > 0) {
        timeString += `${hours}h `;
    }
    timeString += `${minutes}m`;

    elements.nextPrayer.innerHTML = `
        <i class="fas ${nextPrayer.name === 'Fajr' ? 'fa-sun' : 'fa-moon'}"></i>
        Next: ${nextPrayer.name} in ${timeString}
    `;

    // Create standalone progress bar
    const progressBar = `
        <div class="prayer-progress-standalone active">
            <div class="progress-title">Prayer Time Progress</div>
            <div class="progress-label">
                <span class="current">${currentPrayer.name}</span> → 
                <span class="next">${nextPrayer.name}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="progress-times">
                <span>${formatTime(currentPrayer.minutes)}</span>
                <span>${formatTime(nextPrayer.minutes)}</span>
            </div>
            <div class="progress-label" style="margin-top: 1rem;">
                ${timeString} until ${nextPrayer.name}
            </div>
        </div>
    `;

    // Add the progress bar to the prayer grid
    const prayerGrid = document.querySelector('.prayer-grid');
    
    // Remove existing progress bar if it exists
    const existingProgressBar = document.querySelector('.prayer-progress-standalone');
    if (existingProgressBar) {
        existingProgressBar.remove();
    }
    
    // Add new progress bar
    prayerGrid.insertAdjacentHTML('beforeend', progressBar);
}

// Update the progress bar every minute
function startProgressUpdates() {
    setInterval(() => {
        const progressBar = document.querySelector('.prayer-progress-standalone .progress-bar');
        if (progressBar) {
            const currentWidth = parseFloat(progressBar.style.width);
            const newWidth = Math.min(currentWidth + (100 / (60 * 24)), 100); // Increment by one minute's worth
            progressBar.style.width = `${newWidth}%`;
        }
    }, 60000); // Update every minute
}

// Qibla Direction Functions
async function loadQiblaDirection() {
    if (!userLocation) return;

    try {
        const response = await fetch(
            `https://api.aladhan.com/v1/qibla/${userLocation.latitude}/${userLocation.longitude}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to load Qibla direction: ${response.status}`);
        }
        
        const data = await response.json();
        qiblaDirection = data.data.direction;
        elements.qiblaAngle.textContent = `Qibla Direction: ${Math.round(qiblaDirection)}°`;
        
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientationabsolute', updateQiblaCompass);
        }
    } catch (error) {
        console.error('Error loading qibla direction:', error);
        elements.qiblaAngle.innerHTML = `
            <div class="error-message">
                Unable to load Qibla direction. Please try again.
                <button onclick="loadQiblaDirection()" class="retry-button">
                    Retry
                </button>
            </div>
        `;
    }
}

function updateQiblaCompass(event) {
    if (!qiblaDirection) return;
    
    const compass = elements.qiblaCompass.querySelector('.compass');
    const arrow = compass.querySelector('.arrow');
    
    // Calculate the direction
    const compassHeading = event.alpha;
    const arrowRotation = qiblaDirection - compassHeading;
    
    // Update the arrow rotation
    arrow.style.transform = `translate(-50%, -100%) rotate(${arrowRotation}deg)`;
}

// Quran Functions
async function loadQuranData() {
    try {
        // Load Surah list
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        
        if (!data || !data.data) {
            throw new Error('Invalid response from Quran API');
        }
        
        elements.surahSelect.innerHTML = data.data.map(surah => `
            <option value="${surah.number}">
                ${surah.number}. ${surah.englishName} (${surah.name})
            </option>
        `).join('');

        // Add font size control listeners
        document.getElementById('increaseFont').addEventListener('click', () => {
            changeFontSize(2);
        });

        document.getElementById('decreaseFont').addEventListener('click', () => {
            changeFontSize(-2);
        });

        // Load first surah by default
        await loadSurah(1);

        // Add change event listener
        elements.surahSelect.addEventListener('change', (e) => {
            loadSurah(e.target.value);
        });
    } catch (error) {
        console.error('Error loading Quran data:', error);
            elements.quranText.innerHTML = `
                <div class="error-message">
                    Unable to load Quran data. Please check your internet connection.
                    <button onclick="loadQuranData()" class="retry-button">Retry</button>
                </div>
            `;
    }
}

async function loadSurah(surahNumber) {
    try {
        elements.quranText.innerHTML = '<div class="loading">Loading Surah...</div>';

        // Load Surah text and translation simultaneously
        const [surahResponse, translationResponse] = await Promise.all([
            fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
            fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.sahih`)
        ]);

        const [surahData, translationData] = await Promise.all([
            surahResponse.json(),
            translationResponse.json()
        ]);
        
        if (!surahData.data || !translationData.data) {
            throw new Error('Invalid Surah data received');
        }
        
        // Update Surah title and info
        const surah = surahData.data;
        document.getElementById('surahTitle').textContent = surah.name;
        document.getElementById('surahInfo').textContent = 
            `${surah.englishName} - ${surah.englishNameTranslation} | Verses: ${surah.numberOfAyahs} | Revealed in ${surah.revelationType}`;

        // Don't show Bismillah for Surah At-Tawbah (9)
        const bismillah = document.querySelector('.bismillah');
        if (bismillah) {
            bismillah.style.display = surahNumber === 9 ? 'none' : 'block';
        }

        // Combine Arabic and translation with individual audio players
        elements.quranText.innerHTML = surah.ayahs.map((ayah, index) => {
            const paddedSurah = surahNumber.toString().padStart(3, '0');
            const paddedAyah = ayah.numberInSurah.toString().padStart(3, '0');
            const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${paddedSurah}${paddedAyah}.mp3`;
            
            return `
                <div class="ayah" id="ayah-${ayah.number}">
                    <div class="ayah-header">
                        <span class="ayah-number">${ayah.numberInSurah}</span>
                        <div class="ayah-audio">
                            <audio controls>
                    <source src="${audioUrl}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                </div>
                        </div>
                    <div class="arabic">
                        ${ayah.text}
                    </div>
                    <div class="translation">
                        ${translationData.data.ayahs[index].text}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for audio elements
        document.querySelectorAll('.ayah-audio audio').forEach(audio => {
            // Error handling
            audio.onerror = function() {
                const audioContainer = this.parentElement;
                audioContainer.innerHTML = `
                    <span class="audio-error">
                        <i class="fas fa-exclamation-circle"></i> Audio unavailable
                    </span>
                `;
            };

            // Pause other audio when one starts playing
            audio.addEventListener('play', function() {
                document.querySelectorAll('.ayah-audio audio').forEach(otherAudio => {
                    if (otherAudio !== this && !otherAudio.paused) {
                        otherAudio.pause();
                    }
                });
            });
        });

    } catch (error) {
        console.error('Error loading surah:', error);
        elements.quranText.innerHTML = `
            <div class="error-message">
                Unable to load Surah. Please try again.
                <button onclick="loadSurah(${surahNumber})" class="retry-button">
                    Retry
                </button>
            </div>
        `;
    }
}

// Add font size control function
function changeFontSize(change) {
    const quranText = document.getElementById('quranText');
    const currentSize = parseInt(window.getComputedStyle(quranText).fontSize);
    const newSize = Math.min(Math.max(currentSize + change, 16), 32); // Min 16px, Max 32px
    
    quranText.style.fontSize = `${newSize}px`;
    
    // Also adjust Arabic text size
    const arabicTexts = quranText.querySelectorAll('.arabic');
    arabicTexts.forEach(text => {
        text.style.fontSize = `${newSize * 1.3}px`; // Arabic text 30% larger than translation
    });
}

// Hadith Collection
const hadiths = [
    {
        id: 1,
        text: "The deeds are considered by the intentions, and a person will get the reward according to his intention.",
        reference: "Sahih al-Bukhari 1",
        narrator: "Umar ibn Al-Khattab",
        book: "Sahih al-Bukhari",
        chapter: "Book of Revelation",
        grade: "Sahih",
        explanation: "This is one of the most important hadiths in Islam. It emphasizes that the value of actions depends on the intentions behind them. This hadith was often cited by scholars as one of the core principles of Islamic jurisprudence.",
        context: "This hadith was narrated during a sermon by Umar ibn Al-Khattab, who heard it directly from the Prophet Muhammad (peace be upon him). It addresses the importance of sincerity in all actions.",
        benefits: [
            "Teaches the importance of intention in Islam",
            "Shows that actions are judged by their underlying motives",
            "Emphasizes the need for sincerity in worship",
            "Demonstrates that the same action can have different rewards based on intention"
        ],
        relatedHadiths: ["Sahih al-Bukhari 54", "Sahih Muslim 1907"],
        arabicText: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 2,
        text: "The best among you is the one who learns the Quran and teaches it.",
        reference: "Sahih al-Bukhari 5027",
        narrator: "Uthman ibn Affan",
        book: "Sahih al-Bukhari",
        chapter: "Book of Virtues of the Quran",
        grade: "Sahih",
        explanation: "This hadith highlights the special status of those who engage with the Quran, both as learners and teachers. It shows that the best of people are those who not only seek knowledge but also share it with others.",
        context: "This was said during a gathering where the companions were discussing the virtues of different good deeds. The Prophet (peace be upon him) emphasized the importance of Quranic education.",
        benefits: [
            "Encourages Quranic education",
            "Shows the virtue of teaching others",
            "Emphasizes the importance of both learning and teaching",
            "Highlights the ongoing nature of Quranic study"
        ],
        relatedHadiths: ["Sahih al-Bukhari 5028", "Sunan Ibn Majah 211"],
        arabicText: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 3,
        text: "None of you truly believes until he loves for his brother what he loves for himself.",
        reference: "Sahih al-Bukhari 13",
        narrator: "Anas ibn Malik",
        book: "Sahih al-Bukhari",
        chapter: "Book of Faith",
        grade: "Sahih",
        explanation: "This hadith establishes one of the fundamental principles of Islamic brotherhood and social relations. It sets a high standard for how Muslims should treat one another and emphasizes the importance of genuine care for others.",
        context: "This hadith was narrated in the context of teaching the companions about the completeness of faith and its relationship with good character.",
        benefits: [
            "Establishes the importance of brotherhood in Islam",
            "Teaches empathy and compassion",
            "Sets a practical standard for social relations",
            "Shows that faith is connected to good character"
        ],
        relatedHadiths: ["Sahih Muslim 45", "Sunan al-Tirmidhi 2515"],
        arabicText: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 4,
        text: "The strong person is not the one who can wrestle others down. The strong person is the one who can control himself when angry.",
        reference: "Sahih al-Bukhari 6114",
        narrator: "Abu Hurairah",
        book: "Sahih al-Bukhari",
        chapter: "Book of Good Manners",
        grade: "Sahih",
        explanation: "This hadith redefines strength from physical prowess to emotional and spiritual control. It teaches that true strength lies in self-control, particularly during moments of anger.",
        context: "This was said when people were discussing physical strength and wrestling, and the Prophet (peace be upon him) redirected their attention to moral strength.",
        benefits: [
            "Redefines the concept of strength",
            "Teaches the importance of anger management",
            "Encourages self-control",
            "Shows the value of emotional intelligence"
        ],
        relatedHadiths: ["Sahih Muslim 2609", "Sunan Abu Dawood 4784"],
        arabicText: "لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 5,
        text: "Whoever believes in Allah and the Last Day should speak good or remain silent.",
        reference: "Sahih al-Bukhari 6475",
        narrator: "Abu Hurairah",
        book: "Sahih al-Bukhari",
        chapter: "Book of Softening the Heart",
        grade: "Sahih",
        explanation: "This hadith teaches the importance of controlling one's speech and only speaking what is beneficial. It shows that silence is better than harmful or useless speech.",
        context: "This was part of a longer hadith where the Prophet (peace be upon him) was teaching about the characteristics of true faith.",
        benefits: [
            "Teaches the importance of good speech",
            "Shows the virtue of silence",
            "Helps in avoiding sins of the tongue",
            "Links speech to faith and character"
        ],
        relatedHadiths: ["Sahih Muslim 47", "Sunan Ibn Majah 3969"],
        arabicText: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 6,
        text: "A Muslim is the one from whose tongue and hands other Muslims are safe.",
        reference: "Sahih al-Bukhari 10",
        narrator: "Abdullah ibn Amr",
        book: "Sahih al-Bukhari",
        chapter: "Book of Faith",
        grade: "Sahih",
        explanation: "This hadith defines a fundamental characteristic of a true Muslim - being harmless to others. It encompasses both physical harm (hands) and verbal harm (tongue).",
        context: "This was said when the Prophet (peace be upon him) was asked about who is the best Muslim.",
        benefits: [
            "Defines the basic character of a Muslim",
            "Emphasizes the importance of not harming others",
            "Covers both physical and verbal harm",
            "Sets a practical standard for behavior"
        ],
        relatedHadiths: ["Sahih Muslim 41", "Sunan al-Nasa'i 4995"],
        arabicText: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 7,
        text: "Cleanliness is half of faith.",
        reference: "Sahih Muslim 223",
        narrator: "Abu Malik Al-Ashari",
        book: "Sahih Muslim",
        chapter: "Book of Purification",
        grade: "Sahih",
        explanation: "This hadith emphasizes the importance of physical and spiritual cleanliness in Islam. It shows that purification is not just a physical act but a significant part of faith.",
        context: "This was mentioned in the context of teaching about the importance of purification and cleanliness in Islam.",
        benefits: [
            "Shows the importance of cleanliness in Islam",
            "Links physical cleanliness to spiritual purity",
            "Encourages maintaining good hygiene",
            "Demonstrates the comprehensive nature of Islam"
        ],
        relatedHadiths: ["Sunan al-Tirmidhi 3517", "Sunan Ibn Majah 280"],
        arabicText: "الطُّهُورُ شَطْرُ الْإِيمَانِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 8,
        text: "Paradise lies beneath the feet of mothers.",
        reference: "Sunan al-Nasa'i 3104",
        narrator: "Abdullah ibn Abbas",
        book: "Sunan al-Nasa'i",
        chapter: "Book of Jihad",
        grade: "Sahih",
        explanation: "This hadith highlights the high status of mothers in Islam and emphasizes the importance of serving and respecting them. It indicates that treating one's mother well is a path to Paradise.",
        context: "This was said when someone asked about the rights of parents, particularly mothers.",
        benefits: [
            "Shows the high status of mothers in Islam",
            "Emphasizes the importance of serving parents",
            "Teaches respect for mothers",
            "Links good treatment of parents to Paradise"
        ],
        relatedHadiths: ["Sahih al-Bukhari 5971", "Sahih Muslim 2548"],
        arabicText: "الْجَنَّةُ تَحْتَ أَقْدَامِ الْأُمَّهَاتِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 9,
        text: "Seek knowledge from the cradle to the grave.",
        reference: "Al-Bayhaqi",
        narrator: "Anas ibn Malik",
        book: "Shu'ab al-Iman",
        chapter: "Book of Knowledge",
        grade: "Hasan",
        explanation: "This hadith emphasizes the importance of continuous learning in Islam. It shows that the pursuit of knowledge is not limited by age or time.",
        context: "This was said to encourage Muslims to continuously seek knowledge throughout their lives.",
        benefits: [
            "Encourages lifelong learning",
            "Shows the value of knowledge in Islam",
            "Motivates continuous self-improvement",
            "Demonstrates that learning has no age limit"
        ],
        relatedHadiths: ["Sunan Ibn Majah 224", "Jami at-Tirmidhi 2646"],
        arabicText: "اطْلُبُوا الْعِلْمَ مِنَ الْمَهْدِ إِلَى اللَّحْدِ",
        votes: { upvotes: 0, downvotes: 0 }
    },
    {
        id: 10,
        text: "The best of you are those who are best to their families, and I am the best to my family.",
        reference: "Sunan al-Tirmidhi 3895",
        narrator: "Aisha",
        book: "Jami at-Tirmidhi",
        chapter: "Book of Virtues",
        grade: "Sahih",
        explanation: "This hadith establishes the importance of good treatment of family members. It shows that a person's character is best judged by how they treat their closest relations.",
        context: "This was said to emphasize the importance of maintaining good character within the family unit.",
        benefits: [
            "Emphasizes good treatment of family",
            "Sets a standard for domestic behavior",
            "Shows the Prophet's example in family life",
            "Links character to family treatment"
        ],
        relatedHadiths: ["Sahih al-Bukhari 3331", "Sahih Muslim 2325"],
        arabicText: "خَيْرُكُمْ خَيْرُكُمْ لِأَهْلِهِ وَأَنَا خَيْرُكُمْ لِأَهْلِي",
        votes: { upvotes: 0, downvotes: 0 }
    }
];

// Add this function to load votes from Supabase
async function loadHadithVotes() {
    try {
        // First try to load existing votes
        const { data: existingVotes, error } = await supabase
            .from('hadith_votes')
            .select('*');

        if (error) {
            if (error.code === '42P01') {
                // Table doesn't exist, initialize it
                await initializeHadithVotes();
                return;
            }
            throw error;
        }

        if (!existingVotes || existingVotes.length === 0) {
            // No votes exist, initialize them
            await initializeHadithVotes();
            return;
        }

        // Update the hadiths array with vote counts
        hadiths.forEach(hadith => {
            const voteData = existingVotes.find(v => v.hadith_id === hadith.id);
            if (voteData) {
                hadith.votes = {
                    upvotes: voteData.upvotes || 0,
                    downvotes: voteData.downvotes || 0
                };
                hadith.upvotes = voteData.upvotes || 0;
                hadith.downvotes = voteData.downvotes || 0;
            } else {
                hadith.votes = { upvotes: 0, downvotes: 0 };
                hadith.upvotes = 0;
                hadith.downvotes = 0;
            }
        });

        updateHadithVotesDisplay();
    } catch (error) {
        console.error('Error loading hadith votes:', error);
        // Initialize with zeros if there's an error
        hadiths.forEach(hadith => {
            hadith.votes = { upvotes: 0, downvotes: 0 };
            hadith.upvotes = 0;
            hadith.downvotes = 0;
        });
        updateHadithVotesDisplay();
    }
}

async function initializeHadithVotes() {
    try {
        // Create initial vote data for each hadith
        const voteData = hadiths.map(hadith => ({
            hadith_id: hadith.id,
            upvotes: 0,
            downvotes: 0
        }));

        // Insert initial vote data
        const { error } = await supabase
            .from('hadith_votes')
            .upsert(voteData);

        if (error) throw error;

        // Update the hadiths array
        hadiths.forEach(hadith => {
            hadith.votes = { upvotes: 0, downvotes: 0 };
            hadith.upvotes = 0;
            hadith.downvotes = 0;
        });

        updateHadithVotesDisplay();
    } catch (error) {
        console.error('Error initializing hadith votes:', error);
        // Initialize with zeros if there's an error
        hadiths.forEach(hadith => {
            hadith.votes = { upvotes: 0, downvotes: 0 };
            hadith.upvotes = 0;
            hadith.downvotes = 0;
        });
        updateHadithVotesDisplay();
    }
}

// Add this function to update vote displays
function updateHadithVotesDisplay() {
    hadiths.forEach(hadith => {
        const hadithCard = document.querySelector(`.hadith-card[data-id="${hadith.id}"]`);
        if (hadithCard) {
            const upvoteSpan = hadithCard.querySelector('.upvote span');
            const downvoteSpan = hadithCard.querySelector('.downvote span');
            
            upvoteSpan.textContent = hadith.upvotes;
            downvoteSpan.textContent = hadith.downvotes;
        }
    });
}

// Update the handleHadithVote function
async function handleHadithVote(hadithId, isUpvote) {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('Please sign in to vote');
        return;
    }

    const userId = user.id;
    const hadithCard = document.querySelector(`.hadith-card[data-id="${hadithId}"]`);
    const upvoteBtn = hadithCard.querySelector('.upvote');
    const downvoteBtn = hadithCard.querySelector('.downvote');
    
    // Disable buttons during processing
    upvoteBtn.disabled = true;
    downvoteBtn.disabled = true;

    try {
        // Get the current vote state
        const { data: existingVote, error: voteError } = await supabase
            .from('user_hadith_votes')
            .select('is_upvote')
            .match({ hadith_id: hadithId, user_id: userId })
            .maybeSingle();

        if (voteError) throw voteError;

        // Get current vote counts
        const { data: currentVotes, error: votesError } = await supabase
            .from('hadith_votes')
            .select('upvotes, downvotes')
            .eq('hadith_id', hadithId)
            .single();

        if (votesError) throw votesError;

        let newUpvotes = currentVotes.upvotes || 0;
        let newDownvotes = currentVotes.downvotes || 0;

        // Calculate new vote counts based on action
        if (!existingVote) {
            // New vote
            if (isUpvote) {
                newUpvotes++;
            } else {
                newDownvotes++;
            }
            await supabase
                .from('user_hadith_votes')
                .insert({ hadith_id: hadithId, user_id: userId, is_upvote: isUpvote });
        } else if (existingVote.is_upvote === isUpvote) {
            // Remove vote
            if (isUpvote) {
                newUpvotes = Math.max(0, newUpvotes - 1);
            } else {
                newDownvotes = Math.max(0, newDownvotes - 1);
            }
            await supabase
                .from('user_hadith_votes')
                .delete()
                .match({ hadith_id: hadithId, user_id: userId });
        } else {
            // Switch vote
            if (isUpvote) {
                newUpvotes++;
                newDownvotes = Math.max(0, newDownvotes - 1);
            } else {
                newDownvotes++;
                newUpvotes = Math.max(0, newUpvotes - 1);
            }
            await supabase
                .from('user_hadith_votes')
                .update({ is_upvote: isUpvote })
                .match({ hadith_id: hadithId, user_id: userId });
        }

        // Update total votes
        const { error: updateError } = await supabase
            .from('hadith_votes')
            .update({ upvotes: newUpvotes, downvotes: newDownvotes })
            .eq('hadith_id', hadithId);

        if (updateError) throw updateError;

        // Update UI
        const upvoteSpan = upvoteBtn.querySelector('span');
        const downvoteSpan = downvoteBtn.querySelector('span');
        upvoteSpan.textContent = newUpvotes;
        downvoteSpan.textContent = newDownvotes;
        
        // Update button states
        if (!existingVote) {
            // New vote
            if (isUpvote) {
                upvoteBtn.classList.add('voted');
            } else {
                downvoteBtn.classList.add('voted');
            }
        } else if (existingVote.is_upvote === isUpvote) {
            // Remove vote
            if (isUpvote) {
                upvoteBtn.classList.remove('voted');
            } else {
                downvoteBtn.classList.remove('voted');
            }
        } else {
            // Switch vote
            if (isUpvote) {
                upvoteBtn.classList.add('voted');
                downvoteBtn.classList.remove('voted');
            } else {
                downvoteBtn.classList.add('voted');
                upvoteBtn.classList.remove('voted');
            }
        }

    } catch (error) {
        console.error('Error handling vote:', error);
        alert('Error processing your vote. Please try again.');
    } finally {
        // Re-enable buttons
        upvoteBtn.disabled = false;
        downvoteBtn.disabled = false;
    }
}

// Update the loadHadith function to include vote loading
async function loadHadith() {
    try {
        elements.hadithContent.innerHTML = '<div class="loading">Loading hadiths...</div>';
        
        // Load votes first
        await loadHadithVotes();
        
        elements.hadithContent.innerHTML = `
            <div class="hadith-list">
                ${hadiths.map(hadith => `
                    <div class="hadith-card" data-id="${hadith.id}">
                        <div class="hadith-votes">
                            <button class="vote-btn upvote" onclick="handleHadithVote(${hadith.id}, true)">
                                <i class="fas fa-arrow-up"></i>
                                <span>${hadith.upvotes}</span>
                            </button>
                            <button class="vote-btn downvote" onclick="handleHadithVote(${hadith.id}, false)">
                                <i class="fas fa-arrow-down"></i>
                                <span>${hadith.downvotes}</span>
                            </button>
                        </div>
                        <div class="hadith-main">
                            <div class="hadith-text">
                                "${hadith.text}"
                            </div>
                            <div class="hadith-reference">
                                <i class="fas fa-book"></i> ${hadith.reference}
                                <span class="hadith-narrator">Narrated by: ${hadith.narrator}</span>
                                <span class="hadith-grade ${hadith.grade.toLowerCase()}">${hadith.grade}</span>
                            </div>
                            <button class="expand-button" onclick="toggleHadithDetails(${hadith.id})">
                                <span class="expand-text">Show Details</span>
                                <i class="fas fa-chevron-down expand-icon"></i>
                            </button>
                            <div class="hadith-details" id="details-${hadith.id}">
                                <div class="detail-section">
                                    <h4>Arabic Text</h4>
                                    <p class="arabic-text">${hadith.arabicText}</p>
                                </div>
                                <div class="detail-section">
                                    <h4>Context</h4>
                                    <p>${hadith.context}</p>
                                </div>
                                <div class="detail-section">
                                    <h4>Explanation</h4>
                                    <p>${hadith.explanation}</p>
                                </div>
                                <div class="detail-section">
                                    <h4>Benefits</h4>
                                    <ul>
                                        ${hadith.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                                    </ul>
                                </div>
                                <div class="detail-section">
                                    <h4>Source Information</h4>
                                    <p>Book: ${hadith.book}</p>
                                    <p>Chapter: ${hadith.chapter}</p>
                                </div>
                                <div class="detail-section">
                                    <h4>Related Hadiths</h4>
                                    <p>${hadith.relatedHadiths.join(', ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading hadith:', error);
        elements.hadithContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Unable to load hadiths. Please try again.
                <button onclick="loadHadith()" class="retry-button">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Dua Functions
async function loadDua() {
    try {
        // Predefined list of duas with categories and references
        const duas = [
            {
                category: "Daily Life",
                arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
                transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan waqina 'adhaban-nar",
                translation: "Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
                reference: "Quran 2:201",
                benefits: [
                    "A comprehensive dua for both worldly and religious well-being",
                    "One of the most frequently recited duas in the Quran",
                    "Was regularly recited by Prophet Muhammad ﷺ"
                ]
            },
            {
                category: "Knowledge",
                arabic: "رَبِّ زِدْنِي عِلْماً",
                transliteration: "Rabbi zidni 'ilma",
                translation: "My Lord, increase me in knowledge.",
                reference: "Quran 20:114",
                benefits: [
                    "Helps in seeking beneficial knowledge",
                    "Increases wisdom and understanding",
                    "Recommended to recite before studying"
                ]
            },
            {
                category: "Protection",
                arabic: "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
                transliteration: "Hasbiyallahu la ilaha illa huwa 'alayhi tawakkaltu wa huwa rabbul 'arshil 'adheem",
                translation: "Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.",
                reference: "Quran 9:129",
                benefits: [
                    "Provides strong protection from all harm",
                    "Strengthens trust in Allah",
                    "Helps in times of difficulty and anxiety"
                ]
            },
            {
                category: "Success",
                arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
                transliteration: "Rabbi-shrah li sadri, wa yassir li amri",
                translation: "My Lord, expand for me my chest [with assurance] and ease for me my task.",
                reference: "Quran 20:25-26",
                benefits: [
                    "Helps in overcoming difficulties",
                    "Brings ease in tasks and decisions",
                    "Reduces anxiety and stress"
                ]
            }
        ];

        // Get a random dua
        const randomDua = duas[Math.floor(Math.random() * duas.length)];

        elements.duaContent.innerHTML = `
            <div class="dua-card">
                <div class="dua-category">
                    <i class="fas fa-bookmark"></i>
                    ${randomDua.category}
                </div>
                
                <div class="dua-text">
                    <div class="dua-arabic">
                        ${randomDua.arabic}
                        <button class="copy-btn" onclick="copyToClipboard('${randomDua.arabic}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    <div class="dua-transliteration">
                        <div class="label">Transliteration</div>
                        ${randomDua.transliteration}
                        <button class="copy-btn" onclick="copyToClipboard('${randomDua.transliteration}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    <div class="dua-translation">
                        <div class="label">Translation</div>
                        ${randomDua.translation}
                    </div>
                </div>
                
                <div class="dua-reference">
                    <i class="fas fa-book"></i>
                    Reference: ${randomDua.reference}
                </div>
                
                <div class="dua-benefits">
                    <h3><i class="fas fa-star"></i> Benefits</h3>
                    <ul>
                        ${randomDua.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="dua-actions">
                    <button class="action-btn share-btn" onclick="shareDua('${randomDua.arabic}', '${randomDua.translation}')">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="action-btn refresh-btn" onclick="loadDua()">
                        <i class="fas fa-sync-alt"></i> New Dua
                    </button>
                </div>
            </div>
        `;

        // Add copy to clipboard functionality
        window.copyToClipboard = async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                showNotification('Copied to clipboard!', 'success');
            } catch (err) {
                showNotification('Failed to copy text', 'error');
            }
        };

        // Add share functionality
        window.shareDua = async (arabic, translation) => {
            try {
                const shareText = `${arabic}\n\n${translation}`;
                if (navigator.share) {
                    await navigator.share({
                        title: 'Dua of the Day',
                        text: shareText
                    });
                } else {
                    await navigator.clipboard.writeText(shareText);
                    showNotification('Dua copied to clipboard for sharing!', 'success');
                }
            } catch (err) {
                showNotification('Failed to share dua', 'error');
            }
        };

    } catch (error) {
        console.error('Error loading dua:', error);
        elements.duaContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                Unable to load Dua of the Day. Please try again.
                <button onclick="loadDua()" class="retry-button">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Islamic Events Functions
async function loadIslamicEvents() {
    const events = [
        { name: 'Ramadan', date: '2024-02-28', description: 'Month of fasting' },
        { name: 'Laylat al-Qadr', date: '2024-03-23', description: 'Night of Power' },
        { name: 'Eid al-Fitr', date: '2024-03-29', description: 'Festival of breaking the fast' },
        { name: 'Eid al-Adha', date: '2024-06-17', description: 'Festival of sacrifice' }
    ];

    elements.eventsContainer.innerHTML = events
        .map(event => `
            <div class="event-card">
                <div class="event-date">${new Date(event.date).toLocaleDateString()}</div>
                <h3>${event.name}</h3>
                <p>${event.description}</p>
            </div>
        `).join('');
}

function startPrayerTimeUpdates() {
    // Update prayer times every 5 minutes instead of every minute to reduce API load
    setInterval(async () => {
        try {
            await loadPrayerTimes();
        } catch (error) {
            console.error('Error in prayer time update interval:', error);
        }
    }, 300000); // 5 minutes

    // Update dates at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
        updateDates();
        setInterval(updateDates, 86400000); // Update every 24 hours
    }, timeUntilMidnight);
}

// Add this new function
function navigateToPage(pageId) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    // Update active page
    Object.values(pages).forEach(page => {
        if (page) {
            page.classList.remove('active');
        }
    });
    
    if (pages[pageId]) {
        pages[pageId].classList.add('active');
    }

    // Show/hide logo section based on page
    const logoSection = document.querySelector('.logo-section.home-only');
    if (logoSection) {
        if (pageId === 'home') {
            logoSection.style.display = 'flex';
        } else {
            logoSection.style.display = 'none';
        }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load page-specific content if needed
    switch(pageId) {
        case 'qibla':
            loadQiblaDirection();
            break;
        case 'quran':
            loadQuranData();
            break;
        case 'hadith':
            loadHadith();
            break;
        case 'dua':
            loadDua();
            break;
        case 'events':
            loadIslamicEvents();
            break;
    }
}

// Add these new functions
function initializeCalendarCalculator() {
    // Check if elements exist before trying to populate them
    if (!elements.hijriDay || !elements.hijriMonth || !elements.hijriYear) {
        console.warn('Calendar calculator elements not found');
        return;
    }

    // Populate Hijri date dropdowns
    populateHijriDropdowns();
    
    // Set default Gregorian date to today
    if (elements.gregorianDateInput) {
        const today = new Date();
        elements.gregorianDateInput.valueAsDate = today;
    }
    
    // Add event listeners if elements exist
    if (elements.convertToHijri) {
        elements.convertToHijri.addEventListener('click', convertGregorianToHijri);
    }
    if (elements.convertToGregorian) {
        elements.convertToGregorian.addEventListener('click', convertHijriToGregorian);
    }
}

function populateHijriDropdowns() {
    if (!elements.hijriDay || !elements.hijriMonth || !elements.hijriYear) {
        console.warn('Hijri dropdown elements not found');
        return;
    }

    // Clear existing options
    elements.hijriDay.innerHTML = '';
    elements.hijriMonth.innerHTML = '';
    elements.hijriYear.innerHTML = '';
    
    // Days (1-30)
    for (let i = 1; i <= 30; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        elements.hijriDay.appendChild(option);
    }
    
    // Months
    const hijriMonths = [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
        'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
    ];
    
    hijriMonths.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        elements.hijriMonth.appendChild(option);
    });
    
    // Years (1400-1500 AH)
    for (let i = 1400; i <= 1500; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i + ' AH';
        elements.hijriYear.appendChild(option);
    }
}

async function convertGregorianToHijri() {
    try {
        elements.hijriResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        
        const gregorianDate = elements.gregorianDateInput.value;
        const response = await fetch(
            `https://api.aladhan.com/v1/gToH/${gregorianDate}?adjustment=1`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to convert date');
        }
        
        const data = await response.json();
        if (!data || !data.data || !data.data.hijri) {
            throw new Error('Invalid response format');
        }
        
        const hijri = data.data.hijri;
        elements.hijriResult.textContent = 
            `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
            
    } catch (error) {
        console.error('Error converting date:', error);
        elements.hijriResult.innerHTML = 
            '<span class="error"><i class="fas fa-exclamation-circle"></i> Error converting date</span>';
    }
}

async function convertHijriToGregorian() {
    try {
        elements.gregorianResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
        
        const day = elements.hijriDay.value;
        const month = elements.hijriMonth.value;
        const year = elements.hijriYear.value;
        
        const response = await fetch(
            `https://api.aladhan.com/v1/hToG/${day}/${month}/${year}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Failed to convert date');
        }
        
        const data = await response.json();
        if (!data || !data.data || !data.data.gregorian) {
            throw new Error('Invalid response format');
        }
        
        const gregorian = data.data.gregorian;
        elements.gregorianResult.textContent = 
            new Date(gregorian.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
    } catch (error) {
        console.error('Error converting date:', error);
        elements.gregorianResult.innerHTML = 
            '<span class="error"><i class="fas fa-exclamation-circle"></i> Error converting date</span>';
    }
}

// Add this helper function to get Islamic events
function getIslamicEvents(hijriDate) {
    const events = [];
    
    // Check for month-long events
    if (islamicEvents[hijriDate.month.en]) {
        events.push({
            type: islamicEvents[hijriDate.month.en].type,
            description: islamicEvents[hijriDate.month.en].description
        });
    }
    
    // Check for special days
    const specialDays = {
        'Ramadan-27': 'Laylat al-Qadr',
        'Shawwal-1': 'Eid al-Fitr',
        'Dhul Hijjah-10': 'Eid al-Adha',
        'Muharram-1': 'Islamic New Year',
        'Muharram-10': 'Ashura',
        'Rabi al-Awwal-12': 'Mawlid al-Nabi',
        'Rajab-27': 'Isra and Miraj',
        'Ramadan-1': 'First of Ramadan',
        "Sha'ban-15": 'Laylat al-Baraat',
        'Rajab-27': 'Laylat al-Miraj',
        'Rajab-1': 'Laylat al-Raghaib'
    };
    
    const dayKey = `${hijriDate.month.en}-${hijriDate.day}`;
    if (specialDays[dayKey] && islamicEvents[specialDays[dayKey]]) {
        events.push({
            type: islamicEvents[specialDays[dayKey]].type,
            description: islamicEvents[specialDays[dayKey]].description
        });
    }
    
    return events;
}

// Add this new function
function toggleHadithDetails(hadithId) {
    const detailsSection = document.getElementById(`details-${hadithId}`);
    const button = detailsSection.previousElementSibling;
    const expandIcon = button.querySelector('.expand-icon');
    const expandText = button.querySelector('.expand-text');
    
    if (detailsSection.classList.contains('expanded')) {
        detailsSection.classList.remove('expanded');
        expandIcon.style.transform = 'rotate(0deg)';
        expandText.textContent = 'Show Details';
    } else {
        detailsSection.classList.add('expanded');
        expandIcon.style.transform = 'rotate(180deg)';
        expandText.textContent = 'Hide Details';
    }
}

// Add this function to show the Ramadan info popup
function showRamadanInfo() {
    // Create and append overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);

    // Create and append popup
    const popup = document.createElement('div');
    popup.className = 'ramadan-popup';
    popup.innerHTML = `
        <button class="close-btn" onclick="closeRamadanInfo()">
            <i class="fas fa-times"></i>
        </button>
        <h3><i class="fas fa-moon"></i> First Day of Ramadan</h3>
        <p>The first day of Ramadan marks the beginning of the most sacred month in the Islamic calendar. This blessed month is when:</p>
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
            <li>Muslims fast from dawn to sunset</li>
            <li>The Holy Quran was first revealed to Prophet Muhammad ﷺ</li>
            <li>Good deeds are multiplied in reward</li>
            <li>The Night of Power (Laylat al-Qadr) occurs</li>
        </ul>
        <p>During this month, Muslims strengthen their faith through:</p>
        <ul style="margin-left: 1.5rem;">
            <li>Increased prayer and worship</li>
            <li>Reading and reflecting on the Quran</li>
            <li>Giving charity</li>
            <li>Self-reflection and spiritual growth</li>
        </ul>
    `;
    document.body.appendChild(popup);

    // Add active class after a small delay to trigger animation
    setTimeout(() => {
        overlay.classList.add('active');
        popup.classList.add('active');
    }, 10);
}

// Add this function to close the Ramadan info popup
function closeRamadanInfo() {
    const overlay = document.querySelector('.popup-overlay');
    const popup = document.querySelector('.ramadan-popup');
    
    if (overlay && popup) {
        overlay.classList.remove('active');
        popup.classList.remove('active');
        
        // Remove elements after animation
        setTimeout(() => {
            overlay.remove();
            popup.remove();
        }, 300);
    }
}

// Add these functions before setupEventListeners
// Initialize tasbih beads
function initializeTasbihBeads() {
    const beadsContainer = document.querySelector('.tasbih-beads');
    beadsContainer.innerHTML = '';
    
    // Create 33 beads
    for (let i = 0; i < 33; i++) {
        const bead = document.createElement('div');
        bead.className = 'tasbih-bead';
        
        // Calculate position in a circle
        const angle = (i * 360 / 33) * (Math.PI / 180);
        const radius = 120; // Adjust this value to change the circle size
        
        // Calculate x and y coordinates
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        // Position the bead
        bead.style.transform = `translate(${x}px, ${y}px)`;
        
        beadsContainer.appendChild(bead);
    }
}

// Update tasbih display and animations
function updateTasbihDisplay() {
    if (!elements.tasbihCount) return;
    
    // Update counter
    elements.tasbihCount.textContent = tasbihCount;
    
    // Update set progress
    currentSet = tasbihCount % 33;
    const currentSetElement = document.getElementById('currentSet');
    const setProgressElement = document.getElementById('setProgress');
    const totalTodayElement = document.getElementById('totalToday');
    
    if (currentSetElement) currentSetElement.textContent = currentSet;
    if (setProgressElement) setProgressElement.style.width = `${(currentSet / 33) * 100}%`;
    
    // Update beads
    const beads = document.querySelectorAll('.tasbih-bead');
    beads.forEach((bead, index) => {
        bead.classList.toggle('active', index < currentSet);
    });
    
    // Check if we completed a set
    if (currentSet === 0 && tasbihCount > 0) {
        showNotification('Set completed! 33 times ' + currentDhikr, 'success');
    }
    
    // Update total for today
    const today = new Date().toDateString();
    if (lastResetDate !== today) {
        totalToday = 0;
        lastResetDate = today;
    }
    if (totalTodayElement) totalTodayElement.textContent = totalToday;
}

// Handle tasbih button click with haptic feedback
async function handleTasbihClick() {
    tasbihCount++;
    totalToday++;
    
    // Add haptic feedback if supported
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
    
    // Animate the active bead
    const currentBead = document.querySelector(`.tasbih-bead:nth-child(${(currentSet + 1)})`);
    if (currentBead) {
        currentBead.classList.add('active');
        currentBead.style.transform += ' scale(1.2)';
        setTimeout(() => {
            currentBead.style.transform = currentBead.style.transform.replace(' scale(1.2)', '');
        }, 200);
    }
    
    updateTasbihDisplay();
    await saveTasbihCount();
}

// Reset tasbih counter
async function resetTasbih() {
    const wasReset = confirm('Are you sure you want to reset the counter?');
    if (wasReset) {
        tasbihCount = 0;
        currentSet = 0;
        updateTasbihDisplay();
        await saveTasbihCount();
        showNotification('Counter has been reset', 'success');
    }
}

// Update dhikr selection
function updateDhikrButtons() {
    if (!elements.dhikrButtons) return;
    
    elements.dhikrButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.dhikr === currentDhikr);
    });
    
    const tasbihButtonSpan = elements.tasbihButton?.querySelector('span');
    if (tasbihButtonSpan) {
        tasbihButtonSpan.textContent = 'Tap to Count';
    }
}

// Load tasbih state
async function loadTasbihState() {
    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw new Error('Authentication error: ' + authError.message);
        if (!user) {
            // If not authenticated, use default values
            tasbihCount = 0;
            currentDhikr = 'SubhanAllah';
            totalToday = 0;
            lastResetDate = new Date().toDateString();
            initializeTasbihBeads();
            updateTasbihDisplay();
            updateDhikrButtons();
            return;
        }

        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error('Database error: ' + error.message);
        }

        if (data) {
            tasbihCount = data.tasbih_count || 0;
            currentDhikr = data.current_dhikr || 'SubhanAllah';
            totalToday = data.total_today || 0;
            lastResetDate = data.last_reset_date || new Date().toDateString();
            
            // Reset total if it's a new day
            const today = new Date().toDateString();
            if (lastResetDate !== today) {
                totalToday = 0;
                lastResetDate = today;
                // Update the reset in database
                await saveTasbihCount();
            }
        } else {
            // Initialize with default values if no data exists
            tasbihCount = 0;
            currentDhikr = 'SubhanAllah';
            totalToday = 0;
            lastResetDate = new Date().toDateString();
            // Create initial record
            await saveTasbihCount();
        }

        initializeTasbihBeads();
        updateTasbihDisplay();
        updateDhikrButtons();
    } catch (error) {
        console.error('Error loading tasbih state:', error);
        showNotification(error.message || 'Failed to load saved progress', 'error');
        
        // Use default values on error
        tasbihCount = 0;
        currentDhikr = 'SubhanAllah';
        totalToday = 0;
        lastResetDate = new Date().toDateString();
        initializeTasbihBeads();
        updateTasbihDisplay();
        updateDhikrButtons();
    }
}

// Initialize the application
init(); 