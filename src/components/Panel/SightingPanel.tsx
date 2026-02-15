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
    <div className="flex flex-col gap-0.5 py-2 border-b border-white/5">
      <span className="text-[10px] font-display tracking-widest text-signal-muted uppercase">
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-signal-cyan transition-colors text-sm break-all"
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
    // Only add country if it's not already mentioned in city or state
    const countryLower = loc.country.toLowerCase();
    const alreadyMentioned = parts.some(p => p.toLowerCase().includes(countryLower));
    if (!alreadyMentioned) parts.push(loc.country);
  }
  return parts.join(', ');
}

function SightingContent({ sighting }: { sighting: Sighting }) {
  const loc = parseLocation(sighting.location);

  const fields: { label: string; value: string; isLink?: boolean }[] = [];

  if (sighting.occurred) fields.push({ label: 'Date & Time', value: formatDate(sighting.occurred) });
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
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-display tracking-[0.3em] text-white">
            SIGHTING #{sighting.id}
          </span>
        </div>
        {sighting.location && (
          <h2 className="font-display text-lg text-signal-bright tracking-wider">
            {buildHeading(loc)}
          </h2>
        )}
        {sighting.occurred && (
          <p className="text-xs text-signal-muted mt-0.5 font-display tracking-wider uppercase">
            {formatDate(sighting.occurred)}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />

      {/* Fields */}
      <div className="space-y-0">
        {fields.map((field) => (
          <FieldRow key={field.label} {...field} />
        ))}
      </div>

      {/* Summary */}
      {sighting.summary && (
        <div className="mt-4">
          <span className="text-[10px] font-display tracking-widest text-signal-muted uppercase block mb-2">
            Summary
          </span>
          <div className="glass-panel-green rounded-lg p-3 max-h-48 overflow-y-auto">
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
          className="fixed top-0 right-0 h-full w-full sm:w-[380px] md:w-[400px] z-[2000]
                     glass-panel overflow-y-auto overscroll-contain"
          style={{
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-8 sm:h-8 rounded-lg glow-border flex items-center justify-center
                       hover:bg-signal-red/20 hover:border-signal-red/30 transition-all z-10 group active:scale-95"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-signal-muted group-hover:text-signal-red transition-colors">
              <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="p-4 pt-14 sm:p-6 sm:pt-14 pb-safe">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                <span className="text-xs font-display tracking-widest text-white loading-pulse">
                  RETRIEVING DATA...
                </span>
              </div>
            )}

            {error && (
              <div className="text-center py-20">
                <div className="font-display text-signal-red text-sm tracking-wider mb-2">
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
