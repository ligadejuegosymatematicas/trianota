(function(){
  'use strict';

  const TABS = {
    home: 'tabHomeBtn',
    profile: 'tabProfileBtn',
    settings: 'tabSettingsBtn'
  };
  const NAV_SCREENS = new Set(['home', 'config']);
  const HIDDEN_SCREENS = new Set(['gameScreen', 'metaScreen']);
  const originalShowScreen = window.showScreen;

  function el(id){ return document.getElementById(id); }

  function setActive(tab){
    Object.keys(TABS).forEach(key => {
      const btn = el(TABS[key]);
      if(!btn) return;
      const active = key === tab;
      btn.classList.toggle('is-active', active);
      if(active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function setNavVisible(visible){
    document.body.classList.toggle('appNavHidden', !visible);
  }

  function closeConfigChoice(){
    const overlay = el('configChoiceOverlay');
    if(!overlay) return;
    overlay.hidden = true;
    overlay.removeAttribute('data-setting');
  }

  function closeModals(){
    document.querySelectorAll('.modal.show').forEach(modal => modal.classList.remove('show'));
    closeConfigChoice();
  }

  function syncForScreen(id){
    if(HIDDEN_SCREENS.has(id)){
      setNavVisible(false);
      return;
    }
    if(NAV_SCREENS.has(id)) setNavVisible(true);
    if(id === 'home') setActive('home');
    if(id === 'config') setActive('settings');
  }

  if(typeof originalShowScreen === 'function'){
    window.showScreen = function(id){
      const result = originalShowScreen(id);
      syncForScreen(id);
      return result;
    };
  }

  function goHome(){
    closeModals();
    if(typeof window.showScreen === 'function') window.showScreen('home');
    setNavVisible(true);
    setActive('home');
  }

  function goProfile(){
    closeModals();
    if(typeof window.showScreen === 'function') window.showScreen('home');
    if(typeof window.openProfile === 'function') window.openProfile();
    setNavVisible(true);
    setActive('profile');
  }

  function goSettings(){
    closeModals();
    if(typeof window.openConfigScreen === 'function') window.openConfigScreen();
    else if(typeof window.showScreen === 'function') window.showScreen('config');
    setNavVisible(true);
    setActive('settings');
  }

  function bindTabs(){
    const home = el('tabHomeBtn');
    const profile = el('tabProfileBtn');
    const settings = el('tabSettingsBtn');
    if(home) home.onclick = goHome;
    if(profile) profile.onclick = goProfile;
    if(settings) settings.onclick = goSettings;
  }

  function bindSettingsAbout(){
    const about = el('settingsAboutBtn');
    if(about) about.onclick = () => {
      if(typeof window.showModal === 'function') window.showModal('aboutModal');
    };
  }

  function init(){
    bindTabs();
    bindSettingsAbout();
    setNavVisible(true);
    setActive('home');
  }

  init();
  window.TRIANOTA_NAVIGATION = { goHome, goProfile, goSettings, setActive };
})();