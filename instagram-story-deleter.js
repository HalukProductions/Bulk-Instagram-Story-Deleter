(function() {
    'use strict';

    // --- SCRIPT CONFIGURATION ---
    const APP_PREFIX = 'isdi'; // Instagram Story Deleter Injector

    // --- STYLES FOR THE INJECTED UI ---
    const styles = `
        #${APP_PREFIX}-launcher {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background-color: #e53e3e;
            color: white;
            border-radius: 50%;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            cursor: pointer;
            z-index: 9997;
            transition: transform 0.2s;
            font-size: 24px;
        }
        #${APP_PREFIX}-launcher:hover {
            transform: scale(1.1);
            background-color: #c53030;
        }
        #${APP_PREFIX}-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 9998;
            display: none; /* Hidden by default */
            align-items: center;
            justify-content: center;
        }
        #${APP_PREFIX}-modal {
            background-color: #ffffff;
            color: #1a202c;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
            width: 90vw;
            max-width: 800px;
            height: 90vh;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #${APP_PREFIX}-header {
            padding: 16px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #${APP_PREFIX}-header h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1d2129;
        }
        #${APP_PREFIX}-close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #718096;
        }
         #${APP_PREFIX}-close-btn:hover {
            color: #1a202c;
        }
        #${APP_PREFIX}-controls {
            padding: 12px 16px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        .${APP_PREFIX}-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .${APP_PREFIX}-btn-secondary {
            background-color: #edf2f7;
            color: #2d3748;
        }
         .${APP_PREFIX}-btn-secondary:hover {
            background-color: #e2e8f0;
        }
        .${APP_PREFIX}-btn-danger {
            background-color: #e53e3e;
            color: white;
        }
        .${APP_PREFIX}-btn-danger:hover {
            background-color: #c53030;
        }
        .${APP_PREFIX}-btn-danger:disabled {
            background-color: #fca5a5;
            cursor: not-allowed;
        }
        #${APP_PREFIX}-body {
            flex-grow: 1;
            overflow-y: auto;
            padding: 16px;
        }
        #${APP_PREFIX}-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 16px;
        }
        .${APP_PREFIX}-story-item {
            position: relative;
            cursor: pointer;
            border: 3px solid transparent;
            border-radius: 8px;
            overflow: hidden;
            aspect-ratio: 9 / 16;
            background-color: #f3f4f6;
            transition: all 0.2s ease-in-out;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }
        .${APP_PREFIX}-story-item.selected {
            border-color: #3b82f6;
            transform: scale(1.05);
        }
        .${APP_PREFIX}-story-item .overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
        }
        .${APP_PREFIX}-story-item.selected .overlay {
            opacity: 1;
        }
        .${APP_PREFIX}-story-item .checkmark {
            color: white;
            font-size: 3rem;
            font-weight: bold;
        }
        #${APP_PREFIX}-status {
             margin-left: auto;
             font-size: 0.875rem;
             color: #4a5567;
        }
    `;

    // --- HTML FOR THE INJECTED UI ---
    const modalHTML = `
        <div id="${APP_PREFIX}-modal">
            <div id="${APP_PREFIX}-header">
                <h2>Story Deleter</h2>
                <button id="${APP_PREFIX}-close-btn">&times;</button>
            </div>
            <div id="${APP_PREFIX}-controls">
                <button id="${APP_PREFIX}-select-all" class="${APP_PREFIX}-btn ${APP_PREFIX}-btn-secondary">Select All</button>
                <button id="${APP_PREFIX}-deselect-all" class="${APP_PREFIX}-btn ${APP_PREFIX}-btn-secondary">Deselect All</button>
                <button id="${APP_PREFIX}-delete-selected" class="${APP_PREFIX}-btn ${APP_PREFIX}-btn-danger">Delete Selected</button>
                <div id="${APP_PREFIX}-status">Selected: <span id="${APP_PREFIX}-selection-count">0</span></div>
            </div>
            <div id="${APP_PREFIX}-body">
                <div id="${APP_PREFIX}-grid"></div>
            </div>
        </div>
    `;

    // --- MAIN LOGIC ---

    function fetchStoryData() {
        let storyData = [];
        document.querySelectorAll('div[role="button"]').forEach(div => {
            const style = div.firstElementChild.style.backgroundImage;
            if (style && style.includes('ig_cache_key')) {
                const url = style.slice(5, -2); // Remove url("...")
                const keyMatch = url.match(/ig_cache_key=([^&]+)/);
                if (keyMatch && keyMatch[1]) {
                    try {
                        const base64Key = decodeURIComponent(keyMatch[1].split('.')[0]);
                        const mediaId = atob(base64Key);
                        storyData.push({ id: mediaId, thumbnailUrl: url });
                    } catch(e) {}
                }
            }
        });
        const uniqueStoryData = Array.from(new Map(storyData.map(item => [item.id, item])).values());
        return uniqueStoryData;
    }

    function renderStories(stories) {
        const grid = document.getElementById(`${APP_PREFIX}-grid`);
        if (!grid) return;
        grid.innerHTML = '';
        if (stories.length === 0) {
            grid.innerHTML = '<p>No stories found. Please scroll down on the archive page and click the red button again.</p>';
            return;
        }
        stories.forEach(story => {
            const item = document.createElement('div');
            item.className = `${APP_PREFIX}-story-item`;
            item.dataset.storyId = story.id;
            item.style.backgroundImage = `url("${story.thumbnailUrl}")`;

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.innerHTML = '<span class="checkmark">✓</span>';

            item.appendChild(overlay);
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                updateSelectionCount();
            });
            grid.appendChild(item);
        });
    }

    function updateSelectionCount() {
        const count = document.querySelectorAll(`.${APP_PREFIX}-story-item.selected`).length;
        document.getElementById(`${APP_PREFIX}-selection-count`).textContent = count;
    }
    
    async function deleteStory(mediaId, csrfToken) {
        // CORRECTED: Using the correct API endpoint provided by the user.
        const url = `/api/v1/web/create/${mediaId}/delete/`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded', 
                    'X-CSRFToken': csrfToken, 
                    'X-Requested-With': 'XMLHttpRequest', 
                    'X-Instagram-AJAX': '1024024610' // Using a recent valid value
                },
                body: '' // POST request needs a body, even if empty
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const result = await response.json();
                if (response.ok && result.status === 'ok') {
                    console.log(`%cSUCCESS: Deleted story with ID: ${mediaId}`, 'color: #10b981;');
                    return true;
                } else {
                    console.error(`%cFAILED: API reported failure for story ID: ${mediaId}`, 'color: #ef4444;', result);
                    return false;
                }
            } else {
                 console.error(`%cFAILED: Received a non-JSON response (likely an error page) for story ID: ${mediaId}. Status: ${response.status}`, 'color: #ef4444;');
                 return false;
            }

        } catch (error) {
            console.error(`%cFATAL: Network or parsing error while deleting story ID: ${mediaId}`, 'color: #ef4444;', error);
            return false;
        }
    }

    async function runDeletionProcess() {
        const selectedItems = document.querySelectorAll(`.${APP_PREFIX}-story-item.selected`);
        if (selectedItems.length === 0) {
            alert('Please select at least one story to delete.');
            return;
        }
        if (!confirm(`Are you sure you want to permanently delete ${selectedItems.length} stories? This cannot be undone.`)) return;

        const selectedIds = Array.from(selectedItems).map(item => item.dataset.storyId);
        const cookies = document.cookie.split(';').map(c => c.trim());
        const csrfCookie = cookies.find(cookie => cookie.startsWith('csrftoken='));
        if (!csrfCookie) {
            alert("Could not find CSRF token. Deletion failed.");
            return;
        }
        const csrfToken = csrfCookie.split('=')[1];
        
        console.log("Starting deletion...");
        document.getElementById(`${APP_PREFIX}-delete-selected`).disabled = true;

        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            const itemEl = document.querySelector(`.${APP_PREFIX}-story-item[data-story-id="${id}"]`);
            console.log(`%c[${i + 1}/${selectedIds.length}] Deleting story ${id}...`, 'font-weight: bold;');
            const success = await deleteStory(id, csrfToken);
            if (success) {
                if(itemEl) itemEl.remove();
            } else {
                 if(itemEl) itemEl.style.borderColor = '#e53e3e';
            }
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1500));
        }

        alert('Deletion process complete. Check the console for details.');
        document.getElementById(`${APP_PREFIX}-delete-selected`).disabled = false;
        updateSelectionCount();
    }

    async function showModal() {
        document.getElementById(`${APP_PREFIX}-overlay`).style.display = 'flex';
        document.getElementById(`${APP_PREFIX}-launcher`).style.display = 'none';

        const grid = document.getElementById(`${APP_PREFIX}-grid`);
        const statusDiv = document.getElementById(`${APP_PREFIX}-status`);
        const originalStatusHTML = statusDiv.innerHTML;

        grid.innerHTML = '<p>Loading stories, please wait. Scrolling to find items...</p>';

        let allStoriesMap = new Map();
        let previousStoryCount = -1;
        const maxScrolls = 25; // Safety break after 25 scrolls
        const targetCount = 50; // Aim for at least 50 stories
        let currentScroll = 0;
        let scrollsWithoutNewStories = 0;

        // Keep scrolling as long as we haven't hit our limits and we are still finding new stories.
        // We will stop if we have 2 consecutive scrolls that find no new items.
        while (currentScroll < maxScrolls && allStoriesMap.size < targetCount && scrollsWithoutNewStories < 2) {
            previousStoryCount = allStoriesMap.size;

            statusDiv.textContent = `Found ${allStoriesMap.size} stories. Scrolling...`;
            window.scrollTo(0, document.body.scrollHeight);

            // Wait for the loading spinner to disappear by polling the DOM.
            statusDiv.textContent = `Found ${allStoriesMap.size} stories. Waiting for new items to load...`;
            const waitStartTime = Date.now();
            while (document.querySelector('svg[aria-label="Loading..."]') && (Date.now() - waitStartTime < 15000)) { // 15s safety timeout
                await new Promise(resolve => setTimeout(resolve, 250)); // Check for spinner every 250ms
            }

            // A final small delay to ensure DOM has settled after loading.
            await new Promise(resolve => setTimeout(resolve, 500));

            const newStories = fetchStoryData();
            newStories.forEach(story => allStoriesMap.set(story.id, story));
            
            const stories = Array.from(allStoriesMap.values());
            renderStories(stories);

            if (allStoriesMap.size > previousStoryCount) {
                scrollsWithoutNewStories = 0; // Reset because we found new stories.
            } else {
                scrollsWithoutNewStories++; // Increment because this scroll yielded nothing.
            }

            currentScroll++;
        }

        const finalStories = Array.from(allStoriesMap.values());
        statusDiv.innerHTML = originalStatusHTML; // Restore original status area
        updateSelectionCount(); // Update for the final set of stories

        if (finalStories.length === 0) {
            grid.innerHTML = '<p>No stories found. Please make sure you are on your Story Archive page.</p>';
        } else {
            console.log(`Finished loading. Found ${finalStories.length} stories.`);
        }
    }
    
    function hideModal() {
        document.getElementById(`${APP_PREFIX}-overlay`).style.display = 'none';
        document.getElementById(`${APP_PREFIX}-launcher`).style.display = 'flex';
    }

    function init() {
        if (document.getElementById(`${APP_PREFIX}-overlay`)) {
            showModal();
            return;
        }

        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
        
        const launcherBtn = document.createElement('button');
        launcherBtn.id = `${APP_PREFIX}-launcher`;
        launcherBtn.innerHTML = '🗑️';
        launcherBtn.title = 'Open Story Deleter';
        document.body.appendChild(launcherBtn);

        const modalContainer = document.createElement('div');
        modalContainer.id = `${APP_PREFIX}-overlay`;
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        showModal(); // Show modal on first run

        launcherBtn.addEventListener('click', showModal);
        document.getElementById(`${APP_PREFIX}-close-btn`).addEventListener('click', hideModal);
        document.getElementById(`${APP_PREFIX}-select-all`).addEventListener('click', () => {
             document.querySelectorAll(`.${APP_PREFIX}-story-item`).forEach(item => item.classList.add('selected'));
             updateSelectionCount();
        });
        document.getElementById(`${APP_PREFIX}-deselect-all`).addEventListener('click', () => {
             document.querySelectorAll(`.${APP_PREFIX}-story-item`).forEach(item => item.classList.remove('selected'));
             updateSelectionCount();
        });
        document.getElementById(`${APP_PREFIX}-delete-selected`).addEventListener('click', runDeletionProcess);
    }
    
    init();

})();
