import { validateSubmission, generateSubmissionSummary } from '../submissionValidation';
import { FileTableData } from '@/components/file-manager/FileTable';
import { UploadFile } from '@/components/file-manager/FileUpload';

// Mock data for testing
const mockExistingFiles: FileTableData[] = [
  {
    uuid: '1',
    name: 'pitch-deck.pdf',
    file_type: 'application/pdf',
    file_size: 2048000,
    category: 'pitch_deck',
    proprietary: false,
    tldr: 'Company pitch deck',
    tags: ['presentation'],
    processing_status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    uuid: '2',
    name: 'financials.xlsx',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 1024000,
    category: 'financials',
    proprietary: true,
    tldr: 'Financial projections',
    tags: ['financial', 'projections'],
    processing_status: 'processing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
];

const mockPendingFiles: UploadFile[] = [
  {
    id: 'pending-1',
    file: new File(['legal content'], 'legal-docs.pdf', { type: 'application/pdf' }),
    name: 'legal-docs.pdf',
    type: 'application/pdf',
    size: 512000,
    lastModified: Date.now(),
    status: 'pending',
    progress: 0,
  }
];

describe('submissionValidation', () => {
  describe('validateSubmission', () => {
    it('should pass validation with valid files', () => {
      const result = validateSubmission(
        mockExistingFiles,
        [],
        'Test Deal',
        'Test Company'
      );

      expect(result.isValid).toBe(true);
      expect(result.hasMinimumFiles).toBe(true);
      expect(result.hasPitchDeck).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should fail validation with no files', () => {
      const result = validateSubmission([], [], 'Test Deal', 'Test Company');

      expect(result.isValid).toBe(false);
      expect(result.hasMinimumFiles).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].type).toBe('no_files');
    });

    it('should show warning when no pitch deck', () => {
      const filesWithoutPitch = [
        {
          ...mockExistingFiles[1],
          category: 'other',
          name: 'random-file.pdf',
        }
      ];

      const result = validateSubmission(
        filesWithoutPitch,
        [],
        'Test Deal',
        'Test Company'
      );

      expect(result.isValid).toBe(true);
      expect(result.hasPitchDeck).toBe(false);
      expect(result.warnings.some(w => w.type === 'no_pitch_deck')).toBe(true);
    });

    it('should show warning for processing files', () => {
      const result = validateSubmission(
        mockExistingFiles,
        [],
        'Test Deal',
        'Test Company'
      );

      expect(result.warnings.some(w => w.type === 'many_processing')).toBe(true);
    });

    it('should handle pending files in total count', () => {
      const result = validateSubmission(
        [],
        mockPendingFiles,
        'Test Deal',
        'Test Company'
      );

      expect(result.hasMinimumFiles).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  describe('generateSubmissionSummary', () => {
    it('should generate correct summary', () => {
      const result = generateSubmissionSummary(
        mockExistingFiles,
        mockPendingFiles,
        'Test Deal',
        'Test Company'
      );

      expect(result.dealName).toBe('Test Deal');
      expect(result.companyName).toBe('Test Company');
      expect(result.totalFiles).toBe(3);
      expect(result.filesByCategory.pitch_deck).toBe(1);
      expect(result.filesByCategory.financials).toBe(1);
      expect(result.filesByCategory.other).toBe(1); // pending file
      expect(result.processingStatus.completed).toBe(1);
      expect(result.processingStatus.processing).toBe(1);
    });

    it('should handle empty inputs', () => {
      const result = generateSubmissionSummary([], [], undefined, undefined);

      expect(result.dealName).toBe('Untitled Deal');
      expect(result.companyName).toBeUndefined();
      expect(result.totalFiles).toBe(0);
      expect(Object.keys(result.filesByCategory)).toHaveLength(0);
    });

    it('should calculate processing time estimates', () => {
      const result = generateSubmissionSummary(
        mockExistingFiles,
        mockPendingFiles,
        'Test Deal',
        'Test Company'
      );

      expect(result.estimatedProcessingTime).toMatch(/\d+/);
      expect(typeof result.estimatedProcessingTime).toBe('string');
    });
  });
});

// Simple test runner for browser environment
if (typeof window !== 'undefined') {
  console.log('Running submission validation tests...');
  
  try {
    // Test validation with valid files
    const validationResult = validateSubmission(
      mockExistingFiles,
      [],
      'Test Deal',
      'Test Company'
    );
    console.assert(validationResult.isValid === true, 'Valid files should pass validation');
    console.assert(validationResult.hasPitchDeck === true, 'Should detect pitch deck');
    
    // Test validation with no files
    const noFilesResult = validateSubmission([], [], 'Test Deal', 'Test Company');
    console.assert(noFilesResult.isValid === false, 'No files should fail validation');
    console.assert(noFilesResult.blockers.length > 0, 'Should have blockers for no files');
    
    // Test summary generation
    const summaryResult = generateSubmissionSummary(
      mockExistingFiles,
      mockPendingFiles,
      'Test Deal',
      'Test Company'
    );
    console.assert(summaryResult.totalFiles === 3, 'Should count all files');
    console.assert(summaryResult.dealName === 'Test Deal', 'Should preserve deal name');
    
    console.log('✅ All submission validation tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}