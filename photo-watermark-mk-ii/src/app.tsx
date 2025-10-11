import React, { useState, useEffect, useRef } from 'react';
import './index.css';

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      selectDirectory: () => Promise<string[]>;
      getFileName: (path: string) => Promise<string>;
      getThumbnail: (path: string) => Promise<string>;
      getPathForFile: (file: File) => Promise<string | null>;
      handleDroppedPaths: (paths: string[]) => Promise<string[]>;
      applyWatermark: (filePath: string, options: WatermarkOptions) => Promise<string | null>;
    };
  }
}

interface FileInfo {
  path: string;
  name: string;
  thumbnail: string;
}

type PresetPosition =
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest'
  | 'center';

interface WatermarkOptions {
  text: string;
  size: number;
  color: string;
  opacity: number; // 0 - 100
  mode: 'preset' | 'custom';
  position: PresetPosition;
  offsetX?: number;
  offsetY?: number;
}

const presetPositionMap: Record<PresetPosition, { x: number; y: number }> = {
  north: { x: 0.5, y: 0.1 },
  northeast: { x: 0.9, y: 0.1 },
  east: { x: 0.9, y: 0.5 },
  southeast: { x: 0.9, y: 0.9 },
  south: { x: 0.5, y: 0.9 },
  southwest: { x: 0.1, y: 0.9 },
  west: { x: 0.1, y: 0.5 },
  northwest: { x: 0.1, y: 0.1 },
  center: { x: 0.5, y: 0.5 },
};

