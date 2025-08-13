# Draft Persistence Technical Implementation Details

## Core Components

### 1. useDraftPersistence Hook
**Location**: `/assets/src/hooks/useDraftPersistence.ts`
**Purpose**: Central state management for draft operations

#### Key Features:
- Lazy draft ID generation
- Auto-save with debouncing
- Compression and storage strategy selection
- Draft discovery and loading
- Operation locking to prevent race conditions

#### Critical Functions:

```typescript
// Lazy ID generation with ref tracking
const generateDraftId = useCallback((shouldSetState = true) => {
    const newId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (shouldSetState) {
        setLazyDraftId(newId);
    }
    currentDraftIdRef.current = newId;
    return newId;
}, []);

// Save with verification
const saveDraft = useCallback(async (state, files) => {
    const effectiveDraftId = currentDraftIdRef.current || generateDraftId(false);
    const key = getDraftKey(effectiveDraftId);
    
    await enhancedStorageSet(key, JSON.stringify(draftState));
    addToDraftIndex(effectiveDraftId);
    
    // Immediate verification
    const verificationResult = await enhancedStorageGet(key);
    if (!verificationResult) {
        throw new Error('Draft save verification failed');
    }
}, []);

// Safe draft loading with corruption detection
const getAllDrafts = useCallback(async () => {
    const allDraftIds = [...localStorageIndex, ...indexedDBKeys];
    const drafts = [];
    const corruptedDrafts = [];
    
    for (const draftId of allDraftIds) {
        const draft = await loadDraft(draftId);
        
        // Only mark as corrupted if critical fields missing
        if (!draft || !draft.draftId || !draft.dealName || !draft.files) {
            corruptedDrafts.push(draftId);
        } else {
            drafts.push(draft);
        }
    }
    
    // Only delete truly corrupted drafts
    for (const id of corruptedDrafts) {
        await deleteDraft(id);
    }
    
    return drafts;
}, []);
```

### 2. FileManager Component
**Location**: `/assets/src/components/file-manager/FileManager.tsx`
**Purpose**: Main UI component for file upload and draft management

#### Key Features:
- Draft discovery on mount
- Auto-load most recent draft
- Mount guards to prevent race conditions
- Draft selection UI

#### Critical Implementation:

```typescript
// Mount guards and discovery lock
const mountedRef = useRef(true);
const discoveryInProgressRef = useRef(false);

useEffect(() => {
    const discoverAndLoadDrafts = async () => {
        // Prevent concurrent discovery
        if (!mountedRef.current || discoveryInProgressRef.current) {
            return;
        }
        
        discoveryInProgressRef.current = true;
        
        try {
            const drafts = await getAllDrafts();
            
            if (!mountedRef.current) return; // Check again after async
            
            if (drafts.length > 0) {
                // Auto-load most recent
                const mostRecent = drafts[0];
                setDiscoveredDraftId(mostRecent.draftId);
                setCurrentDraftId(mostRecent.draftId);
                loadFilesFromDraft(mostRecent);
            }
        } finally {
            if (mountedRef.current) {
                discoveryInProgressRef.current = false;
            }
        }
    };
    
    discoverAndLoadDrafts();
    
    return () => {
        mountedRef.current = false;
    };
}, []);
```

### 3. File Operations Utilities
**Location**: `/assets/src/utils/fileOperations.ts`
**Purpose**: Low-level storage operations

#### Storage Strategy Selection:

```typescript
export const enhancedStorageSet = async (key: string, value: string) => {
    const size = new Blob([value]).size;
    const threshold = 2 * 1024 * 1024; // 2MB
    
    if (size > threshold) {
        // Large files go to IndexedDB
        await storeInIndexedDB(key, value);
        return { storageMethod: 'indexedDB', size };
    }
    
    // Try compression for localStorage
    try {
        const compressed = await compressString(value);
        const compressedSize = new Blob([compressed]).size;
        
        if (compressedSize < size * 0.8) { // 20% compression benefit
            localStorage.setItem(key, compressed);
            return { storageMethod: 'localStorage-compressed', size: compressedSize };
        }
    } catch (e) {
        // Compression failed, use IndexedDB
    }
    
    // Fallback to IndexedDB
    await storeInIndexedDB(key, value);
    return { storageMethod: 'indexedDB-fallback', size };
};
```

