const submissionRoot = document.querySelector('[data-submission]');
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

if (submissionRoot) {
  loadSubmission();
}

async function loadSubmission() {
  const id = new URLSearchParams(window.location.search).get('id') || '';

  if (!id) {
    submissionRoot.innerHTML = '<p class="status-card">No submission id was provided.</p>';
    return;
  }

  submissionRoot.innerHTML = '<p class="status-card">Opening the photo bundle...</p>';

  try {
    const response = await fetch(galleryDataUrl);

    if (!response.ok) {
      throw new Error('Could not load submission');
    }

    const data = await response.json();
    const photos = normalizeItems(data).filter((item) => item.submissionId === id);

    if (photos.length === 0) {
      throw new Error('Submission not found');
    }

    const submission = {
      submissionId: id,
      day: photos[0].day || 'unlabeled',
      notes: photos.find((item) => item.notes)?.notes || '',
      submittedAt: photos[0].submittedAt,
      photos,
    };
    renderSubmission(submission);
    mediaLoader?.prepareImages(submissionRoot);
    mediaLoader?.warmImages(submission.photos || [], { start: 1, limit: 2, concurrency: 2, width: 960 });
  } catch {
    submissionRoot.innerHTML =
      '<p class="status-card">That bundle slipped into the fog. Try the gallery again.</p>';
  }
}

function normalizeItems(data) {
  return Array.isArray(data.items)
    ? data.items.filter((item) => item && typeof item.url === 'string')
    : [];
}

function renderSubmission(submission) {
  const photos = Array.isArray(submission.photos) ? submission.photos : [];

  submissionRoot.innerHTML = `
    <section class="card submission-heading">
      <p class="eyebrow">${escapeHtml(dayLabels[submission.day] || 'Unlabeled')}</p>
      <h1>Photo Bundle</h1>
      <p class="intro">${photos.length} ${photos.length === 1 ? 'file' : 'files'} uploaded ${escapeHtml(formatDate(submission.submittedAt))}.</p>
      ${submission.notes ? `<p class="note-card">${escapeHtml(submission.notes)}</p>` : ''}
    </section>
    <section class="gallery-grid detail-grid">
      ${photos.map(renderMedia).join('')}
    </section>`;
}

function renderMedia(item, index) {
  const imageOptions = {
    eagerCount: 2,
    highPriorityCount: 1,
    sizes: '(max-width: 620px) 92vw, (max-width: 1180px) 70vw, 760px',
    quality: 'auto:good',
  };
  const media =
    item.kind === 'video'
      ? `<video controls preload="metadata" src="${escapeAttribute(item.url)}"></video>`
      : `<img ${imageAttrs(index, imageOptions)} src="${escapeAttribute(imageUrl(item.url, 960, imageOptions))}" srcset="${escapeAttribute(imageSrcset(item.url, imageOptions))}" alt="${escapeAttribute(item.name)}" />`;

  return `
    <article class="media-card ${item.kind === 'video' ? 'video-card' : ''}">
      <div class="media-frame" data-media-shell>${media}</div>
      <div class="media-copy">
        <h2>${escapeHtml(item.name)}</h2>
        <p class="media-meta">${escapeHtml(item.contentType || 'media')} · ${formatBytes(item.size)}</p>
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
    return mediaLoader.srcset(url, [480, 760, 1100, 1500], options);
  }

  return [480, 760, 1100, 1500].map((width) => `${imageUrl(url, width, options)} ${width}w`).join(', ');
}

function imageUrl(url, width, options) {
  if (mediaLoader) {
    return mediaLoader.imageUrl(url, width, options);
  }

  if (isCloudinaryImage(url)) {
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:good,c_limit,w_${width}/`);
  }

  return url;
}

function isCloudinaryImage(url) {
  return /^https:\/\/res\.cloudinary\.com\/dnpeyfhn2\/image\/upload\//.test(url);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'during Fanime weekend';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 'unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
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
