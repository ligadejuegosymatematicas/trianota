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
  const TRANSITION_MS = 215;
  const PRESS_MS = 90;
  const ACTIVATION_MS = 235;
  let activeTab = 'home';
  let transitionTimer = 0;
  let pendingFrame = 0;
  let switchingTab = false;

  function el(id){ return document.getElementById(id); }
  function tabButton(tab){ return el(TABS[tab]); }

  function setActive(tab, opts={}){
    if(!TABS[tab]) return;
    const changed = activeTab !== tab;
    activeTab = tab;
    Object.keys(TABS).forEach(key => {
      const btn = tabButton(key);
      if(!btn) return;
      const active = key === tab;
      btn.classList.toggle('is-active', active);
      if(active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if((changed || opts.force) && opts.animate) animateTab(tab);
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

  function currentSurface(){
    if(activeTab === 'profile') return document.querySelector('#profileModal.show .profileModalCard');
    if(activeTab === 'settings') return el('config');
    return document.querySelector('.screen.active');
  }

  function surfaceFor(tab){
    if(tab === 'profile') return document.querySelector('#profileModal.show .profileModalCard');
    if(tab === 'settings') return el('config');
    return el('home');
  }

  function animateSurface(tab){
    const incoming = surfaceFor(tab);
    if(!incoming) return;
    clearTimeout(transitionTimer);
    incoming.classList.remove('tabEntering');
    void incoming.offsetWidth;
    incoming.classList.add('tabEntering');
    transitionTimer = window.setTimeout(() => incoming.classList.remove('tabEntering'), TRANSITION_MS + 55);
  }

  function markLeaving(){
    const outgoing = currentSurface();
    if(!outgoing) return;
    outgoing.classList.remove('tabLeaving');
    void outgoing.offsetWidth;
    outgoing.classList.add('tabLeaving');
    window.setTimeout(() => outgoing.classList.remove('tabLeaving'), 150);
  }

  function animateTab(tab){
    const btn = tabButton(tab);
    if(!btn) return;
    btn.classList.remove('is-activating');
    void btn.offsetWidth;
    btn.classList.add('is-activating');
    window.setTimeout(() => btn.classList.remove('is-activating'), ACTIVATION_MS + 40);
  }

  function pressTab(tab){
    const btn = tabButton(tab);
    if(!btn) return;
    btn.classList.add('is-pressing');
    window.setTimeout(() => btn.classList.remove('is-pressing'), PRESS_MS);
  }

  function vibrateTab(){
    try{
      if(navigator && typeof navigator.vibrate === 'function') navigator.vibrate(10);
    }catch(e){}
  }

  function soundTab(){
    try{
      if(typeof window.playTone === 'function') window.playTone('tab');
    }catch(e){}
  }

  function feedback(tab){
    pressTab(tab);
    soundTab();
    vibrateTab();
  }

  function syncForScreen(id){
    if(HIDDEN_SCREENS.has(id)){
      setNavVisible(false);
      return;
    }
    if(NAV_SCREENS.has(id)) setNavVisible(true);
    if(switchingTab) return;
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

  function switchTab(tab, action){
    if(activeTab === tab) return;
    if(pendingFrame) cancelAnimationFrame(pendingFrame);
    markLeaving();
    feedback(tab);
    setActive(tab, {animate:true});
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      switchingTab = true;
      try{
        action();
      }finally{
        switchingTab = false;
      }
      setNavVisible(true);
      setActive(tab);
      animateSurface(tab);
    });
  }

  function goHome(){
    switchTab('home', () => {
      closeModals();
      if(typeof window.showScreen === 'function') window.showScreen('home');
    });
  }

  function goProfile(){
    switchTab('profile', () => {
      closeModals();
      if(typeof window.showScreen === 'function') window.showScreen('home');
      if(typeof window.openProfile === 'function') window.openProfile();
    });
  }

  function goSettings(){
    switchTab('settings', () => {
      closeModals();
      if(typeof window.openConfigScreen === 'function') window.openConfigScreen();
      else if(typeof window.showScreen === 'function') window.showScreen('config');
    });
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
    setActive('home', {force:true});
  }

  init();
  window.TRIANOTA_NAVIGATION = { goHome, goProfile, goSettings, setActive };
})();
