# 🎨 SDXL DJ - AI Visual Generator

An interactive Electron application that generates AI images in real-time using ONNX Runtime and SDXL models. Perfect for live performances, creative sessions, and AI-powered visual art.

SDXL DJ Interface ![AI Models](https://img.shields.io/badge/AI-SDXL%20%2B%20LCM-green) ![Status](https://img.shields.io/badge/Status-Working-brightgreen)

## ✨ Features

- 🎬 **Real-time AI Image Generation** - Generate images as you type with SDXL + LCM models
- 🎛️ **DJ-Style Controls** - Play/pause and stop controls with smart model management
- 🎨 **Multiple Prompts** - Blend up to 4 prompts with adjustable weights
- ⚡ **Performance Optimized** - 1-7 step generation for real-time performance
- 📊 **System Monitoring** - Live CPU, RAM, and GPU usage tracking
- 🎵 **Effects System** - Beat-synced visual effects and modulation
- 🖼️ **Flexible Resolutions** - SDXL-native resolutions from 512x512 to 1728x576
- 💾 **Smart Memory Management** - Automatic model loading/unloading

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **4GB+ RAM** (8GB+ recommended for larger models)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sdxl-dj.git
   cd sdxl-dj
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Download AI Models**
   
   Create a `public/models/` directory and download these ONNX models:
   
   ```bash
   mkdir -p public/models/tokenizer
   ```
   
   **Required Models:**
   - `model.onnx` + `model.onnx_data` - UNet diffusion model (~3.4GB)
   - `text_encoder.onnx` - CLIP text encoder (~493MB) 
   - `vae_decoder.onnx` - VAE decoder (~137MB)
   - `tokenizer/vocab.json` - CLIP vocabulary
   - `tokenizer/merges.txt` - CLIP merge rules

   > **Note:** You'll need to source compatible SDXL ONNX models. The app uses LCM (Latent Consistency Model) variants for fast generation.

4. **Start the application**
   ```bash
   npm run dev
   ```

## 🎛️ How to Use

### Basic Generation
1. **Enter a prompt** in the first prompt field (e.g., "a magical snail in a garden")
2. **Press Play** ▶️ to start generating images
3. **Adjust settings** like resolution and steps for different quality/speed trade-offs

### Controls
- **▶️ Play/Pause** - Start/pause generation (keeps models loaded)
- **⏹️ Stop** - Stop generation and unload models (frees memory)
- **🔄 Random Seed** - Generate new random variations

### Advanced Features
- **Multiple Prompts** - Enable additional prompts and blend them with weights
- **Effects Panel** - Add real-time modulation effects synced to BPM
- **Resolution Options** - Choose from SDXL-optimized resolutions
- **Quality Steps** - Balance between speed (1 step) and quality (7 steps)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │  Electron Main   │    │  ONNX Runtime   │
│  (Vite + TS)    │◄──►│    Process       │◄──►│    Models       │
│                 │    │                  │    │                 │
│ • Prompts       │    │ • Model Loading  │    │ • Text Encoder  │
│ • Controls      │    │ • Image Gen      │    │ • UNet (SDXL)   │
│ • Canvas        │    │ • IPC Handlers   │    │ • VAE Decoder   │
│ • Effects       │    │ • Memory Mgmt    │    │ • Tokenizer     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

- **Frontend** (`src/components/`)
  - `SimpleWorkspace.tsx` - Main UI and generation controls
  - `SystemMonitor.tsx` - Real-time system resource monitoring
  - `EffectsPanel.tsx` - Visual effects and modulation

- **Backend** (`electron/`)
  - `main.js` - Electron main process with ONNX model management
  - `preload.js` - Secure IPC bridge between renderer and main

- **Models** (`public/models/`)
  - SDXL UNet for diffusion
  - CLIP text encoder for prompt understanding  
  - VAE decoder for latent-to-image conversion
  - Custom CLIP tokenizer implementation

## ⚙️ Configuration

### Generation Settings

```typescript
interface GenerationConfig {
  prompt: string;              // Text description
  width: number;               // Image width (SDXL optimized)
  height: number;              // Image height (SDXL optimized) 
  steps: number;               // Quality steps (1-7)
  seed: number;                // Reproducibility seed
  cfg_scale: number;           // Guidance scale (7.5 default)
  negative_prompt?: string;    // What to avoid
}
```

### Performance Tuning

- **Memory:** Adjust Node.js heap size in `main.js` (default: 12GB)
- **Resolution:** Use 512x512 for testing, 1024x1024 for production
- **Steps:** Use 1-2 steps for real-time, 4-7 for quality
- **Models:** Ensure you have LCM-compatible SDXL models

## 🛠️ Development

### Scripts

```bash
# Development with hot reload
npm run dev

# Build for production  
npm run build

# Package as executable
npm run package

# Lint and type check
npm run lint
npm run type-check
```

### Tech Stack

- **Electron** - Desktop app framework
- **React** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **ONNX Runtime Node** - AI model inference
- **Lucide React** - Icons
- **systeminformation** - System monitoring

## 🧪 Troubleshooting

### Common Issues

**Models not loading:**
- Ensure all model files are in `public/models/`
- Check file permissions and sizes
- Verify models are ONNX format compatible with ONNX Runtime

**Out of memory:**
- Reduce resolution (try 512x512)
- Lower quality steps (try 1-2 steps)
- Increase Node.js heap size
- Use Stop button to free memory between sessions

**Poor image quality:**
- Increase quality steps (3-7)
- Use higher resolution 
- Check if models are LCM variants (optimized for few steps)
- Verify VAE decoder compatibility

**Performance issues:**
- Monitor system resources in the top panel
- Use CPU execution provider if GPU issues
- Close other memory-intensive applications

### Debug Logs

The app provides detailed console logging:
- `🎨` - Image generation events
- `📦` - Model loading/unloading
- `🔍` - Debugging information
- `❌` - Errors and fallbacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Ad§d amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Stability AI** for SDXL models
- **ONNX Runtime** team for inference engine
- **LCM** (Latent Consistency Models) for fast generation
- **Electron** community for desktop app framework


---

**Made with ❤️ for real-time AI art generation**