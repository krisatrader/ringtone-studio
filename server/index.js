import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TEMP_DIR = path.join(rootDir, 'temp');
const OUTPUT_DIR = path.join(rootDir, 'output');
const SAMPLES_DIR = path.join(rootDir, 'samples');
const PUBLIC_DIR = path.join(rootDir, 'public');

// Ensure directories exist
[TEMP_DIR, OUTPUT_DIR, SAMPLES_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = express();
const PORT = process.env.PORT || 3030;

// CORS and Private Network Access for GitHub Pages -> localhost communication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, X-Requested-With');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Memory metadata cache for active sessions
const sessionAudio = new Map();

// Multer storage for local file uploads
const upload = multer({
  dest: TEMP_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(mp3|wav|m4a|aac|flac|ogg|wma|aiff|opus)$/i;
    if (file.originalname.match(allowedExts) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Kérjük tölts fel egy érvényes audio fájlt (MP3, WAV, M4A, FLAC, OGG, AAC)!'));
    }
  },
});

/**
 * Execute child process safely with promise
 */
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with code ${code}: ${stderr || stdout}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

/**
 * Extract audio metadata using ffprobe
 */
async function probeAudio(filePath) {
  try {
    const { stdout } = await runProcess('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    const info = JSON.parse(stdout);
    const audioStream = info.streams?.find((s) => s.codec_type === 'audio') || {};
    const duration = parseFloat(info.format?.duration || audioStream.duration || 0);

    return {
      duration: duration || 0,
      bitrate: parseInt(info.format?.bit_rate || 0, 10),
      sampleRate: parseInt(audioStream.sample_rate || 44100, 10),
      channels: audioStream.channels || 2,
      format: info.format?.format_name || 'audio',
      title: info.format?.tags?.title || info.format?.tags?.TITLE || path.basename(filePath, path.extname(filePath)),
      artist: info.format?.tags?.artist || info.format?.tags?.ARTIST || 'Ismeretlen előadó',
    };
  } catch (err) {
    console.error('Probe error:', err);
    return {
      duration: 0,
      title: path.basename(filePath),
      artist: 'Ismeretlen',
      format: 'unknown',
    };
  }
}

/**
 * Resolve Spotify track metadata
 */
async function resolveSpotify(url) {
  let title = '';
  let artist = '';
  let thumbnail = '';

  try {
    // Try Spotify oEmbed first
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData.title) title = oembedData.title;
      if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
    }
  } catch (err) {
    console.warn('Spotify oEmbed failed, falling back to scraping:', err.message);
  }

  try {
    // Scrape HTML for meta tags
    const htmlRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitleMatch && !title) title = ogTitleMatch[1];

      const musicianMatch = html.match(/<meta property="music:musician_description" content="([^"]+)"/i);
      if (musicianMatch) {
        artist = musicianMatch[1];
      } else {
        const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
        if (ogDescMatch) {
          const parts = ogDescMatch[1].split(' · ');
          if (parts.length > 0 && parts[0]) artist = parts[0];
        }
      }

      const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (imgMatch && !thumbnail) thumbnail = imgMatch[1];
    }
  } catch (err) {
    console.warn('Spotify HTML scrape failed:', err.message);
  }

  return { title: title || 'Spotify Zene', artist: artist || 'Előadó', thumbnail };
}

/**
 * Resolve Apple Music track metadata
 */
async function resolveAppleMusic(url) {
  let title = '';
  let artist = '';
  let thumbnail = '';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (res.ok) {
      const html = await res.text();

      const appleTitleMatch = html.match(/<meta name="apple:title" content="([^"]+)"/i);
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (appleTitleMatch) {
        title = appleTitleMatch[1];
      } else if (ogTitleMatch) {
        title = ogTitleMatch[1].replace(/ by [^|]+ on Apple Music.*$/i, '');
      }

      const artistMatch = html.match(/<meta property="music:musician" content="https:\/\/music\.apple\.com\/[^/]+\/artist\/([^/]+)\//i)
        || html.match(/by ([^|]+) on Apple\s*Music/i);
      if (artistMatch) {
        artist = decodeURIComponent(artistMatch[1].replace(/-/g, ' '));
      }

      const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (imgMatch) thumbnail = imgMatch[1];
    }
  } catch (err) {
    console.warn('Apple music scrape error:', err.message);
  }

  return { title: title || 'Apple Music Dal', artist: artist || 'Előadó', thumbnail };
}

/**
 * Download audio using yt-dlp
 */
