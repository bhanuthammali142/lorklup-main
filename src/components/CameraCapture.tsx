// src/components/CameraCapture.tsx
import React, { useRef } from 'react'
import { Camera, Image as ImageIcon, Trash2, Check } from 'lucide-react'
import { useCamera } from '../lib/useCamera'
import { isNative } from '../lib/capacitor'

interface CameraCaptureProps {
  onPhotoSelected: (base64OrPath: string) => void
  label?: string
}

export function CameraCapture({ onPhotoSelected, label = 'Upload Photo' }: CameraCaptureProps) {
  const { photo, loading, selectPhoto, clearPhoto } = useCamera()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await selectPhoto(e)
  }

  const triggerPicker = () => {
    if (isNative()) {
      selectPhoto() // triggers native Capacitor camera plugin directly
    } else {
      fileInputRef.current?.click() // triggers web hidden file picker
    }
  }

  const confirmUpload = () => {
    if (photo) {
      onPhotoSelected(photo)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-5 border border-slate-800 bg-slate-900/40 rounded-2xl w-full max-w-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">{label}</p>
      
      {photo ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 group shadow-lg">
          <img src={photo} alt="Upload preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={triggerPicker}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition active:scale-95 flex items-center justify-center touch-target"
              title="Replace image"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={clearPhoto}
              className="p-2 rounded-xl bg-rose-500/90 text-white hover:bg-rose-600 transition active:scale-95 flex items-center justify-center touch-target"
              title="Delete image"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={triggerPicker}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-800 hover:border-blue-500/40 bg-slate-950/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
        >
          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500">
            {isNative() ? <Camera className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
          </div>
          <p className="text-xs font-semibold text-slate-400">
            {isNative() ? 'Tap to open camera' : 'Select from gallery or drop image'}
          </p>
          <p className="text-[10px] text-slate-500">JPG, PNG up to 5MB</p>
        </div>
      )}

      {/* Hidden Web File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />

      {photo && (
        <button
          type="button"
          onClick={confirmUpload}
          className="w-full btn-premium-primary gap-1.5"
          disabled={loading}
        >
          <Check className="h-4 w-4" /> Save Uploaded Image
        </button>
      )}
    </div>
  )
}
export default CameraCapture
