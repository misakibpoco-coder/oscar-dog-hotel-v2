import React from 'react';
import { useApp, DeviceWidthMode } from '../../context/AppContext';
import { Smartphone, RotateCcw } from 'lucide-react';

export const DeviceToolbar: React.FC = () => {
  const { deviceWidth, setDeviceWidth, resetAllData } = useApp();

  const widths: { label: string; mode: DeviceWidthMode }[] = [
    { label: 'Responsive', mode: 'responsive' },
    { label: '320px (SE)', mode: 320 },
    { label: '360px (Android)', mode: 360 },
    { label: '375px (iPhone mini)', mode: 375 },
    { label: '390px (iPhone 14)', mode: 390 },
    { label: '412px (Pixel / Galaxy)', mode: 412 },
    { label: '430px (Pro Max)', mode: 430 },
    { label: '709px (SVG Ref)', mode: 709 }
  ];

  return (
    <div className="device-toolbar">
      <div className="device-toolbar-title">
        <Smartphone size={16} />
        <span>Mobile Viewport Simulator:</span>
      </div>

      <div className="device-toolbar-buttons">
        {widths.map((w) => (
          <button
            key={w.label}
            type="button"
            className={`device-btn ${deviceWidth === w.mode ? 'active' : ''}`}
            onClick={() => setDeviceWidth(w.mode)}
          >
            {w.label}
          </button>
        ))}

        <button
          type="button"
          className="device-btn"
          onClick={() => {
            if (window.confirm('Reset all demo data to original state?')) {
              resetAllData();
            }
          }}
          title="Reset Sample Data"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}
        >
          <RotateCcw size={12} />
          <span>Reset Data</span>
        </button>
      </div>
    </div>
  );
};
