interface BrandMarkIconProps {
  className?: string;
}

export function BrandMarkIcon({ className }: BrandMarkIconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M12.5 13.5h18.2a4.5 4.5 0 1 1 0 9H12.5a4.5 4.5 0 1 1 0-9Z"
        fill="currentColor"
      />
      <path
        d="M28.5 16.5h7.2a3.4 3.4 0 1 1 0 6.8h-7.2v-6.8Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="m27.2 20.3 3.8 3.2-10.6 12.4a3.2 3.2 0 0 1-4.8.3 3.2 3.2 0 0 1-.3-4.8l11.9-11.1Z"
        fill="currentColor"
        opacity="0.94"
      />
      <circle cx="15.8" cy="33.8" r="1.8" fill="currentColor" opacity="0.18" />
    </svg>
  );
}
