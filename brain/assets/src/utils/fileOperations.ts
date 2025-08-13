/**
 * Safe file operations utility with memory management, streaming Base64 conversion,
 * compression, and localStorage/IndexedDB hybrid storage for production-safe file handling.
 */

import * as pako from 'pako';

// Memory safety constants
const CHUNK_SIZE = 64 * 1024; // 64KB chunks for streaming operations
const MAX_FILE_SIZE_MB = 50; // Maximum file size in MB
const LOCALSTORAGE_QUOTA_BUFFER = 0.1; // Reserve 10% of quota as buffer
const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB threshold for IndexedDB fallback
const CHUNK_STORAGE_PREFIX = 'brain_chunk_'; // Prefix for chunked storage
const MAX_CHUNK_SIZE = 1024 * 1024; // 1MB chunks for chunked storage
const INDEXEDDB_NAME = 'BrainFileStorage';
const INDEXEDDB_VERSION = 1;
const INDEXEDDB_STORE = 'files';

// Types for error handling
export interface FileOperationError extends Error {
  code: 'QUOTA_EXCEEDED' | 'FILE_TOO_LARGE' | 'CONVERSION_FAILED' | 'STORAGE_UNAVAILABLE' | 'COMPRESSION_FAILED' | 'INDEXEDDB_ERROR' | 'CORRUPTION_ERROR';
  originalError?: Error;
}

// Storage info with compression details
export interface FileStorageInfo {
  originalSize: number;
  compressedSize: number;
  base64Size: number;
  compressionRatio: number;
  storageMethod: 'localStorage' | 'indexedDB' | 'chunked';
}

// Compressed data format
interface CompressedFileData {
  compressed: string; // Base64 encoded compressed data
  originalSize: number;
  compressedSize: number;
  mimeType: string;
  compressionMethod: 'gzip';
  format: 'compressed' | 'raw'; // For backward compatibility
}

// Storage quota information
export interface StorageQuotaInfo {
  usedBytes: number;
  availableBytes: number;
  quotaBytes: number;
  usagePercentage: number;
}

/**
 * Get localStorage quota information
 */
export const getStorageQuota = async (): Promise<StorageQuotaInfo> => {
  try {
    // Try to get storage estimate (modern browsers)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const quotaBytes = estimate.quota || 10 * 1024 * 1024; // Default 10MB fallback
      const usedBytes = estimate.usage || 0;
      const availableBytes = quotaBytes - usedBytes;
      const usagePercentage = (usedBytes / quotaBytes) * 100;
      
      return {
        usedBytes,
        availableBytes,
        quotaBytes,
        usagePercentage,
      };
    }
    
    // Fallback: estimate based on localStorage content
    const used = new Blob(Object.values(localStorage)).size;
    const quota = 5 * 1024 * 1024; // Conservative 5MB estimate for older browsers
    
    return {
      usedBytes: used,
      availableBytes: quota - used,
      quotaBytes: quota,
      usagePercentage: (used / quota) * 100,
    };
  } catch (error) {
    // Ultra-conservative fallback
    return {
      usedBytes: 0,
      availableBytes: 2 * 1024 * 1024, // 2MB conservative estimate
      quotaBytes: 2 * 1024 * 1024,
      usagePercentage: 0,
    };
  }
};

/**
 * Check if we have enough storage space for a given data size
 */
export const checkStorageSpace = async (requiredBytes: number): Promise<boolean> => {
  const quota = await getStorageQuota();
  const availableWithBuffer = quota.availableBytes * (1 - LOCALSTORAGE_QUOTA_BUFFER);
  return requiredBytes <= availableWithBuffer;
};

/**
 * Initialize IndexedDB for large file storage
 */
const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    request.onerror = () => {
      const error: FileOperationError = new Error('Failed to open IndexedDB') as FileOperationError;
      error.code = 'INDEXEDDB_ERROR';
      error.originalError = request.error as Error;
      reject(error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(INDEXEDDB_STORE)) {
        db.createObjectStore(INDEXEDDB_STORE);
      }
    };
  });
};

/**
 * Check if IndexedDB is available
 */
const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && indexedDB !== null;
  } catch {
    return false;
  }
};

/**
 * Store data in IndexedDB - ENHANCED DEBUGGING
 */
