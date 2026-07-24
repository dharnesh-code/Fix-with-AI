import { useRef, useState, useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

export default function UploadPanel({ onSubmit, error }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setDescription(transcript);
    }
  }, [transcript]);

  function startVoice() {
    resetTranscript();

    SpeechRecognition.startListening({
      continuous: true,
      language: "en-US",
    });
  }

  function stopVoice() {
    SpeechRecognition.stopListening();
  }

  function handleFile(selected) {
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);

    const dropped = e.dataTransfer.files?.[0];
    handleFile(dropped);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!file || !description.trim()) return;

    onSubmit(file, description.trim());
  }

  return (
    <form className="blueprint-frame upload-panel" onSubmit={handleSubmit}>
      <div className="upload-grid">

        {/* Upload Image */}

        <div>

          <span className="field-label">
            01 — Upload a Photo
          </span>

          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && inputRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >

            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="dropzone-preview"
              />
            ) : (
              <>
                <div className="dropzone-icon">📷</div>

                <div className="dropzone-label">
                  Drag & Drop your image
                </div>

                <div className="dropzone-hint">
                  JPG • PNG • WEBP • Max 8MB
                </div>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

          </div>

        </div>

        {/* Description */}

        <div>

          <span className="field-label">
            02 — Describe your issue
          </span>

          <textarea
            className="description-input"
            placeholder="Describe your problem..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {browserSupportsSpeechRecognition && (

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
              }}
            >

              {!listening ? (

                <button
                  type="button"
                  className="btn-primary"
                  onClick={startVoice}
                >
                  🎤 Start Voice
                </button>

              ) : (

                <button
                  type="button"
                  className="btn-primary"
                  style={{ background: "#ef4444" }}
                  onClick={stopVoice}
                >
                  🔴 Stop Recording
                </button>

              )}

            </div>

          )}

          {!browserSupportsSpeechRecognition && (
            <p style={{ color: "red" }}>
              Your browser doesn't support Voice Recognition.
            </p>
          )}

        </div>

        {/* Submit */}

        <div className="upload-actions">

          {error ? (
            <span className="error-text">
              {error}
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={!file || !description.trim()}
          >
            🚀 Diagnose the Problem
          </button>

        </div>

      </div>
    </form>
  );
}