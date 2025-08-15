import { FileTableData } from '@/components/file-manager/FileTable';
import { UploadFile } from '@/components/file-manager/FileUpload';

export interface SubmissionValidation {
  isValid: boolean;
  hasMinimumFiles: boolean;
  hasPitchDeck: boolean;
  allFilesProcessed: boolean;
  hasRequiredMetadata: boolean;
  dealInfoComplete: boolean;
  warnings: SubmissionWarning[];
  blockers: SubmissionBlocker[];
}

export interface SubmissionWarning {
  type: 'no_pitch_deck' | 'many_processing' | 'missing_categories' | 'no_financials' | 'small_file_count';
  message: string;
  details?: string;
  affectedFiles?: string[];
}

export interface SubmissionBlocker {
  type: 'no_files' | 'all_failed' | 'missing_deal_info';
  message: string;
  details?: string;
  action?: string;
}

export interface SubmissionSummary {
  dealName: string;
  companyName?: string;
  totalFiles: number;
  filesByCategory: Record<string, number>;
  processingStatus: {
    completed: number;
    processing: number;
    pending: number;
    failed: number;
  };
  estimatedProcessingTime: string;
}

export interface FileCategory {
  name: string;
  key: string;
  priority: 'critical' | 'important' | 'optional';
  description: string;
}

export const FILE_CATEGORIES: FileCategory[] = [
  {
    name: 'Pitch Deck',
    key: 'pitch_deck',
    priority: 'critical',
    description: 'Main presentation about the company and opportunity'
  },
  {
    name: 'Financial Documents',
    key: 'financials',
    priority: 'important',
    description: 'Financial statements, projections, or models'
  },
  {
    name: 'Legal Documents',
    key: 'legal',
    priority: 'important',
    description: 'Legal agreements, contracts, or compliance documents'
  },
  {
    name: 'Technical Documentation',
    key: 'technical',
    priority: 'important',
    description: 'Technical specifications, patents, or research papers'
  },
  {
    name: 'Market Research',
    key: 'market',
    priority: 'optional',
    description: 'Market analysis, competitive landscape, or industry reports'
  },
  {
    name: 'Other',
    key: 'other',
    priority: 'optional',
    description: 'Additional supporting documents'
  }
];