#### IndexedDB Operations:

```typescript
const DB_NAME = 'BrainFileStorage';
const STORE_NAME = 'files';

export const storeInIndexedDB = async (key: string, value: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const putRequest = store.put(value, key);
            
            putRequest.onsuccess = () => {
                resolve();
            };
            
            putRequest.onerror = () => {
                reject(new Error(`Failed to store in IndexedDB: ${putRequest.error}`));
            };
        };
        
        request.onerror = () => {
            reject(new Error(`Failed to open IndexedDB: ${request.error}`));
        };
    });
};
```

## Data Structures

### Draft State Schema
```typescript
interface DraftState {
    draftId: string;           // Unique identifier
    dealName: string;          // Required field
    description?: string;      // Optional
    website?: string;          // Optional
    fundingTarget?: string;    // Optional
    files: FileMetadata[];     // Required array
    lastSaved: number;         // Timestamp
    version: number;           // For conflict resolution
    activeTab?: string;        // UI state
}

interface FileMetadata {
    id: string;
    name: string;
    size: number;
    type: string;
    category?: string;
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
    blobData?: string;        // Base64 encoded file content
}
```

### Storage Keys
```typescript
const STORAGE_KEY_PREFIX = 'brain_draft_deal_';
const STORAGE_INDEX_KEY = 'brain_draft_deals_index';
const CHUNK_PREFIX = '_chunk_';

// Example keys:
// Draft: brain_draft_deal_draft_1755099648235_mehhd3v5b
// Index: brain_draft_deals_index
// Chunk: brain_draft_deal_draft_1755099648235_mehhd3v5b_chunk_0
```

## Compression Implementation

### Pako Compression
```typescript
import pako from 'pako';

const compressString = async (str: string): Promise<string> => {
    try {
        const uint8Array = new TextEncoder().encode(str);
        const compressed = pako.gzip(uint8Array);
        
        // Convert to base64 for storage
        const base64 = btoa(String.fromCharCode(...compressed));
        return `gzip:${base64}`;
    } catch (error) {
        console.warn('Compression failed:', error);
        throw error;
    }
};

const decompressString = async (compressed: string): Promise<string> => {
    if (!compressed.startsWith('gzip:')) {
        return compressed; // Not compressed
    }
    
    try {
        const base64 = compressed.slice(5);
        const binary = atob(base64);
        const uint8Array = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
        }
        
        const decompressed = pako.ungzip(uint8Array);
        return new TextDecoder().decode(decompressed);
    } catch (error) {
        console.warn('Decompression failed:', error);
        throw error;
    }
};
```

## Error Handling

### Validation and Recovery
```typescript
const validateDraftIntegrity = (draft: any): ValidationResult => {
    const issues = [];
    
    // Critical fields (cause deletion if missing)
    if (!draft.draftId) issues.push({ severity: 'critical', field: 'draftId' });
    if (!draft.dealName) issues.push({ severity: 'critical', field: 'dealName' });
    if (!draft.files || !Array.isArray(draft.files)) {
        issues.push({ severity: 'critical', field: 'files' });
    }
    
    // Non-critical fields (can be recovered)
    if (typeof draft.lastSaved !== 'number') {
        draft.lastSaved = Date.now(); // Fix it
        issues.push({ severity: 'warning', field: 'lastSaved', fixed: true });
    }
    
    if (typeof draft.version !== 'number') {
        draft.version = 1; // Fix it
        issues.push({ severity: 'warning', field: 'version', fixed: true });
    }
    
    return {
        isValid: !issues.some(i => i.severity === 'critical'),
        issues,
        recovered: issues.filter(i => i.fixed).length > 0
    };
};
```

### Retry Logic
```typescript
const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;
            
            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError!;
};
```

## Performance Optimizations

### 1. Debounced Auto-Save
```typescript
const debouncedAutoSave = useMemo(
    () => debounce(async (state, files) => {
        if (!mountedRef.current) return;
        await saveDraft(state, files);
    }, 30000), // 30 seconds
    []
);
```

