import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { Printer, PrintOptions, PrintJobStatus } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    client,
    printers,
    printJobs,
    selectedPrinter,
    setClient,
    setPrinters,
    setPrintJobs,
    setSelectedPrinter,
    addPrintJob,
    reset
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    printerId: '',
    copies: 1,
    colorMode: 'color',
    duplex: 'none',
    orientation: 'portrait',
    paperSize: 'A4'
  });

  useEffect(() => {
    if (!api.isAuthenticated()) {
      navigate('/login');
      return;
    }

    const savedClient = api.getClient();
    if (savedClient) {
      setClient(savedClient);
    }

    loadData();
    const interval = setInterval(loadJobs, 5000); // Refresh jobs every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([loadPrinters(), loadJobs()]);
  };

  const loadPrinters = async () => {
    try {
      const printerList = await api.getPrinters();
      setPrinters(printerList);

      if (printerList.length > 0 && !selectedPrinter) {
        const defaultPrinter = printerList.find(p => p.isDefault) || printerList[0];
        setSelectedPrinter(defaultPrinter);
        setPrintOptions(prev => ({ ...prev, printerId: defaultPrinter.id }));
      }
    } catch (err: any) {
      console.error('Error loading printers:', err);
    }
  };

  const loadJobs = async () => {
    try {
      const jobs = await api.getPrintJobs(undefined, 20);
      setPrintJobs(jobs);
    } catch (err: any) {
      console.error('Error loading jobs:', err);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await window.electronAPI.selectFile();
      if (result) {
        // Create a File object from the selected path
        const buffer = await window.electronAPI.readFile(result.path);
        const blob = new Blob([buffer]);
        const file = new File([blob], result.name, {
          type: getMimeType(result.name)
        });
        setSelectedFile(file);
        setError('');
      }
    } catch (err: any) {
      setError('Error selecting file: ' + err.message);
    }
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const handlePrint = async () => {
    if (!selectedFile || !printOptions.printerId) {
      setError('Please select a file and printer');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const job = await api.createPrintJob(selectedFile, printOptions);
      addPrintJob(job);
      setSuccess('Print job created successfully!');
      setSelectedFile(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating print job');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await api.cancelPrintJob(jobId);
      await loadJobs();
      setSuccess('Job cancelled successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error cancelling job');
    }
  };

  const handleLogout = () => {
    api.logout();
    reset();
    navigate('/login');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>RPrint - Remote Printing</h1>
        <div className="header-actions">
          {client && (
            <div className="user-info">
              <span>Welcome, {client.displayName}</span>
            </div>
          )}
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="card">
          <h2 className="card-title">Available Printers</h2>
          {printers.length === 0 ? (
            <p>No printers available. Please ensure Windows service is running.</p>
          ) : (
            <div className="printer-list">
              {printers.map(printer => (
                <div
                  key={printer.id}
                  className={`printer-item ${selectedPrinter?.id === printer.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedPrinter(printer);
                    setPrintOptions(prev => ({ ...prev, printerId: printer.id }));
                  }}
                >
                  <h3>{printer.displayName}</h3>
                  <span className={`printer-status ${printer.status}`}>
                    {printer.status}
                  </span>
                  {printer.location && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{printer.location}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Print Document</h2>

          <div className="form-group">
            <label>Select File</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={handleFileSelect}>
                Browse Files
              </button>
              {selectedFile && <span>{selectedFile.name}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label>Copies</label>
              <input
                type="number"
                min="1"
                max="99"
                value={printOptions.copies}
                onChange={(e) => setPrintOptions({ ...printOptions, copies: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>Color Mode</label>
              <select
                value={printOptions.colorMode}
                onChange={(e) => setPrintOptions({ ...printOptions, colorMode: e.target.value as any })}
              >
                <option value="color">Color</option>
                <option value="grayscale">Grayscale</option>
              </select>
            </div>

            <div className="form-group">
              <label>Duplex</label>
              <select
                value={printOptions.duplex}
                onChange={(e) => setPrintOptions({ ...printOptions, duplex: e.target.value as any })}
              >
                <option value="none">None</option>
                <option value="short">Short Edge</option>
                <option value="long">Long Edge</option>
              </select>
            </div>

            <div className="form-group">
              <label>Orientation</label>
              <select
                value={printOptions.orientation}
                onChange={(e) => setPrintOptions({ ...printOptions, orientation: e.target.value as any })}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div className="form-group">
              <label>Paper Size</label>
              <select
                value={printOptions.paperSize}
                onChange={(e) => setPrintOptions({ ...printOptions, paperSize: e.target.value })}
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
                <option value="A3">A3</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={loading || !selectedFile || !selectedPrinter}
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Sending...' : 'Print'}
          </button>
        </div>

        <div className="card">
          <h2 className="card-title">Recent Print Jobs</h2>
          {printJobs.length === 0 ? (
            <p>No print jobs yet</p>
          ) : (
            <div className="job-list">
              {printJobs.map(job => (
                <div key={job.id} className="job-item">
                  <div className="job-info">
                    <h4>{job.fileName}</h4>
                    <p>{new Date(job.createdAt).toLocaleString()}</p>
                    {job.errorMessage && <p style={{ color: '#e74c3c' }}>{job.errorMessage}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className={`job-status ${job.status}`}>{job.status}</span>
                    {job.status === PrintJobStatus.PENDING && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleCancelJob(job.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