async function downloadWithYtDlp(targetUrlOrSearch, outputId) {
  const targetPath = path.join(TEMP_DIR, `${outputId}.mp3`);
  
  const args = [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', path.join(TEMP_DIR, `${outputId}.%(ext)s`),
    '--no-playlist',
    '--max-filesize', '60M',
    targetUrlOrSearch
  ];

  await runProcess('yt-dlp', args);

  if (!fs.existsSync(targetPath)) {
    // Check if another extension was produced
    const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(outputId));
    if (files.length > 0) {
      const actualFile = path.join(TEMP_DIR, files[0]);
      if (actualFile !== targetPath) {
        fs.renameSync(actualFile, targetPath);
      }
    } else {
      throw new Error('A hang letöltése sikertelen volt.');
    }
  }

  return targetPath;
}

// ----------------- API ROUTES -----------------

// Status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    ffmpeg: true,
    ytdlp: true
  });
});

// Samples list
app.get('/api/samples', (req, res) => {
  const samples = [
    {
      id: 'sample-electronic',
      title: 'Neon Pulse (Elektronikus / Upbeat)',
      artist: 'NoCopyrightSounds',
      filename: 'sample-electronic.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
      genre: 'Elektronikus / Dance'
    },
    {
      id: 'sample-inspirational',
      title: 'Inspirational Horizon',
      artist: 'Royalty Free Acoustic',
      filename: 'sample-inspirational.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      genre: 'Akusztikus / Pop'
    },
    {
      id: 'sample-synth-ambient',
      title: 'Retro Synthwave Dream',
      artist: 'Analog Master Synthesizer',
      filename: 'sample-synth-ambient.mp3',
      thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop',
      genre: 'Retro Synthwave'
    }
  ];

  res.json({ samples });
});

// Load a sample directly into session
app.post('/api/load-sample', async (req, res) => {
  try {
    const { sampleId } = req.body;
    const sampleFilename = `${sampleId}.mp3`;
    const sampleFilePath = path.join(SAMPLES_DIR, sampleFilename);

    if (!fs.existsSync(sampleFilePath)) {
      return res.status(404).json({ error: 'A kért minta zene nem található.' });
    }

    const sessionId = uuidv4();
    const destPath = path.join(TEMP_DIR, `${sessionId}.mp3`);
    fs.copyFileSync(sampleFilePath, destPath);

    const probe = await probeAudio(destPath);
    let title = 'Minta Zene';
    let artist = 'Royalty Free';

    if (sampleId.includes('electronic')) {
      title = 'Neon Pulse';
      artist = 'NoCopyrightSounds';
    } else if (sampleId.includes('inspirational')) {
      title = 'Inspirational Horizon';
      artist = 'Royalty Free Studio';
    } else if (sampleId.includes('synth')) {
      title = 'Retro Synthwave Dream';
      artist = 'Analog Master';
    }

    const data = {
      id: sessionId,
      title,
      artist,
      duration: probe.duration || 30,
      format: probe.format,
      audioUrl: `/api/audio/${sessionId}`,
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      source: 'Minta zenetár'
    };

    sessionAudio.set(sessionId, {
      ...data,
      filePath: destPath
    });

    res.json(data);
  } catch (err) {
    console.error('Load sample error:', err);
    res.status(500).json({ error: 'Hiba történt a minta betöltésekor: ' + err.message });
  }
});

// Upload local audio file
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nem érkezett audio fájl.' });
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase() || '.mp3';
    const sessionId = uuidv4();
    const destPath = path.join(TEMP_DIR, `${sessionId}${ext}`);

    fs.renameSync(req.file.path, destPath);

    const probe = await probeAudio(destPath);

    const rawBaseName = path.basename(originalName, ext);
    const data = {
      id: sessionId,
      title: (probe.title && probe.title !== path.basename(destPath, ext) && probe.title !== sessionId) ? probe.title : rawBaseName,
      artist: probe.artist || 'Helyi zene',
      duration: probe.duration || 0,
      format: ext.replace('.', '').toUpperCase(),
      audioUrl: `/api/audio/${sessionId}`,
      thumbnail: null,
      source: 'Helyi fájl'
    };

    sessionAudio.set(sessionId, {
      ...data,
      filePath: destPath
    });

    res.json(data);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Feltöltési hiba: ' + err.message });
  }
});

