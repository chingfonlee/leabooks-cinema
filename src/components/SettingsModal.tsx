import { useRef } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { UI_STRINGS } from "../i18n";
import type { AppSettings } from "../types";
import { useSpatialNavigation } from "../utils/tvNavigation";

interface SettingsModalProps {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

const PAGE_DURATIONS = [10, 15, 20, 30];
const IDLE_VALUES = [30, 60, 90, 0];

export function SettingsModal({
  settings,
  onChange,
  onClose,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useSpatialNavigation(modalRef, true, onClose);

  const strings = UI_STRINGS[settings.language];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{strings.settingsTitle}</h2>
          <button className="action-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-row">
            <div className="setting-info">
              <h3>{strings.settingPageDurTitle}</h3>
              <p>{strings.settingPageDurDesc}</p>
            </div>
            <div className="option-pills">
              {PAGE_DURATIONS.map((sec) => (
                <button
                  key={sec}
                  className={`option-pill ${settings.pageDurationSec === sec ? "active" : ""}`}
                  onClick={() => onChange({ ...settings, pageDurationSec: sec })}
                >
                  {strings.secUnit(sec)}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h3>{strings.settingIdleTitle}</h3>
              <p>{strings.settingIdleDesc}</p>
            </div>
            <div className="option-pills">
              {IDLE_VALUES.map((val) => (
                <button
                  key={val}
                  className={`option-pill ${settings.idleResumeSec === val ? "active" : ""}`}
                  onClick={() => onChange({ ...settings, idleResumeSec: val })}
                >
                  {val === 0 ? strings.off : strings.secUnit(val)}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h3>{strings.settingMusicTitle}</h3>
              <p>{strings.settingMusicDesc}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button
                className={`option-pill ${!settings.musicMuted ? "active" : ""}`}
                onClick={() =>
                  onChange({ ...settings, musicMuted: !settings.musicMuted })
                }
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                {settings.musicMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                {settings.musicMuted ? strings.musicOff : strings.musicOn}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    musicVolume: Number(e.target.value) / 100,
                    musicMuted: false,
                  })
                }
                style={{ width: 150, accentColor: "var(--accent)" }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="action-btn primary"
            data-autofocus="true"
            onClick={onClose}
          >
            {strings.done}
          </button>
        </div>
      </div>
    </div>
  );
}