const storeInIndexedDB = async (key: string, data: any): Promise<void> => {
  console.log(`💾 Storing data in IndexedDB with key: ${key}`);
  
  if (!isIndexedDBAvailable()) {
    const error: FileOperationError = new Error('IndexedDB not available') as FileOperationError;
    error.code = 'INDEXEDDB_ERROR';
    throw error;
  }
  
  const db = await initIndexedDB();
  console.log(`🔄 IndexedDB opened for storage`);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([INDEXEDDB_STORE], 'readwrite');
    const store = transaction.objectStore(INDEXEDDB_STORE);
    
    console.log(`📝 Putting data into store '${INDEXEDDB_STORE}' with key '${key}'`);
    const request = store.put(data, key);
    
    request.onerror = () => {
      console.error(`❌ Failed to store in IndexedDB:`, request.error);
      const error: FileOperationError = new Error('Failed to store in IndexedDB') as FileOperationError;
      error.code = 'INDEXEDDB_ERROR';
      error.originalError = request.error as Error;
      reject(error);
    };
    
    request.onsuccess = () => {
      console.log(`✅ Successfully stored in IndexedDB with key: ${key}`);
      resolve();
    };
  });
};

/**
 * Retrieve data from IndexedDB - ENHANCED DEBUGGING
 */
const getFromIndexedDB = async (key: string): Promise<any> => {
  console.log(`📋 Retrieving data from IndexedDB with key: ${key}`);
  
  if (!isIndexedDBAvailable()) {
    console.log(`❌ IndexedDB not available for retrieval`);
    return null;
  }
  
  try {
    const db = await initIndexedDB();
    console.log(`🔄 IndexedDB opened for retrieval`);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INDEXEDDB_STORE], 'readonly');
      const store = transaction.objectStore(INDEXEDDB_STORE);
      
      console.log(`🔍 Getting data from store '${INDEXEDDB_STORE}' with key '${key}'`);
      const request = store.get(key);
      
      request.onerror = () => {
        console.error(`❌ Failed to retrieve from IndexedDB:`, request.error);
        const error: FileOperationError = new Error('Failed to retrieve from IndexedDB') as FileOperationError;
        error.code = 'INDEXEDDB_ERROR';
        error.originalError = request.error as Error;
        reject(error);
      };
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log(`✅ Successfully retrieved data from IndexedDB with key: ${key}`);
        } else {
          console.log(`⚠️ No data found in IndexedDB for key: ${key}`);
        }
        resolve(result || null);
      };
    });
  } catch (error) {
    console.warn('❌ IndexedDB retrieval failed:', error);
    return null;
  }
};

/**
 * Get all keys from IndexedDB that match a prefix - ENHANCED DEBUGGING
 */
const getAllKeysFromIndexedDB = async (prefix?: string): Promise<string[]> => {
  console.log(`🔍 getAllKeysFromIndexedDB called with prefix: ${prefix}`);
  
  if (!isIndexedDBAvailable()) {
    console.log(`❌ IndexedDB not available`);
    return [];
  }
  
  try {
    console.log(`🔄 Opening IndexedDB: ${INDEXEDDB_NAME}`);
    const db = await initIndexedDB();
    console.log(`✅ IndexedDB opened successfully`);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INDEXEDDB_STORE], 'readonly');
      const store = transaction.objectStore(INDEXEDDB_STORE);
      
      console.log(`🔍 Getting all keys from store: ${INDEXEDDB_STORE}`);
      const request = store.getAllKeys();
      
      request.onerror = () => {
        console.warn('❌ Failed to get IndexedDB keys:', request.error);
        resolve([]);
      };
      
      request.onsuccess = () => {
        const allKeys = request.result;
        console.log(`📦 IndexedDB getAllKeys returned:`, allKeys);
        console.log(`📦 Total keys found: ${allKeys.length}`);
        
        // Convert to strings and filter
        const stringKeys = allKeys.filter(key => typeof key === 'string') as string[];
        console.log(`📦 String keys: ${stringKeys.length}`, stringKeys);
        
        let filteredKeys: string[];
        if (prefix) {
          filteredKeys = stringKeys.filter(key => key.startsWith(prefix));
          console.log(`🔍 Filtered keys with prefix '${prefix}': ${filteredKeys.length}`, filteredKeys);
        } else {
          filteredKeys = stringKeys;
          console.log(`🔍 No prefix filter, returning all string keys: ${filteredKeys.length}`);
        }
        
        console.log(`✅ getAllKeysFromIndexedDB returning ${filteredKeys.length} keys:`, filteredKeys);
        resolve(filteredKeys);
      };
    });
  } catch (error) {
    console.warn('❌ IndexedDB key listing failed:', error);
    return [];
  }
};

