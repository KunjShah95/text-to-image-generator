document.addEventListener('DOMContentLoaded', async () => {
    const generateBtn = document.getElementById('generate-btn');
    const promptInput = document.getElementById('prompt');
    const modelSelect = document.getElementById('model');
    const numImagesInput = document.getElementById('num-images');
    const loadingIndicator = document.getElementById('loading');
    const resultsContainer = document.getElementById('results');
    const errorContainer = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');

    // Load API token from .env file
    let API_TOKEN = "";
    
    try {
        const response = await fetch('../.env');
        if (response.ok) {
            const envText = await response.text();
            const envVars = parseEnvFile(envText);
            API_TOKEN = envVars.HUGGINGFACE_API_TOKEN;
        } else {
            console.error('Failed to load .env file');
        }
    } catch (error) {
        console.error('Error loading .env file:', error);
    }

    function parseEnvFile(envText) {
        const envVars = {};
        const lines = envText.split('\n');
        
        lines.forEach(line => {
            // Skip empty lines and comments
            if (!line || line.startsWith('#')) return;
            
            const equalSignPosition = line.indexOf('=');
            if (equalSignPosition !== -1) {
                const key = line.slice(0, equalSignPosition).trim();
                const value = line.slice(equalSignPosition + 1).trim();
                envVars[key] = value;
            }
        });
        
        return envVars;
    }

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const model = modelSelect.value;
        const numImages = parseInt(numImagesInput.value);
        
        if (!prompt) {
            showError("Please enter a prompt to generate images.");
            return;
        }

        if (!API_TOKEN) {
            showError("Please add your Hugging Face API token in the .env file.");
            return;
        }

        // Clear previous results and errors
        resultsContainer.innerHTML = '';
        hideError();

        // Show loading indicator
        showLoading();

        try {
            const images = await generateImages(prompt, model, numImages);
            displayResults(images);
        } catch (error) {
            showError(error.message || "Failed to generate images. Please try again.");
        } finally {
            // Hide loading indicator
            hideLoading();
        }
    });

    async function generateImages(prompt, model, numImages) {
        const images = [];
        const maxRetries = 5; // Maximum number of retries for model loading
        const retryDelay = 2000; // Delay between retries in milliseconds
        
        try {
            // Make multiple requests if more than one image is requested
            for (let i = 0; i < numImages; i++) {
                let retries = 0;
                let success = false;
                
                while (!success && retries < maxRetries) {
                    try {
                        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${API_TOKEN}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ inputs: prompt })
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            
                            // Check if model is still loading
                            if (errorData.error && errorData.error.includes("loading")) {
                                console.log(`Model ${model} is still loading. Retrying in ${retryDelay/1000} seconds...`);
                                errorMessage.textContent = `Model is loading, please wait... (Attempt ${retries + 1}/${maxRetries})`;
                                errorContainer.classList.remove('hidden');
                                
                                // Wait before retrying
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                                retries++;
                                continue;
                            } else {
                                // Some other error
                                throw new Error(errorData.error || "API request failed");
                            }
                        }

                        // Get the image data as blob
                        const blob = await response.blob();
                        
                        // Check if the response is actually an image (some errors return JSON as blob)
                        if (blob.type.startsWith('image/') || blob.type === 'application/octet-stream') {
                            const imageUrl = URL.createObjectURL(blob);
                            images.push({ url: imageUrl, prompt });
                            success = true;
                        } else {
                            // Handle case where response is not an image
                            const text = await blob.text();
                            try {
                                const errorObj = JSON.parse(text);
                                throw new Error(errorObj.error || "Received invalid response format");
                            } catch (e) {
                                throw new Error("Received invalid response format");
                            }
                        }
                    } catch (error) {
                        if (error.message && error.message.includes("loading") && retries < maxRetries) {
                            retries++;
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        } else if (retries >= maxRetries - 1) {
                            throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
                        } else {
                            throw error;
                        }
                    }
                }
                
                if (!success) {
                    throw new Error(`Failed to generate image after ${maxRetries} attempts`);
                }
            }
            
            return images;
        } catch (error) {
            console.error("Error generating images:", error);
            throw error;
        }
    }

    function displayResults(images) {
        images.forEach((image, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'bg-white rounded-lg shadow overflow-hidden';
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.prompt;
            img.className = 'w-full h-64 object-cover';
            img.id = `generated-image-${index}`;
            
            const cardBody = document.createElement('div');
            cardBody.className = 'p-4';
            
            const promptText = document.createElement('p');
            promptText.className = 'text-gray-600 text-sm line-clamp-2';
            promptText.textContent = image.prompt;
            
            // Enhanced Download section with options
            const downloadSection = document.createElement('div');
            downloadSection.className = 'mt-3 flex flex-col space-y-2';
            
            // Download button
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'bg-secondary hover:bg-green-600 text-white text-sm py-2 px-4 rounded transition duration-300 flex items-center justify-center';
            downloadBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Image
            `;
            
            // Format selection
            const formatSelector = document.createElement('div');
            formatSelector.className = 'flex items-center justify-between';
            
            const formatLabel = document.createElement('span');
            formatLabel.className = 'text-xs text-gray-500';
            formatLabel.textContent = 'Format:';
            
            const formatSelect = document.createElement('select');
            formatSelect.className = 'text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1';
            formatSelect.innerHTML = `
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
            `;
            
            formatSelector.appendChild(formatLabel);
            formatSelector.appendChild(formatSelect);
            
            // Filename input
            const filenameContainer = document.createElement('div');
            filenameContainer.className = 'flex items-center justify-between';
            
            const filenameLabel = document.createElement('span');
            filenameLabel.className = 'text-xs text-gray-500';
            filenameLabel.textContent = 'Filename:';
            
            const filenameInput = document.createElement('input');
            filenameInput.type = 'text';
            filenameInput.className = 'text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 w-36';
            filenameInput.value = `ai-image-${Date.now()}-${index}`;
            
            filenameContainer.appendChild(filenameLabel);
            filenameContainer.appendChild(filenameInput);
            
            // Handle download click
            downloadBtn.addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const format = formatSelect.value;
                const filename = `${filenameInput.value}.${format}`;
                
                // Create a canvas to convert the image if needed
                const imageElement = document.getElementById(`generated-image-${index}`);
                canvas.width = imageElement.naturalWidth;
                canvas.height = imageElement.naturalHeight;
                context.drawImage(imageElement, 0, 0);
                
                // Convert to the selected format
                let mimeType = 'image/png';
                if (format === 'jpg') mimeType = 'image/jpeg';
                if (format === 'webp') mimeType = 'image/webp';
                
                canvas.toBlob(blob => {
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                }, mimeType);
            });
            
            downloadSection.appendChild(filenameContainer);
            downloadSection.appendChild(formatSelector);
            downloadSection.appendChild(downloadBtn);
            
            cardBody.appendChild(promptText);
            cardBody.appendChild(downloadSection);
            imageCard.appendChild(img);
            imageCard.appendChild(cardBody);
            
            resultsContainer.appendChild(imageCard);
        });
    }

    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    function hideLoading() {
        loadingIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
    }

    function hideError() {
        errorContainer.classList.add('hidden');
        errorMessage.textContent = '';
    }
});