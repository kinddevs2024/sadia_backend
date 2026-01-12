import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { uploadBufferToBlob } from '../lib/blob-storage';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  costPrice: number;
  profit: number;
  categoryId: string;
  stock: number;
  active_for_pos: boolean;
  sku: string;
  images?: string[];
  createdAt: string;
}

/**
 * Download image from URL and return as buffer
 */
function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Upload fake images to Vercel Blob Storage and update products
 */
async function addFakeImagesToProducts() {
  try {
    console.log('Starting to add fake images to products...');

    // Read products.json
    const productsPath = path.join(__dirname, '../data/collections/products.json');
    const productsData = fs.readFileSync(productsPath, 'utf-8');
    const products: Product[] = JSON.parse(productsData);

    console.log(`Found ${products.length} products`);

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`Processing product ${i + 1}/${products.length}: ${product.name}`);

      // Skip if product already has images
      if (product.images && product.images.length > 0) {
        console.log(`  Product already has ${product.images.length} images, skipping...`);
        continue;
      }

      // Determine number of images (2-3 per product)
      const numImages = Math.floor(Math.random() * 2) + 2; // 2 or 3 images
      const imageUrls: string[] = [];

      for (let j = 0; j < numImages; j++) {
        try {
          // Generate unique random number for picsum
          const randomId = Date.now() + Math.random() * 1000000;

          // Download image from picsum.photos
          const imageUrl = `https://picsum.photos/400/600?random=${randomId}`;
          console.log(`  Downloading image ${j + 1}/${numImages}...`);
          const imageBuffer = await downloadImage(imageUrl);

          // Upload to Vercel Blob Storage
          const filename = `uploads/products/${product.id}/image-${j + 1}.jpg`;
          console.log(`  Uploading to blob storage...`);
          const blobUrl = await uploadBufferToBlob(imageBuffer, filename, 'image/jpeg');

          imageUrls.push(blobUrl);
          console.log(`  ✓ Uploaded: ${blobUrl}`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`  ✗ Failed to upload image ${j + 1}:`, error);
        }
      }

      // Update product with image URLs
      product.images = imageUrls;
      console.log(`  Added ${imageUrls.length} images to product`);
    }

    // Write updated products back to file
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    console.log('\n✅ Successfully updated products.json with fake images!');
    console.log(`Total products processed: ${products.length}`);

  } catch (error) {
    console.error('❌ Error adding fake images:', error);
    process.exit(1);
  }
}

// Run the script
addFakeImagesToProducts();
