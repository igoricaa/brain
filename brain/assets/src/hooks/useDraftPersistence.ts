import { useState, useCallback, useEffect, useRef } from 'react';

export interface DraftState {
  draftId: string;
  dealName: string;
  description?: string;
  website?: string;
  fundingTarget?: string;
  files: {
    id: string;
    name: string;
    size: number;
    type: string;
    category?: string;
    documentType?: string;
    proprietary?: boolean;
    tldr?: string;
    tags?: string[];
  }[];
  lastSaved: number;
  version: number;
}

export interface DraftPersistenceOptions {
  autoSaveInterval?: number; // milliseconds
  maxDrafts?: number;
  expirationDays?: number;
}

const DEFAULT_OPTIONS: Required<DraftPersistenceOptions> = {
  autoSaveInterval: 30000, // 30 seconds
  maxDrafts: 10,
  expirationDays: 7,
};

const STORAGE_KEY_PREFIX = 'brain_draft_deal_';
const STORAGE_INDEX_KEY = 'brain_draft_deals_index';

export const useDraftPersistence = (
  draftId?: string,
  options: DraftPersistenceOptions = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastDraftState = useRef<DraftState | null>(null);

  // Generate unique draft ID if not provided
  const currentDraftId = draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Storage utilities
  const getDraftKey = useCallback((id: string) => `${STORAGE_KEY_PREFIX}${id}`, []);

  const getDraftIndex = useCallback((): string[] => {
    try {
      const index = localStorage.getItem(STORAGE_INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch {
      return [];
    }
  }, []);

  const updateDraftIndex = useCallback((draftIds: string[]) => {
    try {
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(draftIds));
    } catch (error) {
      console.warn('Failed to update draft index:', error);
    }
  }, []);

  const addToDraftIndex = useCallback((draftId: string) => {
    const index = getDraftIndex();
    if (!index.includes(draftId)) {
      const newIndex = [draftId, ...index].slice(0, opts.maxDrafts);
      updateDraftIndex(newIndex);
    }
  }, [getDraftIndex, updateDraftIndex, opts.maxDrafts]);

  const removeFromDraftIndex = useCallback((draftId: string) => {
    const index = getDraftIndex();
    const newIndex = index.filter(id => id !== draftId);
    updateDraftIndex(newIndex);
  }, [getDraftIndex, updateDraftIndex]);

  // Save draft to localStorage
  const saveDraft = useCallback(async (state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        setError(null);
        
        const previousVersion = lastDraftState.current?.version || 0;
        const draftState: DraftState = {
          ...state,
          draftId: currentDraftId,
          lastSaved: Date.now(),
          version: previousVersion + 1,
        };

        const key = getDraftKey(currentDraftId);
        localStorage.setItem(key, JSON.stringify(draftState));
        addToDraftIndex(currentDraftId);
        
        lastDraftState.current = draftState;
        setLastSaved(new Date());
        
        resolve();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save draft';
        setError(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }, [currentDraftId, getDraftKey, addToDraftIndex]);

  // Auto-save functionality
  const autoSave = useCallback(async (state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>) => {
    // Don't auto-save if state hasn't changed
    if (lastDraftState.current) {
      const currentStateString = JSON.stringify(state);
      const lastStateString = JSON.stringify({
        dealName: lastDraftState.current.dealName,
        description: lastDraftState.current.description,
        website: lastDraftState.current.website,
        fundingTarget: lastDraftState.current.fundingTarget,
        files: lastDraftState.current.files,
      });
      
      if (currentStateString === lastStateString) {
        return;
      }
    }

    setIsAutoSaving(true);
    try {
      await saveDraft(state);
    } catch (error) {
      console.warn('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [saveDraft]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback((state: Omit<DraftState, 'draftId' | 'lastSaved' | 'version'>) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(() => {
      autoSave(state);
    }, opts.autoSaveInterval);
  }, [autoSave, opts.autoSaveInterval]);

  // Load draft from localStorage
  const loadDraft = useCallback((id: string = currentDraftId): DraftState | null => {
    try {
      setError(null);
      const key = getDraftKey(id);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const draft: DraftState = JSON.parse(stored);
      
      // Check if draft has expired
      const ageInDays = (Date.now() - draft.lastSaved) / (1000 * 60 * 60 * 24);
      if (ageInDays > opts.expirationDays) {
        deleteDraft(id);
        return null;
      }
      
      lastDraftState.current = draft;
      setLastSaved(new Date(draft.lastSaved));
      
      return draft;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load draft';
      setError(errorMessage);
      return null;
    }
  }, [currentDraftId, getDraftKey, opts.expirationDays]);

  // Delete draft from localStorage
  const deleteDraft = useCallback((id: string = currentDraftId) => {
    try {
      setError(null);
      const key = getDraftKey(id);
      localStorage.removeItem(key);
      removeFromDraftIndex(id);
      
      if (id === currentDraftId) {
        lastDraftState.current = null;
        setLastSaved(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete draft';
      setError(errorMessage);
    }
  }, [currentDraftId, getDraftKey, removeFromDraftIndex]);

  // Get all saved drafts
  const getAllDrafts = useCallback((): DraftState[] => {
    const index = getDraftIndex();
    const drafts: DraftState[] = [];
    
    for (const draftId of index) {
      try {
        setError(null);
        const key = getDraftKey(draftId);
        const stored = localStorage.getItem(key);
        
        if (!stored) continue;
        
        const draft: DraftState = JSON.parse(stored);
        
        // Check if draft has expired
        const ageInDays = (Date.now() - draft.lastSaved) / (1000 * 60 * 60 * 24);
        if (ageInDays > opts.expirationDays) {
          const deleteKey = getDraftKey(draftId);
          localStorage.removeItem(deleteKey);
          removeFromDraftIndex(draftId);
          continue;
        }
        
        drafts.push(draft);
      } catch (error) {
        console.warn('Failed to load draft:', draftId, error);
      }
    }
    
    // Sort by last saved time (newest first)
    return drafts.sort((a, b) => b.lastSaved - a.lastSaved);
  }, [getDraftIndex, getDraftKey, opts.expirationDays, removeFromDraftIndex]);

  // Clear expired drafts
  const clearExpiredDrafts = useCallback(() => {
    const index = getDraftIndex();
    const validDrafts: string[] = [];
    
    for (const draftId of index) {
      const draft = loadDraft(draftId);
      if (draft) {
        validDrafts.push(draftId);
      }
    }
    
    updateDraftIndex(validDrafts);
  }, [getDraftIndex, loadDraft, updateDraftIndex]);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    const index = getDraftIndex();
    
    for (const draftId of index) {
      const key = getDraftKey(draftId);
      localStorage.removeItem(key);
    }
    
    localStorage.removeItem(STORAGE_INDEX_KEY);
    lastDraftState.current = null;
    setLastSaved(null);
  }, [getDraftIndex, getDraftKey]);

  // Check for conflicts (multiple tabs editing same draft)
  const checkForConflicts = useCallback((): { hasConflict: boolean; conflictVersion?: number } => {
    if (!lastDraftState.current) return { hasConflict: false };
    
    const storedDraft = loadDraft(currentDraftId);
    if (!storedDraft) return { hasConflict: false };
    
    const hasConflict = storedDraft.version > lastDraftState.current.version;
    return {
      hasConflict,
      conflictVersion: hasConflict ? storedDraft.version : undefined,
    };
  }, [currentDraftId, loadDraft]);

  // Listen for storage changes (other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getDraftKey(currentDraftId) && e.newValue) {
        try {
          const newDraft: DraftState = JSON.parse(e.newValue);
          if (lastDraftState.current && newDraft.version > lastDraftState.current.version) {
            // Another tab updated the draft
            lastDraftState.current = newDraft;
            setLastSaved(new Date(newDraft.lastSaved));
          }
        } catch (error) {
          console.warn('Failed to process storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentDraftId, getDraftKey]);

  // Clean up auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  // Clean up expired drafts on mount
  useEffect(() => {
    clearExpiredDrafts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // Core functionality
    saveDraft,
    loadDraft,
    deleteDraft,
    scheduleAutoSave,
    
    // Batch operations
    getAllDrafts,
    clearAllDrafts,
    clearExpiredDrafts,
    
    // Conflict resolution
    checkForConflicts,
    
    // State
    currentDraftId,
    isAutoSaving,
    lastSaved,
    error,
    
    // Utilities
    clearError: () => setError(null),
  };
};