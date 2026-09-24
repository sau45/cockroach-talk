/**
 * CockroachTalk - State Junctions Directory Page Controller
 * File Responsibility: Fetches State Cockroach rooms, handles state search & regional category filtering, auto-polls real-time metrics.
 */

import { fetchJunctionRooms } from '../utils/api.js';
import { createJunctionCard } from '../utils/dom.js';
import { renderCreateRoomModal } from '../partials/modals/createRoomModal.js';
import { renderPasswordPromptModal } from '../partials/modals/passwordPromptModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const gridContainer = document.getElementById('junctions-grid');
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let allRooms = [];
  let currentCategory = 'all';

  const northStates = ['delhi', 'punjab', 'haryana', 'himachal-pradesh', 'uttarakhand', 'jammu-kashmir', 'chandigarh', 'ladakh', 'uttar-pradesh'];
  const southStates = ['karnataka', 'tamil-nadu', 'kerala', 'telangana', 'andhra-pradesh', 'puducherry', 'goa'];
  const westStates = ['maharashtra', 'gujarat', 'rajasthan', 'madhya-pradesh', 'chhattisgarh'];
  const eastStates = ['west-bengal', 'bihar', 'odisha', 'assam', 'jharkhand', 'sikkim', 'tripura'];

  // Render state cockroach chip cards
  function renderRooms(rooms) {
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);"> <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;"><i class="bi bi-bug-fill" aria-hidden="true"></i></span> <h3>No State Junction Found</h3> <p>Try searching for a state name like "Maharashtra", "Delhi", or "Karnataka".</p> </div>
      `;
      return;
    }

    rooms.forEach(room => {
      const cardEl = createJunctionCard(room);
      gridContainer.appendChild(cardEl);
    });
  }

  // Filter rooms by state query and regional category
  function applyFilters() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    
    const filtered = allRooms.filter(room => {
      const nameMatch = room.name.toLowerCase().includes(query) || (room.id && room.id.toLowerCase().includes(query));
      
      let categoryMatch = true;
      if (currentCategory === 'community') {
        categoryMatch = !!room.isCustom;
      } else if (currentCategory === 'north') {
        categoryMatch = !room.isCustom && northStates.includes(room.id);
      } else if (currentCategory === 'south') {
        categoryMatch = !room.isCustom && southStates.includes(room.id);
      } else if (currentCategory === 'west') {
        categoryMatch = !room.isCustom && westStates.includes(room.id);
      } else if (currentCategory === 'east') {
        categoryMatch = !room.isCustom && eastStates.includes(room.id);
      } else if (currentCategory === 'all') {
        // all could mean both default and custom, or we can just leave categoryMatch = true
      }

      return nameMatch && categoryMatch;
    });

    renderRooms(filtered);
  }

  // Initial load
  try {
    allRooms = await fetchJunctionRooms();
    renderRooms(allRooms);
  } catch (err) {
    console.error('[Junctions] Error loading rooms:', err);
  }

  // Real-time auto-poll every 3 seconds to update live user metrics dynamically across browsers
  setInterval(async () => {
    try {
      allRooms = await fetchJunctionRooms();
      applyFilters();
    } catch (e) {}
  }, 3000);

  // Search input listener
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  // Category filter button listeners
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-category') || 'all';
      applyFilters();
    });
  });

  // Setup Create Room Modal
  const btnCreateRoom = document.getElementById('btn-create-room');
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', () => {
      let createModal = document.getElementById('create-room-modal');
      if (!createModal) {
        document.body.insertAdjacentHTML('beforeend', renderCreateRoomModal());
        createModal = document.getElementById('create-room-modal');
        
        const closeBtn = document.getElementById('create-room-close');
        const form = document.getElementById('create-room-form');
        
        closeBtn.addEventListener('click', () => {
          createModal.classList.remove('active');
          setTimeout(() => { createModal.style.display = 'none'; }, 200);
        });
        createModal.addEventListener('click', (e) => {
          if (e.target === createModal) {
            createModal.classList.remove('active');
            setTimeout(() => { createModal.style.display = 'none'; }, 200); // fade out
          }
        });
        
        const modalContent = createModal.querySelector('.modal-content');
        if (modalContent) {
          modalContent.addEventListener('click', (e) => e.stopPropagation());
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          if (window.isUserBanned) {
            if (window.showBannedModal) window.showBannedModal();
            return;
          }

          const topic = document.getElementById('create-room-topic').value;
          const password = document.getElementById('create-room-password').value;
          const submitBtn = document.getElementById('btn-submit-create-room');
          
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Creating...';

          try {
            const res = await fetch('/api/create-room', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic, password })
            });
            const data = await res.json();
            if (data.success) {
              const qs = password ? `?id=${encodeURIComponent(data.roomId)}&pwd=${encodeURIComponent(password)}` : `?id=${encodeURIComponent(data.roomId)}`;
              window.location.href = `room.html${qs}`;
            } else {
              alert(data.message || 'Failed to create room.');
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'Create & Join <i class="bi bi-arrow-right" aria-hidden="true"></i>';
            }
          } catch (err) {
            console.error(err);
            alert('Error creating room.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create & Join <i class="bi bi-arrow-right" aria-hidden="true"></i>';
          }
        });
      }
      createModal.classList.add('active');
      createModal.style.display = 'flex';
      // focus input
      setTimeout(() => { document.getElementById('create-room-topic')?.focus(); }, 100);
    });
  }
});
