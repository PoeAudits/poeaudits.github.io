const gallery = document.querySelector('[data-gallery]');
const title = document.querySelector('[data-gallery-title]');
const summary = document.querySelector('[data-gallery-summary]');
const dayLinks = document.querySelectorAll('[data-day-link]');
const mediaLoader = window.FanimeMedia;
const galleryDataUrl = '/data/media.json';

const dayLabels = {
  'day-0': 'Day 0',
  'day-1': 'Day 1',
  'day-2': 'Day 2',
  'day-3': 'Day 3',
  'day-4': 'Day 4',
  unlabeled: 'Unlabeled',
};

const params = new URLSearchParams(window.location.search);
const day = params.get('day') || '';

if (gallery) {
  loadGallery();
}

async function loadGallery() {
  setActiveDay();
  gallery.innerHTML = '<p class="status-card">Loading the gallery...</p>';

  try {
    const response = await fetch(galleryDataUrl);

    if (!response.ok) {
      throw new Error('Could not load gallery');
    }

    const data = await response.json();
    const items = normalizeItems(data).filter((item) => !day || item.day === day);

    renderHeading(items.length);
    renderItems(items);
    mediaLoader?.prepareImages(gallery);
    mediaLoader?.warmImages(items, { start: 1, limit: 2, concurrency: 2, width: 640 });
  } catch {
    gallery.innerHTML =
      '<p class="status-card">The gallery did not load. Try refreshing.</p>';
  }
}

function normalizeItems(data) {
  return Array.isArray(data.items)
    ? data.items.filter((item) => item && typeof item.url === 'string')
    : [];
}

function renderHeading(count) {
  const label = dayLabels[day] || 'All Days';

  if (title) {
    title.textContent = day ? `${label} Gallery` : 'Fanime Gallery';
  }

  if (summary) {
    summary.textContent = `${count} ${count === 1 ? 'memory' : 'memories'} in the weekend archive.`;
  }
}

function renderItems(items) {
  if (items.length === 0) {
    gallery.innerHTML =
      '<p class="status-card">No memories here yet. Upload the first photo or video.</p>';
    return;
  }

  const photos = items.filter((item) => item.kind !== 'video');
  const videos = items.filter((item) => item.kind === 'video');

  gallery.innerHTML = [
    renderMediaSection('Photos', photos),
    renderMediaSection('Videos', videos),
  ].join('');
}

function renderMediaSection(label, items) {
  if (items.length === 0) {
    return '';
  }

  return `
    <section class="media-section" aria-labelledby="${label.toLowerCase()}-heading">
      <div class="media-section-heading">
        <h2 id="${label.toLowerCase()}-heading">${label}</h2>
        <p>${items.length} ${items.length === 1 ? 'file' : 'files'}</p>
      </div>
      <div class="gallery-grid media-section-grid">
        ${items.map(renderCard).join('')}
      </div>
    </section>`;
}

function renderCard(item, index) {
  const imageOptions = {
    eagerCount: 3,
    highPriorityCount: 1,
    sizes: '(max-width: 620px) 92vw, (max-width: 1180px) 45vw, 360px',
    quality: 'auto:eco',
  };
  const media =
    item.kind === 'video'
      ? `<video controls preload="metadata" src="${escapeAttribute(item.url)}"></video>`
      : `<img ${imageAttrs(index, imageOptions)} src="${escapeAttribute(imageUrl(item.url, 640, imageOptions))}" srcset="${escapeAttribute(imageSrcset(item.url, imageOptions))}" alt="${escapeAttribute(item.name)}" />`;

  return `
    <article class="media-card ${item.kind === 'video' ? 'video-card' : ''}">
      <div class="media-frame" data-media-shell>
        ${media}
      </div>
      <div class="media-copy">
        <p class="media-meta">${escapeHtml(dayLabels[item.day] || 'Unlabeled')} · ${escapeHtml(formatDate(item.submittedAt))}</p>
        <h2>${escapeHtml(item.name)}</h2>
        ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
        <a class="bundle-link" href="/submission.html?id=${encodeURIComponent(item.submissionId)}">Open photo bundle</a>
      </div>
    </article>`;
}

function imageAttrs(index, options) {
  if (mediaLoader) {
    return mediaLoader.imageAttrs(index, options);
  }

  return `loading="${index < options.eagerCount ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${index < options.highPriorityCount ? 'high' : 'auto'}" sizes="${escapeAttribute(options.sizes)}"`;
}

function imageSrcset(url, options) {
  if (mediaLoader) {
    return mediaLoader.srcset(url, [240, 360, 540, 720], options);
  }

  return [240, 360, 540, 720].map((width) => `${imageUrl(url, width, options)} ${width}w`).join(', ');
}

function imageUrl(url, width, options) {
  if (mediaLoader) {
    return mediaLoader.imageUrl(url, width, options);
  }

  if (isCloudinaryImage(url)) {
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:eco,c_limit,w_${width}/`);
  }

  return url;
}

function isCloudinaryImage(url) {
  return /^https:\/\/res\.cloudinary\.com\/dnpeyfhn2\/image\/upload\//.test(url);
}

function setActiveDay() {
  dayLinks.forEach((link) => {
    const linkDay = link.getAttribute('data-day-link') || '';
    link.toggleAttribute('aria-current', linkDay === day || (!linkDay && !day));
  });
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fanime weekend';
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => htmlEscapes[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};
