/**
 * A story's picture or video, filling whatever box it is put in.
 *
 * A video shows its first frame and plays only when asked, with the sound
 * off: a list of six autoplaying clips would eat a phone's data allowance on
 * the first scroll. `controls` is on where somebody may want to watch it —
 * the stories page — and off on a thumbnail.
 */
export function StoryMedia({
  kind,
  url,
  controls = false,
  className = '',
}: {
  readonly kind: 'image' | 'video';
  readonly url: string;
  readonly controls?: boolean;
  readonly className?: string;
}) {
  if (kind === 'video') {
    return (
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        controls={controls}
        className={`h-full w-full bg-c-text object-cover ${className}`}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- our own uploads, served through the rewrite
  return <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
}