// Resolve link from Spotify, YouTube, YouTube Music, Apple Music
app.post('/api/resolve', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Kérjük adj meg egy érvényes zenei linket!' });
    }

    url = url.trim();
    const sessionId = uuidv4();
    let title = '';
    let artist = '';
    let thumbnail = '';
    let source = 'Web';
    let searchQueryOrUrl = url;

    // Detect platform
    const isSpotify = /spotify\.com/i.test(url) || /^spotify:/i.test(url);
    const isApple = /music\.apple\.com/i.test(url);
    const isYouTube = /youtube\.com|youtu\.be/i.test(url);

    if (isSpotify) {
      source = 'Spotify';
      const meta = await resolveSpotify(url);
      title = meta.title;
      artist = meta.artist;
      thumbnail = meta.thumbnail;
      searchQueryOrUrl = `ytsearch1:${artist} - ${title} official audio`;
    } else if (isApple) {
      source = 'Apple Music';
      const meta = await resolveAppleMusic(url);
      title = meta.title;
      artist = meta.artist;
      thumbnail = meta.thumbnail;
      searchQueryOrUrl = `ytsearch1:${artist} - ${title} audio`;
    } else if (isYouTube) {
      source = /music\.youtube\.com/i.test(url) ? 'YouTube Music' : 'YouTube';
      // Fast metadata extraction with yt-dlp
      try {
        const { stdout } = await runProcess('yt-dlp', ['--dump-single-json', '--skip-download', url]);
        const ytdlInfo = JSON.parse(stdout);
        title = ytdlInfo.title || 'YouTube Audio';
        artist = ytdlInfo.uploader || ytdlInfo.channel || 'Előadó';
        thumbnail = ytdlInfo.thumbnail || '';
      } catch (err) {
        console.warn('yt-dlp info failed, continuing with direct download:', err.message);
      }
      searchQueryOrUrl = url;
    } else {
      // Direct search or other supported platform
      source = 'Online Keresés';
      searchQueryOrUrl = `ytsearch1:${url}`;
    }

    // Download audio via yt-dlp
    const downloadedPath = await downloadWithYtDlp(searchQueryOrUrl, sessionId);
    const probe = await probeAudio(downloadedPath);

    if (!title) title = probe.title || 'Zeneszám';
    if (!artist) artist = probe.artist || 'Előadó';

    const data = {
      id: sessionId,
      title,
      artist,
      duration: probe.duration || 0,
      format: 'MP3',
      audioUrl: `/api/audio/${sessionId}`,
      thumbnail: thumbnail || null,
      source
    };

    sessionAudio.set(sessionId, {
      ...data,
      filePath: downloadedPath
    });

    res.json(data);
  } catch (err) {
    console.error('Resolve error:', err);
    res.status(500).json({
      error: 'Nem sikerült letölteni a dalt. Kérjük ellenőrizd a linket vagy próbáld a beépített zene keresőt! (' + (err.message || '') + ')'
    });
  }
});

// Search YouTube/YouTube Music for instant music selection
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Kérjük adj meg egy keresési kifejezést!' });
    }

    const { stdout } = await runProcess('yt-dlp', [
      `ytsearch5:${q.trim()}`,
      '--dump-single-json',
      '--flat-playlist'
    ]);

    const data = JSON.parse(stdout);
    const results = (data.entries || []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      artist: entry.channel || entry.uploader || 'Ismeretlen',
      duration: entry.duration || 0,
      formattedDuration: entry.duration ? `${Math.floor(entry.duration / 60)}:${String(Math.floor(entry.duration % 60)).padStart(2, '0')}` : '0:00',
      url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
      thumbnail: entry.thumbnails && entry.thumbnails.length > 0
        ? entry.thumbnails[entry.thumbnails.length - 1].url
        : `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`
    }));

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Keresési hiba: ' + err.message });
  }
});

// Stream audio for playback and waveform generation
app.get('/api/audio/:id', (req, res) => {
  const { id } = req.params;
  const session = sessionAudio.get(id);

  let targetPath = session?.filePath;

  if (!targetPath || !fs.existsSync(targetPath)) {
    // Look up file in temp directory
    const candidates = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(id));
    if (candidates.length > 0) {
      targetPath = path.join(TEMP_DIR, candidates[0]);
    }
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).send('A kért audio fájl nem található.');
  }

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(targetPath).toLowerCase();
  let contentType = 'audio/mpeg';
  if (ext === '.m4a' || ext === '.m4r') contentType = 'audio/mp4';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.ogg') contentType = 'audio/ogg';
  else if (ext === '.flac') contentType = 'audio/flac';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(targetPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(targetPath).pipe(res);
  }
});

