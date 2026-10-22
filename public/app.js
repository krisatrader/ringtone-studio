/**
 * iPhone Ringtone Studio - Dual Mode Frontend Application Engine
 * Supports both Full Backend Mode (FFmpeg + yt-dlp) and Standalone GitHub Pages Mode!
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- APPLICATION STATE ---
  const state = {
    isBackendAvailable: false,
    backendUrl: '',
    currentTrack: null,     // { id, title, artist, duration, format, audioUrl, thumbnail, source }
    audioBuffer: null,      // Decoded AudioBuffer
    audioContext: null,     // Web Audio API context
    activeSourceNode: null, // Currently playing AudioBufferSourceNode
    isPlaying: false,
    isLooping: false,
    playStartTime: 0,       // context time when playback began
    playOffset: 0,          // offset within track (seconds)
    startTime: 0,           // ringtone start (seconds)
    endTime: 30,            // ringtone end (seconds)
    fadeIn: 1.0,            // seconds
    fadeOut: 2.0,           // seconds
    volume: 1.25,           // multiplier
    normalize: false,
    format: 'm4r',          // 'm4r' or 'mp3'
    zoomLevel: 1.0,         // waveform horizontal zoom
    viewOffset: 0,          // waveform view start in track
    draggingHandle: null,   // 'start', 'end', 'window', or null
    dragStartX: 0,
    dragStartVal: 0,
  };

  // Fallback demo samples for standalone / GitHub Pages hosting
  const FALLBACK_SAMPLES = [
    {
      id: 'sample-electronic',
      title: 'Neon Pulse (Elektronikus / Upbeat)',
      artist: 'NoCopyrightSounds',
      audioUrl: './samples/sample-electronic.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
      genre: 'Elektronikus / Dance'
    },
    {
      id: 'sample-inspirational',
      title: 'Inspirational Horizon',
      artist: 'Royalty Free Acoustic',
      audioUrl: './samples/sample-inspirational.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      genre: 'Akusztikus / Pop'
    },
    {
      id: 'sample-synth-ambient',
      title: 'Retro Synthwave Dream',
      artist: 'Analog Master Synthesizer',
      audioUrl: './samples/sample-synth-ambient.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop',
      genre: 'Retro Synthwave'
    }
  ];

  // --- DOM ELEMENTS ---
  const backendStatusBadge = document.getElementById('backendStatusBadge');
  const backendStatusText = document.getElementById('backendStatusText');
  const onlineModeBanner = document.getElementById('onlineModeBanner');
  const searchOnlineBanner = document.getElementById('searchOnlineBanner');

  const sourceTabs = document.querySelectorAll('#sourceTabs .tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const urlSubmitBtn = document.getElementById('urlSubmitBtn');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const samplesList = document.getElementById('samplesList');
  const cutterSection = document.getElementById('cutterSection');
  const resetTrackBtn = document.getElementById('resetTrackBtn');

  // Track info elements
  const trackThumb = document.getElementById('trackThumb');
  const trackThumbFallback = document.getElementById('trackThumbFallback');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const trackTotalDuration = document.getElementById('trackTotalDuration');
  const trackSourceBadge = document.getElementById('trackSourceBadge');

  // Waveform elements
  const waveformContainer = document.getElementById('waveformContainer');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const waveformLoading = document.getElementById('waveformLoading');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const totalTimeDisplay = document.getElementById('totalTimeDisplay');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');

  // Playback & Timing controls
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const playSelectionBtn = document.getElementById('playSelectionBtn');
  const loopBtn = document.getElementById('loopBtn');
  const loopIcon = document.getElementById('loopIcon');
  const loopText = document.getElementById('loopText');
  const startTimeVal = document.getElementById('startTimeVal');
  const endTimeVal = document.getElementById('endTimeVal');
  const selectedDurationVal = document.getElementById('selectedDurationVal');
  const durationStatusBadge = document.getElementById('durationStatusBadge');
  const startNudgeMinus = document.getElementById('startNudgeMinus');
  const startNudgePlus = document.getElementById('startNudgePlus');
  const endNudgeMinus = document.getElementById('endNudgeMinus');
  const endNudgePlus = document.getElementById('endNudgePlus');

  // Presets
  const presetRingtoneBtn = document.getElementById('presetRingtoneBtn');
  const presetAlertBtn = document.getElementById('presetAlertBtn');
  const presetHookBtn = document.getElementById('presetHookBtn');

  // Audio adjustments
  const fadeInInput = document.getElementById('fadeInInput');
  const fadeInVal = document.getElementById('fadeInVal');
  const fadeOutInput = document.getElementById('fadeOutInput');
  const fadeOutVal = document.getElementById('fadeOutVal');
  const volumeInput = document.getElementById('volumeInput');
  const volumeVal = document.getElementById('volumeVal');
  const normalizeInput = document.getElementById('normalizeInput');

  // Conversion & Format
  const formatButtons = document.querySelectorAll('#formatSelector .format-btn');
  const convertDownloadBtn = document.getElementById('convertDownloadBtn');
  const convertBtnText = document.getElementById('convertBtnText');

  // Guide Modal
  const guideBtn = document.getElementById('guideBtn');
  const guideModal = document.getElementById('guideModal');
  const closeGuideBtn = document.getElementById('closeGuideBtn');
  const gotItGuideBtn = document.getElementById('gotItGuideBtn');
  const guideTabs = document.querySelectorAll('#guideTabs .guide-tab-btn');
  const guideContents = document.querySelectorAll('.guide-content');

  // Toast container
  const toastContainer = document.getElementById('toastContainer');

  // --- AUDIO CONTEXT SETUP ---
  function getAudioContext() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioCtx();
    }
    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    return state.audioContext;
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-3 border pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 max-w-md ${
      type === 'success'
        ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/30'
        : type === 'error'
        ? 'bg-red-950/95 text-red-200 border-red-500/30'
        : 'bg-neutral-900/95 text-neutral-200 border-white/20'
    }`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-5 h-5 shrink-0 ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-brand-400'}"></i>
      <span class="flex-1">${message}</span>
    `;

    toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // --- CHECK BACKEND AVAILABILITY ---
  async function checkBackendStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/status', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        state.isBackendAvailable = true;
        backendStatusBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        backendStatusText.textContent = 'Backend Aktív (FFmpeg & yt-dlp)';
        onlineModeBanner.classList.add('hidden');
        searchOnlineBanner.classList.add('hidden');
        return;
      }
    } catch (e) {
      // Backend not running on this origin (e.g. static GitHub Pages)
    }

    state.isBackendAvailable = false;
    backendStatusBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20';
    backendStatusText.textContent = 'GitHub Pages Mód (Kliensoldali Vágás & .M4R)';
    onlineModeBanner.classList.remove('hidden');
    searchOnlineBanner.classList.remove('hidden');
  }

  // --- TAB SWITCHING ---
  sourceTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      sourceTabs.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((c) => c.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }

      if (tab.dataset.tab === 'samples' && samplesList.children.length === 0) {
        loadSamplesList();
      }
    });
  });

  // --- FORMAT TIME HELPER ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  }

  // --- UPDATE TIMING DASHBOARD ---
  function updateTimingDisplay() {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : (state.currentTrack?.duration || 0);
    
    // Clamp
    if (state.startTime < 0) state.startTime = 0;
    if (state.startTime > totalDur - 1) state.startTime = Math.max(0, totalDur - 1);
    if (state.endTime <= state.startTime) state.endTime = Math.min(totalDur, state.startTime + 30);
    if (state.endTime > totalDur) state.endTime = totalDur;

    const selectedDur = state.endTime - state.startTime;

    startTimeVal.textContent = formatTime(state.startTime);
    endTimeVal.textContent = formatTime(state.endTime);
    selectedDurationVal.textContent = selectedDur.toFixed(1);

    // iPhone 40s limitation check
    if (selectedDur <= 40.0) {
      selectedDurationVal.className = 'text-2xl font-mono font-black text-brand-400';
      durationStatusBadge.className = 'mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1';
      durationStatusBadge.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i><span>Tökéletes méret (Max 40 mp)</span>`;
    } else {
      selectedDurationVal.className = 'text-2xl font-mono font-black text-rose-400';
      durationStatusBadge.className = 'mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1';
      durationStatusBadge.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3"></i><span>Túl hosszú! (Max 40 mp engedett)</span>`;
    }

    if (window.lucide) window.lucide.createIcons();
    drawWaveform();
  }

  // --- FETCH & DECODE AUDIO DATA ---
  async function loadAudioIntoStudio(trackData) {
    state.currentTrack = trackData;
    stopAudio();

    // Show Cutter section
    cutterSection.classList.remove('hidden');
    cutterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Populate track info
    trackTitle.textContent = trackData.title || 'Ismeretlen zeneszám';
    trackArtist.textContent = trackData.artist || 'Ismeretlen előadó';
    trackSourceBadge.textContent = trackData.source || 'Audió';
    trackTotalDuration.textContent = `Teljes hossz: ${formatTime(trackData.duration)}`;

    if (trackData.thumbnail) {
      trackThumb.src = trackData.thumbnail;
      trackThumb.classList.remove('hidden');
      trackThumbFallback.classList.add('hidden');
    } else {
      trackThumb.classList.add('hidden');
      trackThumbFallback.classList.remove('hidden');
    }

    // Show loading overlay
    waveformLoading.classList.remove('hidden');

    try {
      const audioCtx = getAudioContext();
      let decodedBuffer = null;

      if (trackData.buffer) {
        // Direct buffer passed (e.g. from local file reader)
        decodedBuffer = trackData.buffer;
      } else {
        const res = await fetch(trackData.audioUrl);
        if (!res.ok) throw new Error('Nem sikerült letölteni az audió adatfolyamot.');

        const arrayBuffer = await res.arrayBuffer();
        decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      }

      state.audioBuffer = decodedBuffer;

      // Set initial markers
      const dur = decodedBuffer.duration;
      totalTimeDisplay.textContent = formatTime(dur);
      currentTimeDisplay.textContent = '00:00.0';

      state.startTime = 0;
      state.endTime = Math.min(30, dur);
      state.playOffset = 0;

      waveformLoading.classList.add('hidden');
      updateTimingDisplay();
      showToast('Zene sikeresen betöltve! Készítsd el a csengőhangodat.', 'success');
    } catch (err) {
      console.error('Audio load error:', err);
      waveformLoading.classList.add('hidden');
      showToast('Hiba az audió dekódolásakor: ' + err.message, 'error');
    }
  }

  // --- WAVEFORM RENDERING ENGINE ---
  function drawWaveform() {
    if (!state.audioBuffer) return;

    const canvas = waveformCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const buffer = state.audioBuffer;
    const rawData = buffer.getChannelData(0);
    const totalDuration = buffer.duration;

    // View range with zoom
    const visibleDuration = totalDuration / state.zoomLevel;
    const viewStart = state.viewOffset;
    const viewEnd = Math.min(totalDuration, viewStart + visibleDuration);

    const startSample = Math.floor((viewStart / totalDuration) * rawData.length);
    const endSample = Math.floor((viewEnd / totalDuration) * rawData.length);
    const visibleSamples = endSample - startSample;

    const numBars = Math.floor(width / 3.5);
    const step = Math.floor(visibleSamples / numBars);

    // Helpers to convert time <-> X
    function timeToX(t) {
      return ((t - viewStart) / visibleDuration) * width;
    }

    const startX = timeToX(state.startTime);
    const endX = timeToX(state.endTime);
    const playX = timeToX(state.playOffset);

    // 1. Draw Selection Background Highlight
    if (endX > startX) {
      const regionWidth = endX - startX;
      
      // Selected background tint
      const regGrad = ctx.createLinearGradient(startX, 0, endX, 0);
      regGrad.addColorStop(0, 'rgba(124, 58, 237, 0.18)');
      regGrad.addColorStop(1, 'rgba(79, 70, 229, 0.22)');
      ctx.fillStyle = regGrad;
      ctx.fillRect(startX, 0, regionWidth, height);

      // Fade-In visual ramp
      if (state.fadeIn > 0) {
        const fadeWidth = (state.fadeIn / visibleDuration) * width;
        const fadeGrad = ctx.createLinearGradient(startX, 0, startX + fadeWidth, 0);
        fadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        fadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(startX, 0, fadeWidth, height);
      }

      // Fade-Out visual ramp
      if (state.fadeOut > 0) {
        const fadeWidth = (state.fadeOut / visibleDuration) * width;
        const fadeGrad = ctx.createLinearGradient(endX - fadeWidth, 0, endX, 0);
        fadeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
        fadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(endX - fadeWidth, 0, fadeWidth, height);
      }
    }

    // 2. Draw Waveform Peaks
    for (let i = 0; i < numBars; i++) {
      const x = i * 3.5;
      const barTime = viewStart + (i / numBars) * visibleDuration;

      let min = 1.0;
      let max = -1.0;
      const sampleIdx = startSample + i * step;

      for (let j = 0; j < step; j += 4) {
        const datum = rawData[sampleIdx + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      let amp = Math.max(Math.abs(min), Math.abs(max));
      amp = Math.min(1, amp * (state.volume || 1));
      const barHeight = Math.max(3, amp * (height * 0.8));

      // Color based on whether inside selection
      const isInside = barTime >= state.startTime && barTime <= state.endTime;
      
      if (isInside) {
        ctx.fillStyle = '#a78bfa'; // Bright Purple
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'; // Muted
      }

      // Rounded bar
      const barY = centerY - barHeight / 2;
      ctx.beginPath();
      ctx.roundRect(x, barY, 2.2, barHeight, 2);
      ctx.fill();
    }

    // 3. Draw Start Handle
    if (startX >= 0 && startX <= width) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();

      // Top badge handle
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.roundRect(startX - 6, 4, 12, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('S', startX - 3, 16);
    }

    // 4. Draw End Handle
    if (endX >= 0 && endX <= width) {
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();

      // Top badge handle
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(endX - 6, 4, 12, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('E', endX - 3, 16);
    }

    // 5. Draw Playhead Scrubber Cursor
    if (playX >= 0 && playX <= width) {
      ctx.strokeStyle = '#007AFF'; // iOS Blue
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Indicator pip
      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      ctx.arc(playX, height - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- AUDIO PLAYBACK ENGINE ---
  let animFrameId = null;

  function startAudio(offset = state.startTime, playSelectionOnly = false) {
    if (!state.audioBuffer) return;
    stopAudio();

    const audioCtx = getAudioContext();
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = state.audioBuffer;

    // Gain node for preview volume
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = Math.min(2.0, state.volume);

    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    state.activeSourceNode = sourceNode;
    state.isPlaying = true;
    state.playStartTime = audioCtx.currentTime;
    state.playOffset = offset;

    // Start playing
    sourceNode.start(0, offset);

    // Update UI button icon
    playIcon.setAttribute('data-lucide', 'pause');
    if (window.lucide) window.lucide.createIcons();

    function renderPlayback() {
      if (!state.isPlaying) return;

      const elapsed = audioCtx.currentTime - state.playStartTime;
      state.playOffset = offset + elapsed;

      // Handle selection end or track end
      const boundary = playSelectionOnly || state.isLooping ? state.endTime : state.audioBuffer.duration;

      if (state.playOffset >= boundary) {
        if (state.isLooping) {
          // Loop back to selection start
          startAudio(state.startTime, playSelectionOnly);
          return;
        } else {
          stopAudio();
          state.playOffset = state.startTime;
          currentTimeDisplay.textContent = formatTime(state.playOffset);
          drawWaveform();
          return;
        }
      }

      currentTimeDisplay.textContent = formatTime(state.playOffset);
      drawWaveform();
      animFrameId = requestAnimationFrame(renderPlayback);
    }

    animFrameId = requestAnimationFrame(renderPlayback);
  }

  function stopAudio() {
    if (state.activeSourceNode) {
      try {
        state.activeSourceNode.stop();
        state.activeSourceNode.disconnect();
      } catch (e) {}
      state.activeSourceNode = null;
    }
    state.isPlaying = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    playIcon.setAttribute('data-lucide', 'play');
    if (window.lucide) window.lucide.createIcons();
    drawWaveform();
  }

  // Play / Pause toggle
  playPauseBtn.addEventListener('click', () => {
    if (state.isPlaying) {
      stopAudio();
    } else {
      startAudio(state.playOffset || state.startTime);
    }
  });

  // Play selection only
  playSelectionBtn.addEventListener('click', () => {
    startAudio(state.startTime, true);
  });

  // Loop toggle
  loopBtn.addEventListener('click', () => {
    state.isLooping = !state.isLooping;
    if (state.isLooping) {
      loopBtn.className = 'w-full py-1.5 px-3 rounded-lg bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all';
      loopText.textContent = 'Végtelenített Loop: BE';
      showToast('Végtelenített lejátszás bekapcsolva - hallgasd meg az ismétlődő csengést!', 'info');
    } else {
      loopBtn.className = 'w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5 transition-all';
      loopText.textContent = 'Végtelenített Loop: KI';
    }
  });

  // Spacebar shortcut
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      playPauseBtn.click();
    }
  });

  // --- WAVEFORM INTERACTION (DRAG & SEEK) ---
  function getTimeFromEvent(e) {
    const rect = waveformContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const totalDuration = state.audioBuffer ? state.audioBuffer.duration : 1;
    const visibleDuration = totalDuration / state.zoomLevel;
    return state.viewOffset + (x / rect.width) * visibleDuration;
  }

  waveformContainer.addEventListener('mousedown', (e) => {
    if (!state.audioBuffer) return;
    const rect = waveformContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalDuration = state.audioBuffer.duration;
    const visibleDuration = totalDuration / state.zoomLevel;

    function timeToX(t) {
      return ((t - state.viewOffset) / visibleDuration) * rect.width;
    }

    const startX = timeToX(state.startTime);
    const endX = timeToX(state.endTime);
    const tolerance = 12; // px

    if (Math.abs(x - startX) <= tolerance) {
      state.draggingHandle = 'start';
    } else if (Math.abs(x - endX) <= tolerance) {
      state.draggingHandle = 'end';
    } else if (x > startX + tolerance && x < endX - tolerance) {
      state.draggingHandle = 'window';
      state.dragStartX = x;
      state.dragStartVal = state.startTime;
    } else {
      // Seek playhead
      const targetTime = getTimeFromEvent(e);
      state.playOffset = targetTime;
      currentTimeDisplay.textContent = formatTime(targetTime);
      if (state.isPlaying) {
        startAudio(targetTime);
      } else {
        drawWaveform();
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.draggingHandle || !state.audioBuffer) return;
    const targetTime = getTimeFromEvent(e);
    const totalDuration = state.audioBuffer.duration;

    if (state.draggingHandle === 'start') {
      if (targetTime < state.endTime - 0.5 && targetTime >= 0) {
        state.startTime = parseFloat(targetTime.toFixed(2));
      }
    } else if (state.draggingHandle === 'end') {
      if (targetTime > state.startTime + 0.5 && targetTime <= totalDuration) {
        state.endTime = parseFloat(targetTime.toFixed(2));
      }
    } else if (state.draggingHandle === 'window') {
      const rect = waveformContainer.getBoundingClientRect();
      const dx = (e.clientX - rect.left) - state.dragStartX;
      const visibleDuration = totalDuration / state.zoomLevel;
      const dt = (dx / rect.width) * visibleDuration;
      const curDur = state.endTime - state.startTime;

      let newStart = state.dragStartVal + dt;
      if (newStart < 0) newStart = 0;
      if (newStart + curDur > totalDuration) newStart = totalDuration - curDur;

      state.startTime = parseFloat(newStart.toFixed(2));
      state.endTime = parseFloat((newStart + curDur).toFixed(2));
    }

    updateTimingDisplay();
  });

  window.addEventListener('mouseup', () => {
    state.draggingHandle = null;
  });

  // Touch support for mobile / iPhone Safari
  waveformContainer.addEventListener('touchstart', (e) => {
    if (!state.audioBuffer) return;
    const targetTime = getTimeFromEvent(e);
    state.playOffset = targetTime;
    currentTimeDisplay.textContent = formatTime(targetTime);
    if (state.isPlaying) startAudio(targetTime);
    else drawWaveform();
  }, { passive: true });

  // --- NUDGE CONTROLS ---
  startNudgeMinus.addEventListener('click', () => {
    state.startTime = Math.max(0, state.startTime - 0.5);
    updateTimingDisplay();
  });
  startNudgePlus.addEventListener('click', () => {
    state.startTime = Math.min(state.endTime - 0.5, state.startTime + 0.5);
    updateTimingDisplay();
  });
  endNudgeMinus.addEventListener('click', () => {
    state.endTime = Math.max(state.startTime + 0.5, state.endTime - 0.5);
    updateTimingDisplay();
  });
  endNudgePlus.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.endTime + 0.5);
    updateTimingDisplay();
  });

  // --- PRESET BUTTONS ---
  presetRingtoneBtn.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.startTime + 30);
    updateTimingDisplay();
    showToast('Csengőhang hossz beállítva (30 másodperc)', 'info');
  });

  presetAlertBtn.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.startTime + 10);
    updateTimingDisplay();
    showToast('SMS / Értesítő hang beállítva (10 másodperc)', 'info');
  });

  presetHookBtn.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    // Jump to middle / chorus area
    const chorusStart = Math.min(Math.max(0, totalDur * 0.35), totalDur - 30);
    state.startTime = parseFloat(chorusStart.toFixed(1));
    state.endTime = parseFloat(Math.min(totalDur, chorusStart + 30).toFixed(1));
    state.playOffset = state.startTime;
    updateTimingDisplay();
    showToast('Refrén szekció kiválasztva (30 másodperc)', 'info');
  });

  // --- ZOOM BUTTONS ---
  zoomInBtn.addEventListener('click', () => {
    state.zoomLevel = Math.min(4.0, state.zoomLevel + 0.5);
    zoomLevelDisplay.textContent = `Nagyítás: ${state.zoomLevel.toFixed(1)}x`;
    drawWaveform();
  });

  zoomOutBtn.addEventListener('click', () => {
    state.zoomLevel = Math.max(1.0, state.zoomLevel - 0.5);
    if (state.zoomLevel === 1.0) state.viewOffset = 0;
    zoomLevelDisplay.textContent = `Nagyítás: ${state.zoomLevel.toFixed(1)}x`;
    drawWaveform();
  });

  // --- EFFECT SLIDERS ---
  fadeInInput.addEventListener('input', (e) => {
    state.fadeIn = parseFloat(e.target.value);
    fadeInVal.textContent = `${state.fadeIn.toFixed(1)}s`;
    drawWaveform();
  });

  fadeOutInput.addEventListener('input', (e) => {
    state.fadeOut = parseFloat(e.target.value);
    fadeOutVal.textContent = `${state.fadeOut.toFixed(1)}s`;
    drawWaveform();
  });

  volumeInput.addEventListener('input', (e) => {
    state.volume = parseFloat(e.target.value);
    volumeVal.textContent = `${Math.round(state.volume * 100)}%`;
  });

  normalizeInput.addEventListener('change', (e) => {
    state.normalize = e.target.checked;
    if (state.normalize) {
      showToast('EBU R128 hangerő-normalizálás bekapcsolva', 'info');
    }
  });

  // --- FORMAT SELECTOR ---
  formatButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      formatButtons.forEach((b) => {
        b.className = 'format-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white transition-all flex items-center gap-1.5';
      });
      btn.className = 'format-btn active px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 shadow transition-all flex items-center gap-1.5';

      state.format = btn.dataset.format;
      convertBtnText.textContent = state.format === 'm4r' ? 'Csengőhang Letöltése (.m4r)' : 'MP3 Zene Letöltése (.mp3)';
    });
  });

  // --- LOCAL FILE UPLOAD HANDLER ---
  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brand-500', 'bg-brand-500/[0.06]');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-500', 'bg-brand-500/[0.06]');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });

  async function handleFileUpload(file) {
    showToast(`"${file.name}" betöltése és elemzése...`, 'info');

    if (state.isBackendAvailable) {
      // Use backend upload
      try {
        const formData = new FormData();
        formData.append('audio', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Feltöltési hiba');

        loadAudioIntoStudio(data);
      } catch (err) {
        showToast('Hiba a fájl feltöltésekor: ' + err.message, 'error');
      }
    } else {
      // Standalone browser decode mode (GitHub Pages)
      try {
        const audioCtx = getAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const trackData = {
          id: 'local-' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Helyi zenefájl',
          duration: decodedBuffer.duration,
          format: file.name.split('.').pop().toUpperCase(),
          buffer: decodedBuffer,
          source: 'Helyi fájl (Közvetlen)',
          thumbnail: null
        };

        loadAudioIntoStudio(trackData);
      } catch (err) {
        console.error('Client file read error:', err);
        showToast('Hiba a fájl böngészős beolvasásakor: ' + err.message, 'error');
      }
    }
  }

  // --- LINK FORM RESOLVER ---
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Kérjük adj meg egy linket!', 'error');
      return;
    }

    if (!state.isBackendAvailable) {
      showToast('A linkből történő online letöltéshez a helyi szerver futtatása szükséges (npm start). Használj Helyi Fájlt vagy Minta Dalt!', 'info');
      return;
    }

    urlSubmitBtn.disabled = true;
    urlSubmitBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Betöltés...</span>`;

    try {
      showToast('Link feloldása és audió kinyerése folyamatban...', 'info');
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a letöltés során');

      loadAudioIntoStudio(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      urlSubmitBtn.disabled = false;
      urlSubmitBtn.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i><span>Zene Betöltése</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // --- SEARCH FORM HANDLER ---
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;

    if (!state.isBackendAvailable) {
      showToast('Az online keresőhöz a háttérszerver szükséges (npm start). Standalone módban a Helyi Fájl feltöltés érhető el!', 'info');
      return;
    }

    searchResults.innerHTML = `
      <div class="text-center py-8 text-neutral-400 flex items-center justify-center gap-3">
        <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Keresés a dalok között...</span>
      </div>
    `;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Keresési hiba');

      if (!data.results || data.results.length === 0) {
        searchResults.innerHTML = `<div class="text-center py-6 text-neutral-500 text-sm">Nem található találat erre a kifejezésre.</div>`;
        return;
      }

      searchResults.innerHTML = '';
      data.results.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all';
        row.innerHTML = `
          <div class="flex items-center gap-3 overflow-hidden">
            <img src="${item.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-900 border border-white/10" alt="">
            <div class="min-w-0">
              <h5 class="text-xs sm:text-sm font-bold text-white truncate">${item.title}</h5>
              <p class="text-[11px] text-neutral-400 truncate">${item.artist}</p>
              <span class="text-[10px] text-neutral-500 font-mono">${item.formattedDuration}</span>
            </div>
          </div>
          <button data-url="${item.url}" class="select-search-item px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-brand-600/20">
            <i data-lucide="scissors" class="w-3.5 h-3.5"></i>
            <span>Vágás</span>
          </button>
        `;
        searchResults.appendChild(row);
      });

      if (window.lucide) window.lucide.createIcons();

      // Attach click handlers to select buttons
      document.querySelectorAll('.select-search-item').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const itemUrl = btn.dataset.url;
          btn.disabled = true;
          btn.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

          try {
            showToast('Dal letöltése a vágáshoz...', 'info');
            const resolveRes = await fetch('/api/resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: itemUrl }),
            });
            const itemData = await resolveRes.json();
            if (!resolveRes.ok) throw new Error(itemData.error || 'Hiba a betöltéskor');

            loadAudioIntoStudio(itemData);
          } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="scissors" class="w-3.5 h-3.5"></i><span>Vágás</span>`;
            if (window.lucide) window.lucide.createIcons();
          }
        });
      });

    } catch (err) {
      searchResults.innerHTML = `<div class="text-center py-6 text-red-400 text-sm">${err.message}</div>`;
    }
  });

  // --- SAMPLES LIST LOADER ---
  async function loadSamplesList() {
    let samples = FALLBACK_SAMPLES;

    if (state.isBackendAvailable) {
      try {
        const res = await fetch('/api/samples');
        if (res.ok) {
          const data = await res.json();
          if (data.samples && data.samples.length > 0) {
            samples = data.samples;
          }
        }
      } catch (err) {
        console.warn('Backend samples fetch failed, using fallback:', err);
      }
    }

    samplesList.innerHTML = '';
    samples.forEach((sample) => {
      const card = document.createElement('div');
      card.className = 'glass-card p-4 rounded-2xl border border-white/10 hover:border-brand-500/50 transition-all flex flex-col justify-between gap-3 group';
      card.innerHTML = `
        <div class="space-y-2">
          <div class="h-28 rounded-xl overflow-hidden relative">
            <img src="${sample.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" alt="">
            <span class="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/20">
              ${sample.genre}
            </span>
          </div>
          <div>
            <h5 class="text-xs sm:text-sm font-bold text-white line-clamp-1">${sample.title}</h5>
            <p class="text-[11px] text-neutral-400">${sample.artist}</p>
          </div>
        </div>
        <button data-sample-id="${sample.id}" class="load-sample-btn w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-brand-600 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all">
          <i data-lucide="play" class="w-3.5 h-3.5"></i>
          <span>Minta Betöltése</span>
        </button>
      `;
      samplesList.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

    // Attach click events
    document.querySelectorAll('.load-sample-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const sampleId = btn.dataset.sampleId;
        const selectedSample = samples.find((s) => s.id === sampleId) || FALLBACK_SAMPLES[0];

        btn.disabled = true;
        btn.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

        try {
          showToast('Minta dal betöltése a stúdióba...', 'info');

          if (state.isBackendAvailable) {
            const res = await fetch('/api/load-sample', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sampleId }),
            });
            const sData = await res.json();
            if (!res.ok) throw new Error(sData.error || 'Betöltési hiba');
            loadAudioIntoStudio(sData);
          } else {
            // Standalone mode: load directly from public/samples URL
            loadAudioIntoStudio({
              id: selectedSample.id,
              title: selectedSample.title,
              artist: selectedSample.artist,
              audioUrl: selectedSample.audioUrl,
              thumbnail: selectedSample.thumbnail,
              source: 'Minta zenetár (Előtöltött)'
            });
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5"></i><span>Minta Betöltése</span>`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });
  }

  // --- CLIENT-SIDE AUDIO ENCODER & RENDERER ---
  async function renderTrimmedOfflineBuffer(buffer, start, end, fadeIn, fadeOut, volume) {
    const duration = Math.max(0.5, end - start);
    const sampleRate = buffer.sampleRate;
    const numChannels = Math.min(2, buffer.numberOfChannels);
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtx(numChannels, Math.ceil(duration * sampleRate), sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.setValueAtTime(volume, 0);

    // Fade In
    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0.0001, 0);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), Math.min(duration / 2, fadeIn));
    }

    // Fade Out
    if (fadeOut > 0) {
      const fadeOutStart = Math.max(0, duration - fadeOut);
      gainNode.gain.setValueAtTime(volume, fadeOutStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, duration);
    }

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(0, start, duration);
    return await offlineCtx.startRendering();
  }

  function audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const length = buffer.length;
    const dataSize = length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // --- CONVERT & DOWNLOAD BUTTON ---
  convertDownloadBtn.addEventListener('click', async () => {
    if (!state.currentTrack || !state.audioBuffer) {
      showToast('Kérjük először tölts be egy zenét!', 'error');
      return;
    }

    const duration = state.endTime - state.startTime;
    if (state.format === 'm4r' && duration > 40.0) {
      showToast('Figyelem: az iPhone csengőhangok maximum 40 másodpercesek lehetnek! Kérjük rövidítsd le a kiválasztást.', 'error');
      return;
    }

    convertDownloadBtn.disabled = true;
    convertDownloadBtn.innerHTML = `
      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span>Konvertálás és kódolás folyamatban...</span>
    `;

    try {
      const sanitizedTitle = `${state.currentTrack.artist}_${state.currentTrack.title}_csengohang`
        .replace(/[\\/*?:"<>|]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      if (state.isBackendAvailable && !state.currentTrack.buffer) {
        // Full Server-Side FFmpeg conversion
        const payload = {
          id: state.currentTrack.id,
          start: state.startTime,
          end: state.endTime,
          fadeIn: state.fadeIn,
          fadeOut: state.fadeOut,
          volume: state.volume,
          normalize: state.normalize,
          format: state.format,
          title: sanitizedTitle,
        };

        const res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Konvertálási hiba');

        showToast(`Csengőhang elkészült (${data.duration}s)! Letöltés...`, 'success');

        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

      } else {
        // Client-side Browser Render & Download (GitHub Pages Standalone Mode)
        showToast('Kliensoldali audio renderelés és effektek alkalmazása...', 'info');

        const renderedBuffer = await renderTrimmedOfflineBuffer(
          state.audioBuffer,
          state.startTime,
          state.endTime,
          state.fadeIn,
          state.fadeOut,
          state.volume
        );

        let finalBlob = null;
        const targetExt = state.format === 'm4r' ? 'm4r' : 'mp3';
        const fileName = `${sanitizedTitle}.${targetExt}`;

        // Attempt native MediaRecorder audio/mp4 if supported
        if (state.format === 'm4r' && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
          const audioCtx = getAudioContext();
          const dest = audioCtx.createMediaStreamDestination();
          const src = audioCtx.createBufferSource();
          src.buffer = renderedBuffer;
          src.connect(dest);

          const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/mp4' });
          const chunks = [];
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

          const recordPromise = new Promise((resolve) => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/x-m4r' }));
          });

          recorder.start();
          src.start();
          await new Promise((r) => setTimeout(r, Math.min(2000, renderedBuffer.duration * 1000)));
          recorder.stop();
          src.stop();

          finalBlob = await recordPromise;
        }

        if (!finalBlob) {
          // Universal lossless fallback
          finalBlob = audioBufferToWavBlob(renderedBuffer);
        }

        const downloadUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

        showToast(`Csengőhang elkészült (${duration.toFixed(1)}s)! Letöltve mint ${fileName}`, 'success');
      }

      // Show reminder for iPhone setup
      setTimeout(() => {
        showToast('Tipp: Kattints fent az "iPhone Beállítási Útmutató"-ra a csengőhang aktiválásához!', 'info');
      }, 2000);

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      convertDownloadBtn.disabled = false;
      convertDownloadBtn.innerHTML = `
        <i data-lucide="sparkles" class="w-5 h-5 text-white animate-pulse"></i>
        <span>${state.format === 'm4r' ? 'Csengőhang Letöltése (.m4r)' : 'MP3 Zene Letöltése (.mp3)'}</span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // --- RESET BUTTON ---
  resetTrackBtn.addEventListener('click', () => {
    stopAudio();
    cutterSection.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Válassz egy másik dalt a folytatáshoz.', 'info');
  });

  // --- GUIDE MODAL HANDLERS ---
  guideBtn.addEventListener('click', () => {
    guideModal.classList.remove('hidden');
  });

  closeGuideBtn.addEventListener('click', () => {
    guideModal.classList.add('hidden');
  });

  gotItGuideBtn.addEventListener('click', () => {
    guideModal.classList.add('hidden');
  });

  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.classList.add('hidden');
  });

  guideTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      guideTabs.forEach((t) => t.classList.remove('active'));
      guideContents.forEach((c) => c.classList.add('hidden'));

      tab.classList.add('active');
      const target = document.getElementById(`guide-${tab.dataset.guide}`);
      if (target) target.classList.remove('hidden');
    });
  });

  // Initialize
  checkBackendStatus().then(() => {
    loadSamplesList();
  });

  // Resize listener for responsive waveform redraw
  window.addEventListener('resize', () => {
    drawWaveform();
  });
});
