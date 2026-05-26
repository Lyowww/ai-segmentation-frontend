import { useState, useRef } from 'react';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import RequestDuration from './components/RequestDuration';
import UsageDetails from './components/UsageDetails';
import { buildUsageSummary } from './utils/usage';
import './App.css';

function MultiObjectVideoIdentification() {
  const [video, setVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [requestDurationMs, setRequestDurationMs] = useState(null);
  const [usageSummary, setUsageSummary] = useState(null);
  const [apiProvider, setApiProvider] = useState('gemini');
  const [promptVersion, setPromptVersion] = useState('v1');
  const [capsuleGroupResult, setCapsuleGroupResult] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const timerRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideo(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setResults(null);
      setCapsuleGroupResult(null);
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
      return '#ef4444';
    } else if (percentage < 75) {
      return '#f59e0b';
    } else {
      return '#10b981';
    }
  };

  const convertFileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getPrompt = (version = 'v1') => {
    if (version === 'v2') {
      return `Analyze this video of a transparent bug container and identify absolutely ALL daily consumer used products, bottles, containers, etc. visible inside the transparent bug. Return ONLY the requested fields.
{
  "products": [
    {
      "id": "unique_id_for_product",
      "brand": "brand_name",
      "brand_confidence": 0.0-1.0,
      "category": "product_category",
      "category_confidence": 0.0-1.0,
      "material": "material_type",
      "material_confidence": 0.0-1.0
    }
  ]
}

- category should be only one of: shampoo_bottle, beverage_bottle, edible_product, coffee_capsule, coffee, tes, drugs, cleaning_product, personal_hygiene_product.
- material should be only one of: plastic, glass, metal, paper, aluminum, leather, wood.
- brand should be identified brand name all lowercase
- Return all the products in the video regardless of confidence score.
- If an attribute is unknown, use "unknown".

Return ONLY valid JSON object with a "products" array. If no products are detected, return {"products": []}. Do not include any markdown formatting or additional text.`;
    }

    if (version === 'v3') {
      return `List ALL products in the video and return ONLY category and material.
{"products":[{"id":"unique_id_for_product","category":"product_category","category_confidence":0.0-1.0,"material":"material_type","material_confidence":0.0-1.0}]}
- category must be one of: shampoo_bottle, beverage_bottle, edible_product, coffee_capsule, coffee, tes, drugs, cleaning_product, personal_hygiene_product.
- material must be one of: plastic, glass, metal, paper, aluminum, leather, wood.
- If unknown, use "unknown".
Return ONLY JSON object.`;
    }

    if (version === 'v4') {
      return `Estimate the approximate number of Nespresso capsules visible in this single video of a transparent bug container. We only need an approximate count, not an exact number. Also identify capsule brand, category, and material. Return ONLY valid JSON:
{
  "approx_count": number,
  "count_range": { "min": number, "max": number },
  "brand": "brand_name_or_unknown",
  "brand_confidence": 0.0-1.0,
  "category": "coffee_capsule",
  "category_confidence": 0.0-1.0,
  "material": "plastic|aluminum|paper|unknown",
  "material_confidence": 0.0-1.0
}
- Use lowercase brand names.
- If unsure, use "unknown".
- Return JSON only, no markdown or extra text.`;
    }

    return `Analyze this video of a transparent bug container and identify absolutely ALL daily consumer used products, bottles, containers, etc. visible inside the transparent bug. For each product, return a JSON object with a "products" key containing an array of products. Each product should have the following structure:
{
  "products": [
    {
      "id": "unique_id_for_product",
      "brand": "brand_name",
      "brand_confidence": 0.0-1.0,
      "category": "product_category, always drop the confidence score below 0.5 if you are not sure about the category",
      "category_confidence": 0.0-1.0,
      "material": "material_type",
      "material_confidence": 0.0-1.0,
      "cap_color": "when the color of the cap is evedently visible, return the color, otherwise return unknown",
      "cap_color_confidence": 0.0-1.0,
      "color": "when the color is evedently visible and product seem to contain that color from all anglnes, return the color, otherwise return unknown",
      "color_confidence": 0.0-1.0,
      "zindex": "this must show if the the given product is in front of or behind other products in the video, value can be front, back, middle or side",
      "zindex_confidence": 0.0-1.0,
      "visible_part": "percentage of the item visible in the video (0.0-1.0), representing how much of the item is visible versus covered by other items",
      "bbox": {
        "x": 0.0-1.0,
        "y": 0.0-1.0,
        "width": 0.0-1.0,
        "height": 0.0-1.0
      }
    }
  ]
}

- category should be only on of from this list as accurate as possible and most close to one of the items in this list: shampoo_bottle, beverage_bottle, edible_product,coffee_capsule, coffee, tes, drugs, cleaning_product, beverage_bottle, personal_hygiene_product.
- material should be only on of from this list: plastic, glass, metal, paper, aluminum, leather, wood.
- brand should identified brand name all lowercase
- color should be the dominant/main color of the product (e.g., "red", "blue", "green", "white", "transparent", "brown", etc.) - use simple color names
- Return all the products in the video regardless of the confidence score of any attribute, its critical to get all the products in the video with their material, category, and color.
- If the item is too far away from the camera just ignore it.
- If you cannot identify a specific attribute (brand, category, material, or color), use "unknown" as the value, but try your best to identify all attributes.

Return ONLY valid JSON object with a "products" array. If no products are detected, return {"products": []}. Do not include any markdown formatting or additional text.`;
  };

  const parseAPIResponse = (content) => {
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid response format');
    }

    let parsedResults = [];
    if (parsedResponse.products && Array.isArray(parsedResponse.products)) {
      parsedResults = parsedResponse.products;
    } else if (Array.isArray(parsedResponse)) {
      parsedResults = parsedResponse;
    } else if (parsedResponse.items && Array.isArray(parsedResponse.items)) {
      parsedResults = parsedResponse.items;
    } else if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
      parsedResults = parsedResponse.results;
    } else {
      const keys = Object.keys(parsedResponse);
      for (const key of keys) {
        if (Array.isArray(parsedResponse[key])) {
          parsedResults = parsedResponse[key];
          break;
        }
      }
    }

    console.log('Parsed results:', parsedResults);
    return parsedResults;
  };

  const parseCapsuleGroupResponse = (content) => {
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid response format');
    }

    return {
      approx_count: Number.isFinite(parsedResponse.approx_count) ? parsedResponse.approx_count : null,
      count_range: parsedResponse.count_range || null,
      brand: parsedResponse.brand || 'unknown',
      brand_confidence: parsedResponse.brand_confidence !== undefined ? parsedResponse.brand_confidence : 0,
      category: parsedResponse.category || 'coffee_capsule',
      category_confidence: parsedResponse.category_confidence !== undefined ? parsedResponse.category_confidence : 0,
      material: parsedResponse.material || 'unknown',
      material_confidence: parsedResponse.material_confidence !== undefined ? parsedResponse.material_confidence : 0
    };
  };

  const callOpenAIAPI = async (videoFile, parseResponse = parseAPIResponse) => {
    console.log('Starting OpenAI API call with video file:', videoFile.name, videoFile.size, 'bytes');

    const dataUrl = await convertFileToDataURL(videoFile);
    console.log('Video converted to data URL');

    const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    if (!API_KEY) {
      throw new Error('OpenAI API key not configured. Set REACT_APP_OPENAI_API_KEY in your environment.');
    }

    const client = new OpenAI({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true
    });

    console.log('Making API request to OpenAI...');
    const prompt = getPrompt(promptVersion);

    const model = 'gpt-4.1';
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0
    });

    console.log('OpenAI API Response received successfully');
    const content = response.choices[0].message.content;
    console.log('Raw response content:', content);

    return {
      data: parseResponse(content),
      usage: buildUsageSummary({ provider: 'openai', model, response })
    };
  };

  const callGeminiAPI = async (videoFile, parseResponse = parseAPIResponse) => {
    console.log('Starting Gemini API call with video file:', videoFile.name, videoFile.size, 'bytes');

    const base64Data = await convertFileToDataURL(videoFile);
    const base64Video = base64Data.split(',')[1];
    const mimeType = videoFile.type || 'video/mp4';

    const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error('Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const modelId = 'gemini-3-pro-preview';
    const geminiModel = genAI.getGenerativeModel({ model: modelId });

    console.log('Making API request to Gemini...');
    const prompt = getPrompt(promptVersion);

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Video,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const content = response.text();
    console.log('Gemini API Response received successfully');
    console.log('Raw response content:', content);

    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return {
      data: parseResponse(cleanedContent),
      usage: buildUsageSummary({ provider: 'gemini', model: modelId, response })
    };
  };

  const callAPI = async (videoFile, parseResponse) => {
    if (apiProvider === 'openai') {
      return await callOpenAIAPI(videoFile, parseResponse);
    }
    return await callGeminiAPI(videoFile, parseResponse);
  };

  const handleAnalyze = async () => {
    const isGroupPrompt = promptVersion === 'v4';
    if (!video) {
      alert('Please upload a video before analyzing.');
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setCapsuleGroupResult(null);
    setUsageSummary(null);
    setElapsedSeconds(0);
    setRequestDurationMs(null);

    try {
      const providerLabel = apiProvider === 'openai'
        ? 'OPENAI'
        : apiProvider === 'gemini25'
          ? 'GEMINI 2.5 FLASH'
          : 'GEMINI 3';
      console.log(`Analyzing video using ${providerLabel}...`);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      const startTime = performance.now();

      if (isGroupPrompt) {
        const { data: groupResult, usage } = await callAPI(video, parseCapsuleGroupResponse);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRequestDurationMs(Math.round(performance.now() - startTime));
        console.log('Capsule group result:', groupResult);
        setUsageSummary(usage);
        setCapsuleGroupResult(groupResult);
      } else {
        const { data: apiResults, usage } = await callAPI(video);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRequestDurationMs(Math.round(performance.now() - startTime));
        console.log('Video results:', apiResults);
        setUsageSummary(usage);

        let processedResults = Array.isArray(apiResults) ? apiResults : [apiResults];
        processedResults = processedResults.map((result, index) => ({
          id: result.id || `video_product_${index + 1}`,
          brand: result.brand || 'unknown',
          brand_confidence: result.brand_confidence !== undefined ? result.brand_confidence : 0,
          category: result.category || 'unknown',
          category_confidence: result.category_confidence !== undefined ? result.category_confidence : 0,
          material: result.material || 'unknown',
          material_confidence: result.material_confidence !== undefined ? result.material_confidence : 0,
          cap_color: result.cap_color || 'unknown',
          cap_color_confidence: result.cap_color_confidence !== undefined ? result.cap_color_confidence : 0,
          color: result.color || 'unknown',
          color_confidence: result.color_confidence !== undefined ? result.color_confidence : 0,
          zindex: result.zindex || 'unknown',
          zindex_confidence: result.zindex_confidence !== undefined ? result.zindex_confidence : 0,
          visible_part: result.visible_part !== undefined ? result.visible_part : 1.0,
          bbox: result.bbox || null
        }));

        setResults(processedResults);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      if (promptVersion === 'v4') {
        setCapsuleGroupResult({
          error: 'Something went wrong, please try again later.'
        });
      } else {
        setResults({
          error: 'Something went wrong, please try again later.'
        });
      }
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setVideo(null);
    setCapsuleGroupResult(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setResults(null);
    setUsageSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const renderProductDetails = (product, index) => {
    return (
      <div key={index} className="result-item">
        <div className="result-header">
          <h3>Object {index + 1}</h3>
          <div className="result-id">
            <strong>ID:</strong> {product.id}
          </div>
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

  const isGroupPrompt = promptVersion === 'v4';

  return (
    <div className="container">
      <header className="header">
        <h1>Recypic ♻️ - Multi Object Video</h1>
        <p className="subtitle">
          {isGroupPrompt
            ? 'Upload a single video of transparent bug with capsules'
            : 'Upload a single video of transparent bug to identify objects'}
        </p>
      </header>

      <div className="api-selector-section api-selector-compact api-selector-inline">
        <label htmlFor="api-provider-video" className="api-selector-label">
          <strong>AI:</strong>
        </label>
        <select
          id="api-provider-video"
          value={apiProvider}
          onChange={(e) => setApiProvider(e.target.value)}
          className="api-selector"
          disabled={isProcessing}
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Gem 3</option>
        </select>
        <label htmlFor="prompt-version-video" className="api-selector-label">
          <strong>Prompt:</strong>
        </label>
        <select
          id="prompt-version-video"
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
        {!videoUrl ? (
          <div className="upload-options">
            <div className="upload-option upload-option-upload">
              <div className="upload-option-icon">📹</div>
              <p>Upload Video</p>
              <button
                className="btn btn-primary"
                onClick={handleUploadClick}
              >
                Select File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <div className="upload-option upload-option-camera">
              <div className="upload-option-icon">🎥</div>
              <p>Record Video</p>
              <button
                className="btn btn-secondary"
                onClick={handleCameraClick}
              >
                Open Camera
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div className="image-preview-section">
            <div className="image-container">
              <video src={videoUrl} controls className="preview-image" />
            </div>
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={isProcessing}
              >
                {isProcessing ? '🔄 Analyzing...' : '🤖 Analyze Video'}
              </button>
              <button
                className="btn btn-outline"
                onClick={handleReset}
                disabled={isProcessing}
              >
                ✨ New Video
              </button>
            </div>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Analyzing video... {elapsedSeconds}s</p>
        </div>
      )}

      {isGroupPrompt && capsuleGroupResult && !capsuleGroupResult.error && (
        <div className="results">
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
          <h2>Identification Results</h2>
          <p className="subtitle" style={{ marginBottom: '1rem' }}>
            {Array.isArray(results) ? results.length : 0} object{Array.isArray(results) && results.length !== 1 ? 's' : ''} identified
          </p>

          {Array.isArray(results) && results.length > 0 ? (
            results.map((result, index) => renderProductDetails(result, index))
          ) : (
            <div className="result-item">
              <p>No objects detected in the video.</p>
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

      <RequestDuration durationMs={requestDurationMs} label="Request" />
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

export default MultiObjectVideoIdentification;
