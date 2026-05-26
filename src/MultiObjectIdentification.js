import { useState, useRef } from 'react';
import UsageDetails from './components/UsageDetails';
import AnalysisMetrics from './components/AnalysisMetrics';
import RequestDuration from './components/RequestDuration';
import { analyzeMultiObject } from './api/client';
import './App.css';

function MultiObjectIdentification() {
  const [image1, setImage1] = useState(null);
  const [image1Url, setImage1Url] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image2Url, setImage2Url] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [image1Results, setImage1Results] = useState(null);
  const [image2Results, setImage2Results] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [requestDurationMs, setRequestDurationMs] = useState(null);
  const [apiProvider, setApiProvider] = useState('gemini'); // 'openai' or 'gemini'
  const [promptVersion, setPromptVersion] = useState('v1'); // 'v1', 'v2', 'v3'
  const [activeTab, setActiveTab] = useState('merged'); // 'merged', 'image1', 'image2'
  const [capsuleGroupResult, setCapsuleGroupResult] = useState(null);
  const [analysisMetrics, setAnalysisMetrics] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const fileInput1Ref = useRef(null);
  const fileInput2Ref = useRef(null);
  const cameraInput1Ref = useRef(null);
  const cameraInput2Ref = useRef(null);

  const handleFile1Change = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage1(file);
      const url = URL.createObjectURL(file);
      setImage1Url(url);
      setResults(null);
      setCapsuleGroupResult(null);
      setUsageSummary(null);
    }
  };

  const handleFile2Change = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage2(file);
      const url = URL.createObjectURL(file);
      setImage2Url(url);
      setResults(null);
      setCapsuleGroupResult(null);
      setUsageSummary(null);
    }
  };

  const handleUpload1Click = () => {
    fileInput1Ref.current?.click();
  };

  const handleUpload2Click = () => {
    fileInput2Ref.current?.click();
  };

  const handleCamera1Click = () => {
    cameraInput1Ref.current?.click();
  };

  const handleCamera2Click = () => {
    cameraInput2Ref.current?.click();
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


  // Function to find mergeable items between two images
  // const findMergeableItems = (products1, products2) => {
  //   const mergeablePairs = [];
    
  //   if (!products1 || !products2) return mergeablePairs;

  //   // Normalize product attributes for comparison
  //   const normalizeString = (str) => {
  //     if (!str) return '';
  //     return str.toLowerCase().trim();
  //   };

  //   // Check if a value is "unknown" or empty
  //   const isUnknown = (value) => {
  //     if (!value) return true;
  //     const normalized = normalizeString(value);
  //     return normalized === 'unknown' || normalized === '' || normalized === 'n/a' || normalized === 'na';
  //   };

  //   // Find potential matches (less strict than merging - just for display)
  //   products1.forEach((p1, index1) => {
  //     products2.forEach((p2, index2) => {
  //       const brand1 = normalizeString(p1.brand);
  //       const brand2 = normalizeString(p2.brand);
  //       const category1 = normalizeString(p1.category);
  //       const category2 = normalizeString(p2.category);
  //       const material1 = normalizeString(p1.material);
  //       const material2 = normalizeString(p2.material);
  //       const color1 = normalizeString(p1.color);
  //       const color2 = normalizeString(p2.color);

  //       // Count matching attributes (excluding unknown values)
  //       let matchCount = 0;
  //       let totalAttributes = 0;

  //       if (!isUnknown(brand1) && !isUnknown(brand2)) {
  //         totalAttributes++;
  //         const brandMatch = brand1 === brand2 || 
  //                          (brand1 && brand2 && (brand1.includes(brand2) || brand2.includes(brand1)));
  //         if (brandMatch) matchCount++;
  //       }

  //       if (!isUnknown(category1) && !isUnknown(category2)) {
  //         totalAttributes++;
  //         if (category1 === category2) matchCount++;
  //       }

  //       if (!isUnknown(material1) && !isUnknown(material2)) {
  //         totalAttributes++;
  //         if (material1 === material2) matchCount++;
  //       }

  //       if (!isUnknown(color1) && !isUnknown(color2)) {
  //         totalAttributes++;
  //         if (color1 === color2) matchCount++;
  //       }

  //       // If at least 2 attributes match and we have at least 2 known attributes, consider it mergeable
  //       if (totalAttributes >= 2 && matchCount >= 2) {
  //         mergeablePairs.push({
  //           image1Item: { ...p1, index: index1 },
  //           image2Item: { ...p2, index: index2 },
  //           matchScore: matchCount / totalAttributes,
  //           matchCount,
  //           totalAttributes
  //         });
  //       }
  //     });
  //   });

  //   // Sort by match score (highest first)
  //   mergeablePairs.sort((a, b) => b.matchScore - a.matchScore);

  //   return mergeablePairs;
  // };

  // Helper function to check if a product should be marked as potential duplication
  const isPotentialDuplication = (product) => {
    // Product didn't match with any other product
    if (product.source === 'both_images') {
      return false;
    }
    
    // Check all conditions
    const categoryConfLow = (product.category_confidence || 0) < 0.79;
    const brandConfLow = (product.brand_confidence || 0) < 0.05;
    const visiblePartLow = (product.visible_part || 0) < 0.50;
    
    return categoryConfLow && brandConfLow && visiblePartLow;
  };

  // Helper function to render product details
  const renderProductDetails = (product, index, sourceLabel = null) => {
    return (
      <div key={index} className="result-item">
        <div className="result-header">
          <h3>Object {index + 1}</h3>
          <div className="result-id">
            <strong>ID:</strong> {product.id}
          </div>
          {sourceLabel && (
            <div className="result-source" style={{ 
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              {sourceLabel}
            </div>
          )}
        </div>
        
        <div className="result-details">
          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Brand:</strong> <span className="detail-value">{product.brand}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Brand Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.brand_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.brand_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.brand_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Category:</strong> <span className="detail-value">{product.category}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Category Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.category_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.category_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.category_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Material:</strong> <span className="detail-value">{product.material}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Material Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.material_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.material_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.material_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Cap Color:</strong> <span className="detail-value">{product.cap_color || 'unknown'}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Cap Color Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.cap_color_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.cap_color_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.cap_color_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Color:</strong> <span className="detail-value">{product.color || 'unknown'}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Color Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.color_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.color_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.color_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Z-Index:</strong> <span className="detail-value">{product.zindex || 'unknown'}</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Z-Index Confidence:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.zindex_confidence || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.zindex_confidence || 0)
                  }}
                >
                  <span className="confidence-text">{((product.zindex_confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="result-detail-item">
            <div className="detail-header">
              <strong>Visible Part:</strong> <span className="detail-value">{((product.visible_part || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="result-confidence">
              <span className="confidence-label">Visibility:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ 
                    width: `${Math.min((product.visible_part || 0) * 100, 100)}%`,
                    background: getConfidenceColor(product.visible_part || 0)
                  }}
                >
                  <span className="confidence-text">{((product.visible_part || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render results for a single image with mergeable items
  const renderImageResults = (currentImageResults, otherImageResults, imageNumber) => {
    if (!currentImageResults || currentImageResults.length === 0) {
      return (
        <div className="result-item">
          <p>No objects detected in this image.</p>
        </div>
      );
    }

    const mergeablePairs = []; //findMergeableItems(currentImageResults, otherImageResults);
    const mergeableIndices = new Set();
    // mergeablePairs.forEach(pair => {
    //   if (imageNumber === 1) {
    //     mergeableIndices.add(pair.image1Item.index);
    //   } else {
    //     mergeableIndices.add(pair.image2Item.index);
    //   }
    // });

    // Group items: mergeable items first (stacked), then non-mergeable items
    const mergeableItems = [];
    const nonMergeableItems = [];

    currentImageResults.forEach((product, index) => {
      if (mergeableIndices.has(index)) {
        // Find the matching item from the other image
        const matchingPair = mergeablePairs.find(pair => 
          imageNumber === 1 ? pair.image1Item.index === index : pair.image2Item.index === index
        );
        mergeableItems.push({ product, index, matchingPair });
      } else {
        nonMergeableItems.push({ product, index });
      }
    });

    return (
      <div>
        {/* Mergeable Items - Stacked vertically */}
        {mergeableItems.length > 0 && (
          <div className="mergeable-section" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2563eb', fontSize: '1.25rem' }}>
              Potentially Mergeable Items ({mergeableItems.length})
            </h3>
            {mergeableItems.map(({ product, index, matchingPair }) => (
              <div key={index} className="mergeable-group" style={{ 
                marginBottom: '2rem',
                padding: '1rem',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                backgroundColor: '#eff6ff'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ 
                    padding: '0.5rem',
                    backgroundColor: '#dbeafe',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#1e40af'
                  }}>
                    Image {imageNumber} - Item {index + 1}
                  </div>
                  {renderProductDetails(product, index + 1, `From Image ${imageNumber}`)}
                </div>
                {matchingPair && (
                  <div>
                    <div style={{ 
                      padding: '0.5rem',
                      backgroundColor: '#fce7f3',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#9f1239'
                    }}>
                      Matching Item from Image {imageNumber === 1 ? '2' : '1'} 
                      (Match Score: {((matchingPair.matchScore || 0) * 100).toFixed(0)}%)
                    </div>
                    {renderProductDetails(
                      imageNumber === 1 ? matchingPair.image2Item : matchingPair.image1Item,
                      (imageNumber === 1 ? matchingPair.image2Item.index : matchingPair.image1Item.index) + 1,
                      `From Image ${imageNumber === 1 ? '2' : '1'}`
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Non-mergeable Items */}
        {nonMergeableItems.length > 0 && (
          <div className="non-mergeable-section">
            <h3 style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '1.25rem' }}>
              Other Items ({nonMergeableItems.length})
            </h3>
            {nonMergeableItems.map(({ product, index }) => 
              renderProductDetails(product, index + 1, `From Image ${imageNumber}`)
            )}
          </div>
        )}
      </div>
    );
  };

  const handleAnalyze = async () => {
    const isGroupPrompt = promptVersion === 'v4';
    if (!image1 || (!isGroupPrompt && !image2)) {
      alert(isGroupPrompt ? 'Please upload the image before analyzing.' : 'Please upload both images before analyzing.');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setImage1Results(null);
    setImage2Results(null);
    setCapsuleGroupResult(null);
    setAnalysisMetrics(null);
    setElapsedSeconds(0);
    setRequestDurationMs(null);
    setUsageSummary(null);

    const secondsInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    const startTime = performance.now();

    try {
      const { data, usage } = await analyzeMultiObject({
        image1,
        image2: isGroupPrompt ? null : image2,
        provider: apiProvider,
        promptVersion
      });

      setRequestDurationMs(Math.round(performance.now() - startTime));
      setUsageSummary(usage);

      setAnalysisMetrics({
        ai_co2_kg: data.ai_co2_kg,
        estimated_weight_kg: data.estimated_weight_kg,
        purity: data.purity
      });

      if (isGroupPrompt) {
        setCapsuleGroupResult(data.capsuleGroup);
      } else {
        setImage1Results(data.image1Results);
        setImage2Results(data.image2Results);
        setResults(data.merged);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      if (isGroupPrompt) {
        setCapsuleGroupResult({
          error: 'Something went wrong, please try again later.'
        });
      } else {
        setResults({
          error: 'Something went wrong, please try again later.'
        });
      }
    } finally {
      clearInterval(secondsInterval);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImage1(null);
    setImage2(null);
    setCapsuleGroupResult(null);
    setAnalysisMetrics(null);
    if (image1Url) {
      URL.revokeObjectURL(image1Url);
    }
    if (image2Url) {
      URL.revokeObjectURL(image2Url);
    }
    setImage1Url(null);
    setImage2Url(null);
    setResults(null);
    setUsageSummary(null);
    if (fileInput1Ref.current) fileInput1Ref.current.value = '';
    if (fileInput2Ref.current) fileInput2Ref.current.value = '';
    if (cameraInput1Ref.current) cameraInput1Ref.current.value = '';
    if (cameraInput2Ref.current) cameraInput2Ref.current.value = '';
  };

  return (
    <>
    {(() => {
      const isGroupPrompt = promptVersion === 'v4';
      return (
    <div className="container">
        <header className="header">
          <h1>Recypic ♻️ - Multi Object Identification</h1>
          <p className="subtitle">
            {isGroupPrompt
              ? 'Upload a single image of transparent bug with objects'
              : 'Upload 2 images of transparent bug to identify and merge objects'}
          </p>
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
            <option value="v4">v4 (object group)</option>
          </select>
        </div>

        <div className="upload-section">
          <div className="dual-image-upload">
            {/* Image 1 Upload */}
            <div className="image-upload-container">
              <h3>{isGroupPrompt ? 'Image' : 'Image 1'}</h3>
              {!image1Url ? (
                <div className="upload-options">
                  <div className="upload-option upload-option-upload">
                    <div className="upload-option-icon">📷</div>
                    <p>Upload Photo</p>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleUpload1Click}
                    >
                      Select File
                    </button>
                    <input
                      ref={fileInput1Ref}
                      type="file"
                      accept="image/*"
                      onChange={handleFile1Change}
                      style={{ display: 'none' }}
                    />
                  </div>
                  
                  <div className="upload-option upload-option-camera">
                    <div className="upload-option-icon">📸</div>
                    <p>Take Picture</p>
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCamera1Click}
                    >
                      Open Camera
                    </button>
                    <input
                      ref={cameraInput1Ref}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFile1Change}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div className="image-preview-section">
                  <div className="image-container">
                    <img src={image1Url} alt="Preview 1" className="preview-image" />
                  </div>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => {
                      setImage1(null);
                      if (image1Url) URL.revokeObjectURL(image1Url);
                      setImage1Url(null);
                      if (fileInput1Ref.current) fileInput1Ref.current.value = '';
                      if (cameraInput1Ref.current) cameraInput1Ref.current.value = '';
                    }}
                  >
                    ✨ Change Image
                  </button>
                </div>
              )}
            </div>

            {/* Image 2 Upload */}
            {!isGroupPrompt && (
              <div className="image-upload-container">
                <h3>Image 2</h3>
                {!image2Url ? (
                  <div className="upload-options">
                    <div className="upload-option upload-option-upload">
                      <div className="upload-option-icon">📷</div>
                      <p>Upload Photo</p>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleUpload2Click}
                      >
                        Select File
                      </button>
                      <input
                        ref={fileInput2Ref}
                        type="file"
                        accept="image/*"
                        onChange={handleFile2Change}
                        style={{ display: 'none' }}
                      />
                    </div>
                    
                    <div className="upload-option upload-option-camera">
                      <div className="upload-option-icon">📸</div>
                      <p>Take Picture</p>
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleCamera2Click}
                      >
                        Open Camera
                      </button>
                      <input
                        ref={cameraInput2Ref}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFile2Change}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="image-preview-section">
                    <div className="image-container">
                      <img src={image2Url} alt="Preview 2" className="preview-image" />
                    </div>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => {
                        setImage2(null);
                        if (image2Url) URL.revokeObjectURL(image2Url);
                        setImage2Url(null);
                        if (fileInput2Ref.current) fileInput2Ref.current.value = '';
                        if (cameraInput2Ref.current) cameraInput2Ref.current.value = '';
                      }}
                    >
                      ✨ Change Image
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {image1Url && (isGroupPrompt || image2Url) && (
            <div className="action-buttons" style={{ marginTop: '2rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze}
                disabled={isProcessing}
              >
                {isProcessing ? '🔄 Analyzing...' : (isGroupPrompt ? '🤖 Analyze' : '🤖 Analyze & Merge Objects')}
              </button>
              <button 
                className="btn btn-outline" 
                onClick={handleReset}
                disabled={isProcessing}
              >
                ✨ Reset
              </button>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="processing">
            <div className="spinner"></div>
            <p>
              {isGroupPrompt
                ? `Analyzing image... ${elapsedSeconds}s`
                : `Analyzing both images and merging objects... ${elapsedSeconds}s`}
            </p>
          </div>
        )}

        {isGroupPrompt && capsuleGroupResult && !capsuleGroupResult.error && (
          <div className="results">
            <AnalysisMetrics {...analysisMetrics} />
            <div className="result-item">
              <div className="result-header">
                <h3>Group Estimate</h3>
              </div>
              <div className="result-details">
                <div className="result-detail-item">
                  <div className="detail-header">
                    <strong>Approx Count:</strong>{' '}
                    <span className="detail-value">
                      {capsuleGroupResult.approx_count !== null ? capsuleGroupResult.approx_count : 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="result-detail-item">
                  <div className="detail-header">
                    <strong>Count Range:</strong>{' '}
                    <span className="detail-value">
                      {capsuleGroupResult.count_range?.min !== undefined && capsuleGroupResult.count_range?.max !== undefined
                        ? `${capsuleGroupResult.count_range.min} - ${capsuleGroupResult.count_range.max}`
                        : 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="result-detail-item">
                  <div className="detail-header">
                    <strong>Brand:</strong>{' '}
                    <span className="detail-value">{capsuleGroupResult.brand}</span>
                  </div>
                  <div className="result-confidence">
                    <span className="confidence-label">Brand Confidence:</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${Math.min((capsuleGroupResult.brand_confidence || 0) * 100, 100)}%`,
                          background: getConfidenceColor(capsuleGroupResult.brand_confidence || 0)
                        }}
                      >
                        <span className="confidence-text">{((capsuleGroupResult.brand_confidence || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="result-detail-item">
                  <div className="detail-header">
                    <strong>Category:</strong>{' '}
                    <span className="detail-value">{capsuleGroupResult.category}</span>
                  </div>
                  <div className="result-confidence">
                    <span className="confidence-label">Category Confidence:</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${Math.min((capsuleGroupResult.category_confidence || 0) * 100, 100)}%`,
                          background: getConfidenceColor(capsuleGroupResult.category_confidence || 0)
                        }}
                      >
                        <span className="confidence-text">{((capsuleGroupResult.category_confidence || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="result-detail-item">
                  <div className="detail-header">
                    <strong>Material:</strong>{' '}
                    <span className="detail-value">{capsuleGroupResult.material}</span>
                  </div>
                  <div className="result-confidence">
                    <span className="confidence-label">Material Confidence:</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${Math.min((capsuleGroupResult.material_confidence || 0) * 100, 100)}%`,
                          background: getConfidenceColor(capsuleGroupResult.material_confidence || 0)
                        }}
                      >
                        <span className="confidence-text">{((capsuleGroupResult.material_confidence || 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isGroupPrompt && results && !results.error && (
          <div className="results">
            <AnalysisMetrics {...analysisMetrics} />
            {/* Tab Navigation */}
            <div className="results-tabs">
              <button
                className={`results-tab ${activeTab === 'merged' ? 'active' : ''}`}
                onClick={() => setActiveTab('merged')}
              >
                Merged ({results.length})
              </button>
              <button
                className={`results-tab ${activeTab === 'image1' ? 'active' : ''}`}
                onClick={() => setActiveTab('image1')}
              >
                Image 1 ({image1Results?.length || 0})
              </button>
              <button
                className={`results-tab ${activeTab === 'image2' ? 'active' : ''}`}
                onClick={() => setActiveTab('image2')}
              >
                Image 2 ({image2Results?.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'merged' && (
              <div className="tab-content">
                <h2>Merged Identification Results</h2>
                <p className="subtitle" style={{ marginBottom: '1rem' }}>
                  {results.length} unique object{results.length !== 1 ? 's' : ''} identified
                </p>
                
                {Array.isArray(results) && results.length > 0 ? (
                  results.map((result, resultIndex) => (
                <div key={resultIndex} className="result-item">
                  <div className="result-header">
                    <h3>Object {resultIndex + 1}</h3>
                    <div className="result-id">
                      <strong>ID:</strong> {result.id}
                    </div>
                    {result.source && (
                      <div className="result-source" style={{ 
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: result.source === 'both_images' ? '#dbeafe' : 
                                        result.source === 'image1_only' ? '#fef3c7' : '#fce7f3',
                        color: result.source === 'both_images' ? '#1e40af' : 
                               result.source === 'image1_only' ? '#92400e' : '#9f1239',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {result.source === 'both_images' ? '✓ Found in both images (merged)' : 
                         result.source === 'image1_only' ? 'Found only in Image 1' : 
                         'Found only in Image 2'}
                      </div>
                    )}
                    {isPotentialDuplication(result) && (
                      <div className="result-source" style={{ 
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: '1px solid #fca5a5'
                      }}>
                        ⚠️ Potential Duplication
                      </div>
                    )}
                  </div>
                  
                  <div className="result-details">
                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Brand:</strong> <span className="detail-value">{result.brand}</span>
                      </div>
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

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Cap Color:</strong> <span className="detail-value">{result.cap_color || 'unknown'}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Cap Color Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((result.cap_color_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(result.cap_color_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((result.cap_color_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Color:</strong> <span className="detail-value">{result.color || 'unknown'}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Color Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((result.color_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(result.color_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((result.color_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Z-Index:</strong> <span className="detail-value">{result.zindex || 'unknown'}</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Z-Index Confidence:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((result.zindex_confidence || 0) * 100, 100)}%`,
                              background: getConfidenceColor(result.zindex_confidence || 0)
                            }}
                          >
                            <span className="confidence-text">{((result.zindex_confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="result-detail-item">
                      <div className="detail-header">
                        <strong>Visible Part:</strong> <span className="detail-value">{((result.visible_part || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="result-confidence">
                        <span className="confidence-label">Visibility:</span>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ 
                              width: `${Math.min((result.visible_part || 0) * 100, 100)}%`,
                              background: getConfidenceColor(result.visible_part || 0)
                            }}
                          >
                            <span className="confidence-text">{((result.visible_part || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="result-item">
                <p>No objects detected in the images.</p>
              </div>
            )}
              </div>
            )}

            {activeTab === 'image1' && image1Results && (
              <div className="tab-content">
                <h2>Image 1 Results</h2>
                <p className="subtitle" style={{ marginBottom: '1rem' }}>
                  {image1Results.length} object{image1Results.length !== 1 ? 's' : ''} identified
                </p>
                {renderImageResults(image1Results, image2Results, 1)}
              </div>
            )}

            {activeTab === 'image2' && image2Results && (
              <div className="tab-content">
                <h2>Image 2 Results</h2>
                <p className="subtitle" style={{ marginBottom: '1rem' }}>
                  {image2Results.length} object{image2Results.length !== 1 ? 's' : ''} identified
                </p>
                {renderImageResults(image2Results, image1Results, 2)}
              </div>
            )}
          </div>
        )}

        {isGroupPrompt && capsuleGroupResult && capsuleGroupResult.error && (
          <div className="results error">
            <p>{capsuleGroupResult.error}</p>
          </div>
        )}

        {!isGroupPrompt && results && results.error && (
          <div className="results error">
            <p>{results.error}</p>
          </div>
        )}

        <RequestDuration
          durationMs={requestDurationMs}
          label={isGroupPrompt ? 'Compressed Request' : 'Compressed Requests'}
        />
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
    })()}
    </>
  );
}

export default MultiObjectIdentification;
