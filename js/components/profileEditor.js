import { renderEditProfileModal } from '../partials/modals/editProfileModal.js';
import { storage } from '../utils/storage.js';

export function initProfileEditor() {
  let modal, closeBtn, form, btnSave, nameBadge, fileInput, previewImg, placeholderIcon, bioInput, genderOptions;
  let base64Image = null;
  let selectedGender = 'skip';
  let currentTag = null;
  let currentProfile = null;

  function ensureModal() {
    modal = document.getElementById('edit-profile-modal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', renderEditProfileModal());
      modal = document.getElementById('edit-profile-modal');
      closeBtn = document.getElementById('edit-profile-close');
      form = document.getElementById('edit-profile-form');
      btnSave = document.getElementById('btn-save-edit-profile');
      nameBadge = document.getElementById('edit-profile-name-badge');
      fileInput = document.getElementById('edit-profile-picture-upload');
      previewImg = document.getElementById('edit-avatar-preview-img');
      placeholderIcon = document.getElementById('edit-avatar-placeholder-icon');
      bioInput = document.getElementById('edit-profile-bio');
      genderOptions = document.querySelectorAll('.edit-gender-selector .gender-option');
      bindEvents();
    }
  }

  function updateGenderUI() {
    genderOptions.forEach(opt => {
      const val = opt.getAttribute('data-gender');
      if (val === selectedGender) {
        opt.classList.add('selected');
        opt.setAttribute('aria-checked', 'true');
      } else {
        opt.classList.remove('selected');
        opt.setAttribute('aria-checked', 'false');
      }
    });
  }

  // Open modal and load existing data
  window.openEditProfileModal = async function() {
    ensureModal();
    currentProfile = storage.getUserProfile();
    if (currentProfile) {
      currentTag = currentProfile.tag;
      selectedGender = currentProfile.gender || 'skip';
      nameBadge.textContent = currentProfile.displayName || `Cockroach #${currentTag}`;
      updateGenderUI();
      
      // Fetch existing profile data (bio and picture)
      try {
        const res = await fetch(`/api/profile/${currentTag}`);
        const data = await res.json();
        if (data.success) {
          if (data.bio) {
            bioInput.value = data.bio;
          }
          if (data.profilePicture) {
            base64Image = data.profilePicture;
            previewImg.src = base64Image;
            previewImg.style.display = 'block';
            placeholderIcon.style.display = 'none';
          }
        }
      } catch(e) {
        console.error('Failed to load profile data', e);
      }
    }
    
    modal.classList.add('active');
    modal.style.display = 'flex';
  };

  function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300); // Wait for transition
  }

  function bindEvents() {
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Gender selection
    genderOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        selectedGender = opt.getAttribute('data-gender');
        updateGenderUI();
      });
    });

    // Profile Picture Handling
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          base64Image = canvas.toDataURL('image/jpeg', 0.8);
          previewImg.src = base64Image;
          previewImg.style.display = 'block';
          placeholderIcon.style.display = 'none';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Save changes
    btnSave.addEventListener('click', async (e) => {
      e.preventDefault();
      btnSave.disabled = true;
      btnSave.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i> Saving...';

      // Update local storage
      if (currentProfile) {
        currentProfile.gender = selectedGender;
        storage.saveUserProfile(currentProfile);
      }

      const bioText = bioInput.value.trim();

      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tag: currentTag,
            bio: bioText,
            profilePicture: base64Image
          })
        });
        if (currentProfile) {
          storage.updateHeaderHandleUI(currentProfile);
        }
        closeModal();
      } catch (err) {
        console.error('Failed to save profile', err);
        alert('Failed to save profile. Please try again.');
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = 'Save Profile <i class="bi bi-check-lg" aria-hidden="true"></i>';
      }
    });
  }
}
