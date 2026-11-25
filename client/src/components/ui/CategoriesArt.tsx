export function CategoriesArt({ className = "" }: { className?: string }) {
  return (
    <figure className={`editorial-photo ${className}`.trim()}>
      <picture>
        <source
          media="(max-width: 760px)"
          srcSet="/dealio-context/art/popular-categories-wide.svg"
        />
        <img
          src="/dealio-context/art/popular-categories.svg"
          alt=""
          aria-hidden="true"
          width={620}
          height={760}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
    </figure>
  );
}