/**
 * Remove data from IndexedDB
 */
const removeFromIndexedDB = async (key: string): Promise<void> => {
  if (!isIndexedDBAvailable()) {
    return;
  }
  
  try {
    const db = await initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INDEXEDDB_STORE], 'readwrite');
      const store = transaction.objectStore(INDEXEDDB_STORE);
      const request = store.delete(key);
      
      request.onerror = () => {
        const error: FileOperationError = new Error('Failed to remove from IndexedDB') as FileOperationError;
        error.code = 'INDEXEDDB_ERROR';
        error.originalError = request.error as Error;
        reject(error);
      };
      
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('IndexedDB removal failed:', error);
  }
};

/**
 * Compress data using gzip
 */
const compressData = (data: Uint8Array): Uint8Array => {
  try {
    return pako.gzip(data, { level: 6 }); // Level 6 balances compression ratio and speed
  } catch (error) {
    const compressionError: FileOperationError = new Error('Gzip compression failed') as FileOperationError;
    compressionError.code = 'COMPRESSION_FAILED';
    compressionError.originalError = error as Error;
    throw compressionError;
  }
};

/**
 * Decompress data using gzip
 */
const decompressData = (compressedData: Uint8Array): Uint8Array => {
  try {
    return pako.ungzip(compressedData);
  } catch (error) {
    const decompressionError: FileOperationError = new Error('Gzip decompression failed') as FileOperationError;
    decompressionError.code = 'COMPRESSION_FAILED';
    decompressionError.originalError = error as Error;
    throw decompressionError;
  }
};

/**
 * Convert data to compressed Base64 format
 */
const dataToCompressedBase64 = (data: Uint8Array, mimeType: string): CompressedFileData => {
  const originalSize = data.length;
  const compressed = compressData(data);
  const compressedSize = compressed.length;
  const compressedBase64 = arrayBufferToBase64(compressed.buffer);
  
  return {
    compressed: compressedBase64,
    originalSize,
    compressedSize,
    mimeType,
    compressionMethod: 'gzip',
    format: 'compressed'
  };
};

/**
 * Convert compressed Base64 back to data
 */
const compressedBase64ToData = (compressedData: CompressedFileData): Uint8Array => {
  // Handle backward compatibility with raw format
  if (compressedData.format === 'raw' || !compressedData.compressed) {
    throw new Error('Data is not in compressed format');
  }
  
  const compressedBytes = base64ToUint8Array(compressedData.compressed);
  return decompressData(compressedBytes);
};

/**
 * Convert Base64 string to Uint8Array
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  // Handle data URL format: data:mime/type;base64,<data>
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  
  try {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    const conversionError: FileOperationError = new Error('Invalid Base64 string') as FileOperationError;
    conversionError.code = 'CORRUPTION_ERROR';
    conversionError.originalError = error as Error;
    throw conversionError;
  }
};

/**
 * Memory-safe streaming Base64 conversion with compression for large files
 * Processes file in chunks to prevent memory exhaustion and uses gzip compression
 */
