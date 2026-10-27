// The live app shown in the phone and opened by every "Try the demo" button.
// Change this one line to point the demo somewhere else.
const APP_URL = 'https://onhold-app.pages.dev';

const narrow = matchMedia('(max-width: 639px)');
const frame = document.getElementById('app-frame');

for (const a of document.querySelectorAll('[data-app-link]')) {
  a.href = APP_URL;
  a.target = '_blank';
  a.rel = 'noopener';
}

// Only load the app when the phone is on screen: no 2 MB download on a phone that hides it.
const load = () => {
  if (!narrow.matches && !frame.src) frame.src = APP_URL;
};
load();
narrow.addEventListener('change', load);

// Wide screens: scroll to the phone and put the keyboard in it. Phones: the link opens the app full screen.
for (const a of document.querySelectorAll('.js-try')) {
  a.addEventListener('click', (e) => {
    if (narrow.matches) return;
    e.preventDefault();
    document.getElementById('demo').scrollIntoView({ block: 'center' });
    frame.focus({ preventScroll: true });
  });
}
