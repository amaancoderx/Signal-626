'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useSightingDetail } from '@/hooks/useSightings';
import { formatDate, parseLocation } from '@/lib/utils';
import type { Sighting } from '@/lib/types';

interface SightingPanelProps {
  sightingId: number | null;
  onClose: () => void;
}

function FieldRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-signal-cyan/8">
      <span className="text-[10px] font-display tracking-widest text-signal-cyan/50 uppercase">
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal-cyan hover:text-signal-bright transition-colors text-sm break-all"
          style={{ textShadow: '0 0 6px rgba(0,212,255,0.2)' }}
        >
          {value}
        </a>
      ) : (
        <span className="text-signal-bright text-sm leading-relaxed">{value}</span>
      )}
    </div>
  );
}

function buildHeading(loc: { city: string | null; state: string | null; country: string | null }): string {
  const parts: string[] = [];
  if (loc.city) parts.push(loc.city);
  if (loc.state && loc.state !== loc.city) parts.push(loc.state);
  if (loc.country) {
    const countryLower = loc.country.toLowerCase();
    const alreadyMentioned = parts.some(p => p.toLowerCase().includes(countryLower));
    if (!alreadyMentioned) parts.push(loc.country);
  }
  return parts.join(', ');
}

function SightingContent({ sighting }: { sighting: Sighting }) {
  const loc = parseLocation(sighting.location);

  const fields: { label: string; value: string; isLink?: boolean }[] = [];

  if (sighting.occurred) fields.push({ label: 'Occurred', value: formatDate(sighting.occurred) });
  if (loc.city) fields.push({ label: 'City', value: loc.city });
  if (loc.state) fields.push({ label: 'State', value: loc.state });
  if (loc.country) fields.push({ label: 'Country', value: loc.country });
  if (sighting.shape) fields.push({ label: 'Shape', value: sighting.shape });
  if (sighting.color) fields.push({ label: 'Color', value: sighting.color });
  if (sighting.duration) fields.push({ label: 'Duration', value: sighting.duration });
  if (sighting.num_observers) fields.push({ label: 'Observers', value: sighting.num_observers });
  if (sighting.estimated_size) fields.push({ label: 'Estimated Size', value: sighting.estimated_size });
  if (sighting.viewed_from) fields.push({ label: 'Viewed From', value: sighting.viewed_from });
  if (sighting.direction_from_viewer) fields.push({ label: 'Direction', value: sighting.direction_from_viewer });
  if (sighting.angle_of_elevation) fields.push({ label: 'Elevation Angle', value: sighting.angle_of_elevation });
  if (sighting.closest_distance) fields.push({ label: 'Closest Distance', value: sighting.closest_distance });
  if (sighting.estimated_speed) fields.push({ label: 'Estimated Speed', value: sighting.estimated_speed });
  if (sighting.characteristics) fields.push({ label: 'Characteristics', value: sighting.characteristics });
  if (sighting.location_details) fields.push({ label: 'Location Details', value: sighting.location_details });
  if (sighting.reported) fields.push({ label: 'Reported', value: formatDate(sighting.reported) });
  if (sighting.url) fields.push({ label: 'NUFORC Report', value: sighting.url, isLink: true });

  return (
    <>
      {/* Header with neon glow */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-signal-cyan animate-pulse" style={{ boxShadow: '0 0 10px rgba(0,212,255,0.6)' }} />
          <span className="text-[10px] font-display tracking-[0.3em] text-signal-cyan glow-text-cyan">
            SIGHTING #{sighting.id}
          </span>
        </div>
        {sighting.location && (
          <h2 className="font-display text-xl text-signal-bright tracking-wider glow-text-white">
            {buildHeading(loc)}
          </h2>
        )}
        {sighting.occurred && (
          <p className="text-xs text-signal-cyan/60 mt-1 font-display tracking-wider uppercase">
            {formatDate(sighting.occurred)}
          </p>
        )}
      </div>

      {/* Neon divider */}
      <div className="neon-line w-full mb-4" />

      {/* Fields */}
      <div className="space-y-0">
        {fields.map((field) => (
          <FieldRow key={field.label} {...field} />
        ))}
      </div>

      {/* Summary */}
      {sighting.summary && (
        <div className="mt-5">
          <span className="text-[10px] font-display tracking-widest text-signal-cyan/50 uppercase block mb-2">
            Summary
          </span>
          <div
            className="rounded-xl p-4 max-h-48 overflow-y-auto"
            style={{
              background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.12)',
              boxShadow: 'inset 0 0 20px rgba(0,212,255,0.03)',
            }}
          >
            <p className="text-sm text-signal-bright/80 leading-relaxed whitespace-pre-wrap">
              {sighting.summary}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function SightingPanel({ sightingId, onClose }: SightingPanelProps) {
  const { data: sighting, isLoading, error } = useSightingDetail(sightingId);

  return (
    <AnimatePresence>
      {sightingId !== null && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed top-0 right-0 h-full w-full sm:w-[380px] md:w-[420px] z-[2000]
                     overflow-y-auto overscroll-contain"
          style={{
            background: 'linear-gradient(180deg, rgba(8,14,28,0.96) 0%, rgba(5,10,20,0.98) 100%)',
            backdropFilter: 'blur(32px)',
            borderLeft: '1px solid rgba(0,229,255,0.12)',
            boxShadow: '-10px 0 60px rgba(0,0,0,0.6), -5px 0 30px rgba(0,229,255,0.04)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
                       transition-all z-10 group active:scale-95"
            style={{
              border: '1px solid rgba(0,229,255,0.15)',
              background: 'rgba(8,14,28,0.6)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-signal-muted group-hover:text-signal-red transition-colors">
              <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="p-5 pt-14 sm:p-6 sm:pt-14 pb-safe">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-signal-cyan/20 border-t-signal-cyan rounded-full animate-spin mb-4" />
                <span className="text-xs font-display tracking-widest text-signal-cyan loading-pulse glow-text-cyan">
                  RETRIEVING DATA...
                </span>
              </div>
            )}

            {error && (
              <div className="text-center py-20">
                <div className="font-display text-signal-red text-sm tracking-wider mb-2 glow-text-red">
                  SIGNAL LOST
                </div>
                <p className="text-signal-muted text-xs">Failed to retrieve sighting data</p>
              </div>
            )}

            {sighting && <SightingContent sighting={sighting} />}
          </div>

          {/* Bottom gradient */}
          <div className="sticky bottom-0 h-8 bg-gradient-to-t from-signal-panel to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
