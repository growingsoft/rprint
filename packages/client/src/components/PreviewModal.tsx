import React, { useEffect, useState } from 'react';
import { RecentJobWithPreview } from '../store/useRecentJobs';
import './PreviewModal.css';

interface PreviewModalProps {
  jobWithPreview: RecentJobWithPreview;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ jobWithPreview, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { job, fileBlob, mimeType } = jobWithPreview;

  useEffect(() => {
    if (fileBlob) {
      const url = URL.createObjectURL(fileBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileBlob]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderPreview = () => {
    if (!fileBlob || !previewUrl) {
      return (
        <div className="preview-unavailable">
          <FileTypeIcon mimeType={mimeType} large />
          <p>Preview not available</p>
          <p className="preview-unavailable-hint">File was submitted in a previous session</p>
        </div>
      );
    }

    if (mimeType.startsWith('image/')) {
      return <img src={previewUrl} alt={job.fileName} className="preview-image" />;
    }

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={previewUrl}
          title={job.fileName}
          className="preview-pdf"
        />
      );
    }

    if (mimeType === 'text/plain') {
      return <TextPreview blob={fileBlob} />;
    }

    return (
      <div className="preview-unavailable">
        <FileTypeIcon mimeType={mimeType} large />
        <p>Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <div className="preview-modal-backdrop" onClick={handleBackdropClick}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <h3>{job.fileName}</h3>
          <button className="preview-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="preview-modal-content">
          {renderPreview()}
        </div>
        <div className="preview-modal-footer">
          <span className="preview-file-info">
            {formatFileSize(job.fileSize)} &bull; {getMimeTypeLabel(mimeType)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface TextPreviewProps {
  blob: Blob;
}

const TextPreview: React.FC<TextPreviewProps> = ({ blob }) => {
  const [text, setText] = useState<string>('Loading...');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      setText(reader.result as string);
    };
    reader.onerror = () => {
      setText('Error reading file');
    };
    reader.readAsText(blob);
  }, [blob]);

  return <pre className="preview-text">{text}</pre>;
};

interface FileTypeIconProps {
  mimeType: string;
  large?: boolean;
}

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({ mimeType, large }) => {
  const getIcon = () => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
        </svg>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      );
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2zm-3 4h2v2h-2v-2zm0-8h2v2h-2V7zm6 8h-2v-2h2v2zm0-4h-2V9h2v2z"/>
        </svg>
      );
    }
    if (mimeType === 'text/plain') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
      );
    }
    // Default file icon
    return (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
      </svg>
    );
  };

  const getColor = () => {
    if (mimeType.startsWith('image/')) return '#4CAF50';
    if (mimeType === 'application/pdf') return '#F44336';
    if (mimeType.includes('word') || mimeType.includes('document')) return '#2196F3';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '#4CAF50';
    if (mimeType === 'text/plain') return '#607D8B';
    return '#9E9E9E';
  };

  return (
    <div
      className={`file-type-icon ${large ? 'file-type-icon-large' : ''}`}
      style={{ color: getColor() }}
    >
      {getIcon()}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMimeTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel Spreadsheet';
  if (mimeType === 'text/plain') return 'Text File';
  return 'Document';
}
