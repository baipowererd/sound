import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { UploadCloud, Music, Activity, Layers, PlayCircle, Download, Radio, ListMusic, Sparkles, Zap, Waves, Image as ImageIcon, Camera } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

/* ─── Radar Chart (pure canvas, no libraries) ─── */
function RadarChart({ data, labels, size = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 40;
    const n = data.length;
    const angleStep = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // Draw grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (radius * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axis lines + labels
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.stroke();

      // Label
      const lx = cx + (radius + 25) * Math.cos(angle);
      const ly = cy + (radius + 25) * Math.sin(angle);
      ctx.fillText(labels[i], lx, ly + 4);
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = idx * angleStep - Math.PI / 2;
      const val = Math.min(Math.max(data[idx], 0), 1);
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const val = Math.min(Math.max(data[i], 0), 1);
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [data, labels, size]);

  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />;
}

/* ─── Meter Bar component ─── */
function MeterBar({ label, value, max, unit, color, description }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="meter-bar">
      <div className="meter-header">
        <span className="meter-label">{label}</span>
        <span className="meter-value" style={{ color }}>{value} {unit}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {description && <div className="meter-desc">{description}</div>}
    </div>
  );
}

/* ─── BPM Gauge (circular) ─── */
function BpmGauge({ bpm }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const s = 160;
    canvas.width = s * dpr;
    canvas.height = s * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = s + 'px';
    canvas.style.height = s + 'px';

    const cx = s / 2, cy = s / 2, r = 60;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const range = endAngle - startAngle;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const val = Math.min(bpm / 200, 1);
    const valAngle = startAngle + range * val;
    const gradient = ctx.createLinearGradient(0, 0, s, s);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#c084fc');
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, valAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // BPM text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bpm, cx, cy + 5);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('BPM', cx, cy + 22);
  }, [bpm]);

  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />;
}


