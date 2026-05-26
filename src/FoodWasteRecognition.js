import { useState, useRef } from 'react';
import UsageDetails from './components/UsageDetails';
import AnalysisMetrics from './components/AnalysisMetrics';
import RequestDuration from './components/RequestDuration';
import { analyzeFoodWaste } from './api/client';
import './App.css';

function FoodWasteRecognition() {
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [requestDurationMs, setRequestDurationMs] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [apiProvider, setApiProvider] = useState('openai'); // 'openai' or 'gemini'
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setResults(null);
      setUsageSummary(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const getConfidenceColor = (confidence) => {
    const percentage = confidence * 100;
    if (percentage < 40) {
      return '#ef4444'; // Red
    } else if (percentage < 75) {
      return '#f59e0b'; // Yellow/Orange
    } else {
      return '#10b981'; // Green
    }
  };


  const handleAnalyze = async () => {
    if (!image) {
      alert('Please upload an image before analyzing.');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setElapsedSeconds(0);
    setRequestDurationMs(null);
    setUsageSummary(null);

    const secondsInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    const startTime = performance.now();

    try {
      const { data: apiResults, usage } = await analyzeFoodWaste({
        image,
        provider: apiProvider
      });

      setRequestDurationMs(Math.round(performance.now() - startTime));
      setResults(apiResults);
      setUsageSummary(usage);
    } catch (error) {
      console.error('Analysis error:', error);
      setResults({
        error: 'Something went wrong, please try again later.'
      });
    } finally {
      clearInterval(secondsInterval);
      setIsProcessing(false);
    }
  };

  // const handleReset = () => {
  //   setImage(null);
  //   if (imageUrl) {
  //     URL.revokeObjectURL(imageUrl);
  //   }
  //   setImageUrl(null);
  //   setResults(null);
  //   if (fileInputRef.current) fileInputRef.current.value = '';
  //   if (cameraInputRef.current) cameraInputRef.current.value = '';
  // };

  return (
    <div className="container">
      <header className="header">
        <h1>Recypic ♻️ - Food Waste Recognition</h1>
        <p className="subtitle">Upload an image of a transparent container to detect organic food waste and other items</p>
      </header>

      <div className="api-selector-section">
        <label htmlFor="api-provider" className="api-selector-label">
          <strong>AI Provider:</strong>
        </label>
        <select
          id="api-provider"
          value={apiProvider}
          onChange={(e) => setApiProvider(e.target.value)}
          className="api-selector"
          disabled={isProcessing}
        >
          <option value="openai">OpenAI (GPT-4.1)</option>
          <option value="gemini">Google Gemini (Gemini 3 Pro)</option>
        </select>
      </div>

      <div className="upload-section">
        {!imageUrl ? (
          <div className="upload-options">
            <div className="upload-option upload-option-upload">
              <div className="upload-option-icon">📷</div>
              <p>Upload Photo</p>
              <button 
                className="btn btn-primary" 
                onClick={handleUploadClick}
              >
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
              <button 
                className="btn btn-secondary" 
                onClick={handleCameraClick}
              >
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
              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze}
                disabled={isProcessing}
              >
                {isProcessing ? '🔄 Analyzing...' : '🤖 Analyze Food Waste'}
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setImage(null);
                  if (imageUrl) URL.revokeObjectURL(imageUrl);
                  setImageUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  if (cameraInputRef.current) cameraInputRef.current.value = '';
                }}
              >
                ✨ Change Image
              </button>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Analyzing container for food waste and other items... {elapsedSeconds}s</p>
        </div>
      )}

      {results && !results.error && (
        <div className="results">
          <h2>Analysis Results</h2>

          <AnalysisMetrics
            ai_co2_kg={results.ai_co2_kg}
            estimated_weight_kg={results.estimated_weight_kg}
            purity={results.purity}
          />

          {/* Food Waste Detection Section */}
          <div className={`notice ${results.has_organic_food_waste ? 'notice--success' : 'notice--danger'}`}>
            <h3
              className={`notice__title ${
                results.has_organic_food_waste ? 'notice__title--success' : 'notice__title--danger'
              }`}
            >
              {results.has_organic_food_waste ? '✅ Organic Food Waste Detected' : '❌ No Organic Food Waste Detected'}
            </h3>
            <div className="result-confidence">
              <span className="confidence-label">Detection Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min(results.food_waste_confidence * 100, 100)}%`,
                    background: getConfidenceColor(results.food_waste_confidence)
                  }}
                >
                  <span className="confidence-text">{(results.food_waste_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recyclables Section */}
          {/* Organics contamination / packaging section */}
          <div className={`notice ${results.organics_contamination_present ? 'notice--danger' : 'notice--success'}`}>
            <div className="result-header">
              <h3
                className={`notice__title ${
                  results.organics_contamination_present ? 'notice__title--danger' : 'notice__title--success'
                }`}
              >
                {results.organics_contamination_present
                  ? '⚠️ Packaging / Non-organics Detected (Remove Before Organics)'
                  : '✅ No Packaging / Non-organics Detected'}
              </h3>
            </div>
            {results.organics_contamination_present &&
              results.organics_contamination_items &&
              results.organics_contamination_items.length > 0 && (
                <div className="result-details">
                  {results.organics_contamination_items.map((item, index) => (
                    <div key={`organics-contam-${index}`} className="result-detail-item">
                      <div className="detail-header">
                        <strong>Item {index + 1}:</strong>{' '}
                        <span className="detail-value">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <div className={`notice ${results.recyclables_present ? 'notice--danger' : 'notice--success'}`}>
            <div className="result-header">
              <h3
                className={`notice__title ${
                  results.recyclables_present ? 'notice__title--danger' : 'notice__title--success'
                }`}
              >
                {results.recyclables_present ? '⚠️ Recyclables Found in Caddy' : '✅ No Recyclables in Caddy'}
              </h3>
            </div>
            {results.recyclables_present && results.recyclable_items && results.recyclable_items.length > 0 && (
              <div className="result-details">
                {results.recyclable_items.map((item, index) => (
                  <div key={`recyclable-${index}`} className="result-detail-item">
                    <div className="detail-header">
                      <strong>Item {index + 1}:</strong>{' '}
                      <span className="detail-value">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Items Section */}
          {results.other_items && results.other_items.length > 0 && (
            <div className="other-items-section">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
                Other Items Found ({results.other_items.length})
              </h3>
              {results.other_items.map((item, index) => (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <h3>Item {index + 1}</h3>
                    <div className="result-id">
                      <strong>ID:</strong> {item.id}
                    </div>
                  </div>
                  
                  <div className="result-details">
                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Brand:</strong> <span className="detail-value">{item.brand}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Brand Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((item.brand_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(item.brand_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((item.brand_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Category:</strong> <span className="detail-value">{item.category}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Category Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((item.category_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(item.category_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((item.category_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Material:</strong> <span className="detail-value">{item.material}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Material Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((item.material_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(item.material_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((item.material_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Color:</strong> <span className="detail-value">{item.color || 'unknown'}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Color Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((item.color_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(item.color_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((item.color_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.other_items && results.other_items.length === 0 && (
            <div className="result-item">
              <p>No other items detected in the container (only food waste).</p>
            </div>
          )}
        </div>
      )}

      {results && results.error && (
        <div className="results error">
          <p>{results.error}</p>
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

export default FoodWasteRecognition;