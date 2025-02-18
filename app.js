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
    eventsContainer: document.getElementById('eventsContainer')
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

// Initialize the application
async function init() {
    try {
        // Set home page as active initially
        navigateToPage('home');
        
        // Core functionality
        setupEventListeners();
        updateDates();
        
        // Try to load user preferences but don't block if it fails
        try {
            await loadUserPreferences();
        } catch (error) {
            console.log('Could not load user preferences:', error);
        }

        // Location-based features
        try {
            await getCurrentLocation();
            await loadPrayerTimes();
            await loadQiblaDirection();
        } catch (error) {
            console.log('Could not load location-based features:', error);
        }

        // Content features
        try {
            await loadQuranData();
        } catch (error) {
            console.log('Could not load Quran data:', error);
            if (elements.quranText) {
                elements.quranText.innerHTML = '<div class="error-message">Unable to load Quran data. Please check your internet connection.</div>';
            }
        }

        try {
            await loadHadith();
        } catch (error) {
            console.log('Could not load Hadith:', error);
            if (elements.hadithContent) {
                elements.hadithContent.innerHTML = '<div class="error-message">Unable to load Hadith. Please check your internet connection.</div>';
            }
        }

        try {
            await loadDua();
        } catch (error) {
            console.log('Could not load Dua:', error);
            if (elements.duaContent) {
                elements.duaContent.innerHTML = '<div class="error-message">Unable to load Dua. Please try again later.</div>';
            }
        }

        try {
            await loadIslamicEvents();
        } catch (error) {
            console.log('Could not load Islamic events:', error);
            if (elements.eventsContainer) {
                elements.eventsContainer.innerHTML = '<div class="error-message">Unable to load Islamic events. Please try again later.</div>';
            }
        }

        // Start updates
        startPrayerTimeUpdates();
        
        // Apply preferences
        applyUserPreferences();
        
        // Register service worker last
        await registerServiceWorker();
        
    } catch (error) {
        console.error('Error during initialization:', error);
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
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .single();

        if (error) throw error;

        if (data) {
            tasbihCount = data.tasbih_count || 0;
            currentDhikr = data.current_dhikr || 'SubhanAllah';
            updateTasbihDisplay();
            updateDhikrButtons();
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

async function saveTasbihCount() {
    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({ 
                tasbih_count: tasbihCount,
                current_dhikr: currentDhikr
            });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving tasbih count:', error);
    }
}

function updateTasbihDisplay() {
    elements.tasbihCount.textContent = tasbihCount;
    elements.tasbihButton.textContent = currentDhikr;
}

function updateDhikrButtons() {
    elements.dhikrButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.dhikr === currentDhikr);
    });
}

// Event Listeners
function setupEventListeners() {
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
        elements.tasbihButton.addEventListener('click', () => {
            tasbihCount++;
            updateTasbihDisplay();
            saveTasbihCount();
        });

        elements.resetTasbih.addEventListener('click', () => {
            tasbihCount = 0;
            updateTasbihDisplay();
            saveTasbihCount();
        });
    }

    // Dhikr Buttons
    if (elements.dhikrButtons) {
        elements.dhikrButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentDhikr = button.dataset.dhikr;
                updateDhikrButtons();
                updateTasbihDisplay();
                saveTasbihCount();
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
    // Only register service worker if we're on HTTPS or localhost
    if ('serviceWorker' in navigator && 
        (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    } else {
        console.log('Service Worker not registered: requires HTTPS or localhost');
    }
}

// Location Functions
async function getCurrentLocation() {
    try {
        elements.prayerTimes.innerHTML = '<div class="loading">Detecting location...</div>';
        
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
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
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
        
        userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
        
        console.log('Location detected:', userLocation);
        return userLocation;
    } catch (error) {
        console.error('Error getting location:', error);
        elements.prayerTimes.innerHTML = `
            <div class="error-message">
                ${error.message}. Using default location (Mecca).
                <button onclick="getCurrentLocation().then(loadPrayerTimes)" class="retry-button">
                    Try Again
                </button>
            </div>
        `;
        // Default to Mecca coordinates if location access is denied
        userLocation = {
            latitude: 21.4225,
            longitude: 39.8262
        };
        return userLocation;
    }
}

// Date Functions
function updateDates() {
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
            // First try the aladhan API
            const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${now.toISOString().split('T')[0]}`);
            if (!response.ok) throw new Error('Failed to fetch from primary API');
            
            const data = await response.json();
            if (!data.data || !data.data.hijri) throw new Error('Invalid data format');
            
            const hijri = data.data.hijri;
            elements.hijriDate.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
        } catch (error) {
            console.error('Error with primary Hijri API:', error);
            
            // Try backup API
            try {
                const backupResponse = await fetch(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now() / 1000)}?latitude=21.4225&longitude=39.8262`);
                if (!backupResponse.ok) throw new Error('Failed to fetch from backup API');
                
                const backupData = await backupResponse.json();
                if (!backupData.data || !backupData.data.date || !backupData.data.date.hijri) {
                    throw new Error('Invalid backup data format');
                }
                
                const hijri = backupData.data.date.hijri;
                elements.hijriDate.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
            } catch (backupError) {
                console.error('Error with backup Hijri API:', backupError);
                elements.hijriDate.innerHTML = `
                    <span style="color: var(--text-secondary);">Unable to load Hijri date</span>
                    <button onclick="updateDates()" class="retry-button" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8rem;">
                        Retry
                    </button>
                `;
            }
        }
    };

    fetchHijriDate();
}

