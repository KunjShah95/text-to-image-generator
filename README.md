# AI Image Generator

An AI-powered image generation website using Hugging Face APIs. Create stunning images from text descriptions with state-of-the-art AI models.

## Features

- Generate images from text prompts using advanced AI models
- Select from multiple Hugging Face models including:
  - Stable Diffusion XL
  - Stable Diffusion v1.5
  - LDM Text2Image
- Generate multiple images at once
- Download images in various formats (PNG, JPG, WebP)
- Customize filenames before downloading
- Responsive design that works on mobile and desktop

## Technologies Used

- HTML5
- JavaScript (vanilla)
- Tailwind CSS v4.1
- Hugging Face API

## Setup

1. Clone this repository
2. Create a `.env` file in the root directory with your Hugging Face API key:
   ```
   HUGGINGFACE_API_TOKEN=your_api_token_here
   ```
3. Open `index.html` in your browser

## Getting a Hugging Face API Token

1. Create an account on [Hugging Face](https://huggingface.co/join)
2. Go to your profile settings
3. Navigate to the API Tokens section
4. Create a new token with read access

## License

MIT License