### 2. Chunked Base64 Conversion
```typescript
const fileToBase64Chunked = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;
        const chunks: string[] = [];
        
        const readChunk = () => {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsDataURL(slice);
        };
        
        reader.onload = (e) => {
            chunks.push(e.target!.result as string);
            offset += chunkSize;
            
            if (offset < file.size) {
                readChunk();
            } else {
                resolve(chunks.join(''));
            }
        };
        
        reader.onerror = reject;
        readChunk();
    });
};
```

### 3. Parallel File Processing
```typescript
const processFilesInParallel = async (files: File[]): Promise<FileMetadata[]> => {
    const promises = files.map(async (file) => {
        const [base64, hash] = await Promise.all([
            fileToBase64(file),
            calculateFileHash(file)
        ]);
        
        return {
            id: hash,
            name: file.name,
            size: file.size,
            type: file.type,
            blobData: base64
        };
    });
    
    return Promise.all(promises);
};
```

## Testing Utilities

### Browser Console Commands
```javascript
// Get draft index
JSON.parse(localStorage.getItem('brain_draft_deals_index') || '[]')

// Check IndexedDB contents
(async () => {
    const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('BrainFileStorage', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
    
    const tx = db.transaction(['files'], 'readonly');
    const keys = await new Promise((resolve, reject) => {
        const req = tx.objectStore('files').getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
    
    console.log('Draft keys:', keys.filter(k => k.startsWith('brain_draft_deal_')));
})();

// Load specific draft
(async () => {
    const draftId = 'draft_1755099648235_mehhd3v5b';
    const key = `brain_draft_deal_${draftId}`;
    
    // Try IndexedDB
    const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('BrainFileStorage', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
    
    const tx = db.transaction(['files'], 'readonly');
    const data = await new Promise((resolve, reject) => {
        const req = tx.objectStore('files').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
    
    if (data) {
        const draft = JSON.parse(data);
        console.log('Draft loaded:', draft);
    } else {
        console.log('Draft not found in IndexedDB');
    }
})();
```

## Monitoring and Metrics

### Key Performance Indicators
1. **Save Success Rate**: Target >99%
2. **Load Time**: Target <1 second for 10MB
3. **Compression Ratio**: Target 50-70% for PDFs
4. **Storage Efficiency**: Monitor IndexedDB usage
5. **Error Rate**: Target <0.1%

### Logging Strategy
```typescript
const LOG_LEVELS = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    CRITICAL: '🚨'
};

const log = (level: keyof typeof LOG_LEVELS, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = LOG_LEVELS[level];
    
    console.log(`${prefix} [${timestamp}] ${message}`, data || '');
    
    // Could also send to monitoring service
    if (level === 'ERROR' || level === 'CRITICAL') {
        // Send to error tracking service
    }
};
```

## Security Considerations

1. **No Sensitive Data in localStorage**: Only store draft IDs
2. **Sanitize File Names**: Prevent XSS through file names
3. **Validate File Types**: Whitelist allowed MIME types
4. **Size Limits**: Enforce maximum file sizes
5. **Rate Limiting**: Prevent abuse of auto-save

## Migration Guide

### From Old Format to New Format
```typescript
const migrateLegacyDrafts = async () => {
    // Check for old format drafts
    const oldKeys = Object.keys(localStorage).filter(k => k.startsWith('draft_'));
    
    for (const oldKey of oldKeys) {
        try {
            const oldData = localStorage.getItem(oldKey);
            if (!oldData) continue;
            
            const parsed = JSON.parse(oldData);
            
            // Convert to new format
            const newDraft: DraftState = {
                draftId: oldKey,
                dealName: parsed.title || 'Migrated Draft',
                description: parsed.description || '',
                files: parsed.files || [],
                lastSaved: Date.now(),
                version: 1
            };
            
            // Save in new format
            const newKey = `brain_draft_deal_${oldKey}`;
            await enhancedStorageSet(newKey, JSON.stringify(newDraft));
            
            // Update index
            addToDraftIndex(oldKey);
            
            // Remove old format
            localStorage.removeItem(oldKey);
            
            console.log(`Migrated draft: ${oldKey}`);
        } catch (error) {
            console.error(`Failed to migrate ${oldKey}:`, error);
        }
    }
};
```