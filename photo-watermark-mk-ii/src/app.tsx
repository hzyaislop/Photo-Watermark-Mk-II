import React, { useState, useEffect } from 'react';
import './index.css';

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      getFileName: (path: string) => Promise<string>;
    };
  }
  interface File {
    path: string;
  }
}

interface FileInfo {
  path: string;
  name: string;
}

const App = () => {
  const [fileList, setFileList] = useState<FileInfo[]>([]);

  const processFiles = async (files: string[]) => {
    const fileInfoList = await Promise.all(
      files.map(async (path) => {
        const name = await window.electronAPI.getFileName(path);
        return { path, name };
      })
    );
    setFileList((prevList) => [...prevList, ...fileInfoList]);
  };

  const handleSelectFiles = async () => {
    const files = await window.electronAPI.selectFiles();
    if (files) {
      processFiles(files);
    }
  };

  useEffect(() => {
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).map((file) => file.path);
      processFiles(files);
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    document.body.addEventListener('drop', handleDrop);
    document.body.addEventListener('dragover', handleDragOver);

    return () => {
      document.body.removeEventListener('drop', handleDrop);
      document.body.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="file-list-panel">
        <h2>Files</h2>
        <button onClick={handleSelectFiles}>Select Images</button>
        <p>Or drag and drop files here</p>
        <ul>
          {fileList.map((file, index) => (
            <li key={index}>{file.name}</li>
          ))}
        </ul>
      </div>
      <div className="preview-panel">
        <h2>Preview</h2>
        {/* Image preview will go here */}
      </div>
      <div className="controls-panel">
        <h2>Controls</h2>
        {/* Watermark controls will go here */}
      </div>
    </div>
  );
};

export default App;


