const input = document.querySelector('#photos');
const status = document.querySelector('#status');
const form = document.querySelector('#upload-form');
const collage = document.querySelector('[data-home-collage]');
const submitButton = form?.querySelector('button[type="submit"]');
const mediaCloudName = 'dnpeyfhn2';
const mediaUploadPreset = 'Fanime';
const maxFiles = 100;
const uploadConcurrency = 3;
const collageSize = 8;
const mediaLoader = window.FanimeMedia;
const galleryDataUrl = '/data/media.json';

loadHomeCollage();

input?.addEventListener('change', () => {
  const count = input.files?.length ?? 0;

  if (count > maxFiles) {
    input.value = '';
    status.textContent = `Please select ${maxFiles} files or fewer at once.`;
    return;
  }

  status.textContent =
    count === 0 ? '' : `${count} file${count === 1 ? '' : 's'} selected. Photos and videos upload directly.`;
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!input?.files?.length) {
    status.textContent = 'Choose at least one file first.';
    return;
  }

  const files = Array.from(input.files);
  setUploading(true);

  try {
    const assets = await uploadMedia(files);
    console.info('Uploaded media', assets);

    window.location.href = '/thanks.html';
  } catch (error) {
    status.textContent = error.message || 'Upload failed. Try again with fewer files, or remove the largest video/photo.';
    setUploading(false);
  }
});

async function uploadMedia(files) {
  let nextFile = 0;
  let completedFiles = 0;
  const assets = new Array(files.length);
  const workers = Array.from({ length: Math.min(uploadConcurrency, files.length) }, async () => {
    while (nextFile < files.length) {
      const fileIndex = nextFile;
      const file = files[fileIndex];
      nextFile += 1;
      updateUploadStatus(completedFiles, files.length, file.name);
      assets[fileIndex] = await uploadMediaFile(file);
      completedFiles += 1;
      updateUploadStatus(completedFiles, files.length);
    }
  });

  await Promise.all(workers);
  return assets;
}

async function uploadMediaFile(file) {
  const formData = new FormData();
  formData.set('file', file, file.name);
  formData.set('upload_preset', mediaUploadPreset);
  formData.set('tags', 'fanime-2026');

  const context = buildContext(file);

  if (context) {
    formData.set('context', context);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${mediaCloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (context || formData.has('tags')) {
      return uploadMediaFileMinimal(file);
    }

    throw new Error(data?.error?.message || `Upload failed for ${file.name}`);
  }

  if (!isValidMediaResponse(data)) {
    throw new Error(`Upload returned an invalid response for ${file.name}`);
  }

  return mediaAsset(file, data);
}

async function uploadMediaFileMinimal(file) {
  const formData = new FormData();
  formData.set('file', file, file.name);
  formData.set('upload_preset', mediaUploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${mediaCloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Upload failed for ${file.name}`);
  }

  if (!isValidMediaResponse(data)) {
    throw new Error(`Upload returned an invalid response for ${file.name}`);
  }

  return mediaAsset(file, data);
}

function mediaAsset(file, data) {
  const hostedType = data.format ? `${data.resource_type}/${data.format}` : '';

  return {
    url: data.secure_url,
    publicId: data.public_id,
    name: file.name,
    size: data.bytes || file.size,
    type: file.type || hostedType,
    resourceType: data.resource_type,
  };
}

function isValidMediaResponse(data) {
  return (
    data &&
    /^(image|video)$/.test(data.resource_type) &&
    /^https:\/\/res\.cloudinary\.com\/dnpeyfhn2\/(image|video)\/upload\//.test(data.secure_url)
  );
}

function buildContext(file) {
  const parts = [
    ['original_filename', file.name],
    ['day', 'unlabeled'],
    ['uploader', form.elements.uploader.value],
    ['notes', form.elements.notes.value],
  ];

  return parts
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}=${escapeMediaContext(value)}`)
    .join('|');
}

function escapeMediaContext(value) {
  return value.replace(/[=|\\]/g, (char) => `\\${char}`);
}

function updateUploadStatus(completedFiles, totalFiles, currentFile = '') {
  const detail = currentFile ? ` Uploading ${currentFile}...` : '';
  status.textContent = `Uploaded ${completedFiles} of ${totalFiles} files.${detail} Keep this page open.`;
}

function setUploading(isUploading) {
  input.disabled = isUploading;
  submitButton.disabled = isUploading;
  status.classList.toggle('is-uploading', isUploading);
}

async function loadHomeCollage() {
  if (!collage) {
    return;
  }

  try {
    const response = await fetch(galleryDataUrl);

    if (!response.ok) {
      throw new Error('Could not load gallery');
    }

    const data = await response.json();
    const photos = Array.isArray(data.items)
      ? data.items.filter((item) => item.kind === 'image')
      : [];

    renderCollage(photos);
    mediaLoader?.warmImages(photos, { start: collageSize, limit: 2, concurrency: 2, width: 640 });
  } catch {
    renderCollage([]);
  }
}

function renderCollage(photos) {
  collage.textContent = '';

  if (photos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'collage-empty';
    empty.textContent = 'Upload a few photos and this turns into a rotating collage.';
    collage.append(empty);
    return;
  }

  const visiblePhotos = photos.slice(0, collageSize);
  const tiles = visiblePhotos.map((photo, index) => createCollageTile(photo, index));
  collage.append(...tiles);
  mediaLoader?.prepareImages(collage);

  if (photos.length <= visiblePhotos.length) {
    return;
  }

  let nextPhoto = visiblePhotos.length;
  let nextTile = 0;

  window.setInterval(() => {
    const tile = tiles[nextTile];
    const image = tile.querySelector('img');
    const photo = photos[nextPhoto];

    tile.classList.add('is-swapping');
    window.setTimeout(() => {
      image.replaceWith(createCollageImage(photo, nextTile));
      mediaLoader?.prepareImages(tile);
      tile.classList.remove('is-swapping');
    }, 220);

    nextPhoto = (nextPhoto + 1) % photos.length;
    nextTile = (nextTile + 1) % tiles.length;
  }, 3600);
}

function createCollageTile(photo, index) {
  const tile = document.createElement('a');
  tile.className = 'collage-tile';
  tile.dataset.mediaShell = '';
  tile.href = `/submission.html?id=${encodeURIComponent(photo.submissionId)}`;
  tile.setAttribute('aria-label', `Open ${photo.name || 'Fanime memory'} submission`);
  tile.style.setProperty('--tilt', `${[-4, 3, -2, 5, -5, 2, 4, -3][index % 8]}deg`);

  tile.append(createCollageImage(photo, index));
  return tile;
}

function createCollageImage(photo, index) {
  if (mediaLoader) {
    return mediaLoader.createImage(photo, index, {
      eagerCount: 4,
      highPriorityCount: 1,
      sizes: '(max-width: 620px) 46vw, (max-width: 1180px) 24vw, 280px',
      defaultWidth: 360,
      widths: [180, 240, 360, 540],
      quality: 'auto:eco',
    });
  }

  const image = document.createElement('img');
  image.src = photo.url;
  image.alt = photo.name || 'Fanime memory';
  image.loading = index < 6 ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.fetchPriority = index < 4 ? 'high' : 'auto';
  return image;
}
