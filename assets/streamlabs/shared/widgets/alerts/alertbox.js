/* Violet Streamlabs Alert Box — Custom JS (shared across every layout profile) */
/* Generic copy by default — see presets/osu/alert-copy-overrides.md for the osu!-flavored swap. */

// Handle Streamlabs Event Listener (if used in custom widget environment)
document.addEventListener('onEventReceived', function (obj) {
  if (!obj || !obj.detail) return;
  const event = obj.detail.event;
  const listener = obj.detail.listener;

  // Check event type
  if (listener === 'follower-latest') {
    showAlert('follow', 'NEW FOLLOWER', event.name, 'just joined!', '');
  } else if (listener === 'subscriber-latest') {
    const months = event.amount ? ` for ${event.amount} months` : '';
    showAlert('sub', 'NEW SUBSCRIBER', event.name, `subscribed${months}!`, event.message || '');
  } else if (listener === 'tip-latest') {
    showAlert('tip', 'DONATION', event.name, `tipped ${event.formattedAmount || event.amount}!`, event.message || '', event.amount);
  } else if (listener === 'cheer-latest') {
    showAlert('cheer', 'CHEER', event.name, `cheered ${event.amount} bits!`, event.message || '', event.amount);
  } else if (listener === 'raid-latest') {
    showAlert('raid', 'RAID', event.name, `raided with ${event.amount} viewers!`, '');
  }
});

function showAlert(type, category, name, action, message, amount) {
  const containerEl = document.getElementById('violet-alert-container');
  const catEl = document.getElementById('alert-category');
  const nameEl = document.getElementById('alert-user-name');
  const actionEl = document.getElementById('alert-action-text');
  const msgWrapEl = document.getElementById('alert-message-wrap');
  const msgEl = document.getElementById('alert-user-message');

  if (containerEl) containerEl.dataset.type = type;
  if (catEl) catEl.textContent = category;
  if (nameEl) nameEl.textContent = name;
  if (actionEl) actionEl.textContent = action;

  // Amount-scaled glow ring — only meaningful for Tip/Cheer; clamped so huge donations don't blow out the card.
  if (containerEl) {
    const numericAmount = Number(amount) || 0;
    const glow = (type === 'tip' || type === 'cheer') && numericAmount > 0
      ? Math.max(0.15, Math.min(0.55, numericAmount / 100))
      : 0;
    containerEl.style.setProperty('--amount-glow', glow);
  }

  if (msgWrapEl && msgEl) {
    if (message && message.trim() !== '' && message !== '{message}') {
      msgEl.textContent = message;
      msgWrapEl.style.display = 'block';
    } else {
      msgWrapEl.style.display = 'none';
    }
  }
}

// Initial cleanup if message is placeholder
window.addEventListener('load', function () {
  const msgEl = document.getElementById('alert-user-message');
  const msgWrap = document.getElementById('alert-message-wrap');
  if (msgEl && msgWrap) {
    const text = msgEl.textContent.trim();
    if (!text || text === '{message}') {
      msgWrap.style.display = 'none';
    }
  }
});
