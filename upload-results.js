const lastUploadStorageKey = 'fanime-last-media-uploads';
const root = document.querySelector('#upload-results');
const list = document.querySelector('#uploaded-links');
const copyButton = document.querySelector('#copy-upload-json');
const copyStatus = document.querySelector('#copy-status');
const uploadRecord = readUploadRecord();

if (root && list && uploadRecord?.assets?.length > 0) {
  root.hidden = false;
  list.append(...uploadRecord.assets.map(renderAsset));
}

copyButton?.addEventListener('click', async () => {
  if (!uploadRecord) {
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(uploadRecord, null, 2));
    copyStatus.textContent = 'Copied upload JSON.';
  } catch {
    copyStatus.textContent = 'Copy failed. Long-press the links above instead.';
  }
});

function readUploadRecord() {
  try {
    return JSON.parse(window.localStorage.getItem(lastUploadStorageKey) || 'null');
  } catch {
    return null;
  }
}

function renderAsset(asset) {
  const item = document.createElement('li');
  const link = document.createElement('a');

  link.href = asset.url;
  link.textContent = asset.name || asset.publicId || asset.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  item.append(link);
  return item;
}