function App() {
  const [mode, setMode] = useState('audio'); // 'audio' or 'image'
  const [files, setFiles] = useState([]); // up to 3 files
  const [mediaUrls, setMediaUrls] = useState([]); // parallel array of object URLs for playback/preview
  const [analysisResults, setAnalysisResults] = useState([]); // array of result objects
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setFiles([]);
    setMediaUrls([]);
    setAnalysisResults([]);
    setError('');
  };

  // Automatically generate and clean up object URLs when `files` change
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setMediaUrls(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList).filter(f => {
      if (mode === 'audio') return f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i);
      if (mode === 'image') return f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp)$/i);
      return false;
    });

    if (newFiles.length === 0) {
      setError(`Please upload valid ${mode} files`);
      return;
    }

    setFiles(prev => {
      let updated = [...prev];
      for (const file of newFiles) {
        if (updated.length >= 3) break;
        if (!updated.find(f => f.name === file.name)) {
          updated.push(file);
        }
      }
      return updated;
    });
    setError('');
  }, [mode]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;
    setIsLoading(true);
    setError('');
    try {
      const promises = files.map((f) => {
        const formData = new FormData();
        formData.append('file', f);
        return axios.post(`${API_BASE_URL}/${mode === 'audio' ? 'analyze' : 'analyze-image'}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then(res => res.data);
      });
      const resultsArray = await Promise.all(promises);
      const successful = resultsArray.filter(r => r.success);
      setAnalysisResults(successful);
    } catch (err) {
      setError('One or more uploads failed');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '40px' }}>
        <h1>SonicAnalytics</h1>
        <p>Deep file analysis — every number extracted deterministically from the raw data.</p>

        <div className="mode-tabs" style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button className={`tab-btn ${mode === 'audio' ? 'active' : ''}`} onClick={() => handleModeChange('audio')}>
            <Music size={18} /> Audio Analysis
          </button>
          <button className={`tab-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => handleModeChange('image')}>
            <ImageIcon size={18} /> Image Analysis
          </button>
        </div>
      </header>

      <main>
        {/* Upload Section */}
        {analysisResults.length === 0 && !isLoading && (
          <>
            <div
              className={`upload-section ${isDragging ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" className="file-input" ref={fileInputRef} onChange={handleFileChange} accept={`${mode}/*`} multiple />
              <UploadCloud className="upload-icon" />
              <h2>{files.length > 0 ? `${files.length} file(s) ready` : `Drag & Drop ${mode} files here`}</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {files.length > 0 ? `Click "Analyze ${mode === 'audio' ? 'Audio' : 'Image'}" below.` : `or click to browse - up to 3 files`}
              </p>

              {files.length === 0 && mode === 'audio' && (
                <div style={{ marginTop: '20px', fontSize: '0.9rem', position: 'relative', zIndex: 10 }}
                  onClick={(e) => e.stopPropagation()}>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 10px 0' }}>Don't have a file?</p>
                  <a href="/sample_audio.wav" download="sample_audio.wav"
                    className="sample-download-link">
                    <Download size={16} /> Download Sample Audio
                  </a>
                </div>
              )}

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-info">
                      {mode === 'audio' ? <Music size={16} style={{ display: 'inline', marginRight: '5px' }} /> : <ImageIcon size={16} style={{ display: 'inline', marginRight: '5px' }} />}
                      {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="error-message">{error}</div>}
            </div>

            {files.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button className="upload-btn" onClick={handleUploadAll}>
                  <Activity size={20} /> Analyze {mode === 'audio' ? 'Audio' : 'Image'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <h3>Extracting signal features...</h3>
            <p style={{ color: 'var(--text-muted)' }}>{mode === 'audio' ? 'Computing waveform, FFT, MFCC, chroma, onsets…' : 'Computing histograms, edge maps, color space, 2D FFT…'}</p>
          </div>
        )}

        {/* ═══════ RESULTS ═══════ */}
        {analysisResults.length > 0 && (
          <div className="results-section">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <button className="upload-btn"
                onClick={() => { setAnalysisResults([]); setFiles([]); setMediaUrls([]); }}
                style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                Analyze New Set
              </button>
            </div>

            {/* ── Comparison Grid ── */}
            <div className={`comparison-grid ${analysisResults.length === 1 ? 'single-item' : 'multi-item'}`}>
              {analysisResults.map((res, idx) => (
                <div key={idx} className="result-column">
                  {/* Media Preview for this file */}
                  {mode === 'audio' ? (
                    <audio controls src={mediaUrls[idx]} className="audio-player" style={{ marginBottom: '20px' }}>Your browser does not support audio.</audio>
                  ) : (
                    <img src={mediaUrls[idx]} alt="Preview" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px', objectFit: 'contain', maxHeight: '300px', background: 'rgba(0,0,0,0.3)' }} />
                  )}

                  {/* Top Stats Row for this file */}
                  <div className="stats-grid">
                    {mode === 'audio' ? (
                      <>
                        <div className="stat-card">
                          <BpmGauge bpm={res.features.tempo_bpm} />
                          <div className="stat-label" style={{ marginTop: '8px' }}>Rhythm (Tempo)</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.features.estimated_key} {res.features.estimated_mode}</div>
                          <div className="stat-label">Estimated Key</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.duration}s</div>
                          <div className="stat-label">Duration</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.sample_rate} Hz</div>
                          <div className="stat-label">Sample Rate</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="stat-card">
                          <div className="stat-value">{res.resolution}</div>
                          <div className="stat-label">Resolution</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.features.entropy}</div>
                          <div className="stat-label">Information Entropy</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.features.brightness}</div>
                          <div className="stat-label">Brightness Mean</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{res.features.dynamic_range}</div>
                          <div className="stat-label">Dynamic Range</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Radar & Meters (reuse existing components) */}
                  <div className="radar-meters-row">
                    <div className="graph-card radar-card">
                      <h3><Sparkles size={24} color="#facc15" /> Feature Radar</h3>
                      {mode === 'audio' ? (
                        <RadarChart
                          data={[
                            res.features.tempo_bpm / 200,
                            res.features.spectral_centroid_hz / 8000,
                            res.features.bass_energy_ratio,
                            res.features.harmonic_ratio,
                            res.features.percussive_ratio * 2,
                            Math.min(res.features.rms_energy * 10, 1),
                            res.features.onset_strength / 20,
                            res.features.beat_regularity,
                          ]}
                          labels={['Tempo', 'Brightness', 'Bass', 'Harmonic', 'Percussive', 'Energy', 'Attack', 'Rhythm Reg.']}
                          size={320}
                        />
                      ) : (
                        <RadarChart
                          data={[
                            res.features.brightness / 255,
                            res.features.contrast / 100,
                            Math.min(res.features.dynamic_range / 255, 1),
                            Math.min(res.features.entropy / 8, 1),
                            Math.min(res.features.colorfulness / 100, 1),
                            Math.min(res.features.edge_density * 5, 1)
                          ]}
                          labels={['Brightness', 'Contrast', 'Dyn. Range', 'Entropy', 'Colorfulness', 'Edge Density']}
                          size={320}
                        />
                      )}
                    </div>
                    <div className="graph-card meters-card">
                      <h3><Zap size={24} color="#f59e0b" /> Signal Meters</h3>
                      {mode === 'audio' ? (
                        <>
                          <MeterBar label="Brightness" value={res.features.spectral_centroid_hz} max={8000} unit="Hz" color="#f59e0b" description="Spectral centroid — higher = sharper, brighter sound" />
                          <MeterBar label="Bass Energy" value={(res.features.bass_energy_ratio * 100).toFixed(1)} max={100} unit="%" color="#8b5cf6" description="Proportion of energy below 300 Hz" />
                          <MeterBar label="Harmonic" value={(res.features.harmonic_ratio * 100).toFixed(1)} max={100} unit="%" color="#a855f7" description="Tonal / melodic content ratio" />
                          <MeterBar label="Percussive" value={(res.features.percussive_ratio * 100).toFixed(1)} max={100} unit="%" color="#ef4444" description="Drums / transient content ratio" />
                          <MeterBar label="Dynamic Range" value={res.features.dynamic_range_db} max={60} unit="dB" color="#10b981" description="Loudness variation — high = classical, low = compressed" />
                          <MeterBar label="Beat Regularity" value={(res.features.beat_regularity * 100).toFixed(1)} max={100} unit="%" color="#3b82f6" description="How consistent the rhythm is (1 = perfect metronome)" />
                        </>
                      ) : (
                        <>
                          <MeterBar label="Information Entropy" value={res.features.entropy} max={8} unit="" color="#c084fc" description="A measure of information complexity predictability. Smooth=low, Complex=high." />
                          <MeterBar label="Colorfulness" value={res.features.colorfulness} max={100} unit="" color="#ef4444" description="How vivid the colors are compared to grayscale (Hasler & Süsstrunk metric)" />
                          <MeterBar label="Edge Density" value={(res.features.edge_density * 100).toFixed(1)} max={100} unit="%" color="#3b82f6" description="Proportion of structural edges in the image" />
                          <MeterBar label="Contrast" value={res.features.contrast} max={120} unit="" color="#f59e0b" description="Standard deviation of pixel intensities" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Numeric Feature Vector */}
                  <div className="graph-card" style={{ marginBottom: '30px' }}>
                    <h3><Waves size={24} color="#60a5fa" /> Numeric Feature Vector</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Every number below is deterministically computed from the raw data.</p>

                    {mode === 'audio' ? (
                      <>
                        <div className="feature-grid">
                          <div className="feature-section">
                            <h4>Rhythm (Time Domain)</h4>
                            <div className="feature-row"><span>Tempo</span><span>{res.features.tempo_bpm} BPM</span></div>
                            <div className="feature-row"><span>Beat Regularity</span><span>{res.features.beat_regularity}</span></div>
                            <div className="feature-row"><span>Onset Strength</span><span>{res.features.onset_strength}</span></div>
                          </div>
                          <div className="feature-section">
                            <h4>Timbre (Frequency Domain)</h4>
                            <div className="feature-row"><span>Spectral Centroid</span><span>{res.features.spectral_centroid_hz} Hz</span></div>
                            <div className="feature-row"><span>Spectral Bandwidth</span><span>{res.features.spectral_bandwidth_hz} Hz</span></div>
                            <div className="feature-row"><span>Spectral Rolloff</span><span>{res.features.spectral_rolloff_hz} Hz</span></div>
                            <div className="feature-row"><span>Zero Crossing Rate</span><span>{res.features.zero_crossing_rate}</span></div>
                          </div>
                          <div className="feature-section">
                            <h4>Energy / Dynamics</h4>
                            <div className="feature-row"><span>RMS Energy</span><span>{res.features.rms_energy}</span></div>
                            <div className="feature-row"><span>Dynamic Range</span><span>{res.features.dynamic_range_db} dB</span></div>
                            <div className="feature-row"><span>Bass Energy</span><span>{(res.features.bass_energy_ratio * 100).toFixed(1)}%</span></div>
                          </div>
                          <div className="feature-section">
                            <h4>Harmony / Tonality</h4>
                            <div className="feature-row"><span>Key</span><span>{res.features.estimated_key} {res.features.estimated_mode}</span></div>
                            <div className="feature-row"><span>Harmonic Ratio</span><span>{(res.features.harmonic_ratio * 100).toFixed(1)}%</span></div>
                            <div className="feature-row"><span>Percussive Ratio</span><span>{(res.features.percussive_ratio * 100).toFixed(1)}%</span></div>
                          </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ color: '#c084fc', margin: '0 0 10px 0' }}>MFCC Coefficients (Timbre Fingerprint)</h4>
                          <div className="mfcc-grid">
                            {res.features.mfcc_means.map((val, i) => (
                              <div key={i} className="mfcc-chip">
                                <span className="mfcc-idx">M{i}</span>
                                <span className="mfcc-val">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Chroma Energy (Pitch Class Distribution)</h4>
                          <div className="chroma-grid">
                            {Object.entries(res.features.chroma_energy).map(([note, val]) => (
                              <div key={note} className="chroma-bar-wrap">
                                <div className="chroma-bar-bg">
                                  <div className="chroma-bar-fill" style={{ height: `${val * 100}%` }} />
                                </div>
                                <span className="chroma-note">{note}</span>
                                <span className="chroma-val">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="feature-grid">
                          <div className="feature-section">
                            <h4>Luminosity & Contrast</h4>
                            <div className="feature-row"><span>Brightness (Mean)</span><span>{res.features.brightness}</span></div>
                            <div className="feature-row"><span>Contrast (Std Dev)</span><span>{res.features.contrast}</span></div>
                            <div className="feature-row"><span>Dynamic Range</span><span>{res.features.dynamic_range}</span></div>
                            <div className="feature-row"><span>Entropy</span><span>{res.features.entropy} bit/px</span></div>
                          </div>
                          <div className="feature-section">
                            <h4>Color Channels (RGB Means)</h4>
                            <div className="feature-row"><span>Red Channel</span><span>{res.features.channel_means.red}</span></div>
                            <div className="feature-row"><span>Green Channel</span><span>{res.features.channel_means.green}</span></div>
                            <div className="feature-row"><span>Blue Channel</span><span>{res.features.channel_means.blue}</span></div>
                            <div className="feature-row"><span>Colorfulness</span><span>{res.features.colorfulness}</span></div>
                          </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                          <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Dominant Colors (K-Means Output)</h4>
                          <div style={{ display: 'flex', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
                            {res.features.dominant_colors.map((c, i) => (
                              <div key={i} style={{ flex: c.percent, backgroundColor: c.hex, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{Math.round(c.percent * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Graphs for this file */}
                  {/* Graphs for this file */}
                  <div className="graphs-container">
                    {(mode === 'audio' ? [
                      { key: 'waveform', title: 'Amplitude Waveform', icon: <Activity size={24} color="#3b82f6" />, desc: 'Raw amplitude of the audio signal x(t) over time.' },
                      { key: 'onset', title: 'Onset Strength + Beats', icon: <Zap size={24} color="#ef4444" />, desc: 'Energy peaks (attacks) over time. Yellow lines = detected beats.' },
                      { key: 'hpss', title: 'Harmonic vs Percussive Separation', icon: <Layers size={24} color="#a855f7" />, desc: 'The signal decomposed into tonal (harmonic) and transient (percussive) components.' },
                      { key: 'spectrogram', title: 'Frequency Spectrogram', icon: <Layers size={24} color="#f97316" />, desc: 'Intensity of all frequencies over time via Short-Time Fourier Transform.' },
                      { key: 'mel', title: 'Mel Spectrogram', icon: <PlayCircle size={24} color="#10b981" />, desc: 'Frequency mapped to the Mel scale — how humans perceive pitch.' },
                      { key: 'chroma', title: 'Chromagram (Harmony)', icon: <Radio size={24} color="#f59e0b" />, desc: 'The 12 pitch classes over time — reveals chords and key.' },
                      { key: 'rms', title: 'Dynamics (RMS Energy)', icon: <ListMusic size={24} color="#10b981" />, desc: 'Root-mean-square energy — tracks loudness and dynamic variation.' },
                      { key: 'centroid', title: 'Spectral Centroid (Brightness)', icon: <Sparkles size={24} color="#f59e0b" />, desc: 'Center of mass of the spectrum over time — tracks timbral brightness.' },
                      { key: 'mfcc', title: 'MFCCs (Timbre Fingerprint)', icon: <Waves size={24} color="#c084fc" />, desc: '13 Mel-Frequency Cepstral Coefficients — the compact DNA of timbre.' }
                    ] : [
                      { key: 'rgb_hist', title: 'RGB Histogram distribution', icon: <Layers size={24} color="#f97316" />, desc: 'Pixel intensity counts for the Red, Green, and Blue channels.' },
                      { key: 'gray_hist', title: 'Luminance Distribution', icon: <Activity size={24} color="#a855f7" />, desc: 'Histogram of image tonal values from dark to light.' },
                      { key: 'edges', title: 'Edge & Texture Detection', icon: <Zap size={24} color="#ef4444" />, desc: 'Canny edge detection highlighting structural complexity.' },
                      { key: 'fft', title: '2D Frequency Domain (FFT Magnitude)', icon: <Waves size={24} color="#10b981" />, desc: 'Spatial array decomposed into sine waves. Bright dots=repeating textures.' }
                    ]).map(({ key, title, icon, desc }) => (
                      <div className="graph-card" key={key}>
                        <h3>{icon} {title}</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>{desc}</p>
                        <div className="graph-img-container">
                          <img src={`${API_BASE_URL}${res.graphs[key]}`} alt={title} className="graph-img" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Raw JSON Data (All Files) ── */}
        <div className="graph-card" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>📦 {analysisResults.length > 1 ? 'Raw JSON Data (All Files)' : 'Raw JSON Data'}</h3>
            <button
              className="upload-btn"
              style={{ marginTop: 0, padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => {
                const payload = analysisResults.map(r => ({
                  filename: r.filename,
                  ...(mode === 'audio' ? {
                    sample_rate: r.sample_rate,
                    duration: r.duration,
                    total_samples: r.total_samples,
                  } : {
                    resolution: r.resolution,
                    width: r.width,
                    height: r.height,
                  }),
                  features: r.features
                }));
                const jsonStr = JSON.stringify(
                  analysisResults.length === 1 ? payload[0] : payload,
                  null,
                  2
                );
                navigator.clipboard.writeText(jsonStr);
                alert('All JSON copied to clipboard!');
              }}
            >
              Copy {analysisResults.length > 1 ? 'All ' : ''}JSON
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: '10px 0 15px' }}>
            {analysisResults.length > 1 ? 'Full numeric feature vectors for every uploaded file. Copy and use anywhere.' : 'The complete numeric feature vector — deterministically extracted from the waveform. Copy and use anywhere.'}
          </p>
          <pre style={{
            background: '#0f172a',
            color: '#e2e8f0',
            padding: '20px',
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: '500px',
            fontSize: '0.8rem',
            lineHeight: '1.6',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {(() => {
              const payload = analysisResults.map(r => ({
                filename: r.filename,
                ...(mode === 'audio' ? {
                  sample_rate: r.sample_rate,
                  duration: r.duration,
                  total_samples: r.total_samples,
                } : {
                  resolution: r.resolution,
                  width: r.width,
                  height: r.height,
                }),
                features: r.features
              }));
              return JSON.stringify(analysisResults.length === 1 ? payload[0] : payload, null, 2);
            })()}
          </pre>
        </div>
      </main>
    </div>
  );
}

export default App;