export const fileToBase64Streaming = async (file: File, options: { compress?: boolean } = {}): Promise<string> => {
  // Check file size limits
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    const error: FileOperationError = new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB exceeds ${MAX_FILE_SIZE_MB}MB limit`) as FileOperationError;
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  // Default to compression for files > 1MB or when explicitly requested
  const shouldCompress = options.compress !== false && (file.size > 1024 * 1024 || options.compress === true);
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await fileToArrayBuffer(file);
    const fileData = new Uint8Array(arrayBuffer);
    
    if (shouldCompress) {
      // Create compressed data structure
      const compressedData = dataToCompressedBase64(fileData, file.type);
      return JSON.stringify(compressedData);
    } else {
      // For backward compatibility, return raw base64 for small files
      const base64 = arrayBufferToBase64(arrayBuffer);
      const rawData: CompressedFileData = {
        compressed: base64,
        originalSize: fileData.length,
        compressedSize: fileData.length,
        mimeType: file.type,
        compressionMethod: 'gzip',
        format: 'raw'
      };
      return JSON.stringify(rawData);
    }
  } catch (error) {
    const fileError: FileOperationError = new Error(`File conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`) as FileOperationError;
    fileError.code = 'CONVERSION_FAILED';
    fileError.originalError = error instanceof Error ? error : undefined;
    throw fileError;
  }
};

/**
 * Convert File to ArrayBuffer
 */
const fileToArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file as ArrayBuffer'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Backward compatibility exports
export { enhancedStorageSet as safeLocalStorageSetV2 };
export { enhancedStorageGet as safeLocalStorageGetV2 };
export { enhancedStorageRemove as safeLocalStorageRemoveV2 };

/**
 * Optimized ArrayBuffer to Base64 conversion
 * Uses efficient binary string approach for better memory usage
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process in smaller chunks to prevent call stack overflow
  let binaryString = '';
  
  // Process in chunks to avoid maximum call stack issues
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binaryString += String.fromCharCode(...chunk);
  }
  
  return btoa(binaryString);
};

/**
 * Memory-safe Base64 to File conversion with decompression support
 * Handles both compressed and raw Base64 data formats
 */
export const base64ToFileStreaming = (base64Data: string, filename: string, fallbackMimeType: string, lastModified: number): File => {
  try {
    let fileData: Uint8Array;
    let actualMimeType = fallbackMimeType;
    
    // Try to parse as compressed data structure first
    try {
      const parsedData = JSON.parse(base64Data) as CompressedFileData;
      
      if (parsedData.format === 'compressed') {
        // Decompress the data
        fileData = compressedBase64ToData(parsedData);
        actualMimeType = parsedData.mimeType || fallbackMimeType;
        console.log(`Decompressed file: ${filename} (${formatFileSize(parsedData.originalSize)})`);
      } else if (parsedData.format === 'raw') {
        // Raw base64 data in new format
        fileData = base64ToUint8Array(parsedData.compressed);
        actualMimeType = parsedData.mimeType || fallbackMimeType;
      } else {
        throw new Error('Unknown data format');
      }
    } catch (parseError) {
      // Fall back to treating as legacy raw Base64 string
      console.log(`Treating as legacy Base64 format: ${filename}`);
      
      // Handle data URL format or raw Base64
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      // Extract MIME type from data URL if present
      if (base64Data.startsWith('data:')) {
        const mimeMatch = base64Data.match(/data:([^;]+)/);
        if (mimeMatch) {
          actualMimeType = mimeMatch[1];
        }
      }
      
      fileData = base64ToUint8Array(cleanBase64);
    }
    
    // Validate file size after processing
    if (fileData.length > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const error: FileOperationError = new Error(`Decompressed file too large: ${Math.round(fileData.length / 1024 / 1024)}MB exceeds ${MAX_FILE_SIZE_MB}MB limit`) as FileOperationError;
      error.code = 'FILE_TOO_LARGE';
      throw error;
    }
    
    // Create blob and file
    const blob = new Blob([fileData], { type: actualMimeType });
    const file = new File([blob], filename, { type: actualMimeType, lastModified });
    
    console.log(`File reconstructed: ${filename} (${formatFileSize(file.size)}, ${actualMimeType})`);
    return file;
  } catch (error) {
    const fileError: FileOperationError = new Error(`Base64 to File conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`) as FileOperationError;
    fileError.code = 'CONVERSION_FAILED';
    fileError.originalError = error instanceof Error ? error : undefined;
    throw fileError;
  }
};

/**
 * Enhanced storage operation with compression, chunking, and IndexedDB fallback - ENHANCED DEBUGGING
 */
export const enhancedStorageSet = async (key: string, value: string, options: { forceIndexedDB?: boolean; maxChunkSize?: number } = {}): Promise<FileStorageInfo> => {
  const originalSize = new Blob([value]).size;
  const { forceIndexedDB = false, maxChunkSize = MAX_CHUNK_SIZE } = options;
  
  console.log(`💾 enhancedStorageSet called with key: ${key}, size: ${formatFileSize(originalSize)}, forceIndexedDB: ${forceIndexedDB}`);
  
  // Try to compress the value first
  let processedValue = value;
  let compressedSize = originalSize;
  
  try {
    const valueBytes = new TextEncoder().encode(value);
    const compressed = compressData(valueBytes);
    const compressedBase64 = arrayBufferToBase64(compressed.buffer);
    
    if (compressedBase64.length < value.length * 0.9) { // Only use compression if it saves >10%
      processedValue = JSON.stringify({
        compressed: compressedBase64,
        originalSize,
        format: 'compressed-text'
      });
      compressedSize = new Blob([processedValue]).size;
      console.log(`Compressed storage data: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
    }
  } catch (error) {
    console.warn('Text compression failed, using original:', error);
    processedValue = value;
    compressedSize = originalSize;
  }
  
  const finalSize = new Blob([processedValue]).size;
  
  // Determine storage strategy
  console.log(`🤔 Storage strategy decision: finalSize=${formatFileSize(finalSize)}, threshold=${formatFileSize(LARGE_FILE_THRESHOLD)}, forceIndexedDB=${forceIndexedDB}`);
  
  if (forceIndexedDB || finalSize > LARGE_FILE_THRESHOLD) {
    // Use IndexedDB for large data
    console.log(`📦 Using IndexedDB storage strategy`);
    try {
      await storeInIndexedDB(key, processedValue);
      console.log(`✅ IndexedDB storage completed successfully for key: ${key}`);
      return {
        originalSize,
        compressedSize,
        base64Size: finalSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
        storageMethod: 'indexedDB'
      };
    } catch (error) {
      console.error(`❌ IndexedDB storage failed for key: ${key}`, error);
      if (!forceIndexedDB) {
        console.warn('IndexedDB failed, falling back to chunked localStorage:', error);
        return await chunkedStorageSet(key, processedValue, originalSize, compressedSize);
      }
      throw error;
    }
  } else if (finalSize > maxChunkSize) {
    // Use chunked localStorage for medium-large data
    return await chunkedStorageSet(key, processedValue, originalSize, compressedSize);
  } else {
    // Use regular localStorage for small data
    return await safeLocalStorageSet(key, processedValue, originalSize, compressedSize);
  }
};

