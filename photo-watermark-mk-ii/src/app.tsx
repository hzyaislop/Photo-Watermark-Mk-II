import React, { useState, useEffect } from 'react';
import './index.css';

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      selectDirectory: () => Promise<string[]>;
      getFileName: (path: string) => Promise<string>;
      getThumbnail: (path: string) => Promise<string>;
      getPathForFile: (file: File) => Promise<string>;
      handleDroppedPaths: (paths: string[]) => Promise<string[]>;
    };
  }
}

interface FileInfo {
  path: string;
  name: string;
  thumbnail: string;
}

const App = () => {
  const [fileList, setFileList] = useState<FileInfo[]>([]);

  const processFiles = async (files: string[]) => {
    if (!files || files.length === 0) return;
    const fileInfoList = await Promise.all(
      files.map(async (path) => {
        const name = await window.electronAPI.getFileName(path);
        const thumbnail = await window.electronAPI.getThumbnail(path);
        return { path, name, thumbnail };
      })
    );
    setFileList((prevList) => [...prevList, ...fileInfoList]);
  };

  const handleSelectFiles = async () => {
    const files = await window.electronAPI.selectFiles();
    processFiles(files);
  };

  const handleSelectDirectory = async () => {
    const files = await window.electronAPI.selectDirectory();
    processFiles(files);
  };

  useEffect(() => {
    const handleDrop = async (event: DragEvent) => {
      event.preventDefault();
      const droppedFiles = Array.from(event.dataTransfer.files);
      const initialPaths = await Promise.all(
        droppedFiles.map(file => (window as any).electronAPI.getPathForFile(file))
      );
      const validInitialPaths = initialPaths.filter(path => !!path);
      const allImageFiles = await window.electronAPI.handleDroppedPaths(validInitialPaths);
      processFiles(allImageFiles);
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
        <button onClick={handleSelectFiles}>Select Files</button>
        <button onClick={handleSelectDirectory}>Select Folder</button>
        <p>Or drag and drop files here</p>
        <ul>
          {fileList.map((file, index) => (
            <li key={index}>
              <img src={file.thumbnail} alt={file.name} width="50" />
              <span>{file.name}</span>
            </li>
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


