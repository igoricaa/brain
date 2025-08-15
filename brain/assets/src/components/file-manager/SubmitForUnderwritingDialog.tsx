import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  FileSpreadsheet,
  FileType,
  File,
  Clock,
  Upload,
  ArrowLeft,
  Info,
  AlertCircle,
  Building2,
  FileCheck,
  Timer,
} from 'lucide-react';
import { FileTableData } from './FileTable';
import { UploadFile } from './FileUpload';
import {
  validateSubmission,
  generateSubmissionSummary,
  formatFileSize,
  getCategoryDisplayName,
  getCategoryPriority,
  FILE_CATEGORIES,
  type SubmissionValidation,
  type SubmissionSummary,
} from '@/lib/validation/submissionValidation';

export interface SubmitForUnderwritingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFiles: FileTableData[];
  pendingFiles: UploadFile[];
  dealName?: string;
  companyName?: string;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

type DialogStep = 'review' | 'validate' | 'confirm';

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return Image;
  if (type.includes('spreadsheet') || type.includes('excel')) return FileSpreadsheet;
  if (type.includes('presentation') || type.includes('powerpoint')) return FileType;
  return File;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getPriorityBadgeVariant = (priority: 'critical' | 'important' | 'optional') => {
  switch (priority) {
    case 'critical':
      return 'destructive';
    case 'important':
      return 'default';
    case 'optional':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function SubmitForUnderwritingDialog({
  open,
  onOpenChange,
  existingFiles,
  pendingFiles,
  dealName,
  companyName,
  onSubmit,
  isSubmitting = false,
}: SubmitForUnderwritingDialogProps) {
  const [currentStep, setCurrentStep] = useState<DialogStep>('review');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  // Generate validation and summary data
  const validation = validateSubmission(existingFiles, pendingFiles, dealName, companyName);
  const summary = generateSubmissionSummary(existingFiles, pendingFiles, dealName, companyName);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleNext = () => {
    if (currentStep === 'review') {
      setCurrentStep('validate');
    } else if (currentStep === 'validate') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'validate') {
      setCurrentStep('review');
    } else if (currentStep === 'confirm') {
      setCurrentStep('validate');
    }
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;
    
    try {
      await onSubmit();
      onOpenChange(false);
      // Reset to first step for next time
      setCurrentStep('review');
    } catch (error) {
      // Error is handled by parent component
      console.error('Submission failed:', error);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {['review', 'validate', 'confirm'].map((step, index) => {
        const isActive = currentStep === step;
        const isCompleted = ['review', 'validate', 'confirm'].indexOf(currentStep) > index;
        
        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : isCompleted
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 bg-gray-100 text-gray-500'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < 2 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Review Deal Summary</h3>
        <p className="text-sm text-muted-foreground">
          Review your deal information and uploaded files before proceeding.
        </p>
      </div>

      {/* Deal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Deal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Deal Name</label>
              <p className="text-sm font-medium">{summary.dealName}</p>
            </div>
            {summary.companyName && (
              <div>
                <label className="text-sm font-medium text-gray-600">Company</label>
                <p className="text-sm font-medium">{summary.companyName}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Total Files</label>
              <p className="text-sm font-medium">{summary.totalFiles} files</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Estimated Processing</label>
              <p className="text-sm font-medium">{summary.estimatedProcessingTime}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCheck className="h-4 w-4" />
            Files by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FILE_CATEGORIES.map((category) => {
              const count = summary.filesByCategory[category.key] || 0;
              const priority = getCategoryPriority(category.key);
              
              return (
                <div
                  key={category.key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityBadgeVariant(priority)} className="text-xs">
                      {category.name}
                    </Badge>
                    {priority === 'critical' && count === 0 && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{count} files</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4" />
            Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(summary.processingStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {getStatusIcon(status)}
                </div>
                <p className="text-sm font-medium">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderValidateStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Validation Results</h3>
        <p className="text-sm text-muted-foreground">
          Review any warnings or issues before submitting.
        </p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            {validation.isValid ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">Ready for Submission</h4>
                  <p className="text-sm text-green-700">
                    Your deal meets all requirements and can be submitted.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Issues Found</h4>
                  <p className="text-sm text-red-700">
                    Please resolve the blocking issues below before submitting.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blockers */}
      {validation.blockers.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Issues that must be resolved:</p>
              {validation.blockers.map((blocker, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">{blocker.message}</p>
                  <p>{blocker.details}</p>
                  {blocker.action && (
                    <p className="italic">Action: {blocker.action}</p>
                  )}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Recommendations for better results:</p>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">{warning.message}</p>
                  <p>{warning.details}</p>
                  {warning.affectedFiles && warning.affectedFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Affected files: {warning.affectedFiles.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* File Details */}
      <Collapsible
        open={expandedSections.has('files')}
        onOpenChange={() => toggleSection('files')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Details ({existingFiles.length + pendingFiles.length} files)
                </span>
                {expandedSections.has('files') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {existingFiles.map((file) => {
                  const IconComponent = getFileIcon(file.file_type);
                  return (
                    <div
                      key={file.uuid}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <IconComponent className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryDisplayName(file.category)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.processing_status)}
                        <Badge variant={getStatusBadgeVariant(file.processing_status)} className="text-xs">
                          {file.processing_status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                
                {pendingFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Upload className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                            Pending Upload
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Final Confirmation</h3>
        <p className="text-sm text-muted-foreground">
          Please confirm that you want to submit this deal for underwriting.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your files will be uploaded and processed automatically</li>
                <li>• Our AI will analyze the documents and extract key information</li>
                <li>• You'll receive updates on the analysis progress</li>
                <li>• A comprehensive deal report will be generated</li>
                <li>• Estimated completion time: {summary.estimatedProcessingTime}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-medium">Deal Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Deal Name:</span>
                <p className="font-medium">{summary.dealName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Files:</span>
                <p className="font-medium">{summary.totalFiles} files</p>
              </div>
              {summary.companyName && (
                <div>
                  <span className="text-muted-foreground">Company:</span>
                  <p className="font-medium">{summary.companyName}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Processing Time:</span>
                <p className="font-medium">{summary.estimatedProcessingTime}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Proceeding with {validation.warnings.length} recommendation(s)</p>
            <p className="text-sm">
              While not required, addressing these recommendations could improve analysis quality.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case 'review':
        return renderReviewStep();
      case 'validate':
        return renderValidateStep();
      case 'confirm':
        return renderConfirmStep();
      default:
        return renderReviewStep();
    }
  };

  const getDialogTitle = () => {
    switch (currentStep) {
      case 'review':
        return 'Submit for Underwriting - Review';
      case 'validate':
        return 'Submit for Underwriting - Validation';
      case 'confirm':
        return 'Submit for Underwriting - Confirm';
      default:
        return 'Submit for Underwriting';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            Review your deal and files before submitting for underwriting analysis.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}
        
        <div className="py-4">
          {getStepContent()}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== 'review' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {currentStep === 'confirm' ? (
              <Button
                onClick={handleSubmit}
                disabled={!validation.isValid || isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Submit Deal
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}