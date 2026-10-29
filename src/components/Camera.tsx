"use client";

import { useEffect, useRef, useState } from "react";
import { Camera as CameraIcon, Ghost, Upload } from "lucide-react";

const GHOST_LEVELS = [0, 0.3, 0.5];

// Front camera with a face guide. Falls back to a file picker when the
// camera is unavailable or permission is denied.
//
// `ghost` is the person's first baseline photo, shown faintly over the live
// view so they line up the same way every time. Consistent framing is what
// keeps photo-to-photo noise (and false alarms) low.
export function Camera({
  onPhoto,
  guide = "face",
  ghost,
}: {
  onPhoto: (b: Blob) => void;
  guide?: "face" | "upper";
  ghost?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ghostLevel, setGhostLevel] = useState(1);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
      : Promise.reject(new Error("no camera"))
    )
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    // Crop to portrait 3:4 around the centre, which is what the guide shows.
    const targetRatio = 3 / 4;
    let sw = v.videoWidth;
    let sh = v.videoHeight;
    if (sw / sh > targetRatio) sw = Math.round(sh * targetRatio);
    else sh = Math.round(sw / targetRatio);
    const sx = Math.round((v.videoWidth - sw) / 2);
    const sy = Math.round((v.videoHeight - sh) / 2);
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    c.getContext("2d")!.drawImage(v, sx, sy, sw, sh, 0, 0, sw, sh);
    c.toBlob((b) => b && onPhoto(b), "image/jpeg", 0.95);
  }

  return (
    <div>
      {!failed && (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          {ghost && GHOST_LEVELS[ghostLevel] > 0 && (
            // Mirrored like the live preview so it lines up with what the person sees.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ghost}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover mix-blend-screen"
              style={{ opacity: GHOST_LEVELS[ghostLevel] }}
            />
          )}
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <mask id="cut">
                <rect width="300" height="400" fill="white" />
                {guide === "face" ? (
                  <ellipse cx="150" cy="185" rx="105" ry="140" fill="black" />
                ) : (
                  <path d="M150 60 a70 85 0 1 1 -0.1 0 M40 400 q0 -110 110 -125 q110 15 110 125 z" fill="black" />
                )}
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#cut)" />
            {guide === "face" && <ellipse cx="150" cy="185" rx="105" ry="140" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 6" />}
          </svg>
          <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/90">
            {ghost && GHOST_LEVELS[ghostLevel] > 0
              ? "Line up with your faint baseline photo"
              : guide === "face"
                ? "Fill the oval · hair back · no glasses · even light"
                : "Head and shoulders in frame"}
          </p>
          {ghost && (
            <button
              type="button"
              onClick={() => setGhostLevel((g) => (g + 1) % GHOST_LEVELS.length)}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white"
              aria-label="Change baseline overlay strength"
            >
              <Ghost size={14} /> {GHOST_LEVELS[ghostLevel] ? `${GHOST_LEVELS[ghostLevel] * 100}%` : "Off"}
            </button>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {!failed && (
          <button onClick={capture} disabled={!ready} className="btn btn-primary">
            <CameraIcon size={18} /> Take photo
          </button>
        )}
        <label className="btn btn-ghost cursor-pointer">
          <Upload size={18} /> Upload a photo
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(f);
            }}
          />
        </label>
      </div>
      {failed && <p className="mt-3 text-center text-sm text-muted">Camera not available here. Upload a front-facing photo instead.</p>}
    </div>
  );
}
