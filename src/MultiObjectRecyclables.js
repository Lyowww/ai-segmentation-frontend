import { useState, useRef } from 'react';
import UsageDetails from './components/UsageDetails';
import AnalysisMetrics from './components/AnalysisMetrics';
import RequestDuration from './components/RequestDuration';
import { analyzeRecyclables } from './api/client';
import './App.css';

function MultiObjectRecyclables() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [requestDurationMs, setRequestDurationMs] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [apiProvider, setApiProvider] = useState('openai');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            setSummary(null);
            setError(null);
            setUsageSummary(null);
        }
    };
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };


  const handleAnalyze = async () => {
    if (!image) {
      alert('Please upload the image before analyzing.');
      return;
    }

    setIsProcessing(true);
    setSummary(null);
    setError(null);
    setElapsedSeconds(0);
    setRequestDurationMs(null);
    setUsageSummary(null);

    const secondsInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    const startTime = performance.now();

    try {
      const { data: apiResult, usage } = await analyzeRecyclables({
        image,
        provider: apiProvider
      });

      setRequestDurationMs(Math.round(performance.now() - startTime));
      setSummary(apiResult || null);
      setUsageSummary(usage);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Something went wrong, please try again later.');
    } finally {
      clearInterval(secondsInterval);
      setIsProcessing(false);
    }
  };
  const handleReset = () => {
    setImage(null);

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setSummary(null);
    setError(null);
    setUsageSummary(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Recypic ♻️ - Multi Object Recyclables</h1>
        <p className="subtitle">Upload a single image of a transparent bag to detect recyclables</p>
      </header>

      <div className="api-selector-section api-selector-compact api-selector-inline">
        <label htmlFor="api-provider-recyclables" className="api-selector-label">
          <strong>AI:</strong>
        </label>
        <select
          id="api-provider-recyclables"
          value={apiProvider}
          onChange={(e) => setApiProvider(e.target.value)}
          className="api-selector"
          disabled={isProcessing}
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Gem 3</option>
        </select>
      </div>

      <div className="upload-section">
        {!imageUrl ? (
          <div className="upload-options">
            <div className="upload-option upload-option-upload">
              <div className="upload-option-icon">📷</div>
              <p>Upload Photo</p>
              <button className="btn btn-primary" onClick={handleUploadClick}>
                Select File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div className="upload-option upload-option-camera">
              <div className="upload-option-icon">📸</div>
              <p>Take Picture</p>
              <button className="btn btn-secondary" onClick={handleCameraClick}>
                Open Camera
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div className="image-preview-section">
            <div className="image-container">
              <img src={imageUrl} alt="Preview" className="preview-image" />
            </div>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={isProcessing}>
                {isProcessing ? '🔄 Analyzing...' : '🤖 Analyze'}
              </button>
              <button className="btn btn-outline" onClick={handleReset} disabled={isProcessing}>
                ✨ Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Analyzing image... {elapsedSeconds}s</p>
        </div>
      )}

      {error && (
        <div className="results error">
          <p>{error}</p>
        </div>
      )}

      {!error && summary && (
        <div className="results">
          <h2>Recyclables Results</h2>

          <AnalysisMetrics
            ai_co2_kg={summary.ai_co2_kg}
            estimated_weight_kg={summary.estimated_weight_kg}
            purity={summary.purity}
          />

          {summary && (
            <>
              <div className="result-item">
                <div className="result-header">
                  <h3>Bag Summary</h3>
                </div>
                <div className="result-details">
                  <div className="result-detail-item">
                    <div className="detail-header">
                      <strong>Recyclables Present:</strong>{' '}
                      <span className="detail-value">{summary.recyclables_present ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="result-detail-item">
                    <div className="detail-header">
                      <strong>Contamination Reason:</strong>{' '}
                      {summary.contamination_items && summary.contamination_items.length > 0 ? (
                        <ol className="detail-value" style={{ margin: '0.25rem 0 0.25rem 1.25rem' }}>
                          {summary.contamination_items.map((item, idx) => (
                            <li key={`contamination-${idx}`}>{item}</li>
                          ))}
                        </ol>
                      ) : (
                        <span className="detail-value">unknown</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="result-item">
                <div className="result-header">
                  <h3>Detected Food Waste</h3>
                </div>
                <div className="result-details">
                  {summary.food_waste_items && summary.food_waste_items.length > 0 ? (
                    summary.food_waste_items.map((item, index) => (
                      <div key={`food-waste-${index}`} className="result-detail-item">
                        <div className="detail-header">
                          <strong>Item {index + 1}:</strong>{' '}
                          <span className="detail-value">{item}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="result-detail-item">
                      <div className="detail-header">
                        <span className="detail-value">No food waste detected.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <RequestDuration durationMs={requestDurationMs} label="Compressed Request" />
      <UsageDetails usage={usageSummary} />

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">♻️ Recypic</span>
          </div>
          <div className="footer-links">
            <a href="#privacy" className="footer-link">Privacy Policy</a>
            <span className="footer-separator">•</span>
            <a href="#terms" className="footer-link">Terms of Service</a>
            <span className="footer-separator">•</span>
            <a href="#about" className="footer-link">About</a>
          </div>
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} Recypic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MultiObjectRecyclables;
