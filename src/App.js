import { useState, useRef } from 'react';
import MultiObjectIdentification from './MultiObjectIdentification';
import FoodWasteRecognition from './FoodWasteRecognition';
import MultiObjectRecyclables from './MultiObjectRecyclables';
import UsageDetails from './components/UsageDetails';
import AnalysisMetrics from './components/AnalysisMetrics';
import RequestDuration from './components/RequestDuration';
import { analyzeSingleImage } from './api/client';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('multi'); // 'single', 'multi', 'foodwaste', 'recyclables'
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [requestDurationMs, setRequestDurationMs] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [usageSummary, setUsageSummary] = useState(null);
  const [contaminationSummary, setContaminationSummary] = useState(null);
  const [analysisMetrics, setAnalysisMetrics] = useState(null);
  const [apiProvider, setApiProvider] = useState('openai'); // 'openai' or 'gemini'
  const [promptVersion, setPromptVersion] = useState('v1'); // 'v1', 'v2', 'v3'
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
      setContaminationSummary(null);
      setAnalysisMetrics(null);
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

  const drawBoundingBoxes = (imageUrl, products) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use original image dimensions - CSS will scale it the same way as preview-image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image at full size
        ctx.drawImage(img, 0, 0);
        
        // Draw bounding boxes for each product
        products.forEach((product, index) => {
          if (product.bbox) {
            const { x, y, width, height } = product.bbox;
            
            // Convert normalized coordinates to pixel coordinates on the original image
            const pixelX = x * img.width;
            const pixelY = y * img.height;
            const pixelWidth = width * img.width;
            const pixelHeight = height * img.height;
            
            // Draw bounding box
            ctx.strokeStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
            ctx.lineWidth = 3;
            ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
            
            // Draw label background
            const labelText = `${product.id}: ${product.brand}`;
            ctx.font = 'bold 16px Arial';
            const textMetrics = ctx.measureText(labelText);
            const labelWidth = textMetrics.width + 10;
            const labelHeight = 24;
            
            ctx.fillStyle = `hsla(${(index * 60) % 360}, 70%, 50%, 0.8)`;
            ctx.fillRect(pixelX, pixelY - labelHeight, labelWidth, labelHeight);
            
            // Draw label text
            ctx.fillStyle = 'white';
            ctx.fillText(labelText, pixelX + 5, pixelY - 6);
          }
        });
        
        // Convert canvas to data URL
        const annotatedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(annotatedDataUrl);
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  };


  const handleClassify = async () => {
    if (!image) return;

    setIsProcessing(true);
    setResults(null);
    setRequestDurationMs(null);
    setProgressPercent(0);
    setElapsedSeconds(0);
    setUsageSummary(null);
    setContaminationSummary(null);
    setAnalysisMetrics(null);

    const secondsInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95) return prev;
        const step = prev < 60 ? 6 : prev < 85 ? 3 : 1;
        return Math.min(95, prev + step);
      });
    }, 300);
    const startTime = performance.now();

    try {
      const { data: apiResults, usage } = await analyzeSingleImage({
        image,
        provider: apiProvider,
        promptVersion
      });

      setRequestDurationMs(Math.round(performance.now() - startTime));
      setProgressPercent(100);

      const productResults = Array.isArray(apiResults.products) ? apiResults.products : [];

      if (productResults.length > 0 && productResults.some((r) => r.bbox)) {
        try {
          const annotatedImage = await drawBoundingBoxes(imageUrl, productResults);
          setAnnotatedImageUrl(annotatedImage);
        } catch (drawError) {
          console.error('Error drawing bounding boxes:', drawError);
          setAnnotatedImageUrl(null);
        }
      } else {
        setAnnotatedImageUrl(null);
      }

      setResults(productResults);
      setContaminationSummary({
        food_waste_items: apiResults.food_waste_items || [],
        containers_with_food_or_drink: apiResults.containers_with_food_or_drink || [],
        organics_contamination_present: apiResults.organics_contamination_present || false,
        organics_contamination_items: apiResults.organics_contamination_items || []
      });
      setAnalysisMetrics({
        ai_co2_kg: apiResults.ai_co2_kg,
        estimated_weight_kg: apiResults.estimated_weight_kg,
        purity: apiResults.purity
      });
      setUsageSummary(usage);
    } catch (error) {
      console.error('Classification error:', error);
      setResults({
        error: 'Something went wrong, please try again later.'
      });
    } finally {
      clearInterval(progressInterval);
      clearInterval(secondsInterval);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    // annotatedImageUrl is a data URL, not a blob URL, so no need to revoke
    setImageUrl(null);
    setAnnotatedImageUrl(null);
    setResults(null);
    setUsageSummary(null);
    setContaminationSummary(null);
    setAnalysisMetrics(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const screens = [
    { key: 'single', label: 'Single Image' },
    { key: 'multi', label: 'Multi Object' },
    { key: 'foodwaste', label: 'Food Waste' },
    { key: 'recyclables', label: 'Bag Recyclables' }
  ];

  const renderSingleImageScreen = () => (
    <div className="container">
        <header className="header">
          <h1>Recypic ♻️ - AI Image Classifier</h1>
          <p className="subtitle">Upload or capture a photo to classify</p>
        </header>

        <div className="api-selector-section api-selector-compact api-selector-inline">
          <label htmlFor="api-provider" className="api-selector-label">
            <strong>AI:</strong>
          </label>
          <select
            id="api-provider"
            value={apiProvider}
            onChange={(e) => setApiProvider(e.target.value)}
            className="api-selector"
            disabled={isProcessing}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gem 3</option>
          </select>
          <label htmlFor="prompt-version" className="api-selector-label">
            <strong>Prompt:</strong>
          </label>
          <select
            id="prompt-version"
            value={promptVersion}
            onChange={(e) => setPromptVersion(e.target.value)}
            className="api-selector"
            disabled={isProcessing}
          >
            <option value="v1">v1 high</option>
            <option value="v2">v2 medium</option>
            <option value="v3">v3 fast</option>
          </select>
        </div>

        <div className="upload-section">
          {!imageUrl ? (
            <div className="upload-options">
              <div className="upload-option upload-option-upload">
                <div className="upload-option-icon">📷</div>
                <h3>Upload Photo</h3>
                <p>Choose an image from your device</p>
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
                <h3>Take Picture</h3>
                <p>Capture a photo with your camera</p>
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
                  onClick={handleClassify}
                  disabled={isProcessing}
                >
                  {isProcessing ? '🔄 Classifying...' : '🤖 Classify Image'}
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  ✨ New Image
                </button>
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="processing">
            <div className="spinner"></div>
            <p>Analyzing image with AI...</p>
            <div className="progress">
              <div className="progress__track" aria-hidden="true">
                <div className="progress__fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress__meta">
                {progressPercent}% complete · {elapsedSeconds}s elapsed
              </div>
            </div>
          </div>
        )}

        {results && !results.error && (
          <div className="results">
            <h2>Classification Results</h2>

            <AnalysisMetrics {...analysisMetrics} />

            {contaminationSummary && (
              <>
                <div className="result-item">
                  <div className="result-header">
                    <h3>Packaging / Exclude From Organics</h3>
                  </div>
                  <div className="result-details">
                    {contaminationSummary.organics_contamination_items &&
                    contaminationSummary.organics_contamination_items.length > 0 ? (
                      contaminationSummary.organics_contamination_items.map((item, index) => (
                        <div key={`organics-contam-${index}`} className="result-detail-item">
                          <div className="detail-header">
                            <strong>Item {index + 1}:</strong>{' '}
                            <span className="detail-value">{item}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="result-detail-item">
                        <div className="detail-header">
                          <span className="detail-value">No packaging/non-organics detected.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="result-item">
                  <div className="result-header">
                    <h3>Detected Food Waste</h3>
                  </div>
                  <div className="result-details">
                    {contaminationSummary.food_waste_items &&
                    contaminationSummary.food_waste_items.length > 0 ? (
                      contaminationSummary.food_waste_items.map((item, index) => (
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

                <div className="result-item">
                  <div className="result-header">
                    <h3>Containers With Food/Drink</h3>
                  </div>
                  <div className="result-details">
                    {contaminationSummary.containers_with_food_or_drink &&
                    contaminationSummary.containers_with_food_or_drink.length > 0 ? (
                      contaminationSummary.containers_with_food_or_drink.map((item, index) => (
                        <div key={`container-residue-${index}`} className="result-detail-item">
                          <div className="detail-header">
                            <strong>Container {index + 1}:</strong>{' '}
                            <span className="detail-value">{item}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="result-detail-item">
                        <div className="detail-header">
                          <span className="detail-value">No containers with residue detected.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {annotatedImageUrl && (
              <div className="annotated-image-container">
                <h3>Annotated Image with Bounding Boxes</h3>
                <div className="image-container">
                  <img 
                    src={annotatedImageUrl} 
                    alt="Annotated with bounding boxes" 
                    className="annotated-image"
                  />
                </div>
              </div>
            )}
            
            {Array.isArray(results) && results.length > 0 ? (
              results.map((result, resultIndex) => (
                <div key={resultIndex} className="result-item">
                  <div className="result-header">
                    <h3>Product {resultIndex + 1}</h3>
                    <div className="result-id">
                      <strong>ID:</strong> {result.id}
                    </div>
                  </div>
                  
                  <div className="result-details">
                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Brand:</strong> <span className="detail-value">{result.brand}</span>
                      </div>
                      {String(result.brand || '').toLowerCase() === 'unknown' && (
                        <div
                          style={{
                            marginTop: '0.35rem',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}
                        >
                          Tip: for better brand detection, place the product closer to the camera and front-facing (label visible).
                        </div>
                      )}
                      <div className="result-confidence">
                        <span className="confidence-label">Brand Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min(result.brand_confidence * 100, 100)}%`,
                              background: getConfidenceColor(result.brand_confidence)
                            }}
                          >
                            <span className="confidence-text">{(result.brand_confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Category:</strong> <span className="detail-value">{result.category}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Category Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min(result.category_confidence * 100, 100)}%`,
                              background: getConfidenceColor(result.category_confidence)
                            }}
                          >
                            <span className="confidence-text">{(result.category_confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Material:</strong> <span className="detail-value">{result.material}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Material Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min(result.material_confidence * 100, 100)}%`,
                              background: getConfidenceColor(result.material_confidence)
                            }}
                          >
                            <span className="confidence-text">{(result.material_confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="result-item">
                <p>No products detected in the image.</p>
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

  const renderCurrentScreen = () => {
    if (currentScreen === 'multi') return <MultiObjectIdentification />;
    if (currentScreen === 'foodwaste') return <FoodWasteRecognition />;
    if (currentScreen === 'recyclables') return <MultiObjectRecyclables />;
    return renderSingleImageScreen();
  };

  return (
    <div className="App">
      <header className="navigation-bar">
        <div className="navigation-inner">
          <div className="nav-brand">
            <div>
              <div className="nav-brand-title">Recypic</div>
              <div className="nav-brand-subtitle">AI waste & recyclables</div>
            </div>
          </div>
          <nav className="nav-tabs" aria-label="Tools">
            {screens.map((screen) => (
              <button
                key={screen.key}
                type="button"
                className={`nav-button ${currentScreen === screen.key ? 'active' : ''}`}
                onClick={() => setCurrentScreen(screen.key)}
                aria-current={currentScreen === screen.key ? 'page' : undefined}
              >
                {screen.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      {renderCurrentScreen()}
    </div>
  );
}

export default App;
