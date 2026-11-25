export function WelcomeArt({ className = "" }: { className?: string }) {
  return (
    <figure className={`editorial-photo ${className}`.trim()}>
      <img
        src="/dealio-context/art/welcome-deals.svg"
        alt=""
        aria-hidden="true"
        width={1200}
        height={560}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </figure>
  );
}
