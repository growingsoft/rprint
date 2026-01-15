import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Print.css';

// --- Icon Components ---
const PrinterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const FileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CopiesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// --- Interfaces ---
interface Printer {
  id: string;
  name: string;
  displayName: string;
  status: string;
  workerId: string;
  default_paper_size?: string;
  default_orientation?: string;
  default_color_mode?: string;
  default_duplex?: string;
  default_scale?: string;
}

interface PrintJob {
  id: string;
  fileName: string;
  printerId: string;
  printer_name?: string;
  worker_name?: string;
  client_name?: string;
  status: string;
  copies: number;
  createdAt: string;
  errorMessage?: string;
}

// --- Main Component ---
export const Print: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copies, setCopies] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Print options
  const [paperSize, setPaperSize] = useState<string>('4x6');
  const [orientation, setOrientation] = useState<string>('portrait');
  const [colorMode, setColorMode] = useState<string>('color');
  const [duplex, setDuplex] = useState<string>('none');
  const [scale, setScale] = useState<string>('noscale');

  useEffect(() => {
    loadPrinters();
    loadJobs();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadPrinters = async () => {
    try {
      const printersResponse = await api.get('/printers/virtual-printer/list');
      const allPrinters = printersResponse.data.printers || [];
      const packagesResponse = await api.get('/packages/server');
      const serverPackages = packagesResponse.data || [];

      const allowedPrinterIds = new Set<string>();
      for (const pkg of serverPackages) {
        if (pkg.selected_printers) {
          pkg.selected_printers
            .split(',')
            .forEach((id: string) => allowedPrinterIds.add(id));
        } else {
          allPrinters
            .filter((p: Printer) => p.workerId === pkg.worker_id)
            .forEach((p: Printer) => allowedPrinterIds.add(p.id));
        }
      }

      const filteredPrinters = allPrinters.filter(
        (p: Printer) => p.status === 'online' && allowedPrinterIds.has(p.id)
      );
      setPrinters(filteredPrinters);
    } catch (err) {
      console.error('Failed to load printers:', err);
      setError('Failed to load printers');
    }
  };

  const loadJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs((response.data.jobs || []).slice(0, 20));
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePrint = async () => {
    if (!selectedFile || !selectedPrinter) {
      setError('Please select a file and printer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('printerId', selectedPrinter);
      formData.append('copies', copies.toString());
      formData.append('paperSize', paperSize);
      formData.append('orientation', orientation);
      formData.append('colorMode', colorMode);
      formData.append('duplex', duplex);
      formData.append('scale', scale);

      await api.post('/jobs', formData);

      setSelectedFile(null);
      setCopies(1);
      const fileInput = document.getElementById(
        'fileInput'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      loadJobs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit print job');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => `status-${status}`;

  return (
    <div className="print-page">
      <header className="print-header">
        <h1>Print Dashboard</h1>
      </header>

      <main className="print-container">
        <section className="print-form-card">
          <h2>New Print Job</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="printerSelect">Printer</label>
            <select
              id="printerSelect"
              value={selectedPrinter}
              onChange={(e) => {
                const printerId = e.target.value;
                setSelectedPrinter(printerId);
                if (printerId) {
                  const printer = printers.find((p) => p.id === printerId);
                  if (printer) {
                    if (printer.default_paper_size)
                      setPaperSize(printer.default_paper_size);
                    if (printer.default_orientation)
                      setOrientation(printer.default_orientation);
                    if (printer.default_color_mode)
                      setColorMode(printer.default_color_mode);
                    if (printer.default_duplex) setDuplex(printer.default_duplex);
                    if (printer.default_scale) setScale(printer.default_scale);
                  }
                }
              }}
              className="form-select"
            >
              <option value="">-- Select a printer --</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fileInput">File</label>
            <input
              type="file"
              id="fileInput"
              onChange={handleFileSelect}
              className="form-file-input"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
            />
            {selectedFile && (
              <div className="file-info">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="copies">Copies</label>
            <input
              type="number"
              id="copies"
              min="1"
              max="99"
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="paperSize">Paper Size</label>
              <select
                id="paperSize"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="form-select"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="4x6">4 × 6 in (Shipping Label)</option>
                <option value="Label_1.5x3">1.5 × 3 in (Small Label)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="orientation">Orientation</label>
              <select
                id="orientation"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="form-select"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="colorMode">Color Mode</label>
              <select
                id="colorMode"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
                className="form-select"
              >
                <option value="color">Color</option>
                <option value="grayscale">Grayscale</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="duplex">Duplex</label>
              <select
                id="duplex"
                value={duplex}
                onChange={(e) => setDuplex(e.target.value)}
                className="form-select"
              >
                <option value="none">Single-Sided</option>
                <option value="long-edge">Double-Sided (Long Edge)</option>
                <option value="short-edge">Double-Sided (Short Edge)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="scale">Scaling</label>
            <select
              id="scale"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="form-select"
            >
              <option value="noscale">No Scaling</option>
              <option value="fit">Fit to Page</option>
              <option value="shrink">Shrink to Page</option>
            </select>
          </div>

          <button
            onClick={handlePrint}
            disabled={loading || !selectedFile || !selectedPrinter}
            className="btn-primary"
          >
            {loading ? 'Submitting...' : 'Print'}
          </button>
        </section>

        <section className="print-jobs-card">
          <h2>Recent Jobs</h2>
          <div className="jobs-list">
            {jobs.length === 0 ? (
              <div className="no-jobs">No print jobs found.</div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="job-item">
                  <div className="job-header">
                    <span className="job-filename">
                      <FileIcon /> {job.fileName}
                    </span>
                    <span className={`job-status ${getStatusBadge(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="job-details">
                    <span>
                      <PrinterIcon /> {job.printer_name || 'N/A'}
                    </span>
                    <span>
                      <CopiesIcon /> {job.copies}
                    </span>
                    <span>
                      <ClockIcon />{' '}
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {job.errorMessage && (
                    <div className="job-error">{job.errorMessage}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
