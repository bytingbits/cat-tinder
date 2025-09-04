// Get references to the HTML elements we'll be interacting with
const swipeDeck = document.querySelector('.swipe-deck');
const likeButton = document.querySelector('#like');
const nopeButton = document.querySelector('#nope');

// API URL for fetching random cat data
const CATAAS_URL = 'https://cataas.com';

// State variables to keep track of the interaction
let currentCard = null;
let startX = 0;
let isDragging = false;

/**
 * Fetches data for a new cat from the cataas API.
 * The API endpoint `https://cataas.com/cat?json=true` returns metadata for a random cat.
 * We use this to get a unique ID for each cat image.
 */
async function fetchNewCat() {
    try {
        const response = await fetch(`${CATAAS_URL}/cat?json=true`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data; // Returns an object with cat info like { _id: '...' }
    } catch (error) {
        console.error("Failed to fetch a cat:", error);
        // In case of an error, we can return a placeholder or handle it gracefully
        swipeDeck.innerHTML = `<p>Could not fetch new cats. Please try again later.</p>`;
        return null;
    }
}

/**
 * Creates a new card element and adds it to the top of the swipe deck.
 * @param {object} catData - The data object for the cat from the API.
 */
function createCard(catData) {
    const card = document.createElement('div');
    card.classList.add('cat-card');
    // We use the unique _id to construct the image URL
    card.style.backgroundImage = `url(${CATAAS_URL}/cat/${catData._id})`;

    // Add "Like" and "Nope" overlay stamps
    card.innerHTML = `
        <div class="choice like">Like</div>
        <div class="choice nope">Nope</div>
    `;
    
    // Add event listeners for mouse and touch events to handle dragging
    card.addEventListener('mousedown', startDrag);
    card.addEventListener('touchstart', startDrag, { passive: true });

    // Add the new card to the top of the deck
    if (swipeDeck.firstChild) {
        swipeDeck.insertBefore(card, swipeDeck.firstChild);
    } else {
        swipeDeck.appendChild(card);
    }

    currentCard = card;
}

/**
 * Loads a specified number of new cat cards and adds them to the deck.
 * We load two at a time so the next one is ready to go.
 * @param {number} count - The number of cards to load.
 */
async function loadNewCards(count = 1) {
    for (let i = 0; i < count; i++) {
        const catData = await fetchNewCat();
        if (catData) {
            createCard(catData);
        }
    }
}


// --- Drag and Swipe Event Handlers ---

function startDrag(e) {
    if (!currentCard) return;
    isDragging = true;
    // Get the initial horizontal position of the mouse or touch
    startX = e.pageX || e.touches[0].pageX;
    // No smooth transition during drag
    currentCard.style.transition = 'none'; 
    
    // Add move and end listeners to the whole document to track movement anywhere on the page
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag, { passive: true });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
}

function onDrag(e) {
    if (!isDragging || !currentCard) return;
    
    const currentX = e.pageX || e.touches[0].pageX;
    const deltaX = currentX - startX;

    // The horizontal distance needed to trigger a decision (in pixels)
    const decisionThreshold = 100;
    const opacity = Math.abs(deltaX) / decisionThreshold;

    // Show the "Like" or "Nope" stamp based on drag direction
    if (deltaX > 0) {
        currentCard.querySelector('.like').style.opacity = opacity;
        currentCard.querySelector('.nope').style.opacity = 0;
    } else {
        currentCard.querySelector('.nope').style.opacity = opacity;
        currentCard.querySelector('.like').style.opacity = 0;
    }
    
    // Move the card and rotate it slightly
    const rotation = deltaX / 20; // Controls how much the card rotates
    currentCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
}

function endDrag(e) {
    if (!isDragging || !currentCard) return;
    isDragging = false;
    
    const deltaX = (e.pageX || e.changedTouches[0].pageX) - startX;
    const decisionThreshold = 100;

    // Re-enable smooth transitions for snapping back or flying away
    currentCard.style.transition = 'transform 0.3s ease';

    if (Math.abs(deltaX) > decisionThreshold) {
        // Swipe was decisive
        const choice = deltaX > 0 ? 'like' : 'nope';
        handleChoice(choice);
    } else {
        // Swipe was not far enough, snap the card back to the center
        currentCard.style.transform = '';
        currentCard.querySelector('.like').style.opacity = 0;
        currentCard.querySelector('.nope').style.opacity = 0;
    }

    // Clean up global event listeners
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchend', endDrag);
}

/**
 * Handles the swipe decision, animates the card off-screen, and loads the next one.
 * @param {string} choice - 'like' or 'nope'
 */
function handleChoice(choice) {
    if (!currentCard) return;

    // Calculate how far the card should fly off-screen
    const flyOutX = (choice === 'like' ? 1 : -1) * window.innerWidth;
    currentCard.style.transform = `translateX(${flyOutX}px) rotate(${flyOutX / 20}deg)`;

    // Remove the card from the DOM after the animation completes
    currentCard.addEventListener('transitionend', () => {
        currentCard.remove();
    });

    // Nullify currentCard and load the next one
    currentCard = null;
    loadNewCards(1);
}

// --- Button Event Listeners ---

likeButton.addEventListener('click', () => handleChoice('like'));
nopeButton.addEventListener('click', () => handleChoice('nope'));


// --- Initial Load ---
// Load the first two cards when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadNewCards(2);
});
