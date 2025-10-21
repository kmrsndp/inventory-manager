'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ManualReviewItem {
  row_index: number;
  name?: string;
  mobile_candidate?: string;
  mobile_normalized?: string;
  planRaw?: string;
  importMonth?: string;
  reason?: string;
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [manualReview, setManualReview] = useState<ManualReviewItem[]>([]);
  const [importSummary, setImportSummary] = useState<{
    membersCount: number;
    manualReviewCount: number;
    diagnostics: any; // Adjust type as per Diagnostics interface
  } | null>(null);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
      setMessage('');
      setError('');
      setManualReview([]);
      setImportSummary(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select an Excel file to upload.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');
    setManualReview([]);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/import-register', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || 'File processed successfully!');
        setImportSummary(result.data);
        if (result.data.manualReviewCount > 0) {
          setManualReview(result.data.manualReview);
          setMessage(prev => prev + ` ${result.data.manualReviewCount} items require manual review.`);
        }
        // Optionally redirect or refresh data
        // router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to process file.');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Import Excel Register</h1>

      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg shadow-sm bg-white">
        <div className="mb-4">
          <label htmlFor="excelFile" className="block text-gray-700 text-sm font-bold mb-2">
            Upload Excel File:
          </label>
          <input
            type="file"
            id="excelFile"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          type="submit"
          disabled={!selectedFile || loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Import Data'}
        </button>
      </form>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {importSummary && (
        <div className="mt-8 p-4 border rounded-lg shadow-sm bg-blue-50">
          <h2 className="text-xl font-bold mb-4 text-blue-800">Import Summary</h2>
          <p><strong>Members Processed:</strong> {importSummary.membersCount}</p>
          <p><strong>Items for Manual Review:</strong> {importSummary.manualReviewCount}</p>
          {importSummary.diagnostics && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Diagnostics:</h3>
              <p>Total Rows in Excel: {importSummary.diagnostics.totalRows}</p>
              <p>Parsed Rows: {importSummary.diagnostics.parsedRows}</p>
              <p>Skipped Rows: {importSummary.diagnostics.skippedRows}</p>
              <p>Detected Headers: {importSummary.diagnostics.detectedHeaders.map((h: any) => `${h.month}-${h.year}`).join(', ')}</p>
              <p>Best Plan Column: {importSummary.diagnostics.planDetection.bestCol !== null ? `Column ${importSummary.diagnostics.planDetection.bestCol + 1}` : 'N/A'}</p>
            </div>
          )}
        </div>
      )}

      {manualReview.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-yellow-700">Manual Review Required ({manualReview.length} items)</h2>
          <p className="text-yellow-600 mb-4">The following rows could not be fully processed automatically and require manual verification or correction:</p>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Row Index</th>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Mobile Candidate</th>
                  <th className="py-2 px-4 border-b">Normalized Mobile</th>
                  <th className="py-2 px-4 border-b">Plan Raw</th>
                  <th className="py-2 px-4 border-b">Import Month</th>
                  <th className="py-2 px-4 border-b">Reason</th>
                </tr>
              </thead>
              <tbody>
                {manualReview.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{item.row_index}</td>
                    <td className="py-2 px-4 border-b">{item.name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{item.mobile_candidate || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{item.mobile_normalized || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{item.planRaw || 'N/A'}</td>
                    <td className="py-2 px-4 border-b">{item.importMonth || 'N/A'}</td>
                    <td className="py-2 px-4 border-b text-red-600">{item.reason || 'Unknown reason'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
