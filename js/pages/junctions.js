/**
 * CockroachTalk - State Junctions Directory Page Controller
 * File Responsibility: Fetches State Cockroach rooms, handles state search & regional category filtering, auto-polls real-time metrics.
 */

import { fetchJunctionRooms } from '../utils/api.js';
import { createJunctionCard } from '../utils/dom.js';

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
      if (currentCategory === 'north') {
        categoryMatch = northStates.includes(room.id);
      } else if (currentCategory === 'south') {
        categoryMatch = southStates.includes(room.id);
      } else if (currentCategory === 'west') {
        categoryMatch = westStates.includes(room.id);
      } else if (currentCategory === 'east') {
        categoryMatch = eastStates.includes(room.id);
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
});