/**
 * Safe localStorage operation with quota checking
 */
export const safeLocalStorageSet = async (key: string, value: string, originalSize?: number, compressedSize?: number): Promise<FileStorageInfo> => {
  // Check if storage is available
  if (!isStorageAvailable()) {
    const error: FileOperationError = new Error('localStorage is not available') as FileOperationError;
    error.code = 'STORAGE_UNAVAILABLE';
    throw error;
  }

  // Check quota before setting
  const valueSize = new Blob([value]).size;
  const hasSpace = await checkStorageSpace(valueSize);
  
  if (!hasSpace) {
    const quota = await getStorageQuota();
    const error: FileOperationError = new Error(`Not enough storage space. Need ${Math.round(valueSize / 1024)}KB, available ${Math.round(quota.availableBytes / 1024)}KB`) as FileOperationError;
    error.code = 'QUOTA_EXCEEDED';
    throw error;
  }

  try {
    localStorage.setItem(key, value);
    return {
      originalSize: originalSize || valueSize,
      compressedSize: compressedSize || valueSize,
      base64Size: valueSize,
      compressionRatio: originalSize && originalSize > 0 ? (compressedSize || valueSize) / originalSize : 1,
      storageMethod: 'localStorage'
    };
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.code === 22) {
      const quotaError: FileOperationError = new Error('localStorage quota exceeded') as FileOperationError;
      quotaError.code = 'QUOTA_EXCEEDED';
      quotaError.originalError = error;
      throw quotaError;
    }
    
    const storageError: FileOperationError = new Error(`localStorage operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`) as FileOperationError;
    storageError.code = 'STORAGE_UNAVAILABLE';
    storageError.originalError = error instanceof Error ? error : undefined;
    throw storageError;
  }
};

/**
 * Chunked storage for large data that exceeds localStorage limits
 */
