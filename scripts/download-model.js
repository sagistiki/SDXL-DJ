import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LCM Dreamshaper v7 model URLs - all components needed for inference
const BASE_URL = 'https://huggingface.co/SimianLuo/LCM_Dreamshaper_v7/resolve/main';
const MODELS_DIR = path.join(__dirname, '../public/models');

const MODEL_COMPONENTS = [
  // We already have UNet from before - keep using the old files
  { 
    url: `${BASE_URL}/unet/model.onnx`,
    path: path.join(MODELS_DIR, 'model.onnx'), // Keep old name
    name: 'UNet Model'
  },
  {
    url: `${BASE_URL}/unet/model.onnx_data`, 
    path: path.join(MODELS_DIR, 'model.onnx_data'), // Keep old name
    name: 'UNet Data'
  },
  // Text Encoder (for processing prompts) - single file ONNX
  {
    url: `${BASE_URL}/text_encoder/model.onnx`,
    path: path.join(MODELS_DIR, 'text_encoder.onnx'),
    name: 'Text Encoder'
  },
  // VAE Decoder (for converting latents to images) - single file ONNX
  {
    url: `${BASE_URL}/vae_decoder/model.onnx`,
    path: path.join(MODELS_DIR, 'vae_decoder.onnx'),
    name: 'VAE Decoder'
  }
];

async function downloadFile(url, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percentage = totalSize > 0 ? ((downloadedSize / totalSize) * 100).toFixed(1) : '0.0';
        process.stdout.write(`\r${fileName}: ${percentage}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`\n✓ ${fileName} downloaded successfully!`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadModel() {
  // Check if all model components already exist
  const allExist = MODEL_COMPONENTS.every(component => fs.existsSync(component.path));
  
  if (allExist) {
    console.log('✓ All model components already downloaded');
    return;
  }

  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('📥 Downloading LCM Dreamshaper v7 model components (this may take several minutes)...');
  console.log('Components needed: UNet, Text Encoder, VAE Decoder');

  try {
    for (const component of MODEL_COMPONENTS) {
      if (!fs.existsSync(component.path)) {
        console.log(`\n📦 Downloading ${component.name}...`);
        await downloadFile(component.url, component.path, component.name);
      } else {
        console.log(`✓ ${component.name} already exists`);
      }
    }
    
    console.log('\n✓ All model components downloaded successfully!');
    console.log('📊 Model components ready for inference:');
    MODEL_COMPONENTS.forEach(component => {
      if (fs.existsSync(component.path)) {
        const stats = fs.statSync(component.path);
        console.log(`  - ${component.name}: ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
      }
    });
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

// Run the download
downloadModel().catch(console.error);