import { useState } from "react";

interface EditorialPhotoProps {
  image:
    | "tech-desk"
    | "headphones"
    | "server-rack"
    | "electronics-store"
    | "smartwatch"
    | "audio-rack";
  className?: string;
  loading?: "eager" | "lazy";
}

const photos = {
  "tech-desk": {
    alt: "A laptop and a phone on a wooden desk in warm light",
    title: "Apple-iphone-desk-laptop (23699175703)",
    displayTitle: "Laptop and phone on a desk",
    creator: "Pixel.la Free Stock Photos",
    license: "CC0",
    licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/",
    href: "https://commons.wikimedia.org/wiki/File:Apple-iphone-desk-laptop_(23699175703).jpg",
    width: 1200,
    height: 704,
  },
  headphones: {
    alt: "Over-ear headphones resting on a dark wooden surface in black and white",
    title: "Headphones on wood in black and white (Unsplash)",
    displayTitle: "Headphones on a wooden desk",
    creator: "Corey Blaz",
    license: "CC0",
    licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/",
    href: "https://commons.wikimedia.org/wiki/File:Headphones_on_wood_in_black_and_white_(Unsplash).jpg",
    width: 1100,
    height: 749,
  },
  "server-rack": {
    alt: "Rows of server racks with cabling and status lights in a data centre",
    title: "NOIRLab HQ Server Racks (6V6A0375-CC)",
    displayTitle: "Server racks in a data centre",
    creator: "NOIRLab/NSF/AURA/T. Slovinský",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    href: "https://commons.wikimedia.org/wiki/File:NOIRLab_HQ_Server_Racks_(6V6A0375-CC).jpg",
    width: 1123,
    height: 900,
  },
  "electronics-store": {
    alt: "An electronics store floor with lit shelving, display benches and shoppers",
    title: "German electronics store in 2016",
    displayTitle: "Electronics store floor",
    creator: "Jan Honvehlmann",
    license: "Public domain",
    licenseHref: "https://creativecommons.org/publicdomain/mark/1.0/",
    href: "https://commons.wikimedia.org/wiki/File:German_electronics_store_in_2016.jpg",
    width: 1200,
    height: 876,
  },
  smartwatch: {
    alt: "A hand holding a smartwatch, its screen showing the time and step count",
    title: "Smartwatch-828786",
    displayTitle: "Smartwatch in hand",
    creator: "Crew",
    license: "CC0",
    licenseHref: "https://creativecommons.org/publicdomain/zero/1.0/",
    href: "https://commons.wikimedia.org/wiki/File:Smartwatch-828786.jpg",
    width: 1056,
    height: 825,
  },
  "audio-rack": {
    alt: "A studio equipment rack with mixing units, dials and lit meters",
    title: "Studio Equipment Rack",
    displayTitle: "Studio equipment rack",
    creator: "Nir Yaniv",
    license: "CC BY-SA 4.0",
    licenseHref: "https://creativecommons.org/licenses/by-sa/4.0/",
    href: "https://commons.wikimedia.org/wiki/File:Studio_Equipment_Rack.jpg",
    width: 1100,
    height: 815,
  },
} as const;

export function EditorialPhoto({
  image,
  className = "",
  loading = "lazy",
}: EditorialPhotoProps) {
  const photo = photos[image];
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`editorial-photo ${className}`.trim()}>
      <img
        src={`/dealio-context/processed/${image}.webp`}
        alt={failed ? "" : photo.alt}
        title={`${photo.displayTitle} · ${photo.creator} · ${photo.license}`}
        width={photo.width}
        height={photo.height}
        loading={loading}
        fetchPriority={loading === "eager" ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
        style={failed ? { visibility: "hidden" } : undefined}
      />
      {failed ? (
        <figcaption className="editorial-photo-fallback">
          {photo.displayTitle} · {photo.creator} ·{" "}
          <a href={photo.licenseHref} target="_blank" rel="noopener noreferrer">
            {photo.license}
          </a>
        </figcaption>
      ) : (
        <figcaption className="sr-only">
          {photo.displayTitle} · {photo.creator} · {photo.license}, via
          Wikimedia Commons
        </figcaption>
      )}
    </figure>
  );
}