const App = () => {
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [selectedImage, setSelectedImage] = useState<FileInfo | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>({
    text: 'Hello World',
    size: 50,
    color: '#ffffff',
    opacity: 100,
    mode: 'preset',
    position: 'center',
    offsetX: 0.5,
    offsetY: 0.5,
  });
  const previewRef = useRef<HTMLDivElement | null>(null);
  const latestCustomPosition = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

  useEffect(() => {
    if (!selectedImage) {
      const center = { x: 0.5, y: 0.5 };
      setOverlayPosition(center);
      latestCustomPosition.current = center;
      return;
    }

    if (
      watermarkOptions.mode === 'custom' &&
      watermarkOptions.offsetX !== undefined &&
      watermarkOptions.offsetY !== undefined
    ) {
      const x = clamp(watermarkOptions.offsetX);
      const y = clamp(watermarkOptions.offsetY);
      const next = { x, y };
      setOverlayPosition(next);
      latestCustomPosition.current = next;
    } else {
      const preset = presetPositionMap[watermarkOptions.position] ?? presetPositionMap.center;
      setOverlayPosition(preset);
      latestCustomPosition.current = preset;
    }
  }, [selectedImage, watermarkOptions]);

  useEffect(() => {
    if (!selectedImage) return;
    if (
      watermarkOptions.mode === 'custom' &&
      (watermarkOptions.offsetX === undefined || watermarkOptions.offsetY === undefined)
    ) {
      return;
    }

    const apply = async () => {
      const watermarkedImage = await window.electronAPI.applyWatermark(selectedImage.path, watermarkOptions);
      if (watermarkedImage) {
        setPreviewImage(watermarkedImage);
      }
    };

    apply();
  }, [selectedImage, watermarkOptions]);

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
        droppedFiles.map((file) => window.electronAPI.getPathForFile(file))
      );
      const validInitialPaths = initialPaths.filter((path): path is string => Boolean(path));
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

  const updatePositionFromPointer = (clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = clamp((clientX - rect.left) / rect.width);
    const y = clamp((clientY - rect.top) / rect.height);
    const next = { x, y };
    setOverlayPosition(next);
    latestCustomPosition.current = next;
  };

  const finalizeCustomPosition = () => {
    const { x, y } = latestCustomPosition.current;
    setWatermarkOptions((prev) => ({
      ...prev,
      mode: 'custom',
      offsetX: x,
      offsetY: y,
    }));
  };

  const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedImage) return;
    event.preventDefault();
    setIsDragging(true);
    updatePositionFromPointer(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    updatePositionFromPointer(event.clientX, event.clientY);
  };

  const handleOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    finalizeCustomPosition();
  };

  const handleOverlayPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    finalizeCustomPosition();
  };

  const handlePositionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as PresetPosition | 'custom';

    if (value === 'custom') {
      finalizeCustomPosition();
      return;
    }

    setWatermarkOptions((prev) => ({
      ...prev,
      mode: 'preset',
      position: value,
      offsetX: undefined,
      offsetY: undefined,
    }));
  };

  const handleFileClick = (file: FileInfo) => {
    setSelectedImage(file);
    setPreviewImage(null);
  };

  const displayPreviewSrc = previewImage && previewImage.startsWith('data:') ? previewImage : null;
  const positionSelectValue = watermarkOptions.mode === 'custom' ? 'custom' : watermarkOptions.position;
  const watermarkText = watermarkOptions.text.trim();
  const renderWatermarkPreview = () => {
    if (!displayPreviewSrc || !watermarkText) return null;

    if (watermarkOptions.mode === 'custom') {
      return (
        <div
          className={`watermark-anchor${isDragging ? ' dragging' : ''}`}
          style={{
            left: `${overlayPosition.x * 100}%`,
            top: `${overlayPosition.y * 100}%`,
          }}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
          onPointerCancel={handleOverlayPointerCancel}
        />
      );
    }

    return null;
  };

  return (
    <div className="app-container">
      <div className="file-list-panel">
        <h2>文件列表</h2>
        <button onClick={handleSelectFiles}>选择文件</button>
        <button onClick={handleSelectDirectory}>选择文件夹</button>
        <p>或拖拽文件/文件夹到此处</p>
        <ul>
          {fileList.map((file, index) => (
            <li key={index} onClick={() => handleFileClick(file)} className={selectedImage?.path === file.path ? 'selected' : ''}>
              <img src={file.thumbnail} alt={file.name} width="50" />
              <span>{file.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="preview-panel">
        <h2>预览</h2>
        {selectedImage ? (
          <div className="preview-stage" ref={previewRef}>
            {displayPreviewSrc ? (
              <img src={displayPreviewSrc} alt="Preview" className="preview-image" />
            ) : (
              <p>预览生成中...</p>
            )}
            {renderWatermarkPreview()}
          </div>
        ) : (
          <p>请选择一张图片开始设置水印</p>
        )}
      </div>
      <div className="controls-panel">
        <h2>参数设置</h2>
        <div>
          <label>水印文字:</label>
          <input
            type="text"
            value={watermarkOptions.text}
            onChange={(e) => setWatermarkOptions({ ...watermarkOptions, text: e.target.value })}
          />
        </div>
        <div>
          <label>字体大小:</label>
          <input
            type="range"
            min="10"
            max="200"
            value={watermarkOptions.size}
            onChange={(e) => setWatermarkOptions({ ...watermarkOptions, size: parseInt(e.target.value, 10) })}
          />
          <span>{watermarkOptions.size}px</span>
        </div>
        <div>
          <label>字体颜色:</label>
          <input
            type="color"
            value={watermarkOptions.color}
            onChange={(e) => setWatermarkOptions({ ...watermarkOptions, color: e.target.value })}
          />
        </div>
        <div>
          <label>透明度:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={watermarkOptions.opacity}
            onChange={(e) => setWatermarkOptions({ ...watermarkOptions, opacity: parseInt(e.target.value, 10) })}
          />
          <span>{watermarkOptions.opacity}%</span>
        </div>
        <div>
          <label>水印位置:</label>
          <select value={positionSelectValue} onChange={handlePositionChange}>
            <option value="north">上</option>
            <option value="northeast">右上</option>
            <option value="east">右</option>
            <option value="southeast">右下</option>
            <option value="south">下</option>
            <option value="southwest">左下</option>
            <option value="west">左</option>
            <option value="northwest">左上</option>
            <option value="center">中</option>
            <option value="custom">自定义</option>
          </select>
            <p className="controls-hint">选择“自定义”后，拖拽预览中的圆点调整位置</p>
        </div>
      </div>
    </div>
  );
};

export default App;


