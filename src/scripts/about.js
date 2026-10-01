/* The About film follows visibility, motion preferences and the viewer's controls. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  for (const section of document.querySelectorAll('[data-about-reel]')) {
    const video = section.querySelector('video');
    const pauseButton = section.querySelector('[data-about-pause]');
    const soundButton = section.querySelector('[data-about-sound]');
    const pauseLabel = pauseButton?.querySelector('[data-about-pause-label]');
    const pauseIcon = pauseButton?.querySelector('[data-about-pause-icon]');
    const soundLabel = soundButton?.querySelector('[data-about-sound-label]');
    if (!video || !pauseButton || !soundButton || !pauseLabel || !soundLabel) continue;

    let visible = false;
    let leaving = false;
    let manuallyPaused = false;
    let motionRequested = false;
    let playbackBlocked = false;
    let pending = false;
    let generation = 0;
    video.autoplay = false;
    video.muted = true;

    const shouldPlay = () => visible && !document.hidden && !leaving &&
      !manuallyPaused && !playbackBlocked && (!reducedMotion.matches || motionRequested);

    const updateControls = () => {
      const playing = !video.paused && !video.ended;
      const playText = playing ? 'Pause film' : 'Play film';
      const soundText = video.muted ? 'Sound off' : 'Sound on';
      pauseLabel.textContent = playText;
      if (pauseIcon) pauseIcon.textContent = playing ? 'Ⅱ' : '▶';
      pauseButton.setAttribute('aria-label', playText);
      pauseButton.setAttribute('aria-pressed', String(playing));
      soundLabel.textContent = soundText;
      soundButton.setAttribute('aria-label', soundText);
      soundButton.setAttribute('aria-pressed', String(!video.muted));
      section.dataset.aboutPlayback = playbackBlocked ? 'blocked' : playing ? 'playing' : 'paused';
      if (playbackBlocked) pauseButton.title = 'Playback could not start. Select Play film to try again.';
      else pauseButton.removeAttribute('title');
    };

    const syncPlayback = () => {
      if (!shouldPlay()) {
        generation++;
        pending = false;
        video.pause();
        updateControls();
        return;
      }
      if (pending || !video.paused) {
        updateControls();
        return;
      }
      const request = ++generation;
      pending = true;
      const failed = () => {
        if (request !== generation) return;
        pending = false;
        playbackBlocked = true;
        video.pause();
        updateControls();
      };
      try {
        Promise.resolve(video.play()).then(() => {
          if (request !== generation) return;
          pending = false;
          if (!shouldPlay()) video.pause();
          updateControls();
        }, failed);
      } catch {
        failed();
      }
    };

    pauseButton.addEventListener('click', () => {
      if (!video.paused || pending) {
        manuallyPaused = true;
      } else {
        manuallyPaused = false;
        motionRequested = true;
        playbackBlocked = false;
      }
      syncPlayback();
    });
    soundButton.addEventListener('click', () => {
      video.muted = !video.muted;
      updateControls();
      syncPlayback();
    });
    video.addEventListener('play', () => {
      if (!shouldPlay()) video.pause();
      updateControls();
    });
    video.addEventListener('pause', updateControls);
    video.addEventListener('volumechange', updateControls);

    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
      syncPlayback();
    }, {threshold: [0, Number.EPSILON]});
    observer.observe(section);
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pagehide', () => {
      leaving = true;
      syncPlayback();
    });
    window.addEventListener('pageshow', () => {
      leaving = false;
      syncPlayback();
    });
    reducedMotion.addEventListener('change', () => {
      // A newly enabled preference requires a fresh, explicit request to play.
      if (reducedMotion.matches) motionRequested = false;
      syncPlayback();
    });
    updateControls();
  }

  // Process films use native controls and only restart when the viewer presses Play.
  for (const video of document.querySelectorAll('video[data-about-process-film]')) {
    let visible = false;
    let leaving = false;
    const pauseIfUnavailable = () => {
      if (!visible || document.hidden || leaving) video.pause();
    };
    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
      pauseIfUnavailable();
    }, {threshold: [0, Number.EPSILON]});
    observer.observe(video);
    video.addEventListener('play', pauseIfUnavailable);
    document.addEventListener('visibilitychange', pauseIfUnavailable);
    window.addEventListener('pagehide', () => {
      leaving = true;
      video.pause();
    });
    window.addEventListener('pageshow', () => { leaving = false; });
  }
})();