export function validateSubmission(
  existingFiles: FileTableData[],
  pendingFiles: UploadFile[],
  dealName?: string,
  companyName?: string
): SubmissionValidation {
  const allFiles = [...existingFiles];
  const totalFiles = allFiles.length + pendingFiles.length;
  
  const warnings: SubmissionWarning[] = [];
  const blockers: SubmissionBlocker[] = [];

  // Check minimum file requirement
  const hasMinimumFiles = totalFiles > 0;
  if (!hasMinimumFiles) {
    blockers.push({
      type: 'no_files',
      message: 'No files uploaded',
      details: 'At least one file must be uploaded before submission.',
      action: 'Upload files using the file upload area above'
    });
  }

  // Check for pitch deck
  const hasPitchDeck = allFiles.some(file => 
    file.category?.toLowerCase().includes('pitch') || 
    file.document_type?.toLowerCase().includes('pitch') ||
    file.name.toLowerCase().includes('pitch') ||
    file.name.toLowerCase().includes('deck')
  );
  
  if (!hasPitchDeck && totalFiles > 0) {
    warnings.push({
      type: 'no_pitch_deck',
      message: 'No pitch deck detected',
      details: 'Most successful submissions include a pitch deck. Consider adding one or updating file categories.'
    });
  }

  // Check file processing status
  const processingCounts = allFiles.reduce((acc, file) => {
    acc[file.processing_status] = (acc[file.processing_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const allFilesProcessed = allFiles.every(file => 
    file.processing_status === 'completed' || file.processing_status === 'failed'
  );

  if (processingCounts.processing > 0) {
    warnings.push({
      type: 'many_processing',
      message: `${processingCounts.processing} files still processing`,
      details: 'Files are still being analyzed. You can submit now, but some analysis may be incomplete.',
      affectedFiles: allFiles
        .filter(f => f.processing_status === 'processing')
        .map(f => f.name)
    });
  }

  if (processingCounts.failed > 0) {
    warnings.push({
      type: 'many_processing',
      message: `${processingCounts.failed} files failed processing`,
      details: 'Some files could not be processed. Consider re-uploading or removing them.',
      affectedFiles: allFiles
        .filter(f => f.processing_status === 'failed')
        .map(f => f.name)
    });
  }

  // Check for financial documents
  const hasFinancials = allFiles.some(file =>
    file.category?.toLowerCase().includes('financial') ||
    file.document_type?.toLowerCase().includes('financial') ||
    file.name.toLowerCase().includes('financial') ||
    file.name.toLowerCase().includes('p&l') ||
    file.name.toLowerCase().includes('income') ||
    file.name.toLowerCase().includes('balance')
  );

  if (!hasFinancials && totalFiles > 0) {
    warnings.push({
      type: 'no_financials',
      message: 'No financial documents detected',
      details: 'Financial information helps with deal evaluation. Consider adding financial statements or projections.'
    });
  }

  // Check file count
  if (totalFiles > 0 && totalFiles < 3) {
    warnings.push({
      type: 'small_file_count',
      message: 'Relatively few files uploaded',
      details: 'More comprehensive documentation typically leads to better analysis results.'
    });
  }

  // Check metadata completeness
  const hasRequiredMetadata = allFiles.every(file => 
    file.category && file.category !== 'other'
  );

  if (!hasRequiredMetadata && allFiles.length > 0) {
    warnings.push({
      type: 'missing_categories',
      message: 'Some files have generic categories',
      details: 'More specific file categorization helps with analysis accuracy.'
    });
  }

  // Check deal info completeness
  const dealInfoComplete = Boolean(dealName && dealName.trim() !== '' && dealName !== 'Untitled Deal');
  if (!dealInfoComplete) {
    warnings.push({
      type: 'missing_categories',
      message: 'Deal has generic name',
      details: 'Consider updating the deal name to be more descriptive.'
    });
  }

  // Check if all files failed
  if (allFiles.length > 0 && processingCounts.failed === allFiles.length) {
    blockers.push({
      type: 'all_failed',
      message: 'All files failed processing',
      details: 'No files were successfully processed. Please check file formats and try re-uploading.',
      action: 'Try uploading different file formats or contact support'
    });
  }

  const isValid = blockers.length === 0;

  return {
    isValid,
    hasMinimumFiles,
    hasPitchDeck,
    allFilesProcessed,
    hasRequiredMetadata,
    dealInfoComplete,
    warnings,
    blockers
  };
}

export function generateSubmissionSummary(
  existingFiles: FileTableData[],
  pendingFiles: UploadFile[],
  dealName?: string,
  companyName?: string
): SubmissionSummary {
  const allFiles = [...existingFiles];
  const totalFiles = allFiles.length + pendingFiles.length;

  // Count files by category
  const filesByCategory = allFiles.reduce((acc, file) => {
    const category = file.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Add pending files to "other" category
  if (pendingFiles.length > 0) {
    filesByCategory.other = (filesByCategory.other || 0) + pendingFiles.length;
  }

  // Count processing status
  const processingStatus = allFiles.reduce((acc, file) => {
    acc[file.processing_status] = (acc[file.processing_status] || 0) + 1;
    return acc;
  }, {
    completed: 0,
    processing: 0,
    pending: 0,
    failed: 0
  });

  // Estimate processing time based on file count and size
  const estimatedProcessingTime = calculateProcessingTime(totalFiles, allFiles);

  return {
    dealName: dealName || 'Untitled Deal',
    companyName,
    totalFiles,
    filesByCategory,
    processingStatus,
    estimatedProcessingTime
  };
}

function calculateProcessingTime(fileCount: number, files: FileTableData[]): string {
  if (fileCount === 0) return '0 minutes';
  
  // Base time per file: 30 seconds to 2 minutes depending on size
  const avgFileSize = files.length > 0 
    ? files.reduce((sum, f) => sum + f.file_size, 0) / files.length 
    : 1024 * 1024; // 1MB default
  
  // Estimate based on file size (larger files take longer)
  const timePerFile = Math.min(120, Math.max(30, avgFileSize / (1024 * 1024) * 30)); // 30s per MB, max 2min
  const totalSeconds = fileCount * timePerFile;
  
  if (totalSeconds < 60) {
    return '< 1 minute';
  } else if (totalSeconds < 300) {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  } else if (totalSeconds < 900) {
    return '5-15 minutes';
  } else {
    return '15-30 minutes';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIcon(fileType: string): string {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'FileText';
  if (type.includes('image')) return 'Image';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'FileSpreadsheet';
  if (type.includes('presentation') || type.includes('powerpoint')) return 'FileType';
  return 'File';
}

export function getCategoryDisplayName(category: string): string {
  const found = FILE_CATEGORIES.find(cat => cat.key === category);
  return found ? found.name : category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryPriority(category: string): 'critical' | 'important' | 'optional' {
  const found = FILE_CATEGORIES.find(cat => cat.key === category);
  return found ? found.priority : 'optional';
}