// Prayer Times Functions
async function loadPrayerTimes() {
    if (!userLocation) {
        elements.prayerTimes.innerHTML = `
            <div class="error-message">
                Location not available. Please allow location access and refresh the page.
                <button onclick="window.location.reload()" class="retry-button">Refresh Page</button>
            </div>
        `;
        return;
    }

    try {
        elements.prayerTimes.innerHTML = `<div class="loading">Loading prayer times...</div>`;

        // Get location name using reverse geocoding
        let locationName = "Mecca"; // Default location name
        try {
            const geocodeResponse = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`
            );
            const geocodeData = await geocodeResponse.json();
            locationName = geocodeData.city || geocodeData.locality || "Unknown Location";
        } catch (error) {
            console.error('Error getting location name:', error);
        }

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
            Fajr: 'Fajr',
            Sunrise: 'Sunrise',
            Dhuhr: 'Dhuhr',
            Asr: 'Asr',
            Maghrib: 'Maghrib',
            Isha: 'Isha'
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
                Prayer times for: ${locationName}
                <small>(${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})</small>
            </div>
            ${Object.entries(prayerNames)
                .map(([key, name]) => {
                    const time = formattedTimings[key];
                    if (!time) return '';
                    return `
                        <div class="prayer-time">
                            <div class="prayer-name">${name}</div>
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
                Prayer times for: Mecca (Default)
                <small>(21.4225, 39.8262)</small>
            </div>
            ${Object.entries(staticTimes)
                .map(([name, time]) => `
                    <div class="prayer-time">
                        <div class="prayer-name">${name}</div>
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
    const prayerTimes = Object.entries(timings)
        .filter(([name]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(name))
        .map(([name, time]) => {
            const [hours, minutes] = time.split(':');
            const prayerTime = new Date();
            prayerTime.setHours(hours, minutes, 0);
            return { name, time: prayerTime };
        });

    const nextPrayer = prayerTimes.find(prayer => prayer.time > now) || prayerTimes[0];
    const timeUntil = nextPrayer.time - now;
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

    elements.nextPrayer.textContent = `Next Prayer: ${nextPrayer.name} in ${hours}h ${minutes}m`;
}

// Qibla Direction Functions
async function loadQiblaDirection() {
    if (!userLocation) return;

    try {
        const response = await fetch(
            `http://api.aladhan.com/v1/qibla/${userLocation.latitude}/${userLocation.longitude}`
        );
        const data = await response.json();
        qiblaDirection = data.data.direction;
        elements.qiblaAngle.textContent = `Qibla Direction: ${Math.round(qiblaDirection)}°`;
        
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientationabsolute', updateQiblaCompass);
        }
    } catch (error) {
        console.error('Error loading qibla direction:', error);
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

        // Load first surah by default
        await loadSurah(1);

        // Add change event listener
        elements.surahSelect.addEventListener('change', (e) => {
            loadSurah(e.target.value);
        });
    } catch (error) {
        console.error('Error loading Quran data:', error);
        if (elements.surahSelect) {
            elements.surahSelect.innerHTML = '<option value="">Failed to load Surahs</option>';
        }
        if (elements.quranText) {
            elements.quranText.innerHTML = `
                <div class="error-message">
                    Unable to load Quran data. Please check your internet connection.
                    <button onclick="loadQuranData()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }
}

async function loadSurah(surahNumber) {
    try {
        elements.quranText.innerHTML = '<div class="loading">Loading Surah...</div>';
        elements.audioPlayer.innerHTML = '<div class="loading">Loading Audio...</div>';

        // Load Surah text
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
        const data = await response.json();
        
        if (!data || !data.data || !data.data.ayahs) {
            throw new Error('Invalid Surah data received');
        }
        
        elements.quranText.innerHTML = data.data.ayahs.map(ayah => `
            <div class="ayah">
                <span class="arabic">${ayah.text}</span>
                <small class="ayah-number">${ayah.numberInSurah}</small>
            </div>
        `).join('');

        // Load audio with better error handling
        try {
            // Construct the audio URL directly using a reliable CDN
            const paddedNumber = surahNumber.toString().padStart(3, '0');
            const audioUrl = `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${paddedNumber}.mp3`;
            
            // Test if the audio URL is accessible
            const audioTest = await fetch(audioUrl, { method: 'HEAD' });
            if (!audioTest.ok) {
                throw new Error('Audio file not accessible');
            }
            
            elements.audioPlayer.innerHTML = `
                <audio controls controlsList="nodownload">
                    <source src="${audioUrl}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
                <div class="audio-fallback">
                    <a href="${audioUrl}" target="_blank" rel="noopener noreferrer">
                        Download Audio
                    </a>
                </div>
            `;

            // Add error handling for the audio element
            const audioElement = elements.audioPlayer.querySelector('audio');
            audioElement.onerror = () => {
                elements.audioPlayer.innerHTML = `
                    <div class="error-message">
                        Error playing audio. Please try the download link below.
                        <div class="audio-fallback">
                            <a href="${audioUrl}" target="_blank" rel="noopener noreferrer">
                                Download Audio
                            </a>
                        </div>
                    </div>
                `;
            };
        } catch (audioError) {
            console.error('Error loading Surah audio:', audioError);
            elements.audioPlayer.innerHTML = `
                <div class="error-message">
                    Unable to load audio. Please try again.
                    <button onclick="loadSurah(${surahNumber})" class="retry-button">
                        Retry Audio
                    </button>
                </div>
            `;
        }
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

// Hadith Functions
async function loadHadith() {
    try {
        // Using a simple hadith API (you might want to replace this with a more comprehensive one)
        const response = await fetch('https://random-hadith-generator.vercel.app/bukhari');
        const data = await response.json();
        
        elements.hadithContent.innerHTML = `
            <div class="hadith-text">${data.hadith}</div>
            <div class="hadith-reference">Sahih Bukhari</div>
        `;
    } catch (error) {
        console.error('Error loading hadith:', error);
    }
}

// Dua Functions
async function loadDua() {
    try {
        // Predefined list of duas
        const duas = [
            {
                arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
                transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan waqina 'adhaban-nar",
                translation: "Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire."
            },
            {
                arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
                transliteration: "Rabbi-shrah li sadri, wa yassir li amri",
                translation: "My Lord, expand for me my chest [with assurance] and ease for me my task."
            },
            {
                arabic: "رَبِّ زِدْنِي عِلْماً",
                transliteration: "Rabbi zidni 'ilma",
                translation: "My Lord, increase me in knowledge."
            },
            {
                arabic: "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
                transliteration: "Hasbiyallahu la ilaha illa huwa 'alayhi tawakkaltu wa huwa rabbul 'arshil 'adheem",
                translation: "Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne."
            }
        ];

        // Get a random dua
        const randomDua = duas[Math.floor(Math.random() * duas.length)];

        elements.duaContent.innerHTML = `
            <div class="dua-arabic">${randomDua.arabic}</div>
            <div class="dua-transliteration">${randomDua.transliteration}</div>
            <div class="dua-translation">${randomDua.translation}</div>
        `;
    } catch (error) {
        console.error('Error loading dua:', error);
        elements.duaContent.innerHTML = `
            <div class="error-message">
                Unable to load Dua of the Day. Please try again.
                <button onclick="loadDua()" class="retry-button">Retry</button>
            </div>
        `;
    }
}

// Islamic Events Functions
async function loadIslamicEvents() {
    const events = [
        { name: 'Ramadan', date: '2024-03-10', description: 'Month of fasting' },
        { name: 'Eid al-Fitr', date: '2024-04-09', description: 'Festival of breaking the fast' },
        { name: 'Eid al-Adha', date: '2024-06-16', description: 'Festival of sacrifice' },
        // Add more events
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

    // Handle logo section visibility
    const logoSection = document.querySelector('.logo-section.home-only');
    if (logoSection) {
        logoSection.style.display = pageId === 'home' ? 'flex' : 'none';
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

// Initialize the application
init(); 