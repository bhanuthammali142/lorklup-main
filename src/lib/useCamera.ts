// src/lib/useCamera.ts
import { useState } from 'react'
import { isNative, capturePhoto } from './capacitor'
import toast from 'react-hot-toast'

interface CameraOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export function useCamera(options: CameraOptions = {}) {
  const { maxWidth = 1024, maxHeight = 1024, quality = 0.8 } = options
  const [photo, setPhoto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Compress photo helper using canvas
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Keep aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas context not available'))
          ctx.drawImage(img, 0, 0, width, height)

          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64)
        }
        img.onerror = reject
      }
      reader.onerror = reject
    })
  }

  const selectPhoto = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true)
    
    // 1. Native Capacitor Capture Flow
    if (isNative()) {
      try {
        const webPath = await capturePhoto()
        if (webPath) {
          setPhoto(webPath)
          toast.success('Image captured successfully!')
        }
      } catch (err) {
        console.warn('Native camera capture failed/cancelled, trying file picker')
      } finally {
        setLoading(false)
      }
      return
    }

    // 2. Web File Input Fallback Flow
    if (e && e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.')
        setLoading(false)
        return
      }

      try {
        const base64 = await compressImage(file)
        setPhoto(base64)
        toast.success('Photo added & optimized!')
      } catch (err) {
        toast.error('Failed to process image.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  const clearPhoto = () => {
    setPhoto(null)
  }

  return {
    photo,
    loading,
    selectPhoto,
    clearPhoto
  }
}