// Convert trimmed selection to iPhone .m4r or .mp3
app.post('/api/convert', async (req, res) => {
  try {
    const {
      id,
      start = 0,
      end = 30,
      fadeIn = 1.0,
      fadeOut = 2.0,
      volume = 1.0,
      normalize = false,
      format = 'm4r',
      title = 'Csengőhang'
    } = req.body;

    const session = sessionAudio.get(id);
    let inputPath = session?.filePath;

    if (!inputPath || !fs.existsSync(inputPath)) {
      const candidates = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(id));
      if (candidates.length > 0) {
        inputPath = path.join(TEMP_DIR, candidates[0]);
      }
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'A forrásfájl nem található a szerveren.' });
    }

    const startTime = Math.max(0, parseFloat(start));
    const endTime = Math.max(startTime + 1, parseFloat(end));
    const duration = endTime - startTime;

    // Build audio filter chain
    const filterParts = [];

    // Fade in
    const fIn = Math.min(Math.max(0, parseFloat(fadeIn) || 0), duration / 2);
    if (fIn > 0) {
      filterParts.push(`afade=t=in:ss=0:d=${fIn.toFixed(2)}`);
    }

    // Fade out
    const fOut = Math.min(Math.max(0, parseFloat(fadeOut) || 0), duration / 2);
    if (fOut > 0) {
      const fadeOutStart = Math.max(0, duration - fOut);
      filterParts.push(`afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fOut.toFixed(2)}`);
    }

    // Volume adjustment or normalization
    if (normalize) {
      filterParts.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    } else {
      const vol = parseFloat(volume) || 1.0;
      if (vol !== 1.0) {
        filterParts.push(`volume=${vol.toFixed(2)}`);
      }
    }

    const outputId = uuidv4();
    const cleanExt = (format === 'mp3') ? 'mp3' : 'm4r';
    const outputPath = path.join(OUTPUT_DIR, `${outputId}.${cleanExt}`);

    const args = [
      '-y',
      '-ss', startTime.toFixed(3),
      '-to', endTime.toFixed(3),
      '-i', inputPath
    ];

    if (filterParts.length > 0) {
      args.push('-af', filterParts.join(','));
    }

    if (cleanExt === 'm4r') {
      // iPhone Ringtone: AAC stereo at 44.1kHz, 256kbps, ipod/mp4 container
      args.push(
        '-c:a', 'aac',
        '-b:a', '256k',
        '-ar', '44100',
        '-ac', '2',
        '-f', 'ipod',
        outputPath
      );
    } else {
      // Standard MP3
      args.push(
        '-c:a', 'libmp3lame',
        '-q:a', '0',
        '-ar', '44100',
        '-ac', '2',
        outputPath
      );
    }

    await runProcess('ffmpeg', args);

    if (!fs.existsSync(outputPath)) {
      throw new Error('A konvertálás nem hozta létre a célfájlt.');
    }

    const stat = fs.statSync(outputPath);
    const sanitizedTitle = (title || 'iPhone_Csengohang')
      .replace(/[\\/*?:"<>|]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'iPhone_Csengohang';

    res.json({
      success: true,
      downloadUrl: `/api/download/${outputId}.${cleanExt}?name=${encodeURIComponent(sanitizedTitle)}`,
      filename: `${sanitizedTitle}.${cleanExt}`,
      size: stat.size,
      duration: duration.toFixed(1),
      format: cleanExt.toUpperCase()
    });
  } catch (err) {
    console.error('Convert error:', err);
    res.status(500).json({ error: 'Konvertálási hiba: ' + err.message });
  }
});

// Download finished ringtone
app.get('/api/download/:file', (req, res) => {
  const { file } = req.params;
  const filePath = path.join(OUTPUT_DIR, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('A kért csengőhang nem található vagy lejárt.');
  }

  const customName = req.query.name;
  const ext = path.extname(file);
  const downloadName = customName ? `${customName}${ext}` : file;

  let contentType = 'audio/x-m4r';
  if (ext === '.mp3') contentType = 'audio/mpeg';

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
});

// Periodic cleanup of temp files older than 2 hours
setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  [TEMP_DIR, OUTPUT_DIR].forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach((f) => {
        const fullPath = path.join(dir, f);
        fs.stat(fullPath, (sErr, stat) => {
          if (!sErr && stat.mtimeMs < twoHoursAgo) {
            fs.unlink(fullPath, () => {});
          }
        });
      });
    });
  });
}, 30 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🎵 iPhone Ringtone Studio szerver fut a http://localhost:${PORT} címen`);
});
