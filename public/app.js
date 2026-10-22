/**
 * iPhone Ringtone Studio - Complete Universal Web Engine
 * Fully functional both on static GitHub Pages and with local backend!
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- APPLICATION STATE ---
  const state = {
    isBackendAvailable: false,
    backendApiUrl: '',      // Local server base URL if connected (e.g. http://localhost:3030)
    currentTrack: null,     // { id, title, artist, duration, format, audioUrl, thumbnail, source, buffer }
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

  // Pre-loaded royalty-free demo samples (Full length multi-minute songs!)
  const FALLBACK_SAMPLES = [
    {
      id: 'sample-electronic',
      title: 'Upbeat Electronic Dance (Teljes Dal - 2:34)',
      artist: 'Marc Corominas / NCS',
      audioUrl: './samples/sample-electronic.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
      genre: 'Elektronikus / Dance'
    },
    {
      id: 'sample-inspirational',
      title: 'Acoustic Melody & Vocals (Teljes Dal - 3:27)',
      artist: 'Madeline Tasquin',
      audioUrl: './samples/sample-inspirational.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      genre: 'Akusztikus / Pop'
    },
    {
      id: 'sample-synth-ambient',
      title: 'Synthwave Neon Drive (Teljes Dal - 3:18)',
      artist: 'Composer Squad',
      audioUrl: './samples/sample-synth-ambient.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop',
      genre: 'Retro Synthwave'
    }
  ];

  // --- DOM ELEMENTS ---
  const backendStatusBadge = document.getElementById('backendStatusBadge');
  const backendStatusText = document.getElementById('backendStatusText');

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

  // Dual iPhone Touch Sliders
  const startSlider = document.getElementById('startSlider');
  const endSlider = document.getElementById('endSlider');
  const sliderStartTimeVal = document.getElementById('sliderStartTimeVal');
  const sliderEndTimeVal = document.getElementById('sliderEndTimeVal');

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
    // 1. Try relative /api/status
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        state.isBackendAvailable = true;
        state.backendApiUrl = '';
        backendStatusBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        backendStatusText.textContent = 'Helyi Szerver Aktív (yt-dlp & FFmpeg - Teljes dalok)';
        return;
      }
    } catch (e) {}

    // 2. Try http://localhost:3030 if running hosted on GitHub Pages
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('http://localhost:3030/api/status', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        state.isBackendAvailable = true;
        state.backendApiUrl = 'http://localhost:3030';
        backendStatusBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        backendStatusText.textContent = 'Helyi Motor Csatlakoztatva (localhost:3030)';
        return;
      }
    } catch (e) {}

    state.isBackendAvailable = false;
    state.backendApiUrl = '';
    backendStatusBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20';
    backendStatusText.textContent = 'Webes Audió Motor Aktív (100% Online)';
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
  function updateTimingDisplay(syncSliders = true) {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : (state.currentTrack?.duration || 0);
    
    // Clamp
    if (state.startTime < 0) state.startTime = 0;
    if (state.startTime > Math.max(0, totalDur - 0.5)) state.startTime = Math.max(0, totalDur - 0.5);
    if (state.endTime <= state.startTime) state.endTime = Math.min(totalDur, state.startTime + 30);
    if (state.endTime > totalDur) state.endTime = totalDur;

    const selectedDur = state.endTime - state.startTime;

    startTimeVal.textContent = formatTime(state.startTime);
    endTimeVal.textContent = formatTime(state.endTime);
    selectedDurationVal.textContent = selectedDur.toFixed(1);

    if (sliderStartTimeVal) sliderStartTimeVal.textContent = formatTime(state.startTime);
    if (sliderEndTimeVal) sliderEndTimeVal.textContent = formatTime(state.endTime);

    if (syncSliders && totalDur > 0) {
      if (startSlider) {
        startSlider.max = totalDur;
        startSlider.value = state.startTime;
      }
      if (endSlider) {
        endSlider.max = totalDur;
        endSlider.value = state.endTime;
      }
    }

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

  // --- UNIVERSAL IN-BROWSER MUSIC RESOLVER (FULL LENGTH TRACKS!) ---
  async function resolveInBrowser(queryOrUrl) {
    const trimmed = queryOrUrl.trim();
    const isSpotify = /spotify\.com/i.test(trimmed) || /^spotify:/i.test(trimmed);
    const isApple = /music\.apple\.com/i.test(trimmed);
    const isYouTube = /youtube\.com|youtu\.be/i.test(trimmed);

    let searchQuery = trimmed;
    let trackTitleHint = '';
    let trackArtistHint = '';
    let thumbnailHint = '';
    let sourceName = 'Online Zene';

    // 1. Apple Music resolution
    if (isApple) {
      sourceName = 'Apple Music';
      const trackIdMatch = trimmed.match(/[?&]i=(\d+)/i) || trimmed.match(/\/album\/[^/]+\/(\d+)/i);
      if (trackIdMatch) {
        const appleId = trackIdMatch[1];
        try {
          const res = await fetch(`https://itunes.apple.com/lookup?id=${appleId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const item = data.results[0];
              trackTitleHint = item.trackName || item.collectionName || '';
              trackArtistHint = item.artistName || '';
              thumbnailHint = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
              searchQuery = `${trackTitleHint} ${trackArtistHint}`.trim();
            }
          }
        } catch (e) {
          console.warn('Apple lookup failed:', e);
        }
      }

      if (!trackTitleHint) {
        const slugMatch = trimmed.match(/\/album\/([^/?]+)/i) || trimmed.match(/\/song\/([^/?]+)/i);
        if (slugMatch) {
          searchQuery = decodeURIComponent(slugMatch[1].replace(/-/g, ' '));
        }
      }
    }

    // 2. Spotify resolution
    else if (isSpotify) {
      sourceName = 'Spotify';
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          trackTitleHint = oembedData.title || '';
          thumbnailHint = oembedData.thumbnail_url || '';
          searchQuery = trackTitleHint;
        }
      } catch (e) {
        console.warn('Spotify oEmbed fetch error:', e);
      }
    }

    // 3. YouTube resolution
    else if (isYouTube) {
      sourceName = 'YouTube';
      try {
        const ytOembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`;
        const ytRes = await fetch(ytOembedUrl);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          trackTitleHint = ytData.title || '';
          trackArtistHint = ytData.author_name || '';
          thumbnailHint = ytData.thumbnail_url || '';

          // Clean title
          const clean = trackTitleHint
            .replace(/official\s*(music\s*)?(video|audio|visualizer|clip|lyric\s*video)?/gi, '')
            .replace(/[\[\(][^\]\)]*[\]\)]/g, '')
            .replace(/[|•-]/g, ' ')
            .trim();

          searchQuery = `${clean} ${trackArtistHint}`.trim();
        }
      } catch (e) {
        console.warn('YouTube oEmbed fetch error:', e);
      }
    }

    // --- PRIORITY 1: Audius Open Music Network for FULL LENGTH TRACKS (100% full song, 3-6 mins!) ---
    try {
      const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(searchQuery)}&limit=5&app_name=ringtone-studio`;
      const audiusRes = await fetch(audiusUrl);
      if (audiusRes.ok) {
        const aData = await audiusRes.json();
        if (aData.data && aData.data.length > 0) {
          const best = aData.data[0];
          let art = thumbnailHint;
          if (best.artwork) {
            art = best.artwork['480x480'] || best.artwork['1000x1000'] || best.artwork['150x150'] || art;
          }
          const fullStreamUrl = `https://discoveryprovider.audius.co/v1/tracks/${best.id}/stream?app_name=ringtone-studio`;
          return {
            id: 'audius-' + best.id,
            title: trackTitleHint || best.title,
            artist: trackArtistHint || best.user?.name || 'Előadó',
            thumbnail: art,
            audioUrl: fullStreamUrl,
            duration: best.duration || 180, // Full multi-minute length!
            source: `${sourceName} (Audius Teljes Dal)`
          };
        }
      }
    } catch (aErr) {
      console.warn('Audius search error, trying iTunes search:', aErr);
    }

    // --- PRIORITY 2: Query iTunes Audio Stream (High Quality CDN) ---
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=1`;
    const itunesRes = await fetch(itunesUrl);
    if (!itunesRes.ok) throw new Error('Nem sikerült kapcsolatot létesíteni az online zenetárral.');

    const itunesData = await itunesRes.json();
    if (!itunesData.results || itunesData.results.length === 0) {
      // Try searching with just track title hint
      if (trackTitleHint && trackTitleHint !== searchQuery) {
        const retryRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trackTitleHint)}&entity=song&limit=1`);
        const retryData = await retryRes.json();
        if (retryData.results && retryData.results.length > 0) {
          const item = retryData.results[0];
          return {
            title: trackTitleHint || item.trackName,
            artist: item.artistName,
            thumbnail: thumbnailHint || (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
            audioUrl: item.previewUrl,
            duration: item.trackTimeMillis ? item.trackTimeMillis / 1000 : 30,
            source: sourceName
          };
        }
      }
      throw new Error(`Nem találtunk lejátszható audió adatfolyamot erre a dalra: "${searchQuery}". Próbáld a kereső fület vagy helyi fájl feltöltését!`);
    }

    const item = itunesData.results[0];
    return {
      title: trackTitleHint || item.trackName,
      artist: trackArtistHint || item.artistName,
      thumbnail: thumbnailHint || (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      audioUrl: item.previewUrl,
      duration: item.trackTimeMillis ? item.trackTimeMillis / 1000 : 30,
      source: sourceName
    };
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

      // Initialize dual touch sliders
      if (startSlider) {
        startSlider.max = dur;
        startSlider.value = 0;
      }
      if (endSlider) {
        endSlider.max = dur;
        endSlider.value = state.endTime;
      }

      waveformLoading.classList.add('hidden');
      updateTimingDisplay(true);
      showToast(`Zene sikeresen betöltve (${formatTime(dur)})! Teljes dal készen áll a lejátszásra és vágásra.`, 'success');
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

    // 3. Draw Start Handle (Vibrant Purple, Touch-friendly Pills)
    if (startX >= 0 && startX <= width) {
      const isDraggingStart = state.draggingHandle === 'start';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = isDraggingStart ? 3.5 : 2.5;
      if (isDraggingStart) {
        ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Top pill handle
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.roundRect(startX - 22, 2, 44, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', startX, 12);

      // Bottom grip pill
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.roundRect(startX - 14, height - 19, 28, 17, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('◀▶', startX, height - 10.5);
    }

    // 4. Draw End Handle (Vibrant Pink, Touch-friendly Pills)
    if (endX >= 0 && endX <= width) {
      const isDraggingEnd = state.draggingHandle === 'end';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = isDraggingEnd ? 3.5 : 2.5;
      if (isDraggingEnd) {
        ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Top pill handle
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(endX - 22, 2, 44, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VÉG', endX, 12);

      // Bottom grip pill
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(endX - 14, height - 19, 28, 17, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('◀▶', endX, height - 10.5);
    }

    // 5. Draw Playhead Scrubber Cursor
    if (playX >= 0 && playX <= width) {
      ctx.strokeStyle = '#38bdf8'; // Sky Blue
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      // Indicator pip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(playX, height - 6, 5, 0, Math.PI * 2);
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
          state.playOffset = playSelectionOnly ? state.startTime : 0;
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

  // Play / Pause toggle: Plays the ENTIRE full track from current scrubber position
  playPauseBtn.addEventListener('click', () => {
    if (state.isPlaying) {
      stopAudio();
    } else {
      const dur = state.audioBuffer ? state.audioBuffer.duration : 0;
      if (state.playOffset >= dur - 0.5) {
        state.playOffset = 0;
      }
      startAudio(state.playOffset || 0, false);
    }
  });

  // Play selection only: Previews only the selected ringtone cut
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

  // --- WAVEFORM INTERACTION (TOUCH & POINTER OPTIMIZED FOR IPHONE & DESKTOP) ---
  function getTimeFromEvent(e) {
    const rect = waveformContainer.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : (e.clientX !== undefined ? e.clientX : 0);
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const totalDuration = state.audioBuffer ? state.audioBuffer.duration : 1;
    const visibleDuration = totalDuration / state.zoomLevel;
    return state.viewOffset + (x / rect.width) * visibleDuration;
  }

  function getXFromEvent(e) {
    const rect = waveformContainer.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : (e.clientX !== undefined ? e.clientX : 0);
    return Math.max(0, Math.min(rect.width, clientX - rect.left));
  }

  function handleDragStart(e) {
    if (!state.audioBuffer) return;
    const rect = waveformContainer.getBoundingClientRect();
    const x = getXFromEvent(e);
    const totalDuration = state.audioBuffer.duration;
    const visibleDuration = totalDuration / state.zoomLevel;

    function timeToX(t) {
      return ((t - state.viewOffset) / visibleDuration) * rect.width;
    }

    const startX = timeToX(state.startTime);
    const endX = timeToX(state.endTime);
    const tolerance = 32; // Generous 32px touch target for iPhone

    const distStart = Math.abs(x - startX);
    const distEnd = Math.abs(x - endX);

    // If close to both handles (e.g. narrow selection), pick the closer one
    if (distStart <= tolerance && distEnd <= tolerance) {
      state.draggingHandle = (distStart <= distEnd) ? 'start' : 'end';
    } else if (distStart <= tolerance) {
      state.draggingHandle = 'start';
    } else if (distEnd <= tolerance) {
      state.draggingHandle = 'end';
    } else if (x > startX + tolerance && x < endX - tolerance) {
      state.draggingHandle = 'window';
      state.dragStartX = x;
      state.dragStartVal = state.startTime;
    } else {
      // Direct seek playhead
      state.draggingHandle = null;
      const targetTime = getTimeFromEvent(e);
      state.playOffset = targetTime;
      currentTimeDisplay.textContent = formatTime(targetTime);
      if (state.isPlaying) {
        startAudio(targetTime, false);
      } else {
        drawWaveform();
      }
    }

    if (state.draggingHandle && e.cancelable) {
      e.preventDefault();
    }
  }

  function handleDragMove(e) {
    if (!state.draggingHandle || !state.audioBuffer) return;
    if (e.cancelable) e.preventDefault();

    const targetTime = getTimeFromEvent(e);
    const totalDuration = state.audioBuffer.duration;

    if (state.draggingHandle === 'start') {
      const clampedStart = Math.max(0, Math.min(state.endTime - 0.5, targetTime));
      state.startTime = parseFloat(clampedStart.toFixed(2));
    } else if (state.draggingHandle === 'end') {
      // Clamps cleanly without freezing at the edges!
      const clampedEnd = Math.min(totalDuration, Math.max(state.startTime + 0.5, targetTime));
      state.endTime = parseFloat(clampedEnd.toFixed(2));
    } else if (state.draggingHandle === 'window') {
      const rect = waveformContainer.getBoundingClientRect();
      const x = getXFromEvent(e);
      const dx = x - state.dragStartX;
      const visibleDuration = totalDuration / state.zoomLevel;
      const dt = (dx / rect.width) * visibleDuration;
      const curDur = state.endTime - state.startTime;

      let newStart = state.dragStartVal + dt;
      if (newStart < 0) newStart = 0;
      if (newStart + curDur > totalDuration) newStart = totalDuration - curDur;

      state.startTime = parseFloat(newStart.toFixed(2));
      state.endTime = parseFloat((newStart + curDur).toFixed(2));
    }

    updateTimingDisplay(true);
  }

  function handleDragEnd() {
    if (state.draggingHandle) {
      state.draggingHandle = null;
      drawWaveform();
    }
  }

  // Unified Mouse & Touch event listeners
  waveformContainer.addEventListener('mousedown', handleDragStart);
  window.addEventListener('mousemove', handleDragMove);
  window.addEventListener('mouseup', handleDragEnd);

  waveformContainer.addEventListener('touchstart', handleDragStart, { passive: false });
  window.addEventListener('touchmove', handleDragMove, { passive: false });
  window.addEventListener('touchend', handleDragEnd);
  window.addEventListener('touchcancel', handleDragEnd);

  // Sync dual iPhone range sliders with state
  if (startSlider) {
    startSlider.addEventListener('input', (e) => {
      if (!state.audioBuffer) return;
      const val = parseFloat(e.target.value);
      state.startTime = Math.min(val, state.endTime - 0.5);
      updateTimingDisplay(false);
    });
  }

  if (endSlider) {
    endSlider.addEventListener('input', (e) => {
      if (!state.audioBuffer) return;
      const val = parseFloat(e.target.value);
      state.endTime = Math.max(val, state.startTime + 0.5);
      updateTimingDisplay(false);
    });
  }

  // --- NUDGE CONTROLS ---
  startNudgeMinus.addEventListener('click', () => {
    state.startTime = Math.max(0, state.startTime - 0.5);
    updateTimingDisplay(true);
  });
  startNudgePlus.addEventListener('click', () => {
    state.startTime = Math.min(state.endTime - 0.5, state.startTime + 0.5);
    updateTimingDisplay(true);
  });
  endNudgeMinus.addEventListener('click', () => {
    state.endTime = Math.max(state.startTime + 0.5, state.endTime - 0.5);
    updateTimingDisplay(true);
  });
  endNudgePlus.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.endTime + 0.5);
    updateTimingDisplay(true);
  });

  // --- INTELLIGENT CHORUS DETECTION (RMS ENERGY & SPECTRAL DENSITY) ---
  function detectChorusSection(audioBuffer, targetDuration = 30) {
    const totalDuration = audioBuffer.duration;
    if (totalDuration <= targetDuration) {
      return { start: 0, end: totalDuration };
    }

    const rawData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Downsample into 200ms RMS energy frames for fast and accurate spectral power analysis
    const frameSec = 0.2;
    const frameSamples = Math.floor(sampleRate * frameSec);
    const numFrames = Math.floor(rawData.length / frameSamples);
    const energies = new Float32Array(numFrames);

    for (let f = 0; f < numFrames; f++) {
      const offset = f * frameSamples;
      let sum = 0;
      for (let i = 0; i < frameSamples; i += 4) {
        const s = rawData[offset + i];
        sum += s * s;
      }
      energies[f] = Math.sqrt(sum / (frameSamples / 4));
    }

    const windowFrames = Math.floor(targetDuration / frameSec);
    let bestScore = -1;
    let bestStartFrame = 0;

    // In pop/electronic/rock music, choruses rarely occur in intro (<12%) or outro (>88%)
    const minFrame = Math.floor((totalDuration * 0.12) / frameSec);
    const maxFrame = Math.max(minFrame + 1, numFrames - windowFrames - Math.floor((totalDuration * 0.05) / frameSec));

    let currentWindowEnergy = 0;
    for (let i = minFrame; i < minFrame + windowFrames && i < numFrames; i++) {
      currentWindowEnergy += energies[i];
    }

    for (let f = minFrame; f < maxFrame; f++) {
      if (f > minFrame) {
        currentWindowEnergy += energies[f + windowFrames - 1] - energies[f - 1];
      }

      // Weight position towards typical chorus locations (25% to 65% of track duration)
      const timeRatio = (f * frameSec) / totalDuration;
      let posWeight = 1.0;
      if (timeRatio >= 0.25 && timeRatio <= 0.65) {
        posWeight = 1.25; // Boost likely chorus zone
      } else if (timeRatio < 0.15 || timeRatio > 0.85) {
        posWeight = 0.8;
      }

      const score = currentWindowEnergy * posWeight;
      if (score > bestScore) {
        bestScore = score;
        bestStartFrame = f;
      }
    }

    const startSec = Math.max(0, parseFloat((bestStartFrame * frameSec).toFixed(1)));
    const endSec = Math.min(totalDuration, parseFloat((startSec + targetDuration).toFixed(1)));
    return { start: startSec, end: endSec };
  }

  // --- PRESET BUTTONS ---
  presetRingtoneBtn.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.startTime + 30);
    updateTimingDisplay(true);
    showToast('Csengőhang hossz beállítva (30 másodperc)', 'info');
  });

  presetAlertBtn.addEventListener('click', () => {
    const totalDur = state.audioBuffer ? state.audioBuffer.duration : 60;
    state.endTime = Math.min(totalDur, state.startTime + 10);
    updateTimingDisplay(true);
    showToast('SMS / Értesítő hang beállítva (10 másodperc)', 'info');
  });

  // Chorus detection preset button
  presetHookBtn.addEventListener('click', () => {
    if (!state.audioBuffer) {
      showToast('Kérlek először tölts be egy dalt a refrén felismeréséhez!', 'info');
      return;
    }

    showToast('🔍 Refrén keresése a dal dinamikus energiaspektruma alapján...', 'info');

    setTimeout(() => {
      const chorus = detectChorusSection(state.audioBuffer, 30);
      state.startTime = chorus.start;
      state.endTime = chorus.end;
      state.playOffset = state.startTime;
      updateTimingDisplay(true);

      showToast(`🎯 Refrén sikeresen kijelölve: ${formatTime(state.startTime)} - ${formatTime(state.endTime)}!`, 'success');
      startAudio(state.startTime, true);
    }, 120);
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
      // Standalone browser decode mode
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

  // --- LINK FORM RESOLVER (SPOTIFY / YOUTUBE / APPLE MUSIC) ---
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Kérjük adj meg egy linket!', 'error');
      return;
    }

    urlSubmitBtn.disabled = true;
    urlSubmitBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Betöltés...</span>`;

    try {
      showToast('Zenei link feloldása és audió kinyerése...', 'info');

      // 1. If backend is available, try backend resolve first (downloads full track via yt-dlp)
      if (state.isBackendAvailable) {
        try {
          const baseUrl = state.backendApiUrl || '';
          const res = await fetch(`${baseUrl}/api/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const data = await res.json();
          if (res.ok && data.audioUrl) {
            if (data.audioUrl.startsWith('/') && state.backendApiUrl) {
              data.audioUrl = state.backendApiUrl + data.audioUrl;
            }
            loadAudioIntoStudio(data);
            return;
          }
        } catch (backendErr) {
          console.warn('Backend resolve failed, attempting universal web resolve:', backendErr);
        }
      }

      // 2. Universal Web Resolver (Runs directly on GitHub Pages with Audius full tracks!)
      const trackData = await resolveInBrowser(url);
      loadAudioIntoStudio(trackData);

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      urlSubmitBtn.disabled = false;
      urlSubmitBtn.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i><span>Zene Betöltése</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // --- SEARCH FORM HANDLER (PRIORITIZES FULL-LENGTH AUDIUS SONGS) ---
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;

    searchResults.innerHTML = `
      <div class="text-center py-8 text-neutral-400 flex items-center justify-center gap-3">
        <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Keresés a dalok között...</span>
      </div>
    `;

    try {
      let results = [];

      // 1. Query Audius Open Network for FULL-LENGTH tracks (3-6 minutes long!)
      try {
        const audiusRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&limit=12&app_name=ringtone-studio`);
        if (audiusRes.ok) {
          const aData = await audiusRes.json();
          if (aData.data && aData.data.length > 0) {
            results = aData.data.map((item) => {
              const durSec = item.duration || 180;
              let art = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
              if (item.artwork) {
                art = item.artwork['150x150'] || item.artwork['480x480'] || art;
              }
              return {
                id: item.id,
                title: item.title,
                artist: item.user?.name || 'Előadó',
                duration: durSec,
                formattedDuration: `${Math.floor(durSec / 60)}:${String(Math.floor(durSec % 60)).padStart(2, '0')}`,
                url: `https://discoveryprovider.audius.co/v1/tracks/${item.id}/stream?app_name=ringtone-studio`,
                thumbnail: art,
                source: 'Audius (Teljes Dal)'
              };
            });
          }
        }
      } catch (audiusErr) {
        console.warn('Audius search error, falling back to iTunes:', audiusErr);
      }

      // 2. Query iTunes if Audius had no direct match
      if (results.length === 0) {
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=12`;
          const res = await fetch(itunesUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              results = data.results.map((item) => ({
                id: item.trackId,
                title: item.trackName,
                artist: item.artistName,
                duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
                formattedDuration: item.trackTimeMillis
                  ? `${Math.floor(item.trackTimeMillis / 60000)}:${String(Math.floor((item.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
                  : '0:30',
                url: item.previewUrl,
                thumbnail: (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
                source: 'Apple Music / iTunes'
              }));
            }
          }
        } catch (clientErr) {
          console.warn('iTunes search error:', clientErr);
        }
      }

      // 3. If no client results and backend is available, try backend search
      if (results.length === 0 && state.isBackendAvailable) {
        const baseUrl = state.backendApiUrl || '';
        const bRes = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(q)}`);
        const bData = await bRes.json();
        if (bRes.ok && bData.results) {
          results = bData.results;
        }
      }

      if (results.length === 0) {
        searchResults.innerHTML = `<div class="text-center py-6 text-neutral-500 text-sm">Nem található találat erre a kifejezésre. Próbálj másik előadót vagy címet!</div>`;
        return;
      }

      searchResults.innerHTML = '';
      results.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all';
        row.innerHTML = `
          <div class="flex items-center gap-3 overflow-hidden">
            <img src="${item.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-900 border border-white/10" alt="">
            <div class="min-w-0">
              <h5 class="text-xs sm:text-sm font-bold text-white truncate">${item.title}</h5>
              <p class="text-[11px] text-neutral-400 truncate">${item.artist}</p>
              <span class="text-[10px] text-emerald-400 font-mono font-semibold">${item.formattedDuration}</span>
            </div>
          </div>
          <button data-url="${item.url}" data-title="${encodeURIComponent(item.title)}" data-artist="${encodeURIComponent(item.artist)}" data-thumb="${encodeURIComponent(item.thumbnail)}" class="select-search-item px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-semibold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-brand-600/20">
            <i data-lucide="scissors" class="w-3.5 h-3.5"></i>
            <span>Vágás</span>
          </button>
        `;
        searchResults.appendChild(row);
      });

      if (window.lucide) window.lucide.createIcons();

      // Attach click handlers
      document.querySelectorAll('.select-search-item').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const itemUrl = btn.dataset.url;
          const sTitle = decodeURIComponent(btn.dataset.title);
          const sArtist = decodeURIComponent(btn.dataset.artist);
          const sThumb = decodeURIComponent(btn.dataset.thumb);

          btn.disabled = true;
          btn.innerHTML = `<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

          try {
            showToast('Dal betöltése a vágáshoz...', 'info');

            if (itemUrl.startsWith('http') && (itemUrl.includes('audius.co') || itemUrl.includes('apple.com'))) {
              // Direct audio stream (Audius is FULL LENGTH!)
              loadAudioIntoStudio({
                id: 'stream-' + Date.now(),
                title: sTitle,
                artist: sArtist,
                audioUrl: itemUrl,
                thumbnail: sThumb,
                source: itemUrl.includes('audius.co') ? 'Audius (Teljes Dal)' : 'Zene Kereső'
              });
            } else if (state.isBackendAvailable) {
              const baseUrl = state.backendApiUrl || '';
              const resolveRes = await fetch(`${baseUrl}/api/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: itemUrl }),
              });
              const itemData = await resolveRes.json();
              if (!resolveRes.ok) throw new Error(itemData.error || 'Hiba a betöltéskor');
              if (itemData.audioUrl && itemData.audioUrl.startsWith('/') && state.backendApiUrl) {
                itemData.audioUrl = state.backendApiUrl + itemData.audioUrl;
              }
              loadAudioIntoStudio(itemData);
            } else {
              const trackData = await resolveInBrowser(`${sArtist} ${sTitle}`);
              loadAudioIntoStudio(trackData);
            }
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
            const baseUrl = state.backendApiUrl || '';
            const res = await fetch(`${baseUrl}/api/load-sample`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sampleId }),
            });
            const sData = await res.json();
            if (!res.ok) throw new Error(sData.error || 'Betöltési hiba');
            if (sData.audioUrl && sData.audioUrl.startsWith('/') && state.backendApiUrl) {
              sData.audioUrl = state.backendApiUrl + sData.audioUrl;
            }
            loadAudioIntoStudio(sData);
          } else {
            // Standalone mode: load directly from public/samples URL (Full multi-minute songs!)
            loadAudioIntoStudio({
              id: selectedSample.id,
              title: selectedSample.title,
              artist: selectedSample.artist,
              audioUrl: selectedSample.audioUrl,
              thumbnail: selectedSample.thumbnail,
              source: 'Minta zenetár (Teljes Dal)'
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

    return new Blob([view], { type: 'audio/x-m4r' });
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

      if (state.isBackendAvailable && !state.currentTrack.buffer && !state.currentTrack.audioUrl.startsWith('http')) {
        // Backend conversion if audio is on server
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

        const baseUrl = state.backendApiUrl || '';
        const res = await fetch(`${baseUrl}/api/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Konvertálási hiba');

        showToast(`Csengőhang elkészült (${data.duration}s)! Letöltés...`, 'success');

        const a = document.createElement('a');
        let dlUrl = data.downloadUrl;
        if (dlUrl && dlUrl.startsWith('/') && state.backendApiUrl) {
          dlUrl = state.backendApiUrl + dlUrl;
        }
        a.href = dlUrl;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

      } else {
        // Universal Client-side Browser Render & Download (GitHub Pages)
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
          // Universal audio blob fallback
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
        showToast('Tipp: A letöltés után kattints a „Továbbiak...” lehetőségre, majd a „Használat csengőhangként” opcióra!', 'info');
      }, 1500);

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
