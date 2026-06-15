// src/components/CameraCapture.tsx
import React, { useRef, useState, useEffect } from 'react'
import { Camera, RefreshCw, Trash2, X, FolderOpen } from 'lucide-react'
import { isNative, capturePhoto, pickPhotoFromGallery } from '../lib/capacitor'
import { PermissionDialog } from './PermissionDialog'
import toast from 'react-hot-toast'

interface CameraCaptureProps {
  onPhotoSelected: (base64: string) => void
  label?: string
  shape?: 'circle' | 'rectangle'
  initialPreviewUrl?: string
}

export function CameraCapture({ onPhotoSelected, label = 'Upload Photo', shape = 'circle', initialPreviewUrl }: CameraCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(initialPreviewUrl || null)
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [permissionAlert, setPermissionAlert] = useState(false)
  
  // HTML5 Webcam states
  const [webcamActive, setWebcamActive] = useState(false)
  const [loadingWebcam, setLoadingWebcam] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Enumerate cameras on browser mount
  useEffect(() => {
    if (!isNative() && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setHasMultipleCameras(videoDevices.length > 1)
        })
        .catch(err => console.warn('Error enumerating cameras:', err))
    }
  }, [])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Bind stream to video element when mounted
  useEffect(() => {
    if (webcamActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [webcamActive, stream])

  // Convert native webPath to Base64
  const convertWebPathToBase64 = async (webPath: string): Promise<string> => {
    const response = await fetch(webPath)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Auto-crop and compress files uploaded from desktop/device files
  const processUploadedFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas context unavailable'))

          const imgWidth = img.width
          const imgHeight = img.height
          let sWidth = imgWidth
          let sHeight = imgHeight
          let sx = 0
          let sy = 0

          if (shape === 'circle') {
            const size = Math.min(imgWidth, imgHeight)
            sWidth = size
            sHeight = size
            sx = (imgWidth - size) / 2
            sy = (imgHeight - size) / 2
            canvas.width = Math.min(size, 800) // limit output size
            canvas.height = Math.min(size, 800)
          } else {
            // standard ID card aspect ratio (approx 1.58)
            const targetAspectRatio = 1.58
            let cropWidth = imgWidth
            let cropHeight = imgWidth / targetAspectRatio

            if (cropHeight > imgHeight) {
              cropHeight = imgHeight
              cropWidth = imgHeight * targetAspectRatio
            }

            sWidth = cropWidth
            sHeight = cropHeight
            sx = (imgWidth - cropWidth) / 2
            sy = (imgHeight - cropHeight) / 2

            canvas.width = Math.min(cropWidth, 1024)
            canvas.height = Math.min(cropHeight, Math.round(1024 / targetAspectRatio))
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)
          const base64 = canvas.toDataURL('image/jpeg', 0.85) // quality 85%
          resolve(base64)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const startWebcam = async (mode = facingMode) => {
    setLoadingWebcam(true)
    setWebcamError(null)
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      setStream(newStream)
      setWebcamActive(true)
    } catch (err: any) {
      console.error('Error starting webcam:', err)
      setWebcamError('Camera access denied or unavailable. Please upload a file instead.')
      toast.error('Could not access camera. Please upload a file.')
    } finally {
      setLoadingWebcam(false)
    }
  }

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setWebcamActive(false)
  }

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
    if (webcamActive) {
      startWebcam(nextMode)
    }
  }

  const captureWebcamFrame = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    let videoWidth = video.videoWidth
    let videoHeight = video.videoHeight

    if (!videoWidth || !videoHeight) {
      const track = stream?.getVideoTracks()[0]
      const settings = track?.getSettings()
      videoWidth = settings?.width || 640
      videoHeight = settings?.height || 480
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let sWidth = videoWidth
    let sHeight = videoHeight
    let sx = 0
    let sy = 0

    if (shape === 'circle') {
      const size = Math.min(videoWidth, videoHeight)
      sWidth = size
      sHeight = size
      sx = (videoWidth - size) / 2
      sy = (videoHeight - size) / 2
      canvas.width = Math.min(size, 800)
      canvas.height = Math.min(size, 800)
    } else {
      const targetAspectRatio = 1.58
      let cropWidth = videoWidth
      let cropHeight = videoWidth / targetAspectRatio

      if (cropHeight > videoHeight) {
        cropHeight = videoHeight
        cropWidth = videoHeight * targetAspectRatio
      }

      sWidth = cropWidth
      sHeight = cropHeight
      sx = (videoWidth - cropWidth) / 2
      sy = (videoHeight - cropHeight) / 2

      canvas.width = Math.min(cropWidth, 1024)
      canvas.height = Math.min(cropHeight, Math.round(1024 / targetAspectRatio))
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    setPhoto(base64)
    onPhotoSelected(base64)
    stopWebcam()
    toast.success('Photo captured and auto-cropped!')
  }

  const triggerPicker = () => {
    if (isNative()) {
      setShowOptions(true)
    } else {
      // On browser, offer webcam first if available, else open file dialog
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        startWebcam()
      } else {
        fileInputRef.current?.click()
      }
    }
  }

  const handleSourceSelect = async (source: 'camera' | 'gallery') => {
    setShowOptions(false)
    setLoading(true)
    try {
      const webPath = source === 'gallery' ? await pickPhotoFromGallery() : await capturePhoto()
      if (webPath) {
        const base64 = await convertWebPathToBase64(webPath)
        setPhoto(base64)
        onPhotoSelected(base64)
        toast.success('Photo selected successfully!')
      }
    } catch (err) {
      console.warn('Native camera operation cancelled/failed:', err)
      setPermissionAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.')
        return
      }
      setLoading(true)
      try {
        const base64 = await processUploadedFile(file)
        setPhoto(base64)
        onPhotoSelected(base64)
        toast.success('Photo uploaded and optimized!')
      } catch (err) {
        console.error('File process error:', err)
        toast.error('Failed to process uploaded image.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDelete = () => {
    setPhoto(null)
    onPhotoSelected('')
  }

  // Render webcam viewport
  if (webcamActive) {
    return (
      <div className="relative w-full aspect-video sm:aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-xl flex flex-col justify-end">
        {loadingWebcam ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : webcamError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 gap-3">
            <X className="h-10 w-10 text-rose-500" />
            <p className="text-sm font-semibold">{webcamError}</p>
            <button
              onClick={() => { stopWebcam(); fileInputRef.current?.click(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Upload File Instead
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Dynamic target crop overlay */}
        {!loadingWebcam && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {shape === 'circle' ? (
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-dashed border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            ) : (
              <div className="w-[80%] aspect-[1.58] max-w-sm rounded-2xl border-4 border-dashed border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            )}
          </div>
        )}

        {/* Live Camera Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4 z-10">
          <button
            type="button"
            onClick={stopWebcam}
            className="p-3 bg-slate-900/90 hover:bg-slate-800 rounded-full border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 shadow-md"
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={captureWebcamFrame}
            className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full border border-indigo-400 transition active:scale-90 shadow-lg"
            title="Capture Photo"
          >
            <Camera className="h-6 w-6" />
          </button>

          {hasMultipleCameras && (
            <button
              type="button"
              onClick={toggleCamera}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 rounded-full border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 shadow-md"
              title="Switch Camera"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 rounded-2xl w-full">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider self-start">{label}</p>
      
      {photo ? (
        <div className="relative w-full aspect-[1.58] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-sm bg-white dark:bg-slate-900">
          <img src={photo} alt="Onboarding Document Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={triggerPicker}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition active:scale-95 flex items-center justify-center shadow-lg"
              title="Replace image"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition active:scale-95 flex items-center justify-center shadow-lg"
              title="Upload file"
            >
              <FolderOpen className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition active:scale-95 flex items-center justify-center shadow-lg"
              title="Delete image"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[1.58] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500/40 bg-white dark:bg-slate-950/20 flex flex-col items-center justify-center p-4 text-center select-none transition">
          <div className="flex gap-4 mb-2">
            <button
              type="button"
              onClick={triggerPicker}
              className="h-10 w-10 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition active:scale-95"
              title="Open Camera"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition active:scale-95"
              title="Choose File"
            >
              <FolderOpen className="h-5 w-5" />
            </button>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {isNative() ? 'Tap camera or library' : 'Open camera or select file'}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Image will be cropped and compressed</span>
        </div>
      )}

      {/* Hidden Web File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Native Selection Overlay Modal */}
      {showOptions && (
        <div className="fixed inset-0 z-[11000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-850">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Select Photo Source</span>
              <button onClick={() => setShowOptions(false)} className="text-slate-400 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => handleSourceSelect('camera')}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left font-bold"
            >
              <Camera className="h-5 w-5 text-indigo-500" />
              Take Photo with Camera
            </button>
            <button
              onClick={() => handleSourceSelect('gallery')}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left font-bold"
            >
              <FolderOpen className="h-5 w-5 text-indigo-500" />
              Choose from Photo Library
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="w-full py-3 rounded-2xl bg-slate-150 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-950/50 flex items-center justify-center z-50">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-650" />
        </div>
      )}

      <PermissionDialog
        isOpen={permissionAlert}
        onClose={() => setPermissionAlert(false)}
        permissionName="Camera/Gallery"
        description="Please enable camera and photo storage access in your device settings to capture files."
      />
    </div>
  )
}
export default CameraCapture