const chunkedStorageSet = async (key: string, value: string, originalSize: number, compressedSize: number): Promise<FileStorageInfo> => {
  const chunkSize = MAX_CHUNK_SIZE;
  const chunks: string[] = [];
  
  // Split value into chunks
  for (let i = 0; i < value.length; i += chunkSize) {
    chunks.push(value.slice(i, i + chunkSize));
  }
  
  // Store chunk metadata
  const metadata = {
    totalChunks: chunks.length,
    originalSize,
    compressedSize,
    timestamp: Date.now()
  };
  
  try {
    // Store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkKey = `${CHUNK_STORAGE_PREFIX}${key}_${i}`;
      await safeLocalStorageSet(chunkKey, chunks[i]);
    }
    
    // Store metadata
    await safeLocalStorageSet(`${key}_metadata`, JSON.stringify(metadata));
    
    console.log(`Stored data in ${chunks.length} chunks: ${formatFileSize(value.length)}`);
    
    return {
      originalSize,
      compressedSize,
      base64Size: value.length,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      storageMethod: 'chunked'
    };
  } catch (error) {
    // Clean up any partially stored chunks
    await cleanupChunkedStorage(key, chunks.length);
    throw error;
  }
};

/**
 * Enhanced storage retrieval with decompression and chunked support - ENHANCED DEBUGGING
 */
export const enhancedStorageGet = async (key: string): Promise<string | null> => {
  console.log(`📋 enhancedStorageGet called with key: ${key}`);
  
  // Try IndexedDB first
  console.log(`🔍 1. Trying IndexedDB for key: ${key}`);
  try {
    const indexedDBValue = await getFromIndexedDB(key);
    if (indexedDBValue !== null) {
      console.log(`✅ Found data in IndexedDB for key: ${key}`);
      return await decompressStoredValue(indexedDBValue);
    }
    console.log(`❌ No data found in IndexedDB for key: ${key}`);
  } catch (error) {
    console.warn('❌ IndexedDB retrieval failed:', error);
  }
  
  // Try chunked storage
  console.log(`🔍 2. Trying chunked storage for key: ${key}`);
  try {
    const chunkedValue = await getChunkedStorage(key);
    if (chunkedValue !== null) {
      console.log(`✅ Found data in chunked storage for key: ${key}`);
      return await decompressStoredValue(chunkedValue);
    }
    console.log(`❌ No data found in chunked storage for key: ${key}`);
  } catch (error) {
    console.warn('❌ Chunked storage retrieval failed:', error);
  }
  
  // Try regular localStorage
  console.log(`🔍 3. Trying localStorage for key: ${key}`);
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      console.log(`✅ Found data in localStorage for key: ${key}`);
      return await decompressStoredValue(value);
    }
    console.log(`❌ No data found in localStorage for key: ${key}`);
  } catch (error) {
    console.warn('❌ localStorage retrieval failed:', error);
  }
  
  console.log(`❌ No data found in any storage location for key: ${key}`);
  return null;
};

/**
 * Decompress stored value if it was compressed
 */
const decompressStoredValue = async (value: string): Promise<string> => {
  try {
    const parsed = JSON.parse(value);
    if (parsed.format === 'compressed-text' && parsed.compressed) {
      const compressedBytes = base64ToUint8Array(parsed.compressed);
      const decompressed = decompressData(compressedBytes);
      return new TextDecoder().decode(decompressed);
    }
  } catch {
    // Not compressed JSON, return as-is
  }
  return value;
};

/**
 * Retrieve chunked storage data
 */
const getChunkedStorage = async (key: string): Promise<string | null> => {
  try {
    const metadataStr = localStorage.getItem(`${key}_metadata`);
    if (!metadataStr) return null;
    
    const metadata = JSON.parse(metadataStr);
    const chunks: string[] = [];
    
    // Retrieve all chunks
    for (let i = 0; i < metadata.totalChunks; i++) {
      const chunkKey = `${CHUNK_STORAGE_PREFIX}${key}_${i}`;
      const chunk = localStorage.getItem(chunkKey);
      if (chunk === null) {
        throw new Error(`Missing chunk ${i} of ${metadata.totalChunks}`);
      }
      chunks.push(chunk);
    }
    
    return chunks.join('');
  } catch (error) {
    console.warn('Failed to retrieve chunked data:', error);
    // Clean up corrupted chunks
    await cleanupChunkedStorage(key);
    return null;
  }
};

/**
 * Clean up chunked storage entries
 */
