window.FanimeMedia = {
  createImage,
  imageAttrs,
  imageUrl,
  prepareImages,
  srcset,
  warmImages,
};

const defaultWidths = [240, 360, 540, 720];

function createImage(item, index, options = {}) {
  const image = document.createElement('img');
  applyImageAttrs(image, item, index, options);
  return image;
}

function imageAttrs(index, options = {}) {
  const eagerCount = options.eagerCount ?? 2;
  const highPriorityCount = options.highPriorityCount ?? 1;
  const loading = index < eagerCount ? 'eager' : 'lazy';
  const priority = index < highPriorityCount ? 'high' : 'auto';
  const sizes = options.sizes || '(max-width: 620px) 92vw, 33vw';

  return `loading="${loading}" decoding="async" fetchpriority="${priority}" sizes="${sizes}" data-media-image`;
}

function applyImageAttrs(image, item, index, options) {
  const eagerCount = options.eagerCount ?? 2;
  const highPriorityCount = options.highPriorityCount ?? 1;

  image.src = item.url;
  image.srcset = item.srcset || '';
  image.sizes = item.sizes || options.sizes || '(max-width: 620px) 92vw, 33vw';
  image.alt = item.name || 'Fanime memory';
  image.loading = index < eagerCount ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.fetchPriority = index < highPriorityCount ? 'high' : 'auto';
  image.dataset.mediaImage = '';
}

function prepareImages(root = document) {
  root.querySelectorAll('img[data-media-image]').forEach((image) => {
    const shell = image.closest('[data-media-shell]') || image.parentElement;

    if (!shell) {
      return;
    }

    shell.classList.add('is-loading');

    if (image.complete) {
      if (image.naturalWidth > 0) {
        markLoaded(shell);
      } else {
        markFailed(shell);
      }
      return;
    }

    image.addEventListener('load', () => markLoaded(shell), { once: true });
    image.addEventListener('error', () => markFailed(shell), { once: true });
  });
}

function warmImages(items, options = {}) {
  const start = options.start ?? 0;
  const limit = options.limit ?? 2;
  const concurrency = options.concurrency ?? 2;
  const width = options.width ?? 640;
  const urls = items
    .filter((item) => item.kind === 'image' && item.url)
    .slice(start, start + limit)
    .map((item) => item.url);

  if (urls.length === 0) {
    return;
  }

  urls.slice(0, Math.min(1, urls.length)).forEach(addPreloadHint);
  preloadUrls(urls, concurrency);
}

function srcset(url, widths = defaultWidths, options = {}) {
  return widths.map((width) => `${imageUrl(url, width, options)} ${width}w`).join(', ');
}

function imageUrl(url, width, options = {}) {
  return url;
}

function addPreloadHint(url) {
  if (document.head.querySelector(`link[rel="preload"][href="${cssEscape(url)}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.fetchPriority = 'low';
  document.head.append(link);
}

function preloadUrls(urls, concurrency) {
  let active = 0;
  let next = 0;

  function loadNext() {
    while (active < concurrency && next < urls.length) {
      const image = new Image();
      const url = urls[next];

      next += 1;
      active += 1;
      image.decoding = 'async';
      image.onload = image.onerror = () => {
        active -= 1;
        loadNext();
      };
      image.src = url;
    }
  }

  loadNext();
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replace(/["\\]/g, '\\$&');
}

function markLoaded(shell) {
  shell.classList.remove('is-loading');
  shell.classList.add('is-loaded');
}

function markFailed(shell) {
  shell.classList.remove('is-loading');
  shell.classList.add('is-error');
}
