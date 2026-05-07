import Image from "next/image";

type MenuImageProps = {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  src: string | null;
};

export function MenuImage({
  alt,
  className = "object-cover",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 320px",
  src,
}: MenuImageProps) {
  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,rgba(251,191,36,.12),rgba(255,255,255,.03))] px-4 text-center text-xs font-black uppercase text-amber-50/40">
        Sin imagen
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={`h-full w-full ${className}`}
      fill
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      sizes={sizes}
      src={src}
    />
  );
}