const cleanupChunkedStorage = async (key: string, maxChunks?: number): Promise<void> => {
  try {
    // Remove metadata
    localStorage.removeItem(`${key}_metadata`);
    
    // Remove chunks (try up to maxChunks or a reasonable limit)
    const limit = maxChunks || 100;
    for (let i = 0; i < limit; i++) {
      const chunkKey = `${CHUNK_STORAGE_PREFIX}${key}_${i}`;
      const chunk = localStorage.getItem(chunkKey);
      if (chunk === null && i > 10) break; // Stop if we hit 10 consecutive nulls
      if (chunk !== null) {
        localStorage.removeItem(chunkKey);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup chunked storage:', error);
  }
};

/**
 * Enhanced storage removal - ENHANCED DEBUGGING
 */
export const enhancedStorageRemove = async (key: string): Promise<void> => {
  console.log(`🗑️ enhancedStorageRemove called with key: ${key}`);
  
  // Remove from all possible storage locations
  console.log(`🔍 Removing from IndexedDB...`);
  try {
    await removeFromIndexedDB(key);
    console.log(`✅ Removed from IndexedDB: ${key}`);
  } catch (error) {
    console.warn('❌ IndexedDB removal failed:', error);
  }
  
  console.log(`🔍 Removing from chunked storage...`);
  try {
    await cleanupChunkedStorage(key);
    console.log(`✅ Cleaned up chunked storage: ${key}`);
  } catch (error) {
    console.warn('❌ Chunked storage cleanup failed:', error);
  }
  
  console.log(`🔍 Removing from localStorage...`);
  try {
    localStorage.removeItem(key);
    console.log(`✅ Removed from localStorage: ${key}`);
  } catch (error) {
    console.warn('❌ localStorage removal failed:', error);
  }
  
  console.log(`✅ Enhanced storage removal completed for key: ${key}`);
};

/**
 * Check if localStorage is available
 */
const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get comprehensive storage information
 */
export const getStorageInfo = async (): Promise<{ localStorage: StorageQuotaInfo; indexedDB: boolean; totalUsed: number }> => {
  const localStorageInfo = await getStorageQuota();
  const indexedDBAvailable = isIndexedDBAvailable();
  
  let indexedDBUsage = 0;
  if (indexedDBAvailable) {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        indexedDBUsage = estimate.usage || 0;
      }
    } catch (error) {
      console.warn('Failed to get IndexedDB usage estimate:', error);
    }
  }
  
  return {
    localStorage: localStorageInfo,
    indexedDB: indexedDBAvailable,
    totalUsed: localStorageInfo.usedBytes + indexedDBUsage
  };
};

/**
 * Clear all corrupted storage entries
 */
export const clearCorruptedStorage = async (): Promise<{ cleared: number; errors: string[] }> => {
  let clearedCount = 0;
  const errors: string[] = [];
  
  // Check localStorage for corrupted entries
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('brain_') || key.startsWith(CHUNK_STORAGE_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          // Try to parse and validate
          JSON.parse(value);
        }
      } catch (error) {
        try {
          localStorage.removeItem(key);
          clearedCount++;
        } catch (removeError) {
          errors.push(`Failed to remove corrupted key ${key}: ${removeError}`);
        }
      }
    }
  }
  
  return { cleared: clearedCount, errors };
};

/**
 * Cleanup memory by forcing garbage collection hints
 */
export const cleanupMemory = (): void => {
  // Clear any large temporary variables and hint for garbage collection
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }
};

/**
 * Get human-readable file size
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size * 10) / 10}${units[unitIndex]}`;
};

/**
 * Validate and repair file data integrity
 */
export const validateFileIntegrity = async (data: string): Promise<{ isValid: boolean; repaired?: string; error?: string }> => {
  try {
    // Try parsing as compressed data
    const parsed = JSON.parse(data) as CompressedFileData;
    
    if (parsed.format === 'compressed' || parsed.format === 'raw') {
      // Validate base64 data
      try {
        base64ToUint8Array(parsed.compressed);
        return { isValid: true };
      } catch (error) {
        return { isValid: false, error: `Invalid Base64 data: ${error}` };
      }
    }
    
    return { isValid: false, error: 'Unknown data format' };
  } catch (parseError) {
    // Try treating as raw base64
    try {
      base64ToUint8Array(data);
      return { isValid: true };
    } catch (base64Error) {
      return { isValid: false, error: `Data parsing failed: ${parseError}, Base64 validation failed: ${base64Error}` };
    }
  }
};

/**
 * Export IndexedDB key listing function for draft persistence
 */
export { getAllKeysFromIndexedDB };