import { photos, type PhotoName } from "../photos.ts"

/** A real photograph from the registry in `photos.ts`, cropped with object-fit. */
export function Photo({
  name,
  className = "",
  priority = false,
  position
}: {
  name: PhotoName
  className?: string
  priority?: boolean
  position?: string
}) {
  const photo = photos[name]
  return (
    <img
      className={`photo ${className}`}
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      style={{ objectPosition: position ?? photo.position }}
    />
  )
}
