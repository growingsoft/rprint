import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Print.css';

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
  const [quality, setQuality] = useState<string>('normal');
  const [marginTop, setMarginTop] = useState<number>(10);
  const [marginBottom, setMarginBottom] = useState<number>(10);
  const [marginLeft, setMarginLeft] = useState<number>(10);
  const [marginRight, setMarginRight] = useState<number>(10);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    loadPrinters();
    loadJobs();
    const interval = setInterval(loadJobs, 3000); // Refresh jobs every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPrinters = async () => {
    try {
      // Get all virtual printers
      const printersResponse = await api.get('/printers/virtual-printer/list');
      const allPrinters = printersResponse.data.printers || [];

      // Get all server packages to check selected_printers configuration
      const packagesResponse = await api.get('/packages/server');
      const serverPackages = packagesResponse.data || [];

      // Build a set of allowed printer IDs
      const allowedPrinterIds = new Set<string>();
      for (const pkg of serverPackages) {
        if (pkg.selected_printers) {
          // If package has selected_printers, add those IDs
          const selectedIds = pkg.selected_printers.split(',');
          selectedIds.forEach((id: string) => allowedPrinterIds.add(id));
        } else {
          // If no selected_printers, all printers from this worker are allowed
          // Add all printers belonging to this worker
          allPrinters
            .filter((p: Printer) => p.workerId === pkg.worker_id)
            .forEach((p: Printer) => allowedPrinterIds.add(p.id));
        }
      }

      // Filter printers: must be online AND in the allowed list
      const filteredPrinters = allPrinters.filter(
        (p: Printer) => p.status === 'online' && allowedPrinterIds.has(p.id)
      );

      setPrinters(filteredPrinters);
    } catch (err: any) {
      console.error('Failed to load printers:', err);
      setError('Failed to load printers');
    }
  };

  const loadJobs = async () => {
    try {
      const response = await api.get('/jobs');
      const jobsData = response.data.jobs || [];
      setJobs(jobsData.slice(0, 20)); // Show last 20 jobs
    } catch (err: any) {
      console.error('Failed to load jobs:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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
      formData.append('quality', quality);
      formData.append('marginTop', marginTop.toString());
      formData.append('marginBottom', marginBottom.toString());
      formData.append('marginLeft', marginLeft.toString());
      formData.append('marginRight', marginRight.toString());

      await api.post('/jobs', formData);

      // Clear form
      setSelectedFile(null);
      setCopies(1);

      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh jobs
      loadJobs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit print job');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'status-pending',
      printing: 'status-printing',
      completed: 'status-completed',
      failed: 'status-failed',
      cancelled: 'status-cancelled'
    };
    return statusColors[status] || 'status-pending';
  };

  return (
    <div className="print-page">
      <div className="print-header">
        <h1>Print</h1>
      </div>

      <div className="print-container">
        {/* Print Form */}
        <div className="print-form-card">
          <h2>Submit Print Job</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="printerSelect">Select Printer</label>
            <select
              id="printerSelect"
              value={selectedPrinter}
              onChange={(e) => {
                const printerId = e.target.value;
                setSelectedPrinter(printerId);

                // Apply printer's default settings when selected
                if (printerId) {
                  const printer = printers.find(p => p.id === printerId);
                  if (printer) {
                    if (printer.default_paper_size) setPaperSize(printer.default_paper_size);
                    if (printer.default_orientation) setOrientation(printer.default_orientation);
                    if (printer.default_color_mode) setColorMode(printer.default_color_mode);
                    if (printer.default_duplex) setDuplex(printer.default_duplex);
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
            <label htmlFor="fileInput">Select File</label>
            <input
              type="file"
              id="fileInput"
              onChange={handleFileSelect}
              className="form-file-input"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
            />
            {selectedFile && (
              <div className="file-info">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
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

          {/* Basic Print Options */}
          <div className="form-row">
            <div className="form-group" style={{flex: 1}}>
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
                <option value="A3">A3 (297 × 420 mm)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="Tabloid">Tabloid (11 × 17 in)</option>
              </select>
            </div>

            <div className="form-group" style={{flex: 1}}>
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
            <div className="form-group" style={{flex: 1}}>
              <label htmlFor="colorMode">Color Mode</label>
              <select
                id="colorMode"
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value)}
                className="form-select"
              >
                <option value="color">Color</option>
                <option value="grayscale">Grayscale</option>
                <option value="monochrome">Monochrome (Black & White)</option>
              </select>
            </div>

            <div className="form-group" style={{flex: 1}}>
              <label htmlFor="duplex">Duplex (Double-Sided)</label>
              <select
                id="duplex"
                value={duplex}
                onChange={(e) => setDuplex(e.target.value)}
                className="form-select"
              >
                <option value="none">None (Single-Sided)</option>
                <option value="long-edge">Long Edge (Book Style)</option>
                <option value="short-edge">Short Edge (Flip Style)</option>
              </select>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div style={{marginBottom: '1rem'}}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-secondary"
              style={{width: '100%', background: '#f5f5f5', color: '#333', border: '1px solid #ddd'}}
            >
              {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div style={{background: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
              <h3 style={{marginTop: 0, fontSize: '1rem'}}>Advanced Options</h3>

              <div className="form-group">
                <label htmlFor="quality">Print Quality</label>
                <select
                  id="quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="form-select"
                >
                  <option value="draft">Draft (Fast, Lower Quality)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Quality (Slower)</option>
                </select>
              </div>

              <div style={{marginTop: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  Margins (mm)
                </label>
                <div className="form-row">
                  <div className="form-group" style={{flex: 1}}>
                    <label htmlFor="marginTop">Top</label>
                    <input
                      type="number"
                      id="marginTop"
                      min="0"
                      max="50"
                      value={marginTop}
                      onChange={(e) => setMarginTop(parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label htmlFor="marginBottom">Bottom</label>
                    <input
                      type="number"
                      id="marginBottom"
                      min="0"
                      max="50"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label htmlFor="marginLeft">Left</label>
                    <input
                      type="number"
                      id="marginLeft"
                      min="0"
                      max="50"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label htmlFor="marginRight">Right</label>
                    <input
                      type="number"
                      id="marginRight"
                      min="0"
                      max="50"
                      value={marginRight}
                      onChange={(e) => setMarginRight(parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedPrinter && printers.length === 0 && (
            <div className="warning-message" style={{marginBottom: '1rem', padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', color: '#856404'}}>
              ⚠️ No printers available. Please ensure a server package is installed and online.
            </div>
          )}
          {!selectedFile && (
            <div className="info-message" style={{marginBottom: '1rem', padding: '12px', background: '#d1ecf1', border: '1px solid #17a2b8', borderRadius: '8px', color: '#0c5460'}}>
              ℹ️ Please select a file to print
            </div>
          )}
          <button
            onClick={handlePrint}
            disabled={loading || !selectedFile || !selectedPrinter}
            className="btn-primary"
            title={!selectedPrinter ? 'Please select a printer' : !selectedFile ? 'Please select a file' : 'Click to print'}
          >
            {loading ? 'Submitting...' : 'Print'}
          </button>
        </div>

        {/* Print Jobs List */}
        <div className="print-jobs-card">
          <h2>Recent Print Jobs</h2>

          <div className="jobs-list">
            {jobs.length === 0 ? (
              <div className="no-jobs">No print jobs yet</div>
            ) : (
              jobs.map((job) => {
                const jobDate = job.createdAt ? new Date(job.createdAt) : null;
                const isValidDate = jobDate && !isNaN(jobDate.getTime());

                return (
                  <div key={job.id} className="job-item">
                    <div className="job-header">
                      <span className="job-filename">📄 {job.fileName}</span>
                      <span className={`job-status ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="job-details">
                      {job.printer_name && <span>🖨️ Printer: {job.printer_name}</span>}
                      {job.worker_name && <span>💻 Server: {job.worker_name}</span>}
                      {job.client_name && <span>👤 Client: {job.client_name}</span>}
                      <span>📋 Copies: {job.copies}</span>
                      <span>🕐 {isValidDate ? jobDate.toLocaleString() : 'Date unavailable'}</span>
                    </div>
                    {job.errorMessage && (
                      <div className="job-error">{job.errorMessage}